from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="StudentCaseCompletion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("student_id", models.BigIntegerField()),
                ("simulation_case_id", models.BigIntegerField()),
                ("first_completed_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "student_case_completion", "managed": True},
        ),
        migrations.AddConstraint(
            model_name="studentcasecompletion",
            constraint=models.UniqueConstraint(
                fields=("student_id", "simulation_case_id"), name="uq_student_case_completion"
            ),
        ),
    ]
