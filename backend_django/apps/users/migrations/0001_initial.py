"""Empty initial migration — the ``users`` table is owned by Flyway."""
from django.db import migrations


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = []  # Flyway already created the table (managed = False)
