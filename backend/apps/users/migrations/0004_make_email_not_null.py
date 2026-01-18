# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_remove_phone_fields_add_email'),
    ]

    operations = [
        # email 필드를 NOT NULL로 변경 (데이터가 없으므로 안전)
        migrations.AlterField(
            model_name='authuser',
            name='email',
            field=models.EmailField(max_length=254, unique=True, verbose_name='이메일'),
        ),
    ]
