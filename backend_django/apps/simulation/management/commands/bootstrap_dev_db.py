"""Bootstrap local PostgreSQL when Flyway/Spring schema is missing.

Creates the simulation schema, applies pending Django migrations, seeds the
PDF case and assigns it to the demo student group.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection

from apps.grupos.models import Grupo
from apps.simulation.models import CaseVersion, SimulationCase
from apps.users.models import CustomUser

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS grupos (
        id BIGSERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        profesor_id BIGINT NOT NULL REFERENCES users(id),
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS grupo_estudiante (
        grupo_id BIGINT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
        estudiante_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (grupo_id, estudiante_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS simulation_cases (
        id BIGSERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS case_versions (
        id BIGSERIAL PRIMARY KEY,
        simulation_case_id BIGINT NOT NULL REFERENCES simulation_cases(id) ON DELETE CASCADE,
        semantic_version VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        narrative_context TEXT,
        cloned_from_id BIGINT REFERENCES case_versions(id),
        published_at TIMESTAMP,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        version BIGINT NOT NULL DEFAULT 0,
        world_schema_version INTEGER NOT NULL DEFAULT 1
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS simulation_nodes (
        id BIGSERIAL PRIMARY KEY,
        case_version_id BIGINT NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
        node_key VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        narrative TEXT NOT NULL,
        support_resources_json TEXT NOT NULL DEFAULT '[]',
        required_tools_json TEXT NOT NULL DEFAULT '[]',
        sensitive_content BOOLEAN NOT NULL DEFAULT FALSE,
        safe_exit_required BOOLEAN NOT NULL DEFAULT FALSE,
        warning_message TEXT,
        start_node BOOLEAN NOT NULL DEFAULT FALSE,
        terminal_node BOOLEAN NOT NULL DEFAULT FALSE,
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS decision_options (
        id BIGSERIAL PRIMARY KEY,
        case_version_id BIGINT NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
        option_key VARCHAR(100) NOT NULL,
        source_node_id BIGINT NOT NULL REFERENCES simulation_nodes(id) ON DELETE CASCADE,
        target_node_id BIGINT NOT NULL REFERENCES simulation_nodes(id),
        text TEXT NOT NULL,
        classification VARCHAR(20) NOT NULL,
        score_delta INTEGER NOT NULL DEFAULT 0,
        stress_delta INTEGER NOT NULL DEFAULT 0,
        prohibited_penalty INTEGER NOT NULL DEFAULT 0,
        immediate_feedback TEXT NOT NULL DEFAULT '',
        prohibited_conduct BOOLEAN NOT NULL DEFAULT FALSE,
        prohibition_reason TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS simulation_attempts_v2 (
        id UUID PRIMARY KEY,
        attempt_token_hash VARCHAR(255) NOT NULL UNIQUE,
        case_version_id BIGINT NOT NULL REFERENCES case_versions(id),
        student_id BIGINT NOT NULL REFERENCES users(id),
        current_node_id BIGINT NOT NULL REFERENCES simulation_nodes(id),
        status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
        accumulated_score INTEGER NOT NULL DEFAULT 0,
        stress_index INTEGER NOT NULL DEFAULT 0,
        victim_risk INTEGER NOT NULL DEFAULT 50,
        user_trust INTEGER NOT NULL DEFAULT 50,
        institutional_route_activated BOOLEAN NOT NULL DEFAULT FALSE,
        revictimization_risk BOOLEAN NOT NULL DEFAULT FALSE,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        locked_at TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS attempt_events (
        id BIGSERIAL PRIMARY KEY,
        attempt_id UUID NOT NULL REFERENCES simulation_attempts_v2(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        node_id BIGINT REFERENCES simulation_nodes(id),
        decision_option_id BIGINT REFERENCES decision_options(id),
        score_delta INTEGER NOT NULL DEFAULT 0,
        stress_delta INTEGER NOT NULL DEFAULT 0,
        detail TEXT,
        occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS reflection_journals (
        id BIGSERIAL PRIMARY KEY,
        attempt_id UUID NOT NULL REFERENCES simulation_attempts_v2(id) ON DELETE CASCADE,
        node_id BIGINT NOT NULL REFERENCES simulation_nodes(id),
        encrypted_text TEXT NOT NULL,
        encryption_key_ref VARCHAR(255) NOT NULL,
        locked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS scene_maps (
        id BIGSERIAL PRIMARY KEY,
        case_version_id BIGINT NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
        node_id BIGINT NOT NULL UNIQUE REFERENCES simulation_nodes(id) ON DELETE CASCADE,
        map_key VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        width INTEGER NOT NULL DEFAULT 0,
        height INTEGER NOT NULL DEFAULT 0,
        theme VARCHAR(100) NOT NULL DEFAULT '',
        spawn_x INTEGER NOT NULL DEFAULT 0,
        spawn_y INTEGER NOT NULL DEFAULT 0,
        ambient_json TEXT NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS attempt_world_states (
        attempt_id UUID PRIMARY KEY REFERENCES simulation_attempts_v2(id) ON DELETE CASCADE,
        scene_map_id BIGINT REFERENCES scene_maps(id),
        player_x INTEGER NOT NULL DEFAULT 0,
        player_y INTEGER NOT NULL DEFAULT 0,
        inventory_json TEXT NOT NULL DEFAULT '[]',
        inspected_object_keys_json TEXT NOT NULL DEFAULT '[]',
        viewed_dialogue_keys_json TEXT NOT NULL DEFAULT '[]',
        used_tool_keys_json TEXT NOT NULL DEFAULT '[]',
        flags_json TEXT NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS map_objects (
        id BIGSERIAL PRIMARY KEY,
        scene_map_id BIGINT NOT NULL REFERENCES scene_maps(id) ON DELETE CASCADE,
        object_key VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        object_type VARCHAR(50) NOT NULL,
        position_x INTEGER NOT NULL DEFAULT 0,
        position_y INTEGER NOT NULL DEFAULT 0,
        width INTEGER NOT NULL DEFAULT 1,
        height INTEGER NOT NULL DEFAULT 1,
        color_hex VARCHAR(20) NOT NULL DEFAULT '',
        icon VARCHAR(50) NOT NULL DEFAULT '',
        short_code VARCHAR(20) NOT NULL DEFAULT '',
        collision BOOLEAN NOT NULL DEFAULT FALSE,
        visible BOOLEAN NOT NULL DEFAULT TRUE,
        interaction_prompt VARCHAR(255) NOT NULL DEFAULT '',
        interaction_text TEXT NOT NULL DEFAULT '',
        decision_option_id BIGINT REFERENCES decision_options(id),
        tool_code VARCHAR(50),
        unlock_condition_json TEXT NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        z_index INTEGER NOT NULL DEFAULT 0,
        facing VARCHAR(20) NOT NULL DEFAULT '',
        movement_pattern_json TEXT NOT NULL DEFAULT '{}',
        metadata_json TEXT NOT NULL DEFAULT '{}'
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS collision_zones (
        id BIGSERIAL PRIMARY KEY,
        scene_map_id BIGINT NOT NULL REFERENCES scene_maps(id) ON DELETE CASCADE,
        zone_key VARCHAR(100) NOT NULL,
        label VARCHAR(255),
        position_x INTEGER NOT NULL DEFAULT 0,
        position_y INTEGER NOT NULL DEFAULT 0,
        width INTEGER NOT NULL DEFAULT 1,
        height INTEGER NOT NULL DEFAULT 1
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS dialogue_trees (
        id BIGSERIAL PRIMARY KEY,
        scene_map_id BIGINT NOT NULL REFERENCES scene_maps(id) ON DELETE CASCADE,
        map_object_id BIGINT REFERENCES map_objects(id),
        tree_key VARCHAR(100) NOT NULL,
        speaker_name VARCHAR(255) NOT NULL,
        portrait_key VARCHAR(100),
        emotion VARCHAR(50) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS dialogue_lines (
        id BIGSERIAL PRIMARY KEY,
        dialogue_tree_id BIGINT NOT NULL REFERENCES dialogue_trees(id) ON DELETE CASCADE,
        display_order INTEGER NOT NULL DEFAULT 0,
        speaker_name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        emotion VARCHAR(50) NOT NULL DEFAULT ''
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS dialogue_choices (
        id BIGSERIAL PRIMARY KEY,
        dialogue_tree_id BIGINT NOT NULL REFERENCES dialogue_trees(id) ON DELETE CASCADE,
        choice_key VARCHAR(100) NOT NULL,
        text TEXT NOT NULL,
        decision_option_id BIGINT REFERENCES decision_options(id),
        required_tool_code VARCHAR(50),
        effect_json TEXT NOT NULL DEFAULT '{}',
        display_order INTEGER NOT NULL DEFAULT 0
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS clinical_tools (
        id BIGSERIAL PRIMARY KEY,
        case_version_id BIGINT REFERENCES case_versions(id) ON DELETE CASCADE,
        tool_code VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        icon VARCHAR(50) NOT NULL DEFAULT '',
        category VARCHAR(50) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT TRUE
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS rubrics (
        id BIGSERIAL PRIMARY KEY,
        case_version_id BIGINT REFERENCES case_versions(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS rubric_criteria (
        id BIGSERIAL PRIMARY KEY,
        rubric_id BIGINT NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
        competency VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        max_score INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS rubric_evaluations (
        id BIGSERIAL PRIMARY KEY,
        attempt_id UUID NOT NULL REFERENCES simulation_attempts_v2(id) ON DELETE CASCADE,
        rubric_id BIGINT NOT NULL REFERENCES rubrics(id),
        instructor_id BIGINT NOT NULL REFERENCES users(id),
        total_score DECIMAL(10,2) NOT NULL DEFAULT 0,
        comment TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        snapshot_json TEXT NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        evaluated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS criterion_scores (
        id BIGSERIAL PRIMARY KEY,
        rubric_evaluation_id BIGINT NOT NULL REFERENCES rubric_evaluations(id) ON DELETE CASCADE,
        rubric_criterion_id BIGINT NOT NULL REFERENCES rubric_criteria(id),
        score DECIMAL(10,2) NOT NULL DEFAULT 0,
        comment TEXT,
        evidence_json TEXT NOT NULL DEFAULT '[]'
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS publication_checklists (
        id BIGSERIAL PRIMARY KEY,
        case_version_id BIGINT NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
        submitted_by BIGINT NOT NULL REFERENCES users(id),
        completion_ratio DECIMAL(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT '',
        submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS publication_checklist_items (
        id BIGSERIAL PRIMARY KEY,
        checklist_id BIGINT NOT NULL REFERENCES publication_checklists(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        required BOOLEAN NOT NULL DEFAULT TRUE,
        fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
        evidence_note TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor_id BIGINT,
        actor_role VARCHAR(20),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id VARCHAR(100),
        context_json TEXT NOT NULL DEFAULT '{}',
        ip_address VARCHAR(64),
        user_agent TEXT,
        occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        retention_until TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '12 months')
    );
    """,
]

