from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("simulation", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE rubrics
                ADD COLUMN IF NOT EXISTS version varchar(30) NOT NULL DEFAULT '1.0',
                ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;

            ALTER TABLE rubric_criteria
                ADD COLUMN IF NOT EXISTS weight numeric(5,2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

            UPDATE rubric_criteria
            SET weight = max_score
            WHERE weight = 0 AND max_score > 0;

            ALTER TABLE rubric_evaluations
                ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PENDING',
                ADD COLUMN IF NOT EXISTS snapshot_json text NOT NULL DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS created_at timestamptz NULL,
                ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;

            UPDATE rubric_evaluations
            SET created_at = evaluated_at
            WHERE created_at IS NULL;

            UPDATE rubric_evaluations
            SET updated_at = evaluated_at
            WHERE updated_at IS NULL;

            CREATE TABLE IF NOT EXISTS simulation_rubric_assignments (
                id bigserial PRIMARY KEY,
                case_version_id bigint NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
                rubric_id bigint NOT NULL REFERENCES rubrics(id),
                assigned_by bigint NULL REFERENCES users(id),
                active boolean NOT NULL DEFAULT true,
                assigned_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE UNIQUE INDEX IF NOT EXISTS uq_active_case_version_rubric_assignment
                ON simulation_rubric_assignments(case_version_id)
                WHERE active = true;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS uq_active_case_version_rubric_assignment;
            DROP TABLE IF EXISTS simulation_rubric_assignments;
            """,
        ),
    ]
