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

from apps.users.models import User, UserLocation, AuthUser
from apps.users.permissions import IsEmailVerified
from apps.matching.models import Match, Notification
from apps.matching.utils import calculate_distance_km, find_matchable_users
from apps.matching.serializers import (
    MatchableCountSerializer,
    MatchCheckSerializer,
    MatchSerializer,
    NotificationRegisterSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated & IsEmailVerified if not settings.DEBUG else AllowAny])
def matchable_count(request):
    """
    API 12: 매칭 가능 인원 수 조회
    GET /api/matching/matchable-count/
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
    
    # 이메일 인증 여부 확인 (매칭 활성화를 위한 필수 조건)
    auth_user = current_user.user
    if not auth_user.email_verified:
        return Response({
            'success': False,
            'error': '이메일 인증이 완료되지 않았습니다. 매칭 가능 인원 수를 조회하려면 먼저 이메일 인증을 완료해주세요.',
            'email_verified': False,
            'email_verification_required': True
        }, status=status.HTTP_403_FORBIDDEN)
    
    # 매칭 동의가 OFF인 경우 API 호출 거부
    if not current_user.matching_consent:
        return Response({
            'success': False,
            'error': '매칭 동의가 OFF 상태입니다. 매칭 가능 인원 수를 조회하려면 매칭 동의를 ON으로 설정해주세요.',
            'matching_consent_required': True
        }, status=status.HTTP_403_FORBIDDEN)
    
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
    
    return Response({
        'success': True,
        'matchable_count': matchable_count,
        'radius': radius,
        'last_count_updated_at': current_user.last_count_updated_at.isoformat() if current_user.last_count_updated_at else None,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated & IsEmailVerified if not settings.DEBUG else AllowAny])
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
    
    # 이메일 인증 여부 확인 (매칭 활성화를 위한 필수 조건)
    auth_user = current_user.user
    if not auth_user.email_verified:
        return Response({
            'success': False,
            'error': '이메일 인증이 완료되지 않았습니다. 매칭을 확인하려면 먼저 이메일 인증을 완료해주세요.',
            'email_verified': False,
            'email_verification_required': True
        }, status=status.HTTP_403_FORBIDDEN)
    
    # 매칭 동의가 OFF인 경우 API 호출 거부
    if not current_user.matching_consent:
        return Response({
            'success': False,
            'error': '매칭 동의가 OFF 상태입니다. 매칭을 확인하려면 매칭 동의를 ON으로 설정해주세요.',
            'matching_consent_required': True
        }, status=status.HTTP_403_FORBIDDEN)
    
    # 위치 가져오기 (쿼리 파라미터 우선, 없으면 저장된 위치 사용)
    latitude = request.query_params.get('latitude')
    longitude = request.query_params.get('longitude')
    
    if latitude and longitude:
        # 쿼리 파라미터에서 위치 가져오기
        try:
            # DecimalField 제약 조건: max_digits=9, decimal_places=6
            # 소수점 6자리로 반올림하여 저장
            latitude = Decimal(str(latitude)).quantize(Decimal('0.000001'))
            longitude = Decimal(str(longitude)).quantize(Decimal('0.000001'))
            print(f'📍 쿼리 파라미터에서 위치 사용: ({latitude}, {longitude})')
        except (ValueError, TypeError) as e:
            return Response({
                'success': False,
                'error': f'latitude와 longitude는 숫자여야 합니다. ({str(e)})'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        # 저장된 위치 사용
        try:
            user_location = current_user.location
            latitude = Decimal(str(user_location.latitude))
            longitude = Decimal(str(user_location.longitude))
            print(f'📍 저장된 위치 사용: ({latitude}, {longitude})')
        except UserLocation.DoesNotExist:
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
    
    # 매칭 동의 자동 활성화 제거: 이메일 인증이 완료되지 않은 사용자는 매칭 동의를 활성화할 수 없음
    # (이미 위에서 이메일 인증 여부를 확인했으므로, 여기서는 자동 활성화하지 않음)
    
    # 매칭 가능한 사용자 찾기
    matchable_users = find_matchable_users(
        current_user,
        float(latitude),
        float(longitude),
        radius_km=radius
    )
    
    print(f'📊 매칭 가능한 사용자: {len(matchable_users)}명')
    for matchable in matchable_users[:5]:  # 처음 5개만 출력
        print(f'   - {matchable["user"].user.username} (거리: {matchable["distance_m"]:.2f}m, 점수: {matchable["match_score"]})')
    
    # 기존 매칭 확인 (Match 객체 리스트)
    existing_matches = Match.objects.filter(
        Q(user1=current_user) | Q(user2=current_user)
    ).select_related('user1', 'user2').order_by('-matched_at')
    
    print(f'🔍 기존 매칭 확인 중...')
    for match in existing_matches[:5]:  # 처음 5개만 출력
        other_user = match.user2 if match.user1 == current_user else match.user1
        print(f'   ⚠️ {other_user.user.username}: 이미 매칭됨 (매칭 ID: {match.id})')
    
    # 거리 바깥으로 나간 매칭 삭제
    deleted_matches = []
    for match in existing_matches:
        other_user = match.user2 if match.user1 == current_user else match.user1
        
        # 상대방의 현재 위치 확인
        try:
            other_location = other_user.location
            other_lat = float(other_location.latitude)
            other_lon = float(other_location.longitude)
            
            # 현재 위치와 상대방 위치 간 거리 계산 (km)
            distance_km = calculate_distance_km(
                float(latitude), float(longitude),
                other_lat, other_lon
            )
            
            # 반경 밖이면 매칭 삭제
            if distance_km > radius:
                match.delete()
                deleted_matches.append({
                    'match_id': match.id,
                    'other_user': other_user.user.username,
                    'distance_km': distance_km,
                    'radius_km': radius
                })
                print(f'   🗑️ 매칭 삭제: {other_user.user.username} (거리: {distance_km*1000:.2f}m > 반경: {radius*1000:.2f}m)')
        except UserLocation.DoesNotExist:
            # 상대방 위치 정보가 없으면 매칭 삭제
            match.delete()
            deleted_matches.append({
                'match_id': match.id,
                'other_user': other_user.user.username,
                'reason': '상대방 위치 정보 없음'
            })
            print(f'   🗑️ 매칭 삭제: {other_user.user.username} (위치 정보 없음)')
    
    if deleted_matches:
        print(f'📊 총 {len(deleted_matches)}개의 매칭이 삭제되었습니다.')
    
    # 삭제 후 기존 매칭 목록 다시 조회 (삭제된 것 제외)
    existing_matches = Match.objects.filter(
        Q(user1=current_user) | Q(user2=current_user)
    ).select_related('user1', 'user2').order_by('-matched_at')
    
    # 새 매칭 생성
    new_matches = []
    for matchable in matchable_users:
        candidate_user = matchable['user']
        
        # 이미 매칭된 사용자는 제외
        if any(m.user1 == candidate_user or m.user2 == candidate_user for m in existing_matches):
            print(f'   ⚠️ {candidate_user.user.username}: 이미 매칭됨 (매칭 ID: {[m.id for m in existing_matches if m.user1 == candidate_user or m.user2 == candidate_user][0]})')
            continue
        
        # 새 매칭 생성
        try:
            # candidate_user의 위치 정보 확인
            if not hasattr(candidate_user, 'location') or not candidate_user.location:
                continue  # 위치 정보가 없으면 스킵
            
            with transaction.atomic():
                # DecimalField 제약 조건: max_digits=9, decimal_places=6
                # 소수점 6자리로 반올림
                user1_lat = Decimal(str(latitude)).quantize(Decimal('0.000001'))
                user1_lon = Decimal(str(longitude)).quantize(Decimal('0.000001'))
                user2_lat = Decimal(str(candidate_user.location.latitude)).quantize(Decimal('0.000001'))
                user2_lon = Decimal(str(candidate_user.location.longitude)).quantize(Decimal('0.000001'))
                
                new_match = Match.objects.create(
                    user1=current_user,
                    user2=candidate_user,
                    user1_latitude=user1_lat,
                    user1_longitude=user1_lon,
                    user2_latitude=user2_lat,
                    user2_longitude=user2_lon,
                    matched_criteria={
                        'distance_m': matchable['distance_m'],
                        'match_score': matchable['match_score'],
                    }
                )
                new_matches.append(new_match)
                print(f'   ✅ 새 매칭 생성 완료 (매칭 ID: {new_match.id})')
        except Exception as e:
            # 매칭 생성 실패 (중복 등)는 무시하고 계속
            print(f'⚠️ 매칭 생성 실패: {str(e)}')
            continue
    
    # 최신 매칭 정보 (새 매칭 우선, 없으면 기존 매칭)
    latest_match = new_matches[0] if new_matches else (existing_matches[0] if existing_matches else None)
    
    if latest_match:
        serializer = MatchSerializer(latest_match)

        # 새 매칭 여부 판단
        # 1. 실제로 새로 생성된 매칭만 새 매칭으로 간주
        # 2. 거리 밖으로 나갔다가 다시 만난 경우는 이미 new_matches에 포함됨
        has_new_match = len(new_matches) > 0

        return Response({
            'success': True,
            'has_new_match': has_new_match,
            'new_matches_count': len(new_matches),
            'latest_match': serializer.data,
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'success': True,
            'has_new_match': False,
            'new_matches_count': 0,
            'latest_match': None,
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated & IsEmailVerified if not settings.DEBUG else AllowAny])
def register_notification(request):
    """
    API 15: 백그라운드 알림 등록
    POST /api/matching/notifications/register/
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
                'error': '프로필이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = NotificationRegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    fcm_token = serializer.validated_data.get('fcm_token')
    device_type = serializer.validated_data.get('device_type', 'ios')
    
    # 알림 등록 또는 업데이트
    notification, created = Notification.objects.update_or_create(
        user=current_user,
        defaults={
            'fcm_token': fcm_token,
            'device_type': device_type,
            'is_active': True,
        }
    )
    
    return Response({
        'success': True,
        'message': '푸시 알림 토큰이 등록되었습니다.' if created else '푸시 알림 토큰이 업데이트되었습니다.',
        'data': {
            'notification_id': notification.id,
            'device_type': device_type,
            'is_active': notification.is_active,
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated & IsEmailVerified if not settings.DEBUG else AllowAny])
def active_match_count(request):
    """
    현재 사용자의 활성 매칭 수 조회 (50m 이내)
    GET /api/matching/active-count/
    
    현재 위치에서 50m 이내에 있는 매칭된 사용자 수를 반환합니다.
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
    max_distance_km = float(request.query_params.get('max_distance', '0.05'))  # 기본값 50m
    
    if not latitude or not longitude:
        return Response({
            'success': False,
            'error': 'latitude와 longitude는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except ValueError:
        return Response({
            'success': False,
            'error': 'latitude, longitude는 숫자여야 합니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 현재 사용자의 모든 매칭 조회
    matches = Match.objects.filter(
        Q(user1=current_user) | Q(user2=current_user)
    ).select_related('user1', 'user2')
    
    active_count = 0
    active_matches = []
    
    for match in matches:
        # 상대방 사용자 찾기
        other_user = match.user2 if match.user1 == current_user else match.user1
        
        # 상대방의 현재 위치 조회
        try:
            other_location = other_user.location
            other_lat = float(other_location.latitude)
            other_lon = float(other_location.longitude)
            
            # 거리 계산 (km)
            distance_km = calculate_distance_km(
                latitude, longitude,
                other_lat, other_lon
            )
            
            # 50m 이내인 경우만 카운트
            if distance_km <= max_distance_km:
                active_count += 1
                active_matches.append({
                    'id': match.id,
                    'other_user_id': other_user.id,
                    'distance_m': round(distance_km * 1000, 2),
                    'matched_at': match.matched_at.isoformat(),
                })
        except UserLocation.DoesNotExist:
            # 상대방 위치 정보가 없으면 제외
            continue
    
    return Response({
        'success': True,
        'count': active_count,
        'matches': active_matches,
        'max_distance_km': max_distance_km,
    }, status=status.HTTP_200_OK)
