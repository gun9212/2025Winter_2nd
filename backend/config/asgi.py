"""
ASGI config for config project.
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Django ASGI 애플리케이션 초기화
django_asgi_app = get_asgi_application()

# ASGI 애플리케이션 설정
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            # WebSocket 라우팅은 여기에 추가
            # 예: path('ws/', YourConsumer.as_asgi()),
        ])
    ),
})

