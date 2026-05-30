"""Empty initial migration — legacy tables are owned by Flyway."""
from django.db import migrations


class Migration(migrations.Migration):
    initial = True
    dependencies = [("users", "0001_initial")]
    operations = []
