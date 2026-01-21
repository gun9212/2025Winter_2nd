from rest_framework import serializers
from .models import UserLocation, User, IdealTypeProfile, AuthUser


class RegisterSerializer(serializers.ModelSerializer):
    """회원가입 Serializer"""
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    
    class Meta:
        model = AuthUser
        fields = ['username', 'password', 'email']
        extra_kwargs = {
            'username': {'required': True, 'max_length': 100},
            'email': {'required': True},
        }
    
    def validate_username(self, value):
        """username 중복 검증"""
        if AuthUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.")
        return value
    
    def validate_email(self, value):
        """email 중복 검증"""
        if AuthUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value
    
    def create(self, validated_data):
        """사용자 생성 (비밀번호 암호화)"""
        password = validated_data.pop('password')
        user = AuthUser.objects.create_user(
            username=validated_data['username'],
            password=password,
            email=validated_data['email']
        )
        return user


class UserLocationSerializer(serializers.ModelSerializer):
    """사용자 위치 정보 Serializer"""
    class Meta:
        model = UserLocation
        fields = ['latitude', 'longitude']
    
    def validate_latitude(self, value):
        """위도 범위 검증"""
        if not (-90 <= float(value) <= 90):
            raise serializers.ValidationError("위도는 -90~90 사이여야 합니다.")
        return value
    
    def validate_longitude(self, value):
        """경도 범위 검증"""
        if not (-180 <= float(value) <= 180):
            raise serializers.ValidationError("경도는 -180~180 사이여야 합니다.")
        return value


class UserSerializer(serializers.ModelSerializer):
    """사용자 프로필 Serializer"""
    class Meta:
        model = User
        fields = ['age', 'gender', 'height', 'mbti', 'personality', 'interests', 'matching_consent']
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_personality(self, value):
        """성격 유형 검증"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("성격 유형을 최소 1개 이상 선택해주세요.")
        return value
    
    def validate_interests(self, value):
        """관심사 검증"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("관심사를 최소 1개 이상 선택해주세요.")
        return value


class IdealTypeProfileSerializer(serializers.ModelSerializer):
    """이상형 프로필 Serializer"""
    class Meta:
        model = IdealTypeProfile
        fields = ['height_min', 'height_max', 'age_min', 'age_max', 
                 'preferred_gender', 'preferred_mbti', 'preferred_personality', 'preferred_interests', 
                 'priority_1', 'priority_2', 'priority_3', 'match_threshold']
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """전체 데이터 검증"""
        # 키 범위 검증
        if data.get('height_min') and data.get('height_max'):
            if data['height_min'] > data['height_max']:
                raise serializers.ValidationError({
                    'height': '최소 키는 최대 키보다 작거나 같아야 합니다.'
                })
        
        # 나이 범위 검증
        if data.get('age_min') and data.get('age_max'):
            if data['age_min'] > data['age_max']:
                raise serializers.ValidationError({
                    'age': '최소 나이는 최대 나이보다 작거나 같아야 합니다.'
                })
        
        # 선호 MBTI 검증 (선택사항이지만 있으면 최소 1개 이상)
        if 'preferred_mbti' in data and data.get('preferred_mbti') is not None:
            if len(data['preferred_mbti']) == 0:
                raise serializers.ValidationError({
                    'preferred_mbti': '선호 MBTI를 최소 1개 이상 선택해주세요.'
                })
        
        # 선호 성격 검증
        if data.get('preferred_personality') and len(data['preferred_personality']) == 0:
            raise serializers.ValidationError({
                'preferred_personality': '선호 성격 유형을 최소 1개 이상 선택해주세요.'
            })
        
        # 선호 관심사 검증
        if data.get('preferred_interests') and len(data['preferred_interests']) == 0:
            raise serializers.ValidationError({
                'preferred_interests': '선호 관심사를 최소 1개 이상 선택해주세요.'
            })
        
        # 선호 성별 검증
        if 'preferred_gender' in data:
            if data['preferred_gender'] not in ['M', 'F', 'A']:
                raise serializers.ValidationError({
                    'preferred_gender': '선호 성별은 M(남성), F(여성), A(모두) 중 하나여야 합니다.'
                })
        
        return data


# ==================== 인증 관련 Serializer ====================

class EmailVerificationSerializer(serializers.Serializer):
    """
    이메일 인증 Serializer
    API 2: POST /api/auth/verify-email/
    """
    email = serializers.EmailField(required=True, help_text='이메일')
    verification_code = serializers.CharField(required=True, max_length=6, help_text='인증번호')


class LoginSerializer(serializers.Serializer):
    """
    로그인 Serializer
    API 3: POST /api/auth/login/
    username 또는 email로 로그인 가능
    """
    username = serializers.CharField(required=True, max_length=254, help_text='아이디 또는 이메일')
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'}, help_text='비밀번호')


class TokenRefreshSerializer(serializers.Serializer):
    """
    토큰 갱신 Serializer
    API 4: POST /api/auth/refresh/
    """
    refresh = serializers.CharField(required=True, help_text='Refresh Token')


# ==================== 프로필 완성도 관련 Serializer ====================

class ProfileCompletenessSerializer(serializers.Serializer):
    """
    프로필 완성도 확인 Serializer
    API 7: GET /api/users/profile/completeness/
    """
    profile_complete = serializers.BooleanField(help_text='프로필 완성 여부')
    ideal_type_complete = serializers.BooleanField(help_text='이상형 프로필 완성 여부')
    all_complete = serializers.BooleanField(help_text='모든 프로필 완성 여부')


# ==================== 동의 관리 관련 Serializer ====================

class MatchingConsentSerializer(serializers.Serializer):
    """
    매칭 동의 업데이트 Serializer
    API 14: POST /api/users/consent/
    """
    matching_consent = serializers.BooleanField(required=True, help_text='매칭 동의 여부')


class ServiceActiveSerializer(serializers.Serializer):
    """
    서비스 활성화/비활성화 Serializer
    API 16: POST /api/users/service-status/
    """
    service_active = serializers.BooleanField(required=True, help_text='서비스 활성화 여부')


# ==================== 비밀번호 재설정 관련 Serializer ====================

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    비밀번호 재설정 요청 Serializer
    API 16: POST /api/users/auth/password-reset/request/
    """
    username = serializers.CharField(required=True, max_length=100, help_text='아이디')
    email = serializers.EmailField(required=True, help_text='이메일')


class PasswordResetVerifySerializer(serializers.Serializer):
    """
    비밀번호 재설정 인증 확인 Serializer
    API 17: POST /api/users/auth/password-reset/verify/
    """
    username = serializers.CharField(required=True, max_length=100, help_text='아이디')
    email = serializers.EmailField(required=True, help_text='이메일')
    verification_code = serializers.CharField(required=True, max_length=6, help_text='인증번호')


class PasswordResetSerializer(serializers.Serializer):
    """
    비밀번호 재설정 Serializer
    API 18: POST /api/users/auth/password-reset/
    """
    reset_token = serializers.CharField(required=True, help_text='비밀번호 재설정 토큰')
    new_password = serializers.CharField(required=True, min_length=8, write_only=True, style={'input_type': 'password'}, help_text='새 비밀번호')
    
    def validate_new_password(self, value):
        """새 비밀번호 검증"""
        if len(value) < 8:
            raise serializers.ValidationError("비밀번호는 최소 8자 이상이어야 합니다.")
        return value
