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
        """슈퍼유저 생성"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(username, password, **extra_fields)


class AuthUser(AbstractBaseUser):
    """인증 사용자 모델 (auth_users 테이블)"""
    username = models.CharField(max_length=100, unique=True, verbose_name='로그인 ID')
    password = models.CharField(max_length=128, verbose_name='비밀번호')
    email = models.EmailField(unique=True, verbose_name='이메일')
    email_verified = models.BooleanField(default=False, verbose_name='이메일 인증 여부')
    email_verified_at = models.DateTimeField(null=True, blank=True, verbose_name='이메일 인증 시간')
    date_joined = models.DateTimeField(default=timezone.now, verbose_name='가입일')
    last_login = models.DateTimeField(null=True, blank=True, verbose_name='마지막 로그인')
    
    # Django Admin 접근 권한 필드
    is_staff = models.BooleanField(default=False, verbose_name='스태프 권한')
    is_superuser = models.BooleanField(default=False, verbose_name='슈퍼유저 권한')
    is_active = models.BooleanField(default=True, verbose_name='활성화')
    
    objects = AuthUserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = 'auth_users'
        verbose_name = '인증 사용자'
        verbose_name_plural = '인증 사용자들'
    
    def __str__(self):
        return f"{self.username} ({self.email})"
    
    def has_perm(self, perm, obj=None):
        """권한 확인"""
        return self.is_superuser
    
    def has_module_perms(self, app_label):
        """모듈 권한 확인"""
        return self.is_superuser


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
    
    def _check_profile_completeness(self):
        """
        프로필과 이상형 프로필이 모두 완성되었는지 확인하는 내부 메서드
        Returns:
            bool: 프로필과 이상형 프로필이 모두 완성되었는지 여부
        """
        # 프로필 완성도 체크
        profile_fields = ['age', 'gender', 'height', 'mbti', 'personality', 'interests']
        profile_complete = all(getattr(self, field, None) for field in profile_fields)
        profile_complete = profile_complete and len(self.personality) > 0 and len(self.interests) > 0
        
        # 이상형 프로필 완성도 체크
        ideal_type_complete = False
        try:
            ideal_type = self.ideal_type_profile
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
        
        return profile_complete and ideal_type_complete
    
    def save(self, *args, **kwargs):
        # 이메일 인증이 완료되지 않은 경우 매칭 동의와 서비스 활성화를 강제로 False로 설정
        if not self.user.email_verified:
            self.matching_consent = False
            self.service_active = False
            print(f'⚠️ 이메일 인증 미완료: {self.user.username}의 매칭 동의와 서비스 활성화를 False로 강제 설정')
            
            # update_fields가 지정된 경우 matching_consent와 service_active도 포함시켜야 DB에 저장됨
            if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
                if 'matching_consent' not in kwargs['update_fields']:
                    kwargs['update_fields'] = list(kwargs['update_fields']) + ['matching_consent']
                if 'service_active' not in kwargs['update_fields']:
                    kwargs['update_fields'] = list(kwargs['update_fields']) + ['service_active']
        else:
            # 이메일 인증 완료 시에도 프로필과 이상형 프로필이 모두 완성되어야 matching_consent = True 가능
            all_complete = self._check_profile_completeness()
            
            if not all_complete:
                # 프로필 또는 이상형 프로필이 미완성인 경우 matching_consent = False로 강제 설정, service_active = False
                if self.matching_consent:
                    self.matching_consent = False
                    print(f'⚠️ 프로필 미완성: {self.user.username}의 매칭 동의를 False로 강제 설정')
                    
                    # update_fields가 지정된 경우 matching_consent도 포함시켜야 DB에 저장됨
                    if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
                        if 'matching_consent' not in kwargs['update_fields']:
                            kwargs['update_fields'] = list(kwargs['update_fields']) + ['matching_consent']
                
                # service_active도 False로 설정
                if self.service_active:
                    self.service_active = False
                    if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
                        if 'service_active' not in kwargs['update_fields']:
                            kwargs['update_fields'] = list(kwargs['update_fields']) + ['service_active']
            else:
                # 프로필과 이상형 프로필이 모두 완성된 경우 service_active = True로 자동 설정
                if not self.service_active:
                    self.service_active = True
                    print(f'✅ 프로필 완성: {self.user.username}의 service_active를 True로 자동 설정')
                    
                    # update_fields가 지정된 경우 service_active도 포함시켜야 DB에 저장됨
                    if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
                        if 'service_active' not in kwargs['update_fields']:
                            kwargs['update_fields'] = list(kwargs['update_fields']) + ['service_active']
        
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
    
    # 성별 조건
    preferred_gender = models.CharField(
        max_length=1,
        choices=[('M', '남성'), ('F', '여성'), ('A', '모두')],
        default='A',
        verbose_name='선호 성별'
    )
    
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
        """Validation: 성격과 관심사는 최소 1개 이상 필수, MBTI는 선택사항"""
        super().clean()
        # MBTI는 선택사항 (없어도 됨)
        if self.preferred_mbti is not None and len(self.preferred_mbti) == 0:
            raise ValidationError({
                'preferred_mbti': '선호 MBTI를 최소 1개 이상 선택해주세요.'
            })
        # 성격과 관심사는 필수
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
