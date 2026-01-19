"""
두 위치 간 거리 계산
"""
from math import radians, cos, sin, asin, sqrt

def calculate_distance_km(lat1, lon1, lat2, lon2):
    """
    두 지점 간 거리 계산 (Haversine formula)
    반환: 거리 (km)
    """
    # 지구 반경 (km)
    R = 6371
    
    # 라디안으로 변환
    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    # Haversine formula
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c

# 두 위치
lat1, lon1 = 37.503000, 127.032700  # user0001
lat2, lon2 = 37.497900, 127.027600  # user0002

distance_km = calculate_distance_km(lat1, lon1, lat2, lon2)
distance_m = distance_km * 1000

print("=" * 60)
print("위치 간 거리 계산")
print("=" * 60)
print(f"user0001: ({lat1}, {lon1})")
print(f"user0002: ({lat2}, {lon2})")
print(f"\n거리: {distance_m:.2f}m ({distance_km:.4f}km)")
print(f"\n기본 반경: 500m (0.5km)")
print(f"반경 내 여부: {'✅ 반경 내' if distance_m <= 500 else '❌ 반경 초과'}")
print("=" * 60)
