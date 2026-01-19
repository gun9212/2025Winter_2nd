"""
매칭 관련 API Views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from decimal import Decimal

from apps.users.models import User, UserLocation
from apps.matching.models import Match, Notification
from apps.matching.serializers import (
    MatchableCountSerializer,
    MatchCheckSerializer,
    MatchSerializer,
    NotificationRegisterSerializer,
)
from apps.matching.utils import (
    find_matchable_users,
    calculate_distance_km,
    check_match_criteria,
    check_new_matches,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def matchable_count(request):
    """
    API 12: 매칭 가능 인원 수 조회
    GET /api/matching/matchable-count/
    
    Query Parameters:
        - latitude (float): 현재 위치 위도
        - longitude (float): 현재 위치 경도
        - radius (float): 반경 (km 단위, 기본값 0.5 = 500m)
    """
    # 개발 모드에서 인증 없이 테스트하는 경우
    if settings.DEBUG and not request.user.is_authenticated:
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'error': '테스트 모드: user_id가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.users.models import AuthUser
            auth_user = AuthUser.objects.get(id=user_id)
            current_user = auth_user.profile
        except Exception:
            return Response({
                'success': False,
                'error': f'user_id {user_id}에 해당하는 프로필이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        # 정상 모드: 인증된 사용자
        try:
            current_user = request.user.profile
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': '프로필이 없습니다. 먼저 프로필을 생성해주세요.'
            }, status=status.HTTP_404_NOT_FOUND)
    
    # Query Parameters
    latitude = request.query_params.get('latitude')
    longitude = request.query_params.get('longitude')
    radius = request.query_params.get('radius', '0.5')  # 기본값 500m
    
    if not latitude or not longitude:
        return Response({
            'success': False,
            'error': 'latitude와 longitude는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        latitude = float(latitude)
        longitude = float(longitude)
        radius = float(radius)
    except ValueError:
        return Response({
            'success': False,
            'error': 'latitude, longitude, radius는 숫자여야 합니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 매칭 동의는 무조건 ON으로 가정 (요청사항)
    # 매칭 동의가 OFF인 경우에도 강제로 ON으로 설정 (useruser는 제외)
    if not current_user.matching_consent and current_user.user.username != 'useruser':
        current_user.matching_consent = True
        current_user.consent_updated_at = timezone.now()
        current_user.save(update_fields=['matching_consent', 'consent_updated_at'])
        print(f'🔧 매칭 동의를 자동으로 ON으로 설정: {current_user.user.username}')
    
    # 매칭 가능한 사용자 찾기
    matchable_users = find_matchable_users(
        current_user,
        latitude,
        longitude,
        radius_km=radius
    )
    
    matchable_count = len(matchable_users)
    
    # 사용자 프로필에 카운트 업데이트 (useruser는 제외)
    if current_user.user.username != 'useruser':
        current_user.matchable_count = matchable_count
        current_user.last_count_updated_at = timezone.now()
        current_user.save(update_fields=['matchable_count', 'last_count_updated_at'])
    
    serializer = MatchableCountSerializer({
        'matchable_count': matchable_count,
        'last_count_updated_at': current_user.last_count_updated_at,
        'radius': radius,
    })
    
    return Response({
        'success': True,
        'data': serializer.data,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def match_check(request):
    """
    API 13: 매칭 체크 (포그라운드)
    GET /api/matching/check/
    
    새로운 매칭 발생 여부를 확인합니다.
    포그라운드에서는 알림을 표시하지 않습니다.
    """
    # 개발 모드에서 인증 없이 테스트하는 경우
    if settings.DEBUG and not request.user.is_authenticated:
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'error': '테스트 모드: user_id가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.users.models import AuthUser
            auth_user = AuthUser.objects.get(id=user_id)
            current_user = auth_user.profile
        except Exception:
            return Response({
                'success': False,
                'error': f'user_id {user_id}에 해당하는 프로필이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        # 정상 모드: 인증된 사용자
        try:
            current_user = request.user.profile
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': '프로필이 없습니다. 먼저 프로필을 생성해주세요.'
            }, status=status.HTTP_404_NOT_FOUND)
    
    # 매칭 동의는 무조건 ON으로 가정 (요청사항)
    # 매칭 동의가 OFF인 경우에도 강제로 ON으로 설정 (useruser는 제외)
    if not current_user.matching_consent and current_user.user.username != 'useruser':
        current_user.matching_consent = True
        current_user.consent_updated_at = timezone.now()
        current_user.save(update_fields=['matching_consent', 'consent_updated_at'])
        print(f'🔧 매칭 동의를 자동으로 ON으로 설정: {current_user.user.username}')
    
    # 현재 위치 가져오기
    try:
        user_location = current_user.location
        latitude = Decimal(str(user_location.latitude))
        longitude = Decimal(str(user_location.longitude))
    except (UserLocation.DoesNotExist, AttributeError):
        return Response({
            'success': False,
            'error': '위치 정보가 없습니다. 먼저 위치를 업데이트해주세요.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 반경 (기본값 500m)
    try:
        radius = float(request.query_params.get('radius', '0.5'))
    except (ValueError, TypeError):
        return Response({
            'success': False,
            'error': 'radius는 숫자여야 합니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 매칭 가능한 사용자 찾기
    matchable_users = find_matchable_users(
        current_user,
        latitude,
        longitude,
        radius_km=radius
    )
    
    # 새로운 매칭 생성 (아직 매칭되지 않은 사용자와)
    new_matches = []
    for matchable in matchable_users:
        candidate_user = matchable['user']
        
        # 이미 매칭된 사용자인지 확인
        existing_match = Match.objects.filter(
            (Q(user1=current_user) & Q(user2=candidate_user)) |
            (Q(user1=candidate_user) & Q(user2=current_user))
        ).first()
        
        if existing_match:
            continue  # 이미 매칭됨
        
        # 새 매칭 생성
        try:
            # candidate_user의 위치 정보 확인
            if not hasattr(candidate_user, 'location') or not candidate_user.location:
                continue  # 위치 정보가 없으면 스킵
            
            with transaction.atomic():
                new_match = Match.objects.create(
                    user1=current_user,
                    user2=candidate_user,
                    user1_latitude=Decimal(str(latitude)),
                    user1_longitude=Decimal(str(longitude)),
                    user2_latitude=Decimal(str(candidate_user.location.latitude)),
                    user2_longitude=Decimal(str(candidate_user.location.longitude)),
                    matched_criteria={
                        'distance_m': matchable['distance_m'],
                        'match_score': matchable['match_score'],
                    }
                )
                new_matches.append(new_match)
        except Exception as e:
            # 매칭 생성 실패 (중복 등)는 무시하고 계속
            print(f'⚠️ 매칭 생성 실패: {str(e)}')
            continue
    
    # 최신 매칭 정보
    latest_match = new_matches[0] if new_matches else None
    
    # Serializer로 변환
    serializer = MatchCheckSerializer({
        'has_new_match': len(new_matches) > 0,
        'new_matches_count': len(new_matches),
        'latest_match': latest_match,
    })
    
    return Response({
        'success': True,
        'data': serializer.data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def register_notification(request):
    """
    API 15: 백그라운드 알림 등록
    POST /api/matching/notifications/register/
    
    FCM 토큰을 등록하여 백그라운드 매칭 알림을 받을 수 있도록 합니다.
    """
    # 개발 모드에서 인증 없이 테스트하는 경우
    if settings.DEBUG and not request.user.is_authenticated:
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'error': '테스트 모드: user_id가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.users.models import AuthUser
            auth_user = AuthUser.objects.get(id=user_id)
            current_user = auth_user.profile
        except Exception:
            return Response({
                'success': False,
                'error': f'user_id {user_id}에 해당하는 프로필이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        # 정상 모드: 인증된 사용자
        try:
            current_user = request.user.profile
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': '프로필이 없습니다. 먼저 프로필을 생성해주세요.'
            }, status=status.HTTP_404_NOT_FOUND)
    
    # Serializer 검증
    serializer = NotificationRegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    fcm_token = serializer.validated_data['fcm_token']
    device_type = serializer.validated_data['device_type']
    
    # Notification 모델에 FCM 토큰 저장
    # 같은 사용자의 FCM 토큰 등록용 Notification을 찾거나 생성
    # match=None이고 fcm_token이 있는 Notification을 찾거나 생성
    notification, created = Notification.objects.update_or_create(
        user=current_user,
        match=None,  # FCM 토큰 등록은 match와 무관
        defaults={
            'fcm_token': fcm_token,
            'device_type': device_type,
            'is_active': current_user.matching_consent,  # 매칭 동의 상태에 따라
        }
    )
    
    # 이미 존재하는 경우에도 FCM 토큰과 디바이스 타입 업데이트
    if not created:
        notification.fcm_token = fcm_token
        notification.device_type = device_type
        notification.is_active = current_user.matching_consent
        notification.save(update_fields=['fcm_token', 'device_type', 'is_active'])
    
    return Response({
        'success': True,
        'message': '푸시 알림 토큰이 등록되었습니다.' if created else '푸시 알림 토큰이 업데이트되었습니다.',
        'data': {
            'notification_id': notification.id,
            'device_type': device_type,
            'is_active': notification.is_active,
        }
    }, status=status.HTTP_200_OK)
