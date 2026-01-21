from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # 인증 관련 API
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),  # API 4: 토큰 갱신
    path('auth/send-verification-code/', views.send_verification_code, name='send_verification_code'),
    path('auth/verify-email/', views.verify_email, name='verify_email'),
    
    # 비밀번호 재설정 관련 API
    path('auth/password-reset/request/', views.password_reset_request, name='password_reset_request'),  # API 16
    path('auth/password-reset/verify/', views.password_reset_verify, name='password_reset_verify'),  # API 17
    path('auth/password-reset/', views.password_reset, name='password_reset'),  # API 18
    
    # 위치 관련 API
    path('location/', views.get_location, name='get_location'),  # GET: 현재 위치 조회
    path('location/update/', views.update_location, name='update_location'),  # POST: 위치 업데이트
    
    # 프로필 관련 API
    path('profile/', views.profile_view, name='profile_view'),  # GET, POST, PUT 모두 처리
    path('profile/completeness/', views.check_profile_completeness, name='check_profile_completeness'),  # GET
    
    # 이상형 프로필 관련 API
    path('ideal-type/', views.ideal_type_view, name='ideal_type_view'),  # GET, POST, PUT 모두 처리
    
    # 서비스 설정 관련 API
    path('consent/', views.update_consent, name='update_consent'),  # POST: 매칭 동의 업데이트
    
    # 개발용 유틸리티 API
    path('dev/local-ip/', views.get_local_ip, name='get_local_ip'),  # GET: 로컬 IP 주소 조회
]

