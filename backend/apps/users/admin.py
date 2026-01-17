from django.contrib import admin
from .models import AuthUser, User, IdealTypeProfile, UserLocation


@admin.register(AuthUser)
class AuthUserAdmin(admin.ModelAdmin):
    """인증 사용자 Admin"""
    list_display = ('username', 'phone_number', 'phone_verified', 'date_joined', 'last_login')
    list_filter = ('phone_verified', 'date_joined')
    search_fields = ('username', 'phone_number')
    ordering = ('-date_joined',)
    
    fieldsets = (
        ('인증 정보', {
            'fields': ('username', 'password')
        }),
        ('전화번호', {
            'fields': ('phone_number', 'phone_verified', 'phone_verified_at')
        }),
        ('시간 정보', {
            'fields': ('date_joined', 'last_login')
        }),
    )
    
    add_fieldsets = (
        ('인증 정보', {
            'classes': ('wide',),
            'fields': ('username', 'phone_number', 'password'),
        }),
    )


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """사용자 프로필 Admin"""
    list_display = ('user', 'age', 'gender', 'height', 'mbti', 'matching_consent', 'service_active', 'created_at')
    list_filter = ('gender', 'mbti', 'matching_consent', 'service_active', 'created_at')
    search_fields = ('user__username', 'user__phone_number')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at', 'consent_updated_at', 'last_count_updated_at')
    
    fieldsets = (
        ('사용자', {
            'fields': ('user',)
        }),
        ('기본 정보', {
            'fields': ('age', 'gender', 'height', 'mbti')
        }),
        ('성격 및 관심사', {
            'fields': ('personality', 'interests')
        }),
        ('서비스 설정', {
            'fields': ('matching_consent', 'service_active', 'consent_updated_at')
        }),
        ('매칭 통계', {
            'fields': ('matchable_count', 'last_count_updated_at')
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(IdealTypeProfile)
class IdealTypeProfileAdmin(admin.ModelAdmin):
    """이상형 프로필 Admin"""
    list_display = ('user', 'preferred_gender', 'height_min', 'height_max', 'age_min', 'age_max', 'match_threshold', 'created_at')
    list_filter = ('match_threshold', 'created_at')
    search_fields = ('user__user__username', 'user__user__phone_number')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('사용자', {
            'fields': ('user',)
        }),
        ('성별 조건', {
            'fields': ('preferred_gender',),
            'description': '선호하는 성별을 선택하세요. 예: ["M"], ["F"], ["M", "F"]'
        }),
        ('외형 조건', {
            'fields': ('height_min', 'height_max', 'age_min', 'age_max')
        }),
        ('성격 및 관심사 조건', {
            'fields': ('preferred_mbti', 'preferred_personality', 'preferred_interests')
        }),
        ('매칭 설정', {
            'fields': ('match_threshold',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def preferred_gender(self, obj):
        """선호 성별을 읽기 쉬운 형식으로 표시"""
        if not obj.preferred_gender:
            return '-'
        gender_map = {'M': '남성', 'F': '여성'}
        labels = [gender_map.get(g, g) for g in obj.preferred_gender]
        return ', '.join(labels) if labels else '-'
    preferred_gender.short_description = '선호 성별'


@admin.register(UserLocation)
class UserLocationAdmin(admin.ModelAdmin):
    """사용자 위치 Admin"""
    list_display = ('user', 'latitude', 'longitude', 'updated_at')
    list_filter = ('updated_at',)
    search_fields = ('user__user__username', 'user__user__phone_number')
    raw_id_fields = ('user',)
    readonly_fields = ('updated_at',)