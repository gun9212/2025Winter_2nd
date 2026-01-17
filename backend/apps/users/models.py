from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone
from django.core.exceptions import ValidationError


class AuthUserManager(BaseUserManager):
    """인증 사용자 매니저"""
    
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('username은 필수입니다.')
        user = self.model(username=username, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, password=None, **extra_fields):
        # is_staff, is_superuser 필드 없으므로 일반 사용자로 생성
        return self.create_user(username, password, **extra_fields)


class AuthUser(AbstractBaseUser):
    """인증 사용자 모델 (auth_users 테이블)"""
    username = models.CharField(max_length=100, unique=True, verbose_name='로그인 ID')
    password = models.CharField(max_length=128, verbose_name='비밀번호')
    phone_number = models.CharField(max_length=20, unique=True, verbose_name='전화번호')
    phone_verified = models.BooleanField(default=False, verbose_name='전화번호 인증 여부')
    phone_verified_at = models.DateTimeField(null=True, blank=True, verbose_name='전화번호 인증 시간')
    date_joined = models.DateTimeField(default=timezone.now, verbose_name='가입일')
    last_login = models.DateTimeField(null=True, blank=True, verbose_name='마지막 로그인')
    
    objects = AuthUserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = 'auth_users'
        verbose_name = '인증 사용자'
        verbose_name_plural = '인증 사용자들'
    
    def __str__(self):
        return f"{self.username} ({self.phone_number})"


class User(models.Model):
    """사용자 프로필 모델 (users 테이블)"""
    user = models.OneToOneField(
        AuthUser,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='인증 사용자'
    )
    
    # 기본 정보
    age = models.IntegerField(verbose_name='나이')
    gender = models.CharField(max_length=10, choices=[('M', '남성'), ('F', '여성')], verbose_name='성별')
    height = models.IntegerField(verbose_name='키(cm)')
    mbti = models.CharField(max_length=4, verbose_name='MBTI')
    
    # 성격 및 관심사
    personality = models.JSONField(default=list, verbose_name='성격 유형 리스트')
    interests = models.JSONField(default=list, verbose_name='관심사 리스트')
    
    # 서비스 설정
    matching_consent = models.BooleanField(default=False, verbose_name='매칭 동의')
    service_active = models.BooleanField(default=True, verbose_name='서비스 활성화')
    consent_updated_at = models.DateTimeField(null=True, blank=True, verbose_name='동의 업데이트 시간')
    
    # 매칭 통계
    matchable_count = models.IntegerField(default=0, verbose_name='이상형 조건에 부합하는 인원 수')
    last_count_updated_at = models.DateTimeField(null=True, blank=True, verbose_name='마지막 카운트 업데이트 시간')
    
    # 시간 정보
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='프로필 생성 시간')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='프로필 수정 시간')
    
    class Meta:
        db_table = 'users'
        verbose_name = '사용자 프로필'
        verbose_name_plural = '사용자 프로필들'
    
    def clean(self):
        """Validation: personality와 interests는 최소 1개 이상"""
        super().clean()
        if not self.personality or len(self.personality) == 0:
            raise ValidationError({
                'personality': '성격 유형을 최소 1개 이상 선택해주세요.'
            })
        if not self.interests or len(self.interests) == 0:
            raise ValidationError({
                'interests': '관심사를 최소 1개 이상 선택해주세요.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user.username}의 프로필"


class IdealTypeProfile(models.Model):
    """이상형 프로필 모델"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='ideal_type_profile',
        verbose_name='사용자'
    )
    
    # 외형 조건
    height_min = models.IntegerField(verbose_name='최소 키(cm)')
    height_max = models.IntegerField(verbose_name='최대 키(cm)')
    age_min = models.IntegerField(verbose_name='최소 나이')
    age_max = models.IntegerField(verbose_name='최대 나이')
    
    # 성격 및 관심사 조건
    preferred_mbti = models.JSONField(default=list, verbose_name='선호 MBTI 리스트')
    preferred_personality = models.JSONField(default=list, verbose_name='선호 성격 유형 리스트')
    preferred_interests = models.JSONField(default=list, verbose_name='선호 관심사 리스트')
    
    # 매칭 임계값 (기본값: 3개 이상 일치)
    match_threshold = models.IntegerField(default=3, verbose_name='매칭 임계값')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성 시간')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정 시간')
    
    class Meta:
        db_table = 'ideal_type_profiles'
        verbose_name = '이상형 프로필'
        verbose_name_plural = '이상형 프로필들'
    
    def clean(self):
        """Validation: 모든 조건은 최소 1개 이상"""
        super().clean()
        if not self.preferred_mbti or len(self.preferred_mbti) == 0:
            raise ValidationError({
                'preferred_mbti': '선호 MBTI를 최소 1개 이상 선택해주세요.'
            })
        if not self.preferred_personality or len(self.preferred_personality) == 0:
            raise ValidationError({
                'preferred_personality': '선호 성격 유형을 최소 1개 이상 선택해주세요.'
            })
        if not self.preferred_interests or len(self.preferred_interests) == 0:
            raise ValidationError({
                'preferred_interests': '선호 관심사를 최소 1개 이상 선택해주세요.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user.user.username}의 이상형 프로필"


class UserLocation(models.Model):
    """사용자 위치 정보 모델"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='location',
        verbose_name='사용자'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='위도')
    longitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='경도')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='업데이트 시간')
    
    class Meta:
        db_table = 'user_locations'
        verbose_name = '사용자 위치'
        verbose_name_plural = '사용자 위치들'
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"{self.user.user.username}의 위치 ({self.latitude}, {self.longitude})"