SCHEMA_UPGRADE_STATEMENTS = [
    """
    ALTER TABLE rubrics
        ADD COLUMN IF NOT EXISTS version varchar(30) NOT NULL DEFAULT '1.0',
        ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;
    """,
    """
    ALTER TABLE rubric_criteria
        ADD COLUMN IF NOT EXISTS weight numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
    """,
    """
    UPDATE rubric_criteria
    SET weight = max_score
    WHERE weight = 0 AND max_score > 0;
    """,
    """
    ALTER TABLE rubric_evaluations
        ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS snapshot_json text NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS created_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;
    """,
    """
    CREATE TABLE IF NOT EXISTS simulation_rubric_assignments (
        id bigserial PRIMARY KEY,
        case_version_id bigint NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
        rubric_id bigint NOT NULL REFERENCES rubrics(id),
        assigned_by bigint NULL REFERENCES users(id),
        active boolean NOT NULL DEFAULT true,
        assigned_at timestamptz NOT NULL DEFAULT now()
    );
    """,
]

DEMO_CASE_CODE = "SIM-VBG-001"
DEMO_GRUPO_CODIGO = "DEMO1"


def _ensure_case_shell(author):
    case, created = SimulationCase.objects.get_or_create(
        code=DEMO_CASE_CODE,
        defaults={
            "title": "Violencia Familiar y Tentativa de Feminicidio",
            "description": "Caso formativo de psicología social.",
            "active": True,
            "created_by": author,
        },
    )
    if created:
        return case, True
    return case, False


