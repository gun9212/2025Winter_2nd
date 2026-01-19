"""
URL configuration for matching app.
"""
from django.urls import path
from . import views

app_name = 'matching'

urlpatterns = [
    path('matchable-count/', views.matchable_count, name='matchable_count'),
    path('check/', views.match_check, name='match_check'),
    path('notifications/register/', views.register_notification, name='register_notification'),
]

