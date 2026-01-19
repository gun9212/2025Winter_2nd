"""
URL configuration for matching app.
"""
from django.urls import path
from . import views

app_name = 'matching'

urlpatterns = [
    # API 12: 매칭 가능 인원 수 조회
    path('matchable-count/', views.matchable_count, name='matchable_count'),
    
    # API 13: 매칭 체크 (포그라운드)
    path('check/', views.match_check, name='match_check'),
    
    # API 15: 백그라운드 알림 등록
    path('notifications/register/', views.register_notification, name='register_notification'),
]

