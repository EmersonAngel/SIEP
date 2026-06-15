from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("grupos", "0001_initial"),
        ("simulation", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS grupo_case_version (
                grupo_id BIGINT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
                case_version_id BIGINT NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (grupo_id, case_version_id)
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS grupo_case_version;",
        )
    ]