def _assign_demo_group(profesor, estudiante, case_version_id):
    grupo, created = Grupo.objects.get_or_create(
        codigo=DEMO_GRUPO_CODIGO,
        defaults={
            "nombre": "Grupo demo SIEP",
            "profesor": profesor,
            "activo": True,
        },
    )
    with connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO grupo_estudiante (grupo_id, estudiante_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
            """,
            [grupo.id, estudiante.id],
        )
        cur.execute(
            """
            INSERT INTO grupo_case_version (grupo_id, case_version_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
            """,
            [grupo.id, case_version_id],
        )
    return grupo, created


class Command(BaseCommand):
    help = "Inicializa el esquema local del simulador y asigna el caso demo al estudiante."

    def handle(self, *args, **options):
        call_command("seed_demo_users")

        with connection.cursor() as cursor:
            for statement in SCHEMA_STATEMENTS:
                cursor.execute(statement)
            for statement in SCHEMA_UPGRADE_STATEMENTS:
                cursor.execute(statement)

        call_command("migrate", verbosity=0)

        admin = CustomUser.objects.filter(email="admin@psychosim.edu.co").first()
        profesor = CustomUser.objects.filter(email="profesora@psychosim.edu.co").first()
        estudiante = CustomUser.objects.filter(email="estudiante@psychosim.edu.co").first()
        author = admin or profesor
        if author is None:
            self.stderr.write(self.style.ERROR("Faltan usuarios demo. Ejecuta seed_demo_users primero."))
            return

        case, case_created = _ensure_case_shell(author)
        if case_created:
            self.stdout.write(f"Caso base creado: {case.code}")

        call_command("seed_caso_pdf")

        version = CaseVersion.objects.get(
            simulation_case__code=DEMO_CASE_CODE,
            status="PUBLISHED",
        )
        if profesor is None or estudiante is None:
            self.stderr.write(self.style.WARNING(
                "Usuarios profesor/estudiante no encontrados; omitiendo asignación de grupo."
            ))
            return

        grupo, grupo_created = _assign_demo_group(profesor, estudiante, version.id)
        action = "creado" if grupo_created else "actualizado"
        self.stdout.write(self.style.SUCCESS(
            f"Simulador listo: caso {DEMO_CASE_CODE} v{version.semantic_version} "
            f"asignado al grupo {grupo.codigo} ({action})."
        ))
