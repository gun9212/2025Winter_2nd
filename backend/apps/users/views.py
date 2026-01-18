from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
import random
import string
from django.core.mail import send_mail
from decouple import config
import boto3
from botocore.exceptions import ClientError
from .models import UserLocation, User, AuthUser
from .serializers import UserLocationSerializer, UserSerializer, RegisterSerializer, LoginSerializer, EmailVerificationSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    회원가입 API
    POST /api/auth/register/
    
    Request Body:
    {
        "username": "user123",
        "password": "password123",
        "email": "user@example.com"
    }
    
    Response (201 Created):
    {
        "id": 1,
        "username": "user123",
        "email": "user@example.com",
        "email_verified": false,
        "date_joined": "2025-01-15T10:00:00Z"
    }
    """
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # 응답 데이터 (비밀번호 제외)
        response_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'email_verified': user.email_verified,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    로그인 API
    POST /api/auth/login/
    
    Request Body:
    {
        "username": "user123",
        "password": "password123"
    }
    
    Response (200 OK):
    {
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "user": {
            "id": 1,
            "username": "user123",
            "phone_number": "010-1234-5678"
        }
    }
    """
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    
    # 사용자 인증
    user = authenticate(request, username=username, password=password)
    
    if user is None:
        return Response(
            {'error': '아이디 또는 비밀번호가 올바르지 않습니다.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # JWT 토큰 발급
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    # 사용자 정보
    user_data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
    }
    
    # last_login 업데이트
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    
    return Response({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_code(request):
    """
    이메일 인증번호 발송 API
    POST /api/auth/send-verification-code/
    
    Request Body:
    {
        "email": "user@example.com"
    }
    
    Response (200 OK):
    {
        "success": true,
        "message": "인증번호가 전송되었습니다.",
        "expires_in": 120  // 초 단위
    }
    """
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': '이메일을 입력해주세요.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 이메일 형식 검증
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    try:
        validate_email(email)
    except ValidationError:
        return Response(
            {'error': '올바른 이메일 형식이 아닙니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 인증번호 생성 (6자리 숫자)
    verification_code = ''.join(random.choices(string.digits, k=6))
    
    # Redis에 인증번호 저장 (2분 유효시간)
    cache_key = f'verification_code:email:{email}'
    cache.set(cache_key, verification_code, timeout=120)  # 120초 = 2분
    
    # 이메일 발송
    try:
        subject = '[IdealMatch] 이메일 인증번호를 확인해주세요'
        message = f'''
안녕하세요! IdealMatch입니다. 👋

회원가입을 위해 아래 인증번호를 입력해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   인증번호: {verification_code}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ 유효시간: 2분
이 인증번호는 2분 후 만료됩니다.

🔒 보안 안내
• 이 인증번호는 타인에게 공유하지 마세요.
• IdealMatch는 절대 인증번호를 요청하지 않습니다.
• 본인이 요청하지 않은 경우 이 이메일을 무시해주세요.

문의사항이 있으시면 언제든지 연락주세요.
IdealMatch와 함께 특별한 만남을 시작하세요! 💕

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IdealMatch 팀
이메일: support@idealmatch.com
        '''.strip()
        
        # 이메일 발송 방식 결정
        use_aws_ses = config('USE_AWS_SES', default=False, cast=bool)
        
        if settings.DEBUG and not use_aws_ses:
            # 개발 환경: 콘솔에 출력 (기본값)
            print("=" * 60)
            print("📧 이메일 인증번호 발송 (개발 모드)")
            print(f"   이메일: {email}")
            print(f"   인증번호: {verification_code}")
            print("   유효시간: 2분")
            print("=" * 60)
        elif use_aws_ses:
            # AWS SES 사용 (프로덕션 환경)
            try:
                # AWS 자격 증명 설정
                # EC2에서 IAM 역할을 사용하는 경우 자격 증명 불필요
                # 로컬 테스트나 명시적 자격 증명이 필요한 경우에만 사용
                ses_config = {
                    'region_name': config('AWS_SES_REGION', default='ap-northeast-2'),
                }
                
                # Access Key가 설정되어 있으면 사용, 없으면 IAM 역할 사용
                aws_access_key = config('AWS_ACCESS_KEY_ID', default='')
                aws_secret_key = config('AWS_SECRET_ACCESS_KEY', default='')
                
                if aws_access_key and aws_secret_key:
                    ses_config['aws_access_key_id'] = aws_access_key
                    ses_config['aws_secret_access_key'] = aws_secret_key
                
                ses_client = boto3.client('ses', **ses_config)
                
                # 이메일 발송
                response = ses_client.send_email(
                    Source=settings.DEFAULT_FROM_EMAIL,
                    Destination={'ToAddresses': [email]},
                    Message={
                        'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                        'Body': {'Text': {'Data': message, 'Charset': 'UTF-8'}}
                    }
                )
                
                if settings.DEBUG:
                    print(f"✅ AWS SES로 이메일 발송 완료: {email}")
                    print(f"   MessageId: {response.get('MessageId')}")
                else:
                    # 프로덕션에서는 로그만 남기기 (민감 정보 출력 안 함)
                    print(f"✅ 이메일 발송 완료: {email}")
                    
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                print(f"❌ AWS SES 이메일 발송 실패: {error_code} - {error_message}")
                
                # 개발 환경에서는 콘솔에 출력 (디버깅 편의)
                if settings.DEBUG:
                    print("=" * 60)
                    print("📧 이메일 인증번호 (SES 실패, 콘솔 출력)")
                    print(f"   이메일: {email}")
                    print(f"   인증번호: {verification_code}")
                    print("=" * 60)
                    # 개발 환경에서는 에러를 발생시키지 않고 계속 진행
                    # (콘솔 출력으로 대체)
                else:
                    # 프로덕션에서는 에러 발생
                    return Response(
                        {'error': '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
        else:
            # 일반 SMTP 사용 (Gmail 등)
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        
        return Response({
            'success': True,
            'message': '인증번호가 전송되었습니다.',
            'expires_in': 120,
            # 개발 환경에서만 인증번호 반환 (프로덕션에서는 제거)
            **({'verification_code': verification_code} if settings.DEBUG else {})
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"❌ 이메일 발송 오류: {e}")
        return Response(
            {'error': '이메일 발송 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """
    이메일 인증 API
    POST /api/auth/verify-email/
    
    Request Body:
    {
        "email": "user@example.com",
        "verification_code": "123456"
    }
    
    Response (200 OK):
    {
        "email_verified": true,
        "email_verified_at": "2025-01-15T10:05:00Z"
    }
    """
    serializer = EmailVerificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    verification_code = serializer.validated_data['verification_code']
    
    # Redis에서 인증번호 확인
    cache_key = f'verification_code:email:{email}'
    stored_code = cache.get(cache_key)
    
    if not stored_code:
        return Response(
            {'error': '인증번호가 만료되었거나 존재하지 않습니다. 다시 발송해주세요.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if stored_code != verification_code:
        return Response(
            {'error': '인증번호가 일치하지 않습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 인증번호 일치 - 해당 이메일로 사용자 찾기
    try:
        user = AuthUser.objects.get(email=email)
        user.email_verified = True
        user.email_verified_at = timezone.now()
        user.save(update_fields=['email_verified', 'email_verified_at'])
        
        # 인증번호 삭제 (한 번만 사용 가능)
        cache.delete(cache_key)
        
        return Response({
            'email_verified': True,
            'email_verified_at': user.email_verified_at.isoformat()
        }, status=status.HTTP_200_OK)
    except AuthUser.DoesNotExist:
        # 회원가입 전 인증인 경우 (회원가입 화면에서 사용)
        # 인증번호만 확인하고 사용자 업데이트는 하지 않음
        cache.delete(cache_key)
        
        return Response({
            'email_verified': True,
            'email_verified_at': timezone.now().isoformat(),
            'message': '인증이 완료되었습니다.'
        }, status=status.HTTP_200_OK)


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
            print("✅ 위치 업데이트 성공!")
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
