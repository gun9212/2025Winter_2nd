from rest_framework import serializers
from .models import UserLocation, User, IdealTypeProfile


class UserLocationSerializer(serializers.ModelSerializer):
    """사용자 위치 정보 Serializer"""
    class Meta:
        model = UserLocation
        fields = ['latitude', 'longitude']
    
    def validate_latitude(self, value):
        """위도 범위 검증"""
        if not (-90 <= float(value) <= 90):
            raise serializers.ValidationError("위도는 -90~90 사이여야 합니다.")
        return value
    
    def validate_longitude(self, value):
        """경도 범위 검증"""
        if not (-180 <= float(value) <= 180):
            raise serializers.ValidationError("경도는 -180~180 사이여야 합니다.")
        return value


class UserSerializer(serializers.ModelSerializer):
    """사용자 프로필 Serializer"""
    class Meta:
        model = User
        fields = ['age', 'gender', 'height', 'mbti', 'personality', 'interests']
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_personality(self, value):
        """성격 유형 검증"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("성격 유형을 최소 1개 이상 선택해주세요.")
        return value
    
    def validate_interests(self, value):
        """관심사 검증"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("관심사를 최소 1개 이상 선택해주세요.")
        return value


class IdealTypeProfileSerializer(serializers.ModelSerializer):
    """이상형 프로필 Serializer"""
    class Meta:
        model = IdealTypeProfile
        fields = ['height_min', 'height_max', 'age_min', 'age_max',
                 'preferred_gender',
                 'preferred_mbti', 'preferred_personality', 'preferred_interests', 
                 'match_threshold']
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """전체 필드 검증"""
        # 키 범위 검증
        if data.get('height_min') is not None and data.get('height_max') is not None:
            if data['height_min'] > data['height_max']:
                raise serializers.ValidationError({
                    'height': '최소 키는 최대 키보다 작거나 같아야 합니다.'
                })
        
        # 나이 범위 검증
        if data.get('age_min') is not None and data.get('age_max') is not None:
            if data['age_min'] > data['age_max']:
                raise serializers.ValidationError({
                    'age': '최소 나이는 최대 나이보다 작거나 같아야 합니다.'
                })
        
        # 선호 성별 검증
        if data.get('preferred_gender') is not None:
            if len(data['preferred_gender']) == 0:
                raise serializers.ValidationError({
                    'preferred_gender': '성별을 최소 1개 이상 선택해주세요.'
                })
            # 'M' 또는 'F'만 허용
            valid_genders = {'M', 'F'}
            for gender in data['preferred_gender']:
                if gender not in valid_genders:
                    raise serializers.ValidationError({
                        'preferred_gender': f'유효하지 않은 성별입니다: {gender}. M 또는 F만 허용됩니다.'
                    })
        
        # 선호 MBTI 검증
        if data.get('preferred_mbti') is not None:
            if len(data['preferred_mbti']) == 0:
                raise serializers.ValidationError({
                    'preferred_mbti': 'MBTI를 최소 1개 이상 선택해주세요.'
                })
        
        # 선호 성격 검증
        if data.get('preferred_personality') is not None:
            if len(data['preferred_personality']) == 0:
                raise serializers.ValidationError({
                    'preferred_personality': '성격 유형을 최소 1개 이상 선택해주세요.'
                })
        
        # 선호 관심사 검증
        if data.get('preferred_interests') is not None:
            if len(data['preferred_interests']) == 0:
                raise serializers.ValidationError({
                    'preferred_interests': '관심사를 최소 1개 이상 선택해주세요.'
                })
        
        return data
