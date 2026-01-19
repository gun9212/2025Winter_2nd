from django.contrib import admin
from .models import Match, Notification


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    """매칭 Admin"""
    list_display = ('id', 'user1', 'user2', 'matched_at', 'user1_latitude', 'user1_longitude')
    list_filter = ('matched_at',)
    search_fields = ('user1__user__username', 'user2__user__username')
    raw_id_fields = ('user1', 'user2')
    readonly_fields = ('matched_at',)  # auto_now_add 필드는 읽기 전용
    
    fieldsets = (
        ('사용자', {
            'fields': ('user1', 'user2')
        }),
        ('매칭 시점 위치', {
            'fields': ('user1_latitude', 'user1_longitude', 'user2_latitude', 'user2_longitude')
        }),
        ('매칭 정보', {
            'fields': ('matched_at', 'matched_criteria')
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """알림 Admin"""
    list_display = ('id', 'user', 'match', 'is_active', 'boundary_entered_at', 'boundary_exited_at')
    list_filter = ('is_active', 'boundary_entered_at', 'boundary_exited_at')
    search_fields = ('user__user__username', 'match__id')
    raw_id_fields = ('user', 'match')
    
    fieldsets = (
        ('알림 정보', {
            'fields': ('user', 'match')
        }),
        ('boundary 상태', {
            'fields': ('is_active', 'boundary_entered_at', 'boundary_exited_at')
        }),
    )

