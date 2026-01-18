# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_authuser_is_active_authuser_is_staff_and_more'),
    ]

    operations = [
        # 1단계: phone_number 필드 제거 (먼저 제거)
        migrations.RemoveField(
            model_name='authuser',
            name='phone_number',
        ),
        migrations.RemoveField(
            model_name='authuser',
            name='phone_verified',
        ),
        migrations.RemoveField(
            model_name='authuser',
            name='phone_verified_at',
        ),
        
        # 2단계: email 필드 추가 (null=True로 먼저 추가)
        migrations.AddField(
            model_name='authuser',
            name='email',
            field=models.EmailField(max_length=254, null=True, unique=True, verbose_name='이메일'),
        ),
        migrations.AddField(
            model_name='authuser',
            name='email_verified',
            field=models.BooleanField(default=False, verbose_name='이메일 인증 여부'),
        ),
        migrations.AddField(
            model_name='authuser',
            name='email_verified_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='이메일 인증 시간'),
        ),
    ]
