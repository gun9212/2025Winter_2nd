from django.db import models
from django.core.exceptions import ValidationError
from apps.users.models import User


class Match(models.Model):
    """매칭 정보 모델"""
    user1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='matches_as_user1',
        verbose_name='사용자 1'
    )
    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='matches_as_user2',
        verbose_name='사용자 2'
    )
    
    # 매칭 시점의 위치 정보
    user1_latitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='사용자1의 위도 (매칭 시점)')
    user1_longitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='사용자1의 경도 (매칭 시점)')
    user2_latitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='사용자2의 위도 (매칭 시점)')
    user2_longitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='사용자2의 경도 (매칭 시점)')
    
    matched_at = models.DateTimeField(auto_now_add=True, verbose_name='매칭 시간')
    matched_criteria = models.JSONField(default=dict, verbose_name='매칭된 조건')
    match_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='매칭 점수',
        help_text='매칭 점수 (0.00 ~ 100.00)'
    )
    
    class Meta:
        db_table = 'matches'
        verbose_name = '매칭'
        verbose_name_plural = '매칭들'
        unique_together = [['user1', 'user2']]
        indexes = [
            models.Index(fields=['user1', 'matched_at']),
            models.Index(fields=['user2', 'matched_at']),
        ]
        # user1_id != user2_id 제약조건은 clean() 메서드에서 처리
    
    def clean(self):
        """Validation: 자기 자신과 매칭 불가"""
        super().clean()
        if self.user1_id == self.user2_id:
            raise ValidationError('자기 자신과 매칭할 수 없습니다.')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user1.user.username} ↔ {self.user2.user.username}"


class Notification(models.Model):
    """알림(푸시 토큰 등록/상태) 모델

    초기 버전에서는 Match별 알림 추적을 위해 설계되었으나,
    이후 백그라운드 푸시 알림(FCM) 토큰 등록을 위해 `match`를 nullable로 확장하고
    `fcm_token`, `device_type`, timestamp 필드를 추가했습니다.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='사용자'
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='매칭',
        null=True,
        blank=True,
    )
    
    # 푸시 알림 토큰 등록용
    fcm_token = models.CharField(max_length=255, null=True, blank=True, verbose_name='FCM 토큰')
    device_type = models.CharField(
        max_length=10,
        choices=[('ios', 'iOS'), ('android', 'Android')],
        null=True,
        blank=True,
        verbose_name='디바이스 타입'
    )
    
    # boundary 추적
    boundary_entered_at = models.DateTimeField(null=True, blank=True, verbose_name='boundary 진입 시간')
    boundary_exited_at = models.DateTimeField(null=True, blank=True, verbose_name='boundary 이탈 시간')
    is_active = models.BooleanField(default=False, verbose_name='알림 활성화 여부')
    
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name='생성 시간')
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name='업데이트 시간')
    
    class Meta:
        db_table = 'notifications'
        verbose_name = '알림'
        verbose_name_plural = '알림들'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'match']),
            models.Index(fields=['user', 'fcm_token']),
        ]
    
    def __str__(self):
        if self.fcm_token:
            return f"{self.user.user.username}의 푸시 토큰({self.device_type})"
        return f"{self.user.user.username}의 알림 - {self.match}"
