from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # 회원가입 API
    path('register/', views.register, name='register'),
    
    # username으로 user_id 조회 API
    path('user-id/', views.get_user_id_by_username, name='get_user_id_by_username'),
    
    # 위치 관련 API
    path('location/update/', views.update_location, name='update_location'),
    
    # 프로필 관련 API
    path('profile/', views.profile_view, name='profile_view'),  # GET, POST, PUT 모두 처리
    path('profile/completeness/', views.check_profile_completeness, name='check_profile_completeness'),  # GET
    
    # 이상형 프로필 관련 API
    path('ideal-type/', views.ideal_type_view, name='ideal_type_view'),  # GET, POST, PUT 모두 처리
]

