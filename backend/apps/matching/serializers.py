from rest_framework import serializers
from apps.matching.models import Match, Notification
from apps.users.models import User


# ==================== 매칭 관련 Serializer ====================

class UserBasicSerializer(serializers.ModelSerializer):
    """사용자 기본 정보 Serializer (매칭 결과에 포함)"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'age', 'gender']


class MatchSerializer(serializers.ModelSerializer):
    """매칭 정보 Serializer"""
    user1 = UserBasicSerializer(read_only=True)
    user2 = UserBasicSerializer(read_only=True)
    user1_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    user1_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    user2_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    user2_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    matched_criteria = serializers.JSONField(read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'user1', 'user2',
            'user1_latitude', 'user1_longitude',
            'user2_latitude', 'user2_longitude',
            'matched_at', 'matched_criteria', 'match_score'
        ]
        read_only_fields = ['id', 'matched_at']


class MatchableCountSerializer(serializers.Serializer):
    """
    매칭 가능 인원 수 Serializer
    API 12: GET /api/matches/matchable-count/
    """
    matchable_count = serializers.IntegerField(help_text='매칭 가능한 인원 수')
    last_count_updated_at = serializers.DateTimeField(
        allow_null=True, 
        required=False,
        help_text='마지막 카운트 업데이트 시간'
    )
    radius = serializers.FloatField(
        required=False,
        help_text='반경 (km 단위)'
    )


class MatchCheckSerializer(serializers.Serializer):
    """
    매칭 체크 Serializer (포그라운드)
    API 13: GET /api/matches/check/
    """
    has_new_match = serializers.BooleanField(help_text='새로운 매칭 발생 여부')
    new_matches_count = serializers.IntegerField(
        required=False,
        help_text='새로운 매칭 개수'
    )
    latest_match = MatchSerializer(required=False, help_text='최신 매칭 정보')


# ==================== 알림 관련 Serializer ====================

class NotificationSerializer(serializers.ModelSerializer):
    """알림 Serializer"""
    match = MatchSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'match',
            'boundary_entered_at', 'boundary_exited_at',
            'is_active'
        ]
        read_only_fields = ['id']


class NotificationRegisterSerializer(serializers.Serializer):
    """
    백그라운드 알림 등록 Serializer
    API 19: POST /api/notifications/register/
    """
    fcm_token = serializers.CharField(
        required=True, 
        max_length=255,
        help_text='Firebase Cloud Messaging 토큰'
    )
    device_type = serializers.ChoiceField(
        choices=['ios', 'android'],
        required=True,
        help_text='디바이스 타입 (ios 또는 android)'
    )

    def validate_fcm_token(self, value):
        """FCM 토큰 검증"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('FCM 토큰은 필수입니다.')
        return value.strip()
    
    def validate_device_type(self, value):
        """디바이스 타입 검증"""
        if value not in ['ios', 'android']:
            raise serializers.ValidationError('device_type은 "ios" 또는 "android"여야 합니다.')
        return value


