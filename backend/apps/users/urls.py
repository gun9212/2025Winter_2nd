from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # 인증 관련 API
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/send-verification-code/', views.send_verification_code, name='send_verification_code'),
    path('auth/verify-email/', views.verify_email, name='verify_email'),
    
    # 위치 관련 API
    path('location/update/', views.update_location, name='update_location'),
    
    # 프로필 관련 API
    path('profile/', views.profile_view, name='profile_view'),  # GET, POST, PUT 모두 처리
    path('profile/completeness/', views.check_profile_completeness, name='check_profile_completeness'),  # GET
]

