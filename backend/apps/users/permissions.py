from rest_framework import permissions


class IsEmailVerified(permissions.BasePermission):
    """
    이메일 인증이 완료된 사용자만 접근을 허용하는 Permission 클래스
    """
    
    def has_permission(self, request, view):
        """
        요청한 사용자의 이메일 인증 여부를 확인
        """
        # 인증되지 않은 사용자는 거부
        if not request.user or not request.user.is_authenticated:
            return False
        
        # 이메일 인증이 완료된 사용자만 허용
        return request.user.email_verified
