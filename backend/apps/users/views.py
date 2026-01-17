from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.conf import settings
from .models import UserLocation, User, AuthUser, IdealTypeProfile
from .serializers import UserLocationSerializer, UserSerializer, IdealTypeProfileSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])  # 개발 환경에서는 인증 우회
def update_location(request):
    """
    위치 업데이트 API
    POST /api/users/location/update/
    
    개발 환경(DEBUG=True)에서는 인증 없이 테스트 가능
    user_id를 request body에 포함하여 전송하면 해당 사용자의 위치 업데이트
    """
    # 요청 로그 (디버깅용)
    print("=" * 60)
    print("📍 위치 업데이트 API 요청 수신")
    print(f"   Method: {request.method}")
    print(f"   User: {request.user if hasattr(request, 'user') else 'Anonymous'}")
    print(f"   Data: {request.data}")
    print(f"   Headers: {dict(request.headers)}")
    print("=" * 60)
    
    serializer = UserLocationSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            # 개발 환경에서 인증 없이 테스트하는 경우
            if settings.DEBUG and not request.user.is_authenticated:
                user_id = request.data.get('user_id')
                print(f"🔧 디버그 모드: 인증 없음, user_id: {user_id}")
                if not user_id:
                    error_msg = '테스트 모드: user_id가 필요합니다. (예: {"user_id": 1, "latitude": 37.5665, "longitude": 126.9780})'
                    print(f"❌ {error_msg}")
                    print("=" * 60)
                    return Response({
                        'success': False,
                        'error': error_msg
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    # user_id로 User 프로필 찾기
                    auth_user = AuthUser.objects.get(id=user_id)
                    user_profile = auth_user.profile
                except (AuthUser.DoesNotExist, User.DoesNotExist):
                    return Response({
                        'success': False,
                        'error': f'user_id {user_id}에 해당하는 프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # 정상 모드: 인증된 사용자 사용
                try:
                    user_profile = request.user.profile
                except User.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': '프로필이 없습니다. 먼저 프로필을 생성해주세요.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # upsert (있으면 업데이트, 없으면 생성)
            location, created = UserLocation.objects.update_or_create(
                user=user_profile,
                defaults={
                    'latitude': serializer.validated_data['latitude'],
                    'longitude': serializer.validated_data['longitude'],
                    'updated_at': timezone.now(),
                }
            )
            
            result = {
                'success': True,
                'message': '위치가 업데이트되었습니다.' if not created else '위치가 저장되었습니다.',
                'data': UserLocationSerializer(location).data,
                'updated_at': location.updated_at.isoformat(),
            }
            
            # 성공 로그
            print(f"✅ 위치 업데이트 성공!")
            print(f"   User: {user_profile.user.username}")
            print(f"   Latitude: {location.latitude}")
            print(f"   Longitude: {location.longitude}")
            print(f"   Created: {created}")
            print("=" * 60)
            
            return Response(result, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': f'위치 업데이트 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def profile_view(request):
    """
    프로필 조회/생성/수정 API
    GET /api/users/profile/ - 프로필 조회
    POST /api/users/profile/ - 프로필 생성
    PUT /api/users/profile/ - 프로필 수정
    
    개발 환경(DEBUG=True)에서는 인증 없이 테스트 가능
    user_id를 query parameter 또는 request body에 포함하여 전송
    """
    # GET 요청: 프로필 조회
    if request.method == 'GET':
        try:
            # 개발 환경에서 인증 없이 테스트하는 경우
            if settings.DEBUG and not request.user.is_authenticated:
                user_id = request.query_params.get('user_id') or request.data.get('user_id')
                if not user_id:
                    return Response({
                        'success': False,
                        'error': '테스트 모드: user_id가 필요합니다. (예: ?user_id=1)'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    auth_user = AuthUser.objects.get(id=user_id)
                    user_profile = auth_user.profile
                except (AuthUser.DoesNotExist, User.DoesNotExist):
                    return Response({
                        'success': False,
                        'message': '프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # 정상 모드: 인증된 사용자 사용
                try:
                    user_profile = request.user.profile
                except User.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': '프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = UserSerializer(user_profile)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'프로필 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # POST/PUT 요청: 프로필 생성/수정
    else:  # POST or PUT
        try:
            # 개발 환경에서 인증 없이 테스트하는 경우
            if settings.DEBUG and not request.user.is_authenticated:
                user_id = request.data.get('user_id')
                if not user_id:
                    return Response({
                        'success': False,
                        'error': '테스트 모드: user_id가 필요합니다. (예: {"user_id": 1, "age": 25, ...})'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    auth_user = AuthUser.objects.get(id=user_id)
                    user_profile = auth_user.profile
                    serializer = UserSerializer(user_profile, data=request.data, partial=request.method == 'PUT')
                except User.DoesNotExist:
                    # 프로필이 없으면 생성
                    serializer = UserSerializer(data=request.data)
            else:
                # 정상 모드: 인증된 사용자 사용
                try:
                    user_profile = request.user.profile
                    serializer = UserSerializer(user_profile, data=request.data, partial=request.method == 'PUT')
                except User.DoesNotExist:
                    # 프로필이 없으면 생성
                    serializer = UserSerializer(data=request.data)
            
            if serializer.is_valid():
                # 개발 모드에서 user_id가 있는 경우
                if settings.DEBUG and not request.user.is_authenticated and request.data.get('user_id'):
                    user_id = request.data.get('user_id')
                    auth_user = AuthUser.objects.get(id=user_id)
                    serializer.save(user=auth_user)
                else:
                    serializer.save(user=request.user)
                
                return Response({
                    'success': True,
                    'message': '프로필이 저장되었습니다.',
                    'data': serializer.data
                }, status=status.HTTP_200_OK)
            
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': f'프로필 저장 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 별칭 함수 (하위 호환성 유지)
def get_profile(request):
    """프로필 조회 (별칭)"""
    return profile_view(request)


def update_profile(request):
    """프로필 생성/수정 (별칭)"""
    return profile_view(request)


@api_view(['GET'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def check_profile_completeness(request):
    """
    프로필 완성도 확인 API
    GET /api/users/profile/completeness/
    
    개발 환경(DEBUG=True)에서는 인증 없이 테스트 가능
    user_id를 query parameter로 전송하면 해당 사용자의 완성도 확인
    """
    try:
        # 개발 환경에서 인증 없이 테스트하는 경우
        if settings.DEBUG and not request.user.is_authenticated:
            user_id = request.query_params.get('user_id') or request.data.get('user_id')
            if not user_id:
                return Response({
                    'success': False,
                    'error': '테스트 모드: user_id가 필요합니다. (예: ?user_id=1)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                auth_user = AuthUser.objects.get(id=user_id)
                profile = auth_user.profile
            except (AuthUser.DoesNotExist, User.DoesNotExist):
                return Response({
                    'success': True,
                    'profile_complete': False,
                    'ideal_type_complete': False,
                    'all_complete': False
                }, status=status.HTTP_200_OK)
        else:
            # 정상 모드: 인증된 사용자 사용
            try:
                profile = request.user.profile
            except User.DoesNotExist:
                return Response({
                    'success': True,
                    'profile_complete': False,
                    'ideal_type_complete': False,
                    'all_complete': False
                }, status=status.HTTP_200_OK)
        
        # 프로필 완성도 체크
        profile_fields = ['age', 'gender', 'height', 'mbti', 'personality', 'interests']
        profile_complete = all(getattr(profile, field, None) for field in profile_fields)
        profile_complete = profile_complete and len(profile.personality) > 0 and len(profile.interests) > 0
        
        # 이상형 프로필 완성도 체크
        ideal_type_complete = False
        try:
            ideal_type = profile.ideal_type_profile
            if ideal_type:
                ideal_fields = ['height_min', 'height_max', 'age_min', 'age_max', 
                              'preferred_mbti', 'preferred_personality', 'preferred_interests']
                ideal_type_complete = all(getattr(ideal_type, field, None) for field in ideal_fields)
                ideal_type_complete = ideal_type_complete and \
                    len(ideal_type.preferred_mbti) > 0 and \
                    len(ideal_type.preferred_personality) > 0 and \
                    len(ideal_type.preferred_interests) > 0
        except Exception:
            ideal_type_complete = False
        
        return Response({
            'success': True,
            'profile_complete': profile_complete,
            'ideal_type_complete': ideal_type_complete,
            'all_complete': profile_complete and ideal_type_complete
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'프로필 완성도 확인 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
