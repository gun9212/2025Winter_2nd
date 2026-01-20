from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import authenticate
import random
import string
from django.core.mail import send_mail
from decouple import config
import boto3
from botocore.exceptions import ClientError
from .models import UserLocation, User, AuthUser
from .serializers import (
    UserLocationSerializer, UserSerializer, RegisterSerializer, LoginSerializer, 
    EmailVerificationSerializer, IdealTypeProfileSerializer, MatchingConsentSerializer,
    PasswordResetRequestSerializer, PasswordResetVerifySerializer, PasswordResetSerializer
)


def check_profile_and_ideal_type_complete(user_profile):
    """
    프로필과 이상형 프로필이 모두 완성되었는지 확인하는 헬퍼 함수
    
    Returns:
        tuple: (profile_complete, ideal_type_complete, all_complete)
    """
    from .models import IdealTypeProfile
    
    # 프로필 완성도 체크
    profile_fields = ['age', 'gender', 'height', 'mbti', 'personality', 'interests']
    profile_complete = all(getattr(user_profile, field, None) for field in profile_fields)
    profile_complete = profile_complete and len(user_profile.personality) > 0 and len(user_profile.interests) > 0
    
    # 이상형 프로필 완성도 체크
    ideal_type_complete = False
    try:
        ideal_type = user_profile.ideal_type_profile
        if ideal_type:
            # 필수 필드 확인 (MBTI는 선택사항)
            ideal_fields = ['height_min', 'height_max', 'age_min', 'age_max', 
                          'preferred_personality', 'preferred_interests']
            ideal_type_complete = all(getattr(ideal_type, field, None) for field in ideal_fields)
            # 성격과 관심사는 최소 1개 이상 필수
            ideal_type_complete = ideal_type_complete and \
                len(ideal_type.preferred_personality) > 0 and \
                len(ideal_type.preferred_interests) > 0
    except Exception:
        ideal_type_complete = False
    
    all_complete = profile_complete and ideal_type_complete
    
    return profile_complete, ideal_type_complete, all_complete


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
        
        # 회원가입 시 이메일 인증 상태 확인
        # verify_email API에서 인증번호를 확인했지만 사용자가 없어서 업데이트하지 못한 경우
        # Redis에 인증번호가 사용되었는지 확인 (인증번호가 삭제되었다면 인증 완료된 것으로 간주)
        email = user.email
        cache_key = f'verification_code:email:{email}'
        stored_code = cache.get(cache_key)
        
        # 인증번호가 없으면 이미 인증 완료된 것으로 간주
        # (verify_email API에서 인증번호를 삭제했기 때문)
        if stored_code is None:
            # 인증 완료 플래그 확인 (별도 캐시 키 사용)
            verification_completed_key = f'email_verified:email:{email}'
            if cache.get(verification_completed_key):
                user.email_verified = True
                user.email_verified_at = timezone.now()
                user.save(update_fields=['email_verified', 'email_verified_at'])
                # 플래그 삭제
                cache.delete(verification_completed_key)
                
                # 이메일 인증 완료 시 프로필과 이상형 프로필이 모두 완성되었는지 확인하여 service_active 설정
                # (프로필과 이상형 프로필이 모두 완성되어야 service_active = True)
                try:
                    user_profile = user.profile
                    _, _, all_complete = check_profile_and_ideal_type_complete(user_profile)
                    
                    if all_complete:
                        # 프로필과 이상형 프로필이 모두 완성된 경우에만 service_active = True
                        if not user_profile.service_active:
                            user_profile.service_active = True
                            user_profile.save(update_fields=['service_active'])
                            print(f'✅ 회원가입 시 이메일 인증 완료 + 프로필 완성: {user.username}의 service_active를 True로 설정')
                    else:
                        # 프로필 또는 이상형 프로필이 미완성인 경우 service_active = False
                        if user_profile.service_active:
                            user_profile.service_active = False
                            user_profile.save(update_fields=['service_active'])
                            print(f'⚠️ 프로필 미완성: {user.username}의 service_active를 False로 설정')
                except User.DoesNotExist:
                    # 프로필이 아직 없는 경우 - 나중에 프로필 생성 시 체크됨
                    pass
        
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
        "username": "user123" 또는 "user@example.com",
        "password": "password123"
    }
    
    Response (200 OK):
    {
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "user": {
            "id": 1,
            "username": "user123",
            "email": "user@example.com"
        }
    }
    """
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username_or_email = serializer.validated_data['username']
    password = serializer.validated_data['password']
    
    # username 또는 email로 사용자 찾기
    user = None
    
    # 이메일 형식인지 확인
    if '@' in username_or_email:
        # 이메일로 사용자 찾기
        try:
            user = AuthUser.objects.get(email=username_or_email)
            # 이메일로 찾은 경우, username으로 인증 시도
            user = authenticate(request, username=user.username, password=password)
        except AuthUser.DoesNotExist:
            user = None
    else:
        # username으로 인증 시도
        user = authenticate(request, username=username_or_email, password=password)
    
    if user is None:
        return Response(
            {'error': '아이디 또는 비밀번호가 올바르지 않습니다.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # 이메일 인증 여부 확인
    if not user.email_verified:
        return Response(
            {
                'error': '이메일 인증이 완료되지 않았습니다.',
                'email_verified': False,
                'email': user.email,  # 이메일 주소 포함하여 프론트엔드에서 인증 화면으로 유도
                'message': '이메일 인증을 완료한 후 서비스를 이용할 수 있습니다.',
                'requires_email_verification': True  # 프론트엔드에서 이메일 인증 화면 표시 플래그
            },
            status=status.HTTP_403_FORBIDDEN
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
        'email_verified': user.email_verified,
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
    
    # 이미 등록된 이메일인지 확인
    # 단, 이메일 인증이 완료되지 않은 사용자는 인증번호 발송 허용 (로그인 시 이메일 인증 완료를 위한 재인증)
    existing_user = AuthUser.objects.filter(email=email).first()
    if existing_user and existing_user.email_verified:
        # 이미 등록되고 이메일 인증이 완료된 이메일인 경우
        return Response(
            {'error': '이미 등록된 이메일입니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    # 이메일 인증이 미완료인 경우 또는 회원가입 전인 경우 인증번호 발송 허용
    
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
                
                # AWS SES로 이메일 발송 성공
                if settings.DEBUG:
                    print(f"✅ AWS SES로 이메일 발송 완료: {email}")
                    print(f"   MessageId: {response.get('MessageId')}")
                    # DEBUG 모드에서도 인증번호는 콘솔에 출력하지 않음 (보안)
                    # 실제 이메일로 발송되었으므로 콘솔 출력 불필요
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
        
        # 이메일 인증 완료 시 프로필과 이상형 프로필이 모두 완성되었는지 확인하여 service_active 설정
        # (프로필과 이상형 프로필이 모두 완성되어야 service_active = True)
        try:
            user_profile = user.profile
            _, _, all_complete = check_profile_and_ideal_type_complete(user_profile)
            
            if all_complete:
                # 프로필과 이상형 프로필이 모두 완성된 경우에만 service_active = True
                if not user_profile.service_active:
                    user_profile.service_active = True
                    user_profile.save(update_fields=['service_active'])
                    print(f'✅ 이메일 인증 완료 + 프로필 완성: {user.username}의 service_active를 True로 설정')
            else:
                # 프로필 또는 이상형 프로필이 미완성인 경우 service_active = False
                if user_profile.service_active:
                    user_profile.service_active = False
                    user_profile.save(update_fields=['service_active'])
                    print(f'⚠️ 프로필 미완성: {user.username}의 service_active를 False로 설정')
        except User.DoesNotExist:
            # 프로필이 아직 없는 경우 (회원가입 전 인증) - 나중에 프로필 생성 시 체크됨
            pass
        
        # 인증번호 삭제 (한 번만 사용 가능)
        cache.delete(cache_key)
        
        return Response({
            'email_verified': True,
            'email_verified_at': user.email_verified_at.isoformat()
        }, status=status.HTTP_200_OK)
    except AuthUser.DoesNotExist:
        # 회원가입 전 인증인 경우 (회원가입 화면에서 사용)
        # 인증번호만 확인하고 사용자 업데이트는 하지 않음
        # 대신 인증 완료 플래그를 Redis에 저장 (회원가입 시 확인용)
        cache.delete(cache_key)
        
        # 인증 완료 플래그 저장 (회원가입 시 확인용, 5분 유효)
        verification_completed_key = f'email_verified:email:{email}'
        cache.set(verification_completed_key, True, timeout=300)  # 5분 유효
        
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
    
    if not serializer.is_valid():
        print(f"❌ Serializer 검증 실패: {serializer.errors}")
        print("=" * 60)
        return Response({
            'success': False,
            'error': '입력 데이터가 유효하지 않습니다.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
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
                    print(f"✅ 사용자 프로필 찾음: {user_profile.user.username}")
                except AuthUser.DoesNotExist:
                    print(f"❌ AuthUser {user_id}가 존재하지 않습니다.")
                    return Response({
                        'success': False,
                        'error': f'user_id {user_id}에 해당하는 사용자가 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
                except User.DoesNotExist:
                    print(f"❌ User 프로필이 없습니다 (user_id: {user_id})")
                    return Response({
                        'success': False,
                        'error': f'user_id {user_id}에 해당하는 프로필이 없습니다. 먼저 프로필을 생성해주세요.'
                    }, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    print(f"❌ 프로필 조회 중 예외 발생: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    return Response({
                        'success': False,
                        'error': f'프로필 조회 중 오류가 발생했습니다: {str(e)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # 정상 모드: 인증된 사용자 사용
                try:
                    user_profile = request.user.profile
                except User.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': '프로필이 없습니다. 먼저 프로필을 생성해주세요.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # 이메일 인증 여부 확인 (매칭 활성화를 위한 필수 조건)
            auth_user = user_profile.user
            if not auth_user.email_verified:
                print("⚠️ 이메일 인증이 완료되지 않았습니다. 위치 업데이트가 거부됩니다.")
                print(f"   User: {user_profile.user.username}")
                print("=" * 60)
                return Response({
                    'success': False,
                    'error': '이메일 인증이 완료되지 않았습니다. 위치 업데이트를 하려면 먼저 이메일 인증을 완료해주세요.',
                    'email_verified': False,
                    'email_verification_required': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 매칭 동의가 OFF인 경우 위치 업데이트 거부
            if not user_profile.matching_consent:
                print("⚠️ 매칭 동의가 OFF 상태입니다. 위치 업데이트가 거부됩니다.")
                print(f"   User: {user_profile.user.username}")
                print("=" * 60)
                return Response({
                    'success': False,
                    'error': '매칭 동의가 OFF 상태입니다. 위치 업데이트를 하려면 매칭 동의를 ON으로 설정해주세요.',
                    'matching_consent_required': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # useruser는 위치 업데이트 제외
            if user_profile.user.username == 'useruser':
                print("⚠️ useruser는 위치 업데이트가 제한됩니다.")
                print("=" * 60)
                # 기존 위치 정보 반환 (업데이트하지 않음)
                try:
                    existing_location = user_profile.location
                    return Response({
                        'success': True,
                        'message': 'useruser의 위치는 고정되어 있습니다. (업데이트되지 않음)',
                        'data': UserLocationSerializer(existing_location).data,
                        'updated_at': existing_location.updated_at.isoformat(),
                    }, status=status.HTTP_200_OK)
                except UserLocation.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': 'useruser의 위치 정보가 없습니다.'
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
            import traceback
            print(f"❌ 위치 업데이트 중 예외 발생: {str(e)}")
            print(traceback.format_exc())
            print("=" * 60)
            return Response({
                'success': False,
                'error': f'위치 업데이트 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Serializer 검증 실패 시
    print(f"❌ Serializer 검증 실패: {serializer.errors}")
    print("=" * 60)
    return Response({
        'success': False,
        'error': '입력 데이터가 유효하지 않습니다.',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])  # 개발 환경에서는 인증 우회
def get_location(request):
    """
    현재 위치 조회 API
    GET /api/users/location/
    
    서버에 저장된 사용자의 최신 위치 정보를 반환합니다.
    개발 환경(DEBUG=True)에서는 인증 없이 테스트 가능
    user_id를 query parameter로 전송하면 해당 사용자의 위치 조회
    """
    # 요청 로그 (디버깅용)
    print("=" * 60)
    print("📍 위치 조회 API 요청 수신")
    print(f"   Method: {request.method}")
    print(f"   User: {request.user if hasattr(request, 'user') else 'Anonymous'}")
    print(f"   Query Params: {request.query_params}")
    print("=" * 60)
    
    try:
        # 개발 환경에서 인증 없이 테스트하는 경우
        if settings.DEBUG and not request.user.is_authenticated:
            user_id = request.query_params.get('user_id')
            print(f"🔧 디버그 모드: 인증 없음, user_id: {user_id}")
            if not user_id:
                error_msg = '테스트 모드: user_id가 필요합니다. (예: /api/users/location/?user_id=1)'
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
        
        # 위치 정보 조회
        try:
            location = user_profile.location
            serializer = UserLocationSerializer(location)
            
            result = {
                'success': True,
                'data': serializer.data,
                'updated_at': location.updated_at.isoformat(),
            }
            
            # 성공 로그
            print("✅ 위치 조회 성공!")
            print(f"   User: {user_profile.user.username}")
            print(f"   Latitude: {location.latitude}")
            print(f"   Longitude: {location.longitude}")
            print(f"   Updated At: {location.updated_at}")
            print("=" * 60)
            
            return Response(result, status=status.HTTP_200_OK)
        except UserLocation.DoesNotExist:
            return Response({
                'success': False,
                'error': '위치 정보가 없습니다. 먼저 위치를 업데이트해주세요.'
            }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'위치 조회 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            # email_verified 정보 추가 (딕셔너리로 변환하여 수정 가능하게 만듦)
            response_data = dict(serializer.data)  # OrderedDict를 일반 dict로 변환
            response_data['email_verified'] = user_profile.user.email_verified
            print(f'📧 프로필 조회 - email_verified: {response_data.get("email_verified")}, user: {user_profile.user.username}')
            return Response({
                'success': True,
                'data': response_data
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
                    user_profile = serializer.save(user=auth_user)
                else:
                    auth_user = request.user
                    user_profile = serializer.save(user=auth_user)
                
                # 이메일 인증 여부 및 프로필 완성도에 따라 service_active 및 matching_consent 설정
                if not user_profile.user.email_verified:
                    # 이메일 인증 미완료: service_active = False, matching_consent = False
                    user_profile.matching_consent = False
                    user_profile.service_active = False
                    user_profile.save(update_fields=['matching_consent', 'service_active'])
                    print(f'⚠️ 이메일 인증 미완료 사용자: service_active = False, matching_consent = False 설정 ({auth_user.username})')
                else:
                    # 이메일 인증 완료: 프로필과 이상형 프로필 완성도 확인
                    _, _, all_complete = check_profile_and_ideal_type_complete(user_profile)
                    
                    if all_complete:
                        # 프로필과 이상형 프로필이 모두 완성된 경우에만 service_active = True
                        if not user_profile.service_active:
                            user_profile.service_active = True
                            user_profile.save(update_fields=['service_active'])
                            print(f'✅ 프로필 완성: {auth_user.username}의 service_active를 True로 설정')
                    else:
                        # 프로필 또는 이상형 프로필이 미완성인 경우 service_active = False, matching_consent = False
                        if user_profile.service_active:
                            user_profile.service_active = False
                        if user_profile.matching_consent:
                            user_profile.matching_consent = False
                        user_profile.save(update_fields=['service_active', 'matching_consent'])
                        print(f'⚠️ 프로필 미완성: {auth_user.username}의 service_active와 matching_consent를 False로 설정')
                
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


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def ideal_type_view(request):
    """
    이상형 프로필 조회/생성/수정 API
    GET /api/users/ideal-type/ - 이상형 프로필 조회
    POST /api/users/ideal-type/ - 이상형 프로필 생성
    PUT /api/users/ideal-type/ - 이상형 프로필 수정
    
    개발 환경(DEBUG=True)에서는 인증 없이 테스트 가능
    user_id를 query parameter 또는 request body에 포함하여 전송
    """
    from .models import IdealTypeProfile
    
    # GET 요청: 이상형 프로필 조회
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
                    ideal_type = user_profile.ideal_type_profile
                except (AuthUser.DoesNotExist, User.DoesNotExist):
                    return Response({
                        'success': False,
                        'message': '프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
                except IdealTypeProfile.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': '이상형 프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # 정상 모드: 인증된 사용자 사용
                try:
                    user_profile = request.user.profile
                    ideal_type = user_profile.ideal_type_profile
                except User.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': '프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
                except IdealTypeProfile.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': '이상형 프로필이 없습니다.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = IdealTypeProfileSerializer(ideal_type)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'이상형 프로필 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # POST/PUT 요청: 이상형 프로필 생성/수정
    else:  # POST or PUT
        try:
            # 개발 환경에서 인증 없이 테스트하는 경우
            if settings.DEBUG and not request.user.is_authenticated:
                user_id = request.data.get('user_id')
                if not user_id:
                    return Response({
                        'success': False,
                        'error': '테스트 모드: user_id가 필요합니다. (예: {"user_id": 1, "height_min": 160, ...})'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    auth_user = AuthUser.objects.get(id=user_id)
                    user_profile = auth_user.profile
                except User.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': '사용자 프로필이 없습니다. 먼저 프로필을 생성해주세요.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    ideal_type = user_profile.ideal_type_profile
                    serializer = IdealTypeProfileSerializer(ideal_type, data=request.data, partial=request.method == 'PUT')
                except IdealTypeProfile.DoesNotExist:
                    # 이상형 프로필이 없으면 생성
                    serializer = IdealTypeProfileSerializer(data=request.data)
            else:
                # 정상 모드: 인증된 사용자 사용
                try:
                    user_profile = request.user.profile
                except User.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': '사용자 프로필이 없습니다. 먼저 프로필을 생성해주세요.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    ideal_type = user_profile.ideal_type_profile
                    serializer = IdealTypeProfileSerializer(ideal_type, data=request.data, partial=request.method == 'PUT')
                except IdealTypeProfile.DoesNotExist:
                    # 이상형 프로필이 없으면 생성
                    serializer = IdealTypeProfileSerializer(data=request.data)
            
            if serializer.is_valid():
                # 개발 모드에서 user_id가 있는 경우
                if settings.DEBUG and not request.user.is_authenticated and request.data.get('user_id'):
                    user_id = request.data.get('user_id')
                    auth_user = AuthUser.objects.get(id=user_id)
                    user_profile = auth_user.profile
                    serializer.save(user=user_profile)
                else:
                    user_profile = request.user.profile
                    serializer.save(user=user_profile)
                
                # 이상형 프로필 저장 후 프로필 완성도 확인하여 service_active 및 matching_consent 설정
                if user_profile.user.email_verified:
                    _, _, all_complete = check_profile_and_ideal_type_complete(user_profile)
                    
                    if all_complete:
                        # 프로필과 이상형 프로필이 모두 완성된 경우에만 service_active = True
                        if not user_profile.service_active:
                            user_profile.service_active = True
                            user_profile.save(update_fields=['service_active'])
                            print(f'✅ 이상형 프로필 완성: {user_profile.user.username}의 service_active를 True로 설정')
                    else:
                        # 프로필 또는 이상형 프로필이 미완성인 경우 service_active = False, matching_consent = False
                        if user_profile.service_active:
                            user_profile.service_active = False
                        if user_profile.matching_consent:
                            user_profile.matching_consent = False
                        user_profile.save(update_fields=['service_active', 'matching_consent'])
                        print(f'⚠️ 프로필 미완성: {user_profile.user.username}의 service_active와 matching_consent를 False로 설정')
                
                return Response({
                    'success': True,
                    'message': '이상형 프로필이 저장되었습니다.',
                    'data': serializer.data
                }, status=status.HTTP_200_OK if request.method == 'PUT' else status.HTTP_201_CREATED)
            
            # 에러 메시지를 읽기 쉬운 형식으로 변환
            error_messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    for error in errors:
                        if isinstance(error, dict):
                            error_messages.append(f"{field}: {', '.join(str(v) for v in error.values())}")
                        else:
                            error_messages.append(f"{field}: {str(error)}")
                else:
                    error_messages.append(f"{field}: {str(errors)}")
            
            error_message = '; '.join(error_messages) if error_messages else '입력 데이터가 올바르지 않습니다.'
            
            return Response({
                'success': False,
                'error': error_message,
                'errors': serializer.errors  # 상세 에러 정보도 포함
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': f'이상형 프로필 저장 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        
        # 프로필 완성도 체크 (헬퍼 함수 사용)
        profile_complete, ideal_type_complete, all_complete = check_profile_and_ideal_type_complete(profile)
        
        return Response({
            'success': True,
            'profile_complete': profile_complete,
            'ideal_type_complete': ideal_type_complete,
            'all_complete': all_complete
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'프로필 완성도 확인 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated if not settings.DEBUG else AllowAny])
def update_consent(request):
    """
    매칭 동의 업데이트 API
    POST /api/users/consent/
    
    Request Body:
    {
        "matching_consent": true  // 또는 false
    }
    
    개발 환경(DEBUG=True)에서는 인증 없이 테스트 가능
    user_id를 request body에 포함하여 전송하면 해당 사용자의 동의 상태 업데이트
    
    Response (200 OK):
    {
        "success": true,
        "message": "매칭 동의가 업데이트되었습니다.",
        "data": {
            "matching_consent": true,
            "consent_updated_at": "2025-01-19T12:00:00Z"
        }
    }
    """
    serializer = MatchingConsentSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    matching_consent = serializer.validated_data['matching_consent']
    
    try:
        # 개발 환경에서 인증 없이 테스트하는 경우
        if settings.DEBUG and not request.user.is_authenticated:
            user_id = request.data.get('user_id')
            if not user_id:
                return Response({
                    'success': False,
                    'error': '테스트 모드: user_id가 필요합니다. (예: {"user_id": 1, "matching_consent": true})'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                auth_user = AuthUser.objects.get(id=user_id)
                user_profile = auth_user.profile
            except (AuthUser.DoesNotExist, User.DoesNotExist):
                return Response({
                    'success': False,
                    'error': f'user_id {user_id}에 해당하는 프로필이 없습니다. 먼저 프로필을 생성해주세요.'
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
        
        # 이메일 인증 여부 확인
        auth_user = user_profile.user
        if not auth_user.email_verified:
            # 이메일 인증이 완료되지 않은 경우 매칭 동의 및 서비스 활성화 변경 완전 차단 (고정)
            # matching_consent와 service_active는 모두 False로 고정되어 있으며, 변경할 수 없음
            return Response(
                {
                    'success': False,
                    'error': '이메일 인증이 완료되지 않았습니다.',
                    'email_verified': False,
                    'message': '이메일 인증이 완료되지 않아 매칭 동의와 서비스 활성화를 변경할 수 없습니다. 먼저 이메일 인증을 완료해주세요.',
                    'data': {
                        'matching_consent': False,  # 항상 False로 고정
                        'service_active': False,  # 항상 False로 고정
                        'consent_updated_at': user_profile.consent_updated_at.isoformat() if user_profile.consent_updated_at else None
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 프로필과 이상형 프로필 완성도 확인
        _, _, all_complete = check_profile_and_ideal_type_complete(user_profile)
        
        if not all_complete:
            # 프로필 또는 이상형 프로필이 미완성인 경우 매칭 동의 변경 차단 (고정)
            # matching_consent는 False로 고정되어 있으며, 변경할 수 없음
            if matching_consent:
                # True로 설정하려고 하면 403 Forbidden 반환
                return Response(
                    {
                        'success': False,
                        'error': '프로필이 완성되지 않았습니다.',
                        'message': '매칭 동의를 활성화하려면 프로필과 이상형 프로필을 모두 완성해주세요.',
                        'data': {
                            'matching_consent': False,  # 항상 False로 고정
                            'service_active': user_profile.service_active,
                            'consent_updated_at': user_profile.consent_updated_at.isoformat() if user_profile.consent_updated_at else None
                        }
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            else:
                # False로 설정하려는 경우는 허용 (이미 False이므로 변경 없음)
                return Response(
                    {
                        'success': True,
                        'message': '매칭 동의가 OFF 상태입니다. (프로필 미완성)',
                        'data': {
                            'matching_consent': False,
                            'service_active': user_profile.service_active,
                            'consent_updated_at': user_profile.consent_updated_at.isoformat() if user_profile.consent_updated_at else None
                        }
                    },
                    status=status.HTTP_200_OK
                )
        
        # 매칭 동의를 활성화하려는 경우 service_active도 True로 설정
        if matching_consent:
            user_profile.service_active = True
            update_fields = ['matching_consent', 'service_active', 'consent_updated_at']
        else:
            update_fields = ['matching_consent', 'consent_updated_at']
        
        # 매칭 동의 상태 업데이트
        user_profile.matching_consent = matching_consent
        user_profile.consent_updated_at = timezone.now()
        user_profile.save(update_fields=update_fields)

        # ------------------------------------------------------------------
        # 매칭 동의 OFF: 관련 매칭 모두 삭제
        # ------------------------------------------------------------------
        if not matching_consent:
            from django.db.models import Q
            from apps.matching.models import Match

            deleted_qs = Match.objects.filter(
                Q(user1=user_profile) | Q(user2=user_profile)
            )
            deleted_count = deleted_qs.count()
            deleted_qs.delete()
            print(f'🗑️ 매칭 동의 OFF: {deleted_count}개의 매칭 삭제됨 ({user_profile.user.username})')

        # ------------------------------------------------------------------
        # 매칭 동의 ON: 즉시 재매칭 시도 (현재 위치 기준 10m 반경)
        # ------------------------------------------------------------------
        else:
            try:
                # 위치 확인
                user_location = user_profile.location
                from apps.matching.utils import find_matchable_users
                from apps.matching.models import Match
                from django.db.models import Q
                from django.db import transaction
                from decimal import Decimal

                latitude = float(user_location.latitude)
                longitude = float(user_location.longitude)

                # 반경 0.01km = 10m
                matchable_users = find_matchable_users(
                    user_profile,
                    latitude,
                    longitude,
                    radius_km=0.01
                )

                # 기존 매칭 사용자 ID 수집 (중복 방지)
                existing_matches = Match.objects.filter(
                    Q(user1=user_profile) | Q(user2=user_profile)
                ).select_related('user1', 'user2')
                existing_user_ids = {
                    (m.user2.id if m.user1 == user_profile else m.user1.id)
                    for m in existing_matches
                }

                new_matches_count = 0

                for matchable in matchable_users:
                    candidate_user = matchable['user']

                    # 이미 매칭된 사용자면 스킵
                    if candidate_user.id in existing_user_ids:
                        continue

                    # 위치 정보 없는 후보는 스킵
                    if not hasattr(candidate_user, 'location') or not candidate_user.location:
                        continue

                    try:
                        with transaction.atomic():
                            user1_lat = Decimal(str(latitude)).quantize(Decimal('0.000001'))
                            user1_lon = Decimal(str(longitude)).quantize(Decimal('0.000001'))
                            user2_lat = Decimal(str(candidate_user.location.latitude)).quantize(Decimal('0.000001'))
                            user2_lon = Decimal(str(candidate_user.location.longitude)).quantize(Decimal('0.000001'))

                            Match.objects.create(
                                user1=user_profile,
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
                            new_matches_count += 1
                    except Exception as e:
                        print(f'⚠️ 매칭 재생성 실패: {str(e)}')
                        continue

                print(f'✅ 매칭 동의 ON: {new_matches_count}개의 매칭 재생성 ({user_profile.user.username})')
            except UserLocation.DoesNotExist:
                print(f'⚠️ 매칭 동의 ON - 위치 정보 없음, 재매칭 건너뜀 ({user_profile.user.username})')

        # 응답 메시지
        consent_status = '활성화' if matching_consent else '비활성화'

        return Response({
            'success': True,
            'message': f'매칭 동의가 {consent_status}되었습니다.',
            'data': {
                'matching_consent': user_profile.matching_consent,
                'service_active': user_profile.service_active,
                'consent_updated_at': user_profile.consent_updated_at.isoformat()
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'매칭 동의 업데이트 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """
    비밀번호 재설정 요청 API
    API 16: POST /api/users/auth/password-reset/request/
    
    Request Body:
    {
        "username": "user123",
        "email": "user@example.com"
    }
    
    Response (200 OK):
    {
        "success": true,
        "message": "인증번호가 이메일로 발송되었습니다.",
        "expires_in": 120
    }
    """
    try:
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        username = serializer.validated_data['username']
        email = serializer.validated_data['email']
        
        # 사용자 확인 (아이디와 이메일이 일치하는지 확인)
        try:
            user = AuthUser.objects.get(username=username, email=email)
        except AuthUser.DoesNotExist:
            # 보안상 상세 정보 노출하지 않음
            return Response({
                'success': False,
                'error': '아이디와 이메일이 일치하지 않습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 인증번호 생성 (6자리 숫자)
        verification_code = ''.join(random.choices(string.digits, k=6))
        
        # Redis에 인증번호 저장 (2분 유효시간)
        cache_key = f'password_reset_code:email:{email}'
        cache.set(cache_key, verification_code, timeout=120)  # 120초 = 2분
        
        # 이메일 발송
        subject = '[IdealMatch] 비밀번호 재설정 인증번호를 확인해주세요'
        message = f'''
안녕하세요! IdealMatch입니다. 👋

비밀번호 재설정을 위해 아래 인증번호를 입력해주세요.

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
            print("📧 비밀번호 재설정 인증번호 발송 (개발 모드)")
            print(f"   이메일: {email}")
            print(f"   인증번호: {verification_code}")
            print("   유효시간: 2분")
            print("=" * 60)
        elif use_aws_ses:
            # AWS SES 사용 (프로덕션 환경)
            try:
                ses_config = {
                    'region_name': config('AWS_SES_REGION', default='ap-northeast-2'),
                }
                
                aws_access_key = config('AWS_ACCESS_KEY_ID', default='')
                aws_secret_key = config('AWS_SECRET_ACCESS_KEY', default='')
                
                if aws_access_key and aws_secret_key:
                    ses_config['aws_access_key_id'] = aws_access_key
                    ses_config['aws_secret_access_key'] = aws_secret_key
                
                ses_client = boto3.client('ses', **ses_config)
                
                response = ses_client.send_email(
                    Source=settings.DEFAULT_FROM_EMAIL,
                    Destination={'ToAddresses': [email]},
                    Message={
                        'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                        'Body': {'Text': {'Data': message, 'Charset': 'UTF-8'}}
                    }
                )
                
                if settings.DEBUG:
                    print(f"✅ AWS SES로 비밀번호 재설정 인증번호 발송 완료: {email}")
                    print(f"   MessageId: {response.get('MessageId')}")
                else:
                    print(f"✅ 비밀번호 재설정 인증번호 발송 완료: {email}")
                    
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                print(f"❌ AWS SES 이메일 발송 실패: {error_code} - {error_message}")
                
                if settings.DEBUG:
                    # 개발 환경에서는 SES 실패해도 콘솔에 출력하고 계속 진행
                    print("=" * 60)
                    print("📧 비밀번호 재설정 인증번호 (SES 실패, 콘솔 출력)")
                    print(f"   이메일: {email}")
                    print(f"   인증번호: {verification_code}")
                    print("=" * 60)
                    # 개발 환경에서는 오류를 반환하지 않고 계속 진행
                else:
                    # 프로덕션 환경에서는 오류 반환
                    return Response({
                        'success': False,
                        'error': '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # 일반 SMTP 사용
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            if settings.DEBUG:
                print(f"✅ SMTP로 비밀번호 재설정 인증번호 발송 완료: {email}")
        
        return Response({
            'success': True,
            'message': '인증번호가 이메일로 발송되었습니다.',
            'expires_in': 120,
            **({'verification_code': verification_code} if settings.DEBUG else {})
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ 비밀번호 재설정 요청 오류: {str(e)}")
        import traceback
        traceback.print_exc()  # 상세한 오류 스택 트레이스 출력
        return Response({
            'success': False,
            'error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify(request):
    """
    비밀번호 재설정 인증 확인 API
    API 17: POST /api/users/auth/password-reset/verify/
    
    Request Body:
    {
        "username": "user123",
        "email": "user@example.com",
        "verification_code": "123456"
    }
    
    Response (200 OK):
    {
        "success": true,
        "message": "인증이 완료되었습니다.",
        "reset_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."  // 10-30분 유효
    }
    """
    serializer = PasswordResetVerifySerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    email = serializer.validated_data['email']
    verification_code = serializer.validated_data['verification_code']
    
    # 사용자 확인
    try:
        user = AuthUser.objects.get(username=username, email=email)
    except AuthUser.DoesNotExist:
        return Response({
            'success': False,
            'error': '아이디와 이메일이 일치하지 않습니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 인증번호 확인
    cache_key = f'password_reset_code:email:{email}'
    stored_code = cache.get(cache_key)
    
    if not stored_code:
        return Response({
            'success': False,
            'error': '인증번호가 만료되었거나 존재하지 않습니다. 다시 발송해주세요.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if stored_code != verification_code:
        return Response({
            'success': False,
            'error': '인증번호가 일치하지 않습니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 인증번호 삭제 (일회용)
    cache.delete(cache_key)
    
    # 비밀번호 재설정 토큰 생성 (JWT Access Token 사용)
    # 유효시간: 1분 (60초) - 가이드에 따라 짧게 설정
    from rest_framework_simplejwt.tokens import AccessToken
    from datetime import timedelta
    from rest_framework_simplejwt.settings import api_settings
    
    # 원래 설정 저장
    original_lifetime = api_settings.ACCESS_TOKEN_LIFETIME
    
    # 임시로 1분으로 설정
    api_settings.ACCESS_TOKEN_LIFETIME = timedelta(minutes=1)
    
    # 커스텀 만료 시간(1분)을 가진 Access Token 생성
    reset_token = str(AccessToken.for_user(user))
    
    # 원래 설정 복원
    api_settings.ACCESS_TOKEN_LIFETIME = original_lifetime
    
    # Redis에 reset_token 저장 (1분 유효시간)
    reset_token_key = f'password_reset_token:email:{email}'
    cache.set(reset_token_key, reset_token, timeout=60)  # 1분 = 60초
    
    return Response({
        'success': True,
        'message': '인증이 완료되었습니다.',
        'reset_token': reset_token
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset(request):
    """
    비밀번호 재설정 API
    API 18: POST /api/users/auth/password-reset/
    
    Request Body:
    {
        "reset_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "new_password": "newpassword123"
    }
    
    Response (200 OK):
    {
        "success": true,
        "message": "비밀번호가 재설정되었습니다."
    }
    """
    serializer = PasswordResetSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    reset_token = serializer.validated_data['reset_token']
    new_password = serializer.validated_data['new_password']
    
    # reset_token으로 사용자 찾기
    # reset_token은 JWT Access Token이므로 디코딩하여 사용자 ID 추출
    try:
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        
        # JWT 토큰 검증
        UntypedToken(reset_token)
        
        # 토큰에서 사용자 ID 추출
        from rest_framework_simplejwt.tokens import AccessToken
        access_token = AccessToken(reset_token)
        user_id = access_token['user_id']
        
        # 사용자 확인
        try:
            user = AuthUser.objects.get(id=user_id)
        except AuthUser.DoesNotExist:
            return Response({
                'success': False,
                'error': '유효하지 않은 토큰입니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Redis에서 reset_token 확인 (추가 검증)
        reset_token_key = f'password_reset_token:email:{user.email}'
        stored_token = cache.get(reset_token_key)
        
        if not stored_token or stored_token != reset_token:
            return Response({
                'success': False,
                'error': '토큰이 만료되었거나 유효하지 않습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except (InvalidToken, TokenError) as e:
        return Response({
            'success': False,
            'error': '유효하지 않은 토큰입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'success': False,
            'error': '토큰 검증 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # 비밀번호 변경
    user.set_password(new_password)
    user.save()
    
    # reset_token 삭제 (일회용)
    reset_token_key = f'password_reset_token:email:{user.email}'
    cache.delete(reset_token_key)
    
    return Response({
        'success': True,
        'message': '비밀번호가 재설정되었습니다.'
    }, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    """
    커스텀 토큰 갱신 뷰
    사용자가 존재하지 않을 때 적절한 에러 응답 반환
    """
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except (TokenError, InvalidToken) as e:
            # 토큰이 유효하지 않은 경우 (만료되었거나 잘못된 토큰)
            return Response(
                {
                    'detail': 'Token is invalid or expired. Please login again.',
                    'code': 'token_not_valid'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        except AuthUser.DoesNotExist:
            # 사용자가 존재하지 않는 경우 (사용자가 삭제되었거나 토큰이 잘못된 경우)
            return Response(
                {
                    'detail': 'User not found. Please login again.',
                    'code': 'user_not_found'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            # 기타 예외 처리 (DoesNotExist는 serializer 내부에서 발생할 수 있음)
            # serializer의 validate 메서드에서 발생하는 예외를 잡기 위해
            error_message = str(e)
            if 'DoesNotExist' in error_message or 'matching query does not exist' in error_message:
                return Response(
                    {
                        'detail': 'User not found. Please login again.',
                        'code': 'user_not_found'
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )
            # 기타 예외
            return Response(
                {
                    'detail': 'An error occurred while refreshing the token.',
                    'code': 'token_refresh_error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )