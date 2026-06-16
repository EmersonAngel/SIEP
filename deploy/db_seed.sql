--
-- PostgreSQL database dump
--

\restrict zCLaPXUnlsJVxM6Ep8ShRNAGno6HWz0fwCvndFIbXdg2Roq0DQVBeYXhxKwcaQJ

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.simulation_rubric_assignments DROP CONSTRAINT IF EXISTS simulation_rubric_assignments_rubric_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_rubric_assignments DROP CONSTRAINT IF EXISTS simulation_rubric_assignments_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_rubric_assignments DROP CONSTRAINT IF EXISTS simulation_rubric_assignments_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_nodes DROP CONSTRAINT IF EXISTS simulation_nodes_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_cases DROP CONSTRAINT IF EXISTS simulation_cases_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_attempts_v2 DROP CONSTRAINT IF EXISTS simulation_attempts_v2_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_attempts_v2 DROP CONSTRAINT IF EXISTS simulation_attempts_v2_current_node_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_attempts_v2 DROP CONSTRAINT IF EXISTS simulation_attempts_v2_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sesiones_juego DROP CONSTRAINT IF EXISTS sesiones_juego_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sesiones_juego DROP CONSTRAINT IF EXISTS sesiones_juego_caso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scene_maps DROP CONSTRAINT IF EXISTS scene_maps_node_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scene_maps DROP CONSTRAINT IF EXISTS scene_maps_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rubrics DROP CONSTRAINT IF EXISTS rubrics_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.rubrics DROP CONSTRAINT IF EXISTS rubrics_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rubric_evaluations DROP CONSTRAINT IF EXISTS rubric_evaluations_rubric_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rubric_evaluations DROP CONSTRAINT IF EXISTS rubric_evaluations_instructor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rubric_evaluations DROP CONSTRAINT IF EXISTS rubric_evaluations_attempt_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rubric_criteria DROP CONSTRAINT IF EXISTS rubric_criteria_rubric_id_fkey;
ALTER TABLE IF EXISTS ONLY public.respuestas DROP CONSTRAINT IF EXISTS respuestas_sesion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.respuestas DROP CONSTRAINT IF EXISTS respuestas_pregunta_id_fkey;
ALTER TABLE IF EXISTS ONLY public.respuestas DROP CONSTRAINT IF EXISTS respuestas_opcion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reflection_journals DROP CONSTRAINT IF EXISTS reflection_journals_node_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reflection_journals DROP CONSTRAINT IF EXISTS reflection_journals_attempt_id_fkey;
ALTER TABLE IF EXISTS ONLY public.publication_checklists DROP CONSTRAINT IF EXISTS publication_checklists_submitted_by_fkey;
ALTER TABLE IF EXISTS ONLY public.publication_checklists DROP CONSTRAINT IF EXISTS publication_checklists_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.publication_checklist_items DROP CONSTRAINT IF EXISTS publication_checklist_items_checklist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.preguntas DROP CONSTRAINT IF EXISTS preguntas_escenario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.opciones DROP CONSTRAINT IF EXISTS opciones_pregunta_id_fkey;
ALTER TABLE IF EXISTS ONLY public.map_objects DROP CONSTRAINT IF EXISTS map_objects_scene_map_id_fkey;
ALTER TABLE IF EXISTS ONLY public.map_objects DROP CONSTRAINT IF EXISTS map_objects_decision_option_id_fkey;
ALTER TABLE IF EXISTS ONLY public.grupos DROP CONSTRAINT IF EXISTS grupos_profesor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.grupo_estudiante DROP CONSTRAINT IF EXISTS grupo_estudiante_grupo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.grupo_estudiante DROP CONSTRAINT IF EXISTS grupo_estudiante_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.grupo_case_version DROP CONSTRAINT IF EXISTS grupo_case_version_grupo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.grupo_case_version DROP CONSTRAINT IF EXISTS grupo_case_version_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.escenarios DROP CONSTRAINT IF EXISTS escenarios_caso_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_trees DROP CONSTRAINT IF EXISTS dialogue_trees_scene_map_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_trees DROP CONSTRAINT IF EXISTS dialogue_trees_map_object_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_lines DROP CONSTRAINT IF EXISTS dialogue_lines_dialogue_tree_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_choices DROP CONSTRAINT IF EXISTS dialogue_choices_dialogue_tree_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_choices DROP CONSTRAINT IF EXISTS dialogue_choices_decision_option_id_fkey;
ALTER TABLE IF EXISTS ONLY public.decision_options DROP CONSTRAINT IF EXISTS decision_options_target_node_id_fkey;
ALTER TABLE IF EXISTS ONLY public.decision_options DROP CONSTRAINT IF EXISTS decision_options_source_node_id_fkey;
ALTER TABLE IF EXISTS ONLY public.decision_options DROP CONSTRAINT IF EXISTS decision_options_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.criterion_scores DROP CONSTRAINT IF EXISTS criterion_scores_rubric_evaluation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.criterion_scores DROP CONSTRAINT IF EXISTS criterion_scores_rubric_criterion_id_fkey;
ALTER TABLE IF EXISTS ONLY public.collision_zones DROP CONSTRAINT IF EXISTS collision_zones_scene_map_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinical_tools DROP CONSTRAINT IF EXISTS clinical_tools_case_version_id_fkey;
ALTER TABLE IF EXISTS ONLY public.casos DROP CONSTRAINT IF EXISTS casos_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.case_versions DROP CONSTRAINT IF EXISTS case_versions_simulation_case_id_fkey;
ALTER TABLE IF EXISTS ONLY public.case_versions DROP CONSTRAINT IF EXISTS case_versions_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.case_versions DROP CONSTRAINT IF EXISTS case_versions_cloned_from_id_fkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attempt_world_states DROP CONSTRAINT IF EXISTS attempt_world_states_scene_map_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attempt_world_states DROP CONSTRAINT IF EXISTS attempt_world_states_attempt_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attempt_events DROP CONSTRAINT IF EXISTS attempt_events_node_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attempt_events DROP CONSTRAINT IF EXISTS attempt_events_decision_option_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attempt_events DROP CONSTRAINT IF EXISTS attempt_events_attempt_id_fkey;
DROP INDEX IF EXISTS public.uq_active_case_version_rubric_assignment;
DROP INDEX IF EXISTS public.idx_simulation_nodes_version;
DROP INDEX IF EXISTS public.idx_sesiones_estudiante;
DROP INDEX IF EXISTS public.idx_sesiones_caso;
DROP INDEX IF EXISTS public.idx_scene_maps_version;
DROP INDEX IF EXISTS public.idx_respuestas_sesion;
DROP INDEX IF EXISTS public.idx_reflection_attempt;
DROP INDEX IF EXISTS public.idx_preguntas_escenario;
DROP INDEX IF EXISTS public.idx_opciones_pregunta;
DROP INDEX IF EXISTS public.idx_map_objects_scene;
DROP INDEX IF EXISTS public.idx_escenarios_caso;
DROP INDEX IF EXISTS public.idx_dialogue_lines_tree;
DROP INDEX IF EXISTS public.idx_decision_options_source;
DROP INDEX IF EXISTS public.idx_criterion_scores_eval;
DROP INDEX IF EXISTS public.idx_case_versions_case_status;
DROP INDEX IF EXISTS public.idx_audit_logs_time;
DROP INDEX IF EXISTS public.idx_audit_logs_retention;
DROP INDEX IF EXISTS public.idx_attempts_student_status;
DROP INDEX IF EXISTS public.idx_attempt_world_scene;
DROP INDEX IF EXISTS public.idx_attempt_events_attempt_time;
DROP INDEX IF EXISTS public.flyway_schema_history_s_idx;
DROP INDEX IF EXISTS public.auth_permission_content_type_id_2f476e4b;
DROP INDEX IF EXISTS public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX IF EXISTS public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX IF EXISTS public.auth_group_name_a6ea08ec_like;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.student_case_completion DROP CONSTRAINT IF EXISTS uq_student_case_completion;
ALTER TABLE IF EXISTS ONLY public.student_case_completion DROP CONSTRAINT IF EXISTS student_case_completion_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_rubric_assignments DROP CONSTRAINT IF EXISTS simulation_rubric_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_nodes DROP CONSTRAINT IF EXISTS simulation_nodes_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_nodes DROP CONSTRAINT IF EXISTS simulation_nodes_case_version_id_node_key_key;
ALTER TABLE IF EXISTS ONLY public.simulation_cases DROP CONSTRAINT IF EXISTS simulation_cases_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_cases DROP CONSTRAINT IF EXISTS simulation_cases_code_key;
ALTER TABLE IF EXISTS ONLY public.simulation_attempts_v2 DROP CONSTRAINT IF EXISTS simulation_attempts_v2_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_attempts_v2 DROP CONSTRAINT IF EXISTS simulation_attempts_v2_attempt_token_hash_key;
ALTER TABLE IF EXISTS ONLY public.sesiones_juego DROP CONSTRAINT IF EXISTS sesiones_juego_pkey;
ALTER TABLE IF EXISTS ONLY public.scene_maps DROP CONSTRAINT IF EXISTS scene_maps_pkey;
ALTER TABLE IF EXISTS ONLY public.scene_maps DROP CONSTRAINT IF EXISTS scene_maps_node_id_key;
ALTER TABLE IF EXISTS ONLY public.scene_maps DROP CONSTRAINT IF EXISTS scene_maps_case_version_id_map_key_key;
ALTER TABLE IF EXISTS ONLY public.rubrics DROP CONSTRAINT IF EXISTS rubrics_pkey;
ALTER TABLE IF EXISTS ONLY public.rubric_evaluations DROP CONSTRAINT IF EXISTS rubric_evaluations_pkey;
ALTER TABLE IF EXISTS ONLY public.rubric_evaluations DROP CONSTRAINT IF EXISTS rubric_evaluations_attempt_id_rubric_id_instructor_id_key;
ALTER TABLE IF EXISTS ONLY public.rubric_criteria DROP CONSTRAINT IF EXISTS rubric_criteria_pkey;
ALTER TABLE IF EXISTS ONLY public.respuestas DROP CONSTRAINT IF EXISTS respuestas_pkey;
ALTER TABLE IF EXISTS ONLY public.reflection_journals DROP CONSTRAINT IF EXISTS reflection_journals_pkey;
ALTER TABLE IF EXISTS ONLY public.reflection_journals DROP CONSTRAINT IF EXISTS reflection_journals_attempt_id_node_id_key;
ALTER TABLE IF EXISTS ONLY public.publication_checklists DROP CONSTRAINT IF EXISTS publication_checklists_pkey;
ALTER TABLE IF EXISTS ONLY public.publication_checklist_items DROP CONSTRAINT IF EXISTS publication_checklist_items_pkey;
ALTER TABLE IF EXISTS ONLY public.publication_checklist_items DROP CONSTRAINT IF EXISTS publication_checklist_items_checklist_id_code_key;
ALTER TABLE IF EXISTS ONLY public.preguntas DROP CONSTRAINT IF EXISTS preguntas_pkey;
ALTER TABLE IF EXISTS ONLY public.preguntas DROP CONSTRAINT IF EXISTS preguntas_escenario_id_orden_key;
ALTER TABLE IF EXISTS ONLY public.opciones DROP CONSTRAINT IF EXISTS opciones_pkey;
ALTER TABLE IF EXISTS ONLY public.map_objects DROP CONSTRAINT IF EXISTS map_objects_scene_map_id_object_key_key;
ALTER TABLE IF EXISTS ONLY public.map_objects DROP CONSTRAINT IF EXISTS map_objects_pkey;
ALTER TABLE IF EXISTS ONLY public.grupos DROP CONSTRAINT IF EXISTS grupos_pkey;
ALTER TABLE IF EXISTS ONLY public.grupos DROP CONSTRAINT IF EXISTS grupos_codigo_key;
ALTER TABLE IF EXISTS ONLY public.grupo_estudiante DROP CONSTRAINT IF EXISTS grupo_estudiante_pkey;
ALTER TABLE IF EXISTS ONLY public.grupo_case_version DROP CONSTRAINT IF EXISTS grupo_case_version_pkey;
ALTER TABLE IF EXISTS ONLY public.flyway_schema_history DROP CONSTRAINT IF EXISTS flyway_schema_history_pk;
ALTER TABLE IF EXISTS ONLY public.escenarios DROP CONSTRAINT IF EXISTS escenarios_pkey;
ALTER TABLE IF EXISTS ONLY public.escenarios DROP CONSTRAINT IF EXISTS escenarios_caso_id_orden_key;
ALTER TABLE IF EXISTS ONLY public.django_migrations DROP CONSTRAINT IF EXISTS django_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE IF EXISTS ONLY public.dialogue_trees DROP CONSTRAINT IF EXISTS dialogue_trees_scene_map_id_tree_key_key;
ALTER TABLE IF EXISTS ONLY public.dialogue_trees DROP CONSTRAINT IF EXISTS dialogue_trees_pkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_lines DROP CONSTRAINT IF EXISTS dialogue_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_lines DROP CONSTRAINT IF EXISTS dialogue_lines_dialogue_tree_id_display_order_key;
ALTER TABLE IF EXISTS ONLY public.dialogue_choices DROP CONSTRAINT IF EXISTS dialogue_choices_pkey;
ALTER TABLE IF EXISTS ONLY public.dialogue_choices DROP CONSTRAINT IF EXISTS dialogue_choices_dialogue_tree_id_choice_key_key;
ALTER TABLE IF EXISTS ONLY public.decision_options DROP CONSTRAINT IF EXISTS decision_options_pkey;
ALTER TABLE IF EXISTS ONLY public.decision_options DROP CONSTRAINT IF EXISTS decision_options_case_version_id_option_key_key;
ALTER TABLE IF EXISTS ONLY public.criterion_scores DROP CONSTRAINT IF EXISTS criterion_scores_rubric_evaluation_id_rubric_criterion_id_key;
ALTER TABLE IF EXISTS ONLY public.criterion_scores DROP CONSTRAINT IF EXISTS criterion_scores_pkey;
ALTER TABLE IF EXISTS ONLY public.collision_zones DROP CONSTRAINT IF EXISTS collision_zones_scene_map_id_zone_key_key;
ALTER TABLE IF EXISTS ONLY public.collision_zones DROP CONSTRAINT IF EXISTS collision_zones_pkey;
ALTER TABLE IF EXISTS ONLY public.clinical_tools DROP CONSTRAINT IF EXISTS clinical_tools_pkey;
ALTER TABLE IF EXISTS ONLY public.clinical_tools DROP CONSTRAINT IF EXISTS clinical_tools_case_version_id_tool_code_key;
ALTER TABLE IF EXISTS ONLY public.casos DROP CONSTRAINT IF EXISTS casos_pkey;
ALTER TABLE IF EXISTS ONLY public.case_versions DROP CONSTRAINT IF EXISTS case_versions_simulation_case_id_semantic_version_key;
ALTER TABLE IF EXISTS ONLY public.case_versions DROP CONSTRAINT IF EXISTS case_versions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_name_key;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.attempt_world_states DROP CONSTRAINT IF EXISTS attempt_world_states_pkey;
ALTER TABLE IF EXISTS ONLY public.attempt_events DROP CONSTRAINT IF EXISTS attempt_events_pkey;
ALTER TABLE IF EXISTS ONLY public.access_requests DROP CONSTRAINT IF EXISTS access_requests_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.simulation_rubric_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.simulation_nodes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.simulation_cases ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sesiones_juego ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.scene_maps ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rubrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rubric_evaluations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rubric_criteria ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.respuestas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reflection_journals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.publication_checklists ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.publication_checklist_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.preguntas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.opciones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.map_objects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.grupos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.escenarios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.dialogue_trees ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.dialogue_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.dialogue_choices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.decision_options ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.criterion_scores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.collision_zones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clinical_tools ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.casos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.case_versions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attempt_events ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.student_case_completion;
DROP SEQUENCE IF EXISTS public.simulation_rubric_assignments_id_seq;
DROP TABLE IF EXISTS public.simulation_rubric_assignments;
DROP SEQUENCE IF EXISTS public.simulation_nodes_id_seq;
DROP TABLE IF EXISTS public.simulation_nodes;
DROP SEQUENCE IF EXISTS public.simulation_cases_id_seq;
DROP TABLE IF EXISTS public.simulation_cases;
DROP TABLE IF EXISTS public.simulation_attempts_v2;
DROP SEQUENCE IF EXISTS public.sesiones_juego_id_seq;
DROP TABLE IF EXISTS public.sesiones_juego;
DROP SEQUENCE IF EXISTS public.scene_maps_id_seq;
DROP TABLE IF EXISTS public.scene_maps;
DROP SEQUENCE IF EXISTS public.rubrics_id_seq;
DROP TABLE IF EXISTS public.rubrics;
DROP SEQUENCE IF EXISTS public.rubric_evaluations_id_seq;
DROP TABLE IF EXISTS public.rubric_evaluations;
DROP SEQUENCE IF EXISTS public.rubric_criteria_id_seq;
DROP TABLE IF EXISTS public.rubric_criteria;
DROP SEQUENCE IF EXISTS public.respuestas_id_seq;
DROP TABLE IF EXISTS public.respuestas;
DROP SEQUENCE IF EXISTS public.reflection_journals_id_seq;
DROP TABLE IF EXISTS public.reflection_journals;
DROP SEQUENCE IF EXISTS public.publication_checklists_id_seq;
DROP TABLE IF EXISTS public.publication_checklists;
DROP SEQUENCE IF EXISTS public.publication_checklist_items_id_seq;
DROP TABLE IF EXISTS public.publication_checklist_items;
DROP SEQUENCE IF EXISTS public.preguntas_id_seq;
DROP TABLE IF EXISTS public.preguntas;
DROP SEQUENCE IF EXISTS public.opciones_id_seq;
DROP TABLE IF EXISTS public.opciones;
DROP SEQUENCE IF EXISTS public.map_objects_id_seq;
DROP TABLE IF EXISTS public.map_objects;
DROP SEQUENCE IF EXISTS public.grupos_id_seq;
DROP TABLE IF EXISTS public.grupos;
DROP TABLE IF EXISTS public.grupo_estudiante;
DROP TABLE IF EXISTS public.grupo_case_version;
DROP TABLE IF EXISTS public.flyway_schema_history;
DROP SEQUENCE IF EXISTS public.escenarios_id_seq;
DROP TABLE IF EXISTS public.escenarios;
DROP TABLE IF EXISTS public.django_migrations;
DROP TABLE IF EXISTS public.django_content_type;
DROP SEQUENCE IF EXISTS public.dialogue_trees_id_seq;
DROP TABLE IF EXISTS public.dialogue_trees;
DROP SEQUENCE IF EXISTS public.dialogue_lines_id_seq;
DROP TABLE IF EXISTS public.dialogue_lines;
DROP SEQUENCE IF EXISTS public.dialogue_choices_id_seq;
DROP TABLE IF EXISTS public.dialogue_choices;
DROP SEQUENCE IF EXISTS public.decision_options_id_seq;
DROP TABLE IF EXISTS public.decision_options;
DROP SEQUENCE IF EXISTS public.criterion_scores_id_seq;
DROP TABLE IF EXISTS public.criterion_scores;
DROP SEQUENCE IF EXISTS public.collision_zones_id_seq;
DROP TABLE IF EXISTS public.collision_zones;
DROP SEQUENCE IF EXISTS public.clinical_tools_id_seq;
DROP TABLE IF EXISTS public.clinical_tools;
DROP SEQUENCE IF EXISTS public.casos_id_seq;
DROP TABLE IF EXISTS public.casos;
DROP SEQUENCE IF EXISTS public.case_versions_id_seq;
DROP TABLE IF EXISTS public.case_versions;
DROP TABLE IF EXISTS public.auth_permission;
DROP TABLE IF EXISTS public.auth_group_permissions;
DROP TABLE IF EXISTS public.auth_group;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.attempt_world_states;
DROP SEQUENCE IF EXISTS public.attempt_events_id_seq;
DROP TABLE IF EXISTS public.attempt_events;
DROP TABLE IF EXISTS public.access_requests;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_requests (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    reviewed_at timestamp with time zone
);


--
-- Name: access_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.access_requests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.access_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: attempt_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_events (
    id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    event_type character varying(48) NOT NULL,
    node_id bigint,
    decision_option_id bigint,
    score_delta integer DEFAULT 0 NOT NULL,
    stress_delta integer DEFAULT 0 NOT NULL,
    detail text,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: attempt_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attempt_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attempt_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attempt_events_id_seq OWNED BY public.attempt_events.id;


--
-- Name: attempt_world_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_world_states (
    attempt_id uuid NOT NULL,
    scene_map_id bigint,
    player_x integer DEFAULT 145 NOT NULL,
    player_y integer DEFAULT 430 NOT NULL,
    inventory_json text DEFAULT '[]'::text NOT NULL,
    inspected_object_keys_json text DEFAULT '[]'::text NOT NULL,
    viewed_dialogue_keys_json text DEFAULT '[]'::text NOT NULL,
    used_tool_keys_json text DEFAULT '[]'::text NOT NULL,
    flags_json text DEFAULT '{}'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id bigint,
    actor_role character varying(40),
    action character varying(120) NOT NULL,
    resource_type character varying(80),
    resource_id character varying(120),
    context_json text DEFAULT '{}'::text NOT NULL,
    ip_address character varying(80),
    user_agent text,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL,
    retention_until timestamp without time zone NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: case_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_versions (
    id bigint NOT NULL,
    simulation_case_id bigint NOT NULL,
    semantic_version character varying(32) NOT NULL,
    status character varying(24) NOT NULL,
    narrative_context text,
    cloned_from_id bigint,
    published_at timestamp without time zone,
    created_by bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    world_schema_version integer DEFAULT 2 NOT NULL,
    CONSTRAINT case_versions_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'IN_REVIEW'::character varying, 'PUBLISHED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


--
-- Name: case_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_versions_id_seq OWNED BY public.case_versions.id;


--
-- Name: casos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.casos (
    id bigint NOT NULL,
    titulo character varying(200) NOT NULL,
    descripcion text,
    contexto_narrativo text,
    activo boolean DEFAULT true NOT NULL,
    created_by bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: casos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.casos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: casos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.casos_id_seq OWNED BY public.casos.id;


--
-- Name: clinical_tools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_tools (
    id bigint NOT NULL,
    case_version_id bigint,
    tool_code character varying(80) NOT NULL,
    label character varying(120) NOT NULL,
    icon character varying(80) DEFAULT 'psychology'::character varying NOT NULL,
    category character varying(80) DEFAULT 'clinical'::character varying NOT NULL,
    description text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: clinical_tools_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinical_tools_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinical_tools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinical_tools_id_seq OWNED BY public.clinical_tools.id;


--
-- Name: collision_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collision_zones (
    id bigint NOT NULL,
    scene_map_id bigint NOT NULL,
    zone_key character varying(120) NOT NULL,
    label character varying(160),
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL
);


--
-- Name: collision_zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collision_zones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collision_zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collision_zones_id_seq OWNED BY public.collision_zones.id;


--
-- Name: criterion_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criterion_scores (
    id bigint NOT NULL,
    rubric_evaluation_id bigint NOT NULL,
    rubric_criterion_id bigint NOT NULL,
    score numeric(6,2) DEFAULT 0 NOT NULL,
    comment text,
    evidence_json text DEFAULT '{}'::text NOT NULL
);


--
-- Name: criterion_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.criterion_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: criterion_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.criterion_scores_id_seq OWNED BY public.criterion_scores.id;


--
-- Name: decision_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decision_options (
    id bigint NOT NULL,
    case_version_id bigint NOT NULL,
    option_key character varying(120) NOT NULL,
    source_node_id bigint NOT NULL,
    target_node_id bigint NOT NULL,
    text text NOT NULL,
    classification character varying(24) NOT NULL,
    score_delta integer DEFAULT 0 NOT NULL,
    stress_delta integer DEFAULT 0 NOT NULL,
    prohibited_penalty integer DEFAULT '-50'::integer NOT NULL,
    immediate_feedback text NOT NULL,
    prohibited_conduct boolean DEFAULT false NOT NULL,
    prohibition_reason text,
    CONSTRAINT decision_options_classification_check CHECK (((classification)::text = ANY ((ARRAY['ADEQUATE'::character varying, 'RISKY'::character varying, 'INADEQUATE'::character varying])::text[])))
);


--
-- Name: decision_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.decision_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: decision_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.decision_options_id_seq OWNED BY public.decision_options.id;


--
-- Name: dialogue_choices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dialogue_choices (
    id bigint NOT NULL,
    dialogue_tree_id bigint NOT NULL,
    choice_key character varying(120) NOT NULL,
    text text NOT NULL,
    decision_option_id bigint,
    required_tool_code character varying(80),
    effect_json text DEFAULT '{}'::text NOT NULL,
    display_order integer DEFAULT 1 NOT NULL
);


--
-- Name: dialogue_choices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dialogue_choices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dialogue_choices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dialogue_choices_id_seq OWNED BY public.dialogue_choices.id;


--
-- Name: dialogue_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dialogue_lines (
    id bigint NOT NULL,
    dialogue_tree_id bigint NOT NULL,
    display_order integer DEFAULT 1 NOT NULL,
    speaker_name character varying(160) NOT NULL,
    text text NOT NULL,
    emotion character varying(60) DEFAULT 'neutral'::character varying NOT NULL
);


--
-- Name: dialogue_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dialogue_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dialogue_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dialogue_lines_id_seq OWNED BY public.dialogue_lines.id;


--
-- Name: dialogue_trees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dialogue_trees (
    id bigint NOT NULL,
    scene_map_id bigint NOT NULL,
    map_object_id bigint,
    tree_key character varying(120) NOT NULL,
    speaker_name character varying(160) NOT NULL,
    portrait_key character varying(120),
    emotion character varying(60) DEFAULT 'neutral'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: dialogue_trees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dialogue_trees_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dialogue_trees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dialogue_trees_id_seq OWNED BY public.dialogue_trees.id;


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: escenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escenarios (
    id bigint NOT NULL,
    caso_id bigint NOT NULL,
    orden integer NOT NULL,
    nombre character varying(200) NOT NULL,
    contexto text,
    mapa_key character varying(100) NOT NULL
);


--
-- Name: escenarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.escenarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: escenarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.escenarios_id_seq OWNED BY public.escenarios.id;


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


--
-- Name: grupo_case_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupo_case_version (
    grupo_id bigint NOT NULL,
    case_version_id bigint NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: grupo_estudiante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupo_estudiante (
    grupo_id bigint NOT NULL,
    estudiante_id bigint NOT NULL
);


--
-- Name: grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupos (
    id bigint NOT NULL,
    nombre character varying(150) NOT NULL,
    codigo character varying(30) NOT NULL,
    profesor_id bigint NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;


--
-- Name: map_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.map_objects (
    id bigint NOT NULL,
    scene_map_id bigint NOT NULL,
    object_key character varying(120) NOT NULL,
    label character varying(180) NOT NULL,
    object_type character varying(32) NOT NULL,
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    width integer DEFAULT 48 NOT NULL,
    height integer DEFAULT 48 NOT NULL,
    color_hex character varying(16) DEFAULT '#4FA3A5'::character varying NOT NULL,
    icon character varying(80) DEFAULT 'psychology'::character varying NOT NULL,
    short_code character varying(12) DEFAULT 'ACT'::character varying NOT NULL,
    collision boolean DEFAULT false NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    interaction_prompt character varying(180) NOT NULL,
    interaction_text text NOT NULL,
    decision_option_id bigint,
    tool_code character varying(80),
    unlock_condition_json text DEFAULT '{}'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    z_index integer DEFAULT 0 NOT NULL,
    facing character varying(16) DEFAULT 'down'::character varying NOT NULL,
    movement_pattern_json text DEFAULT '{}'::text NOT NULL,
    metadata_json text DEFAULT '{}'::text NOT NULL,
    CONSTRAINT map_objects_object_type_check CHECK (((object_type)::text = ANY ((ARRAY['PERSON'::character varying, 'OBJECT'::character varying, 'ROUTE'::character varying, 'TOOL'::character varying, 'WARNING'::character varying, 'EXIT'::character varying])::text[])))
);


--
-- Name: map_objects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.map_objects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: map_objects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.map_objects_id_seq OWNED BY public.map_objects.id;


--
-- Name: opciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opciones (
    id bigint NOT NULL,
    pregunta_id bigint NOT NULL,
    texto text NOT NULL,
    es_correcta boolean DEFAULT false NOT NULL,
    feedback_texto text,
    normativa_ref character varying(300)
);


--
-- Name: opciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opciones_id_seq OWNED BY public.opciones.id;


--
-- Name: preguntas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preguntas (
    id bigint NOT NULL,
    escenario_id bigint NOT NULL,
    orden integer NOT NULL,
    enunciado text NOT NULL,
    puntos_correcta integer DEFAULT 10 NOT NULL
);


--
-- Name: preguntas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.preguntas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preguntas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.preguntas_id_seq OWNED BY public.preguntas.id;


--
-- Name: publication_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publication_checklist_items (
    id bigint NOT NULL,
    checklist_id bigint NOT NULL,
    code character varying(80) NOT NULL,
    label character varying(220) NOT NULL,
    required boolean DEFAULT true NOT NULL,
    fulfilled boolean DEFAULT false NOT NULL,
    evidence_note text
);


--
-- Name: publication_checklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publication_checklist_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publication_checklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publication_checklist_items_id_seq OWNED BY public.publication_checklist_items.id;


--
-- Name: publication_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publication_checklists (
    id bigint NOT NULL,
    case_version_id bigint NOT NULL,
    submitted_by bigint NOT NULL,
    completion_ratio numeric(5,2) DEFAULT 0 NOT NULL,
    status character varying(24) NOT NULL,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    CONSTRAINT publication_checklists_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'COMPLETE'::character varying, 'REJECTED'::character varying])::text[])))
);


--
-- Name: publication_checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publication_checklists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publication_checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publication_checklists_id_seq OWNED BY public.publication_checklists.id;


--
-- Name: reflection_journals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reflection_journals (
    id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    node_id bigint NOT NULL,
    encrypted_text text NOT NULL,
    encryption_key_ref character varying(120) NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: reflection_journals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reflection_journals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reflection_journals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reflection_journals_id_seq OWNED BY public.reflection_journals.id;


--
-- Name: respuestas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respuestas (
    id bigint NOT NULL,
    sesion_id bigint NOT NULL,
    pregunta_id bigint NOT NULL,
    opcion_id bigint NOT NULL,
    es_correcta boolean NOT NULL,
    tiempo_respuesta_ms integer,
    respondida_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: respuestas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.respuestas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: respuestas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.respuestas_id_seq OWNED BY public.respuestas.id;


--
-- Name: rubric_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubric_criteria (
    id bigint NOT NULL,
    rubric_id bigint NOT NULL,
    competency character varying(80) NOT NULL,
    title character varying(180) NOT NULL,
    description text,
    max_score integer DEFAULT 5 NOT NULL,
    display_order integer DEFAULT 1 NOT NULL,
    weight numeric(5,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: rubric_criteria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rubric_criteria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rubric_criteria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rubric_criteria_id_seq OWNED BY public.rubric_criteria.id;


--
-- Name: rubric_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubric_evaluations (
    id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    rubric_id bigint NOT NULL,
    instructor_id bigint NOT NULL,
    total_score numeric(6,2) DEFAULT 0 NOT NULL,
    comment text,
    evaluated_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    snapshot_json text DEFAULT '{}'::text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: rubric_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rubric_evaluations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rubric_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rubric_evaluations_id_seq OWNED BY public.rubric_evaluations.id;


--
-- Name: rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubrics (
    id bigint NOT NULL,
    case_version_id bigint,
    name character varying(180) NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_by bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    version character varying(30) DEFAULT '1.0'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone
);


--
-- Name: rubrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rubrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rubrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rubrics_id_seq OWNED BY public.rubrics.id;


--
-- Name: scene_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_maps (
    id bigint NOT NULL,
    case_version_id bigint NOT NULL,
    node_id bigint NOT NULL,
    map_key character varying(120) NOT NULL,
    title character varying(220) NOT NULL,
    width integer DEFAULT 960 NOT NULL,
    height integer DEFAULT 540 NOT NULL,
    theme character varying(80) DEFAULT 'clinical-soft'::character varying NOT NULL,
    spawn_x integer DEFAULT 145 NOT NULL,
    spawn_y integer DEFAULT 430 NOT NULL,
    ambient_json text DEFAULT '{}'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: scene_maps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scene_maps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scene_maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scene_maps_id_seq OWNED BY public.scene_maps.id;


--
-- Name: sesiones_juego; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesiones_juego (
    id bigint NOT NULL,
    estudiante_id bigint NOT NULL,
    caso_id bigint NOT NULL,
    fecha_inicio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_fin timestamp without time zone,
    puntaje_total integer DEFAULT 0 NOT NULL,
    completado boolean DEFAULT false NOT NULL
);


--
-- Name: sesiones_juego_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sesiones_juego_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sesiones_juego_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sesiones_juego_id_seq OWNED BY public.sesiones_juego.id;


--
-- Name: simulation_attempts_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_attempts_v2 (
    id uuid NOT NULL,
    attempt_token_hash character varying(128) NOT NULL,
    case_version_id bigint NOT NULL,
    student_id bigint NOT NULL,
    current_node_id bigint NOT NULL,
    status character varying(24) NOT NULL,
    accumulated_score integer DEFAULT 0 NOT NULL,
    stress_index integer DEFAULT 0 NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    locked_at timestamp without time zone,
    victim_risk integer DEFAULT 50 NOT NULL,
    user_trust integer DEFAULT 50 NOT NULL,
    institutional_route_activated boolean DEFAULT false NOT NULL,
    revictimization_risk boolean DEFAULT false NOT NULL,
    CONSTRAINT simulation_attempts_v2_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'SAFE_EXITED'::character varying, 'COMPLETED'::character varying])::text[])))
);


--
-- Name: simulation_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_cases (
    id bigint NOT NULL,
    code character varying(80) NOT NULL,
    title character varying(220) NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_by bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: simulation_cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.simulation_cases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: simulation_cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.simulation_cases_id_seq OWNED BY public.simulation_cases.id;


--
-- Name: simulation_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_nodes (
    id bigint NOT NULL,
    case_version_id bigint NOT NULL,
    node_key character varying(120) NOT NULL,
    title character varying(220) NOT NULL,
    narrative text NOT NULL,
    support_resources_json text DEFAULT '[]'::text NOT NULL,
    required_tools_json text DEFAULT '[]'::text NOT NULL,
    sensitive_content boolean DEFAULT false NOT NULL,
    safe_exit_required boolean DEFAULT false NOT NULL,
    warning_message text,
    start_node boolean DEFAULT false NOT NULL,
    terminal_node boolean DEFAULT false NOT NULL,
    position_x integer,
    position_y integer
);


--
-- Name: simulation_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.simulation_nodes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: simulation_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.simulation_nodes_id_seq OWNED BY public.simulation_nodes.id;


--
-- Name: simulation_rubric_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_rubric_assignments (
    id bigint NOT NULL,
    case_version_id bigint NOT NULL,
    rubric_id bigint NOT NULL,
    assigned_by bigint,
    active boolean DEFAULT true NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: simulation_rubric_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.simulation_rubric_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: simulation_rubric_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.simulation_rubric_assignments_id_seq OWNED BY public.simulation_rubric_assignments.id;


--
-- Name: student_case_completion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_case_completion (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    simulation_case_id bigint NOT NULL,
    first_completed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: student_case_completion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.student_case_completion ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.student_case_completion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'PROFESOR'::character varying, 'ESTUDIANTE'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attempt_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events ALTER COLUMN id SET DEFAULT nextval('public.attempt_events_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: case_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_versions ALTER COLUMN id SET DEFAULT nextval('public.case_versions_id_seq'::regclass);


--
-- Name: casos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.casos ALTER COLUMN id SET DEFAULT nextval('public.casos_id_seq'::regclass);


--
-- Name: clinical_tools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_tools ALTER COLUMN id SET DEFAULT nextval('public.clinical_tools_id_seq'::regclass);


--
-- Name: collision_zones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collision_zones ALTER COLUMN id SET DEFAULT nextval('public.collision_zones_id_seq'::regclass);


--
-- Name: criterion_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criterion_scores ALTER COLUMN id SET DEFAULT nextval('public.criterion_scores_id_seq'::regclass);


--
-- Name: decision_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_options ALTER COLUMN id SET DEFAULT nextval('public.decision_options_id_seq'::regclass);


--
-- Name: dialogue_choices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_choices ALTER COLUMN id SET DEFAULT nextval('public.dialogue_choices_id_seq'::regclass);


--
-- Name: dialogue_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_lines ALTER COLUMN id SET DEFAULT nextval('public.dialogue_lines_id_seq'::regclass);


--
-- Name: dialogue_trees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_trees ALTER COLUMN id SET DEFAULT nextval('public.dialogue_trees_id_seq'::regclass);


--
-- Name: escenarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escenarios ALTER COLUMN id SET DEFAULT nextval('public.escenarios_id_seq'::regclass);


--
-- Name: grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);


--
-- Name: map_objects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_objects ALTER COLUMN id SET DEFAULT nextval('public.map_objects_id_seq'::regclass);


--
-- Name: opciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones ALTER COLUMN id SET DEFAULT nextval('public.opciones_id_seq'::regclass);


--
-- Name: preguntas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas ALTER COLUMN id SET DEFAULT nextval('public.preguntas_id_seq'::regclass);


--
-- Name: publication_checklist_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklist_items ALTER COLUMN id SET DEFAULT nextval('public.publication_checklist_items_id_seq'::regclass);


--
-- Name: publication_checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklists ALTER COLUMN id SET DEFAULT nextval('public.publication_checklists_id_seq'::regclass);


--
-- Name: reflection_journals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_journals ALTER COLUMN id SET DEFAULT nextval('public.reflection_journals_id_seq'::regclass);


--
-- Name: respuestas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas ALTER COLUMN id SET DEFAULT nextval('public.respuestas_id_seq'::regclass);


--
-- Name: rubric_criteria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria ALTER COLUMN id SET DEFAULT nextval('public.rubric_criteria_id_seq'::regclass);


--
-- Name: rubric_evaluations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations ALTER COLUMN id SET DEFAULT nextval('public.rubric_evaluations_id_seq'::regclass);


--
-- Name: rubrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics ALTER COLUMN id SET DEFAULT nextval('public.rubrics_id_seq'::regclass);


--
-- Name: scene_maps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_maps ALTER COLUMN id SET DEFAULT nextval('public.scene_maps_id_seq'::regclass);


--
-- Name: sesiones_juego id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_juego ALTER COLUMN id SET DEFAULT nextval('public.sesiones_juego_id_seq'::regclass);


--
-- Name: simulation_cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_cases ALTER COLUMN id SET DEFAULT nextval('public.simulation_cases_id_seq'::regclass);


--
-- Name: simulation_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_nodes ALTER COLUMN id SET DEFAULT nextval('public.simulation_nodes_id_seq'::regclass);


--
-- Name: simulation_rubric_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_rubric_assignments ALTER COLUMN id SET DEFAULT nextval('public.simulation_rubric_assignments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: access_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.access_requests (id, nombre, apellido, email, status, created_at, reviewed_at) FROM stdin;
\.


--
-- Data for Name: attempt_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attempt_events (id, attempt_id, event_type, node_id, decision_option_id, score_delta, stress_delta, detail, occurred_at) FROM stdin;
5442	76c124bf-d077-467a-b204-ec3343c7e9bd	ATTEMPT_STARTED	299	\N	0	0	Intento iniciado	2026-06-15 20:42:12.008809
5443	76c124bf-d077-467a-b204-ec3343c7e9bd	NODE_ENTERED	299	\N	0	0	Nodo inicial	2026-06-15 20:42:12.011824
5447	c0423f87-e1d7-4179-98ac-2fba45f0cbac	ATTEMPT_STARTED	299	\N	0	0	Intento iniciado	2026-06-15 20:42:43.575325
5448	c0423f87-e1d7-4179-98ac-2fba45f0cbac	NODE_ENTERED	299	\N	0	0	Nodo inicial	2026-06-15 20:42:43.58052
5452	c0423f87-e1d7-4179-98ac-2fba45f0cbac	MAP_INTERACTION_OPENED	299	\N	0	0	Observar la zona restringida	2026-06-15 20:43:12.373903
5456	c0423f87-e1d7-4179-98ac-2fba45f0cbac	NPC_DIALOGUE_VIEWED	299	\N	0	0	NPC escuchado: psicologa-orientadora	2026-06-15 20:43:14.971126
5460	c0423f87-e1d7-4179-98ac-2fba45f0cbac	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:43:18.590185
5464	c0423f87-e1d7-4179-98ac-2fba45f0cbac	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:43:30.200449
5519	c0423f87-e1d7-4179-98ac-2fba45f0cbac	SAFE_EXIT_REQUESTED	299	\N	0	0	Reemplazado por nuevo intento	2026-06-15 21:03:28.697131
5520	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	ATTEMPT_STARTED	299	\N	0	0	Intento iniciado	2026-06-15 21:03:28.708089
5521	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	NODE_ENTERED	299	\N	0	0	Nodo inicial	2026-06-15 21:03:28.710335
5757	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	SAFE_EXIT_REQUESTED	300	\N	0	0	Reemplazado por nuevo intento	2026-06-15 21:06:19.980783
5758	b7586948-a869-4f69-9707-2a93e161ea9f	ATTEMPT_STARTED	299	\N	0	0	Intento iniciado	2026-06-15 21:06:19.990408
5759	b7586948-a869-4f69-9707-2a93e161ea9f	NODE_ENTERED	299	\N	0	0	Nodo inicial	2026-06-15 21:06:19.993703
5763	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:29.236482
5767	b7586948-a869-4f69-9707-2a93e161ea9f	NPC_DIALOGUE_VIEWED	299	\N	0	0	NPC escuchado: psicologa-orientadora	2026-06-15 21:06:34.826981
5771	b7586948-a869-4f69-9707-2a93e161ea9f	PROHIBITED_DECISION_RETRY_REQUIRED	299	699	0	0	La respuesta seleccionada puede ser riesgosa o inadecuada para este momento. Tienes una última oportunidad para volver a responder esta escena.	2026-06-15 21:06:41.830528
5775	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:48.251085
5779	b7586948-a869-4f69-9707-2a93e161ea9f	PROHIBITED_DECISION_SELECTED	299	699	-15	65	Alerta ética: la intervención puede aumentar el riesgo de revictimización. La urgencia vital y la estabilización van primero: interrogar a una víctima en shock la revictimiza.	2026-06-15 21:06:55.021962
5780	b7586948-a869-4f69-9707-2a93e161ea9f	NODE_ENTERED	300	\N	0	0	Nodo visitado	2026-06-15 21:06:55.024074
5784	b7586948-a869-4f69-9707-2a93e161ea9f	SAFE_EXIT_REQUESTED	300	\N	0	0	Salida segura solicitada	2026-06-15 21:07:07.228129
5791	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:00:31.193675
5795	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:20:55.050574
5444	76c124bf-d077-467a-b204-ec3343c7e9bd	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:42:17.758462
5449	c0423f87-e1d7-4179-98ac-2fba45f0cbac	MAP_INTERACTION_OPENED	299	\N	0	0	Tomar el kit de Primeros Auxilios Psicológicos	2026-06-15 20:43:07.750742
5453	c0423f87-e1d7-4179-98ac-2fba45f0cbac	MAP_INTERACTION_OPENED	299	\N	0	0	Observar la zona restringida	2026-06-15 20:43:12.701574
5457	c0423f87-e1d7-4179-98ac-2fba45f0cbac	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:43:15.923779
5461	c0423f87-e1d7-4179-98ac-2fba45f0cbac	PROHIBITED_DECISION_RETRY_REQUIRED	299	699	0	0	La respuesta seleccionada puede ser riesgosa o inadecuada para este momento. Puedes volver a responder esta escena.	2026-06-15 20:43:21.951946
5465	c0423f87-e1d7-4179-98ac-2fba45f0cbac	PROHIBITED_DECISION_RETRY_REQUIRED	299	699	0	0	La respuesta seleccionada puede ser riesgosa o inadecuada para este momento. Puedes volver a responder esta escena.	2026-06-15 20:43:31.650298
5522	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	PROHIBITED_DECISION_RETRY_REQUIRED	299	697	0	0	La respuesta seleccionada puede ser riesgosa o inadecuada para este momento. Tienes una última oportunidad para volver a responder esta escena.	2026-06-15 21:03:28.770411
5760	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:25.046447
5764	b7586948-a869-4f69-9707-2a93e161ea9f	NPC_DIALOGUE_VIEWED	299	\N	0	0	NPC escuchado: enfermera-urgencias	2026-06-15 21:06:31.812749
5768	b7586948-a869-4f69-9707-2a93e161ea9f	ROOM_ENTERED	299	\N	0	0	Puerta hacia sala hospital-sala-escucha	2026-06-15 21:06:36.035401
5772	b7586948-a869-4f69-9707-2a93e161ea9f	ROOM_ENTERED	299	\N	0	0	Puerta hacia sala hospital-urgencias	2026-06-15 21:06:45.049792
5776	b7586948-a869-4f69-9707-2a93e161ea9f	ROOM_ENTERED	299	\N	0	0	Puerta hacia sala hospital-sala-escucha	2026-06-15 21:06:48.833879
5781	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	300	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:56.938643
5785	46fa7d34-ba37-46c0-a4ee-a81d27ebcb19	ATTEMPT_STARTED	299	\N	0	0	Intento iniciado	2026-06-16 00:56:58.853931
5786	46fa7d34-ba37-46c0-a4ee-a81d27ebcb19	NODE_ENTERED	299	\N	0	0	Nodo inicial	2026-06-16 00:56:58.863366
5792	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:00:37.592994
5796	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:21:01.741855
5445	76c124bf-d077-467a-b204-ec3343c7e9bd	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:42:21.328282
5450	c0423f87-e1d7-4179-98ac-2fba45f0cbac	MAP_INTERACTION_OPENED	299	\N	0	0	Hablar con la familia en crisis	2026-06-15 20:43:08.593588
5454	c0423f87-e1d7-4179-98ac-2fba45f0cbac	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:43:12.752298
5458	c0423f87-e1d7-4179-98ac-2fba45f0cbac	ROOM_ENTERED	299	\N	0	0	Puerta hacia sala hospital-sala-escucha	2026-06-15 20:43:16.123086
5462	c0423f87-e1d7-4179-98ac-2fba45f0cbac	MAP_INTERACTION_OPENED	299	\N	0	0	Acompañar a la familia	2026-06-15 20:43:28.21304
5466	c0423f87-e1d7-4179-98ac-2fba45f0cbac	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:43:33.228375
5523	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	PROHIBITED_DECISION_SELECTED	299	697	-15	65	Alerta ética: la intervención puede aumentar el riesgo de revictimización. La noticia de una muerte exige protocolo (EPICEE/SPIKES), contención y estabilización previa. Sin eso, la crisis escala.	2026-06-15 21:03:28.824788
5524	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	NODE_ENTERED	300	\N	0	0	Nodo visitado	2026-06-15 21:03:28.827821
5761	b7586948-a869-4f69-9707-2a93e161ea9f	MAP_INTERACTION_OPENED	299	\N	0	0	Tomar el kit de Primeros Auxilios Psicológicos	2026-06-15 21:06:25.138888
5765	b7586948-a869-4f69-9707-2a93e161ea9f	MAP_INTERACTION_OPENED	299	\N	0	0	Observar la zona restringida	2026-06-15 21:06:32.975624
5769	b7586948-a869-4f69-9707-2a93e161ea9f	MAP_INTERACTION_OPENED	299	\N	0	0	Acompañar a la familia	2026-06-15 21:06:38.126351
5773	b7586948-a869-4f69-9707-2a93e161ea9f	ROOM_ENTERED	299	\N	0	0	Puerta hacia sala hospital-sala-escucha	2026-06-15 21:06:46.914094
5777	b7586948-a869-4f69-9707-2a93e161ea9f	MAP_INTERACTION_OPENED	299	\N	0	0	Acompañar a la familia	2026-06-15 21:06:50.093354
5782	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	300	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:59.883562
5787	46fa7d34-ba37-46c0-a4ee-a81d27ebcb19	SAFE_EXIT_REQUESTED	299	\N	0	0	Reemplazado por nuevo intento	2026-06-16 01:00:15.104085
5788	c01fa38d-d259-4666-8736-b596dd9540d6	ATTEMPT_STARTED	299	\N	0	0	Intento iniciado	2026-06-16 01:00:15.119722
5789	c01fa38d-d259-4666-8736-b596dd9540d6	NODE_ENTERED	299	\N	0	0	Nodo inicial	2026-06-16 01:00:15.122734
5793	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:00:39.244339
5446	76c124bf-d077-467a-b204-ec3343c7e9bd	SAFE_EXIT_REQUESTED	299	\N	0	0	Salida segura solicitada	2026-06-15 20:42:36.47316
5451	c0423f87-e1d7-4179-98ac-2fba45f0cbac	NPC_DIALOGUE_VIEWED	299	\N	0	0	NPC escuchado: enfermera-urgencias	2026-06-15 20:43:11.170218
5455	c0423f87-e1d7-4179-98ac-2fba45f0cbac	NPC_DIALOGUE_VIEWED	299	\N	0	0	NPC escuchado: psicologa-orientadora	2026-06-15 20:43:14.14512
5459	c0423f87-e1d7-4179-98ac-2fba45f0cbac	MAP_INTERACTION_OPENED	299	\N	0	0	Acompañar a la familia	2026-06-15 20:43:17.635862
5463	c0423f87-e1d7-4179-98ac-2fba45f0cbac	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 20:43:28.636238
5762	b7586948-a869-4f69-9707-2a93e161ea9f	MAP_INTERACTION_OPENED	299	\N	0	0	Hablar con la familia en crisis	2026-06-15 21:06:26.27889
5766	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:33.478695
5770	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:38.323101
5774	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:46.962689
5778	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:06:50.526847
5783	b7586948-a869-4f69-9707-2a93e161ea9f	WORLD_POSITION_UPDATED	300	\N	0	0	Posicion de jugador actualizada	2026-06-15 21:07:07.104405
5790	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:00:21.542124
5794	c01fa38d-d259-4666-8736-b596dd9540d6	WORLD_POSITION_UPDATED	299	\N	0	0	Posicion de jugador actualizada	2026-06-16 01:20:54.20432
4970	ad93c443-40f2-4323-b77a-5a971b68621b	ATTEMPT_STARTED	14	\N	0	0	Intento iniciado	2026-06-15 14:17:38.643774
4971	ad93c443-40f2-4323-b77a-5a971b68621b	NODE_ENTERED	14	\N	0	0	Nodo inicial	2026-06-15 14:17:38.649709
4972	ad93c443-40f2-4323-b77a-5a971b68621b	WORLD_POSITION_UPDATED	14	\N	0	0	Posicion de jugador actualizada	2026-06-15 14:17:45.975867
4973	ad93c443-40f2-4323-b77a-5a971b68621b	SAFE_EXIT_REQUESTED	14	\N	0	0	Salida segura solicitada	2026-06-15 14:17:48.021999
\.


--
-- Data for Name: attempt_world_states; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attempt_world_states (attempt_id, scene_map_id, player_x, player_y, inventory_json, inspected_object_keys_json, viewed_dialogue_keys_json, used_tool_keys_json, flags_json, updated_at) FROM stdin;
b7586948-a869-4f69-9707-2a93e161ea9f	298	322	458	["PAP"]	["tool-pap", "familia-crisis", "zona-restringida", "familia-duelo"]	["familia-crisis", "zona-restringida", "familia-duelo"]	[]	{"syncedNodeId": 300, "viewedNpcKeys": ["familia-crisis", "enfermera-urgencias", "psicologa-orientadora", "familia-duelo"], "caseFlags": {"interrogatorio_prematuro": true}, "caseMetrics": {"confianza": 30, "crisis_emocional": 65, "riesgo_victima": 65, "rigor_tecnico": 40, "etica_profesional": 25, "ruta_institucional": 50, "calidad_duelo": 50}}	2026-06-15 21:07:07.301828
c01fa38d-d259-4666-8736-b596dd9540d6	297	460	406	[]	[]	[]	[]	{"syncedNodeId": 299}	2026-06-16 07:29:25.372422
76c124bf-d077-467a-b204-ec3343c7e9bd	297	545	435	[]	[]	[]	[]	{"syncedNodeId": 299}	2026-06-15 20:42:36.581723
46fa7d34-ba37-46c0-a4ee-a81d27ebcb19	297	480	430	[]	[]	[]	[]	{"syncedNodeId": 299}	2026-06-16 00:56:59.18266
c0423f87-e1d7-4179-98ac-2fba45f0cbac	298	263	421	["PAP"]	["tool-pap", "familia-crisis", "zona-restringida", "familia-duelo"]	["familia-crisis", "zona-restringida", "familia-duelo"]	[]	{"syncedNodeId": 299, "viewedNpcKeys": ["familia-crisis", "enfermera-urgencias", "psicologa-orientadora", "familia-duelo"]}	2026-06-15 20:43:33.225843
ad93c443-40f2-4323-b77a-5a971b68621b	14	434	200	[]	[]	[]	[]	{"syncedNodeId": 14}	2026-06-15 20:41:06.973721
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_id, actor_role, action, resource_type, resource_id, context_json, ip_address, user_agent, occurred_at, retention_until) FROM stdin;
1	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	1	{"method":"startAttempt","class":"SimulationGameService"}	172.30.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-06-05 22:55:48.65651	2027-05-31 22:55:48.65651
2	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	1	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 07:55:28.096896	2027-06-04 07:55:28.096896
3	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	309735ce-d0c8-4e1a-9ec8-cabb12fbc5d9	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 07:55:46.937947	2027-06-04 07:55:46.937947
4	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	1	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 07:55:49.903014	2027-06-04 07:55:49.901886
5	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	b99084b1-4fc9-41df-bb83-411a2979f073	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 07:56:12.049031	2027-06-04 07:56:12.049031
6	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	1	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 07:59:09.131954	2027-06-04 07:59:09.13134
7	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; es-CO) WindowsPowerShell/5.1.26100.8457	2026-06-09 08:34:36.118808	2027-06-04 08:34:36.118808
8	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 08:45:35.772018	2027-06-04 08:45:35.772018
9	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 08:46:07.998641	2027-06-04 08:46:07.99764
10	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 09:27:02.796144	2027-06-04 09:27:02.796144
11	1	ADMIN	DECISION_SELECTED	ATTEMPT	3a1c873d-5c75-42eb-9a6f-836fe004b64d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 09:28:13.016453	2027-06-04 09:28:13.016453
12	1	ADMIN	DECISION_SELECTED	ATTEMPT	3a1c873d-5c75-42eb-9a6f-836fe004b64d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 09:29:21.276709	2027-06-04 09:29:21.275095
13	1	ADMIN	DECISION_SELECTED	ATTEMPT	3a1c873d-5c75-42eb-9a6f-836fe004b64d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 09:29:35.583226	2027-06-04 09:29:35.582674
14	1	ADMIN	DECISION_SELECTED	ATTEMPT	3a1c873d-5c75-42eb-9a6f-836fe004b64d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 09:29:48.979737	2027-06-04 09:29:48.979737
15	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 16:04:49.709792	2027-06-04 16:04:49.707542
16	1	ADMIN	DECISION_SELECTED	ATTEMPT	ab9e54ca-82cf-4ef2-a0aa-6e817de84f30	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 16:05:14.486823	2027-06-04 16:05:14.485771
17	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 16:22:50.028405	2027-06-04 16:22:50.028405
18	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 16:36:08.201038	2027-06-04 16:36:08.200518
19	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	74978b5c-f9cd-4d97-8d18-4fbc96797303	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 16:42:02.292134	2027-06-04 16:42:02.292134
20	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-09 18:11:00.291583	2027-06-04 18:11:00.290581
21	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-11 06:58:59.229687	2027-06-06 06:58:59.229687
22	1	ADMIN	DECISION_SELECTED	ATTEMPT	cf8368b9-fff0-4757-af2b-a4c717dc9147	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-11 07:06:38.549405	2027-06-06 07:06:38.549405
23	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-11 07:37:56.887066	2027-06-06 07:37:56.887066
24	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-11 07:43:07.808939	2027-06-06 07:43:07.808395
25	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 07:58:57.389675	2027-06-07 07:58:57.38867
26	1	ADMIN	DECISION_SELECTED	ATTEMPT	13fe4b02-1425-49ff-bc90-a6713bd9db66	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:00:16.706409	2027-06-07 08:00:16.706409
27	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:01:33.242031	2027-06-07 08:01:33.242031
28	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:14:59.046376	2027-06-07 08:14:59.046376
29	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:15:16.19139	2027-06-07 08:15:16.19139
30	3	ESTUDIANTE	ATTEMPT_STARTED	CASE_VERSION	2	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:26:14.019039	2027-06-07 08:26:14.018022
31	3	ESTUDIANTE	ATTEMPT_STARTED	CASE_VERSION	3	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:28:30.685216	2027-06-07 08:28:30.685216
32	3	ESTUDIANTE	DECISION_SELECTED	ATTEMPT	b4bc5347-5224-4a05-afa3-b4b77886556a	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:28:56.82294	2027-06-07 08:28:56.82294
33	3	ESTUDIANTE	SAFE_EXIT_REQUESTED	ATTEMPT	b4bc5347-5224-4a05-afa3-b4b77886556a	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:29:18.279091	2027-06-07 08:29:18.277196
34	3	ESTUDIANTE	ATTEMPT_STARTED	CASE_VERSION	3	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:31:18.263475	2027-06-07 08:31:18.262471
35	3	ESTUDIANTE	DECISION_SELECTED	ATTEMPT	b2dea836-016e-4fe1-b1c6-4a01bdb8f719	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:32:46.098404	2027-06-07 08:32:46.098404
36	3	ESTUDIANTE	DECISION_SELECTED	ATTEMPT	b2dea836-016e-4fe1-b1c6-4a01bdb8f719	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:38:16.571814	2027-06-07 08:38:16.57126
37	3	ESTUDIANTE	SAFE_EXIT_REQUESTED	ATTEMPT	b2dea836-016e-4fe1-b1c6-4a01bdb8f719	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:38:31.598128	2027-06-07 08:38:31.598128
38	3	ESTUDIANTE	ATTEMPT_STARTED	CASE_VERSION	3	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:39:06.353614	2027-06-07 08:39:06.353082
39	3	ESTUDIANTE	DECISION_SELECTED	ATTEMPT	8b8c9177-5416-4f7a-993b-807b0c348599	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:39:35.138331	2027-06-07 08:39:35.138331
40	3	ESTUDIANTE	DECISION_SELECTED	ATTEMPT	8b8c9177-5416-4f7a-993b-807b0c348599	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:39:49.534945	2027-06-07 08:39:49.534945
41	3	ESTUDIANTE	SAFE_EXIT_REQUESTED	ATTEMPT	8b8c9177-5416-4f7a-993b-807b0c348599	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-12 08:41:39.922239	2027-06-07 08:41:39.922239
42	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 10:49:22.208668	2027-06-09 10:49:22.208668
43	1	ADMIN	DECISION_SELECTED	ATTEMPT	25678892-cd80-4b08-a855-6ab699170939	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 11:58:52.922673	2027-06-09 11:58:52.922673
44	1	ADMIN	DECISION_SELECTED	ATTEMPT	25678892-cd80-4b08-a855-6ab699170939	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 12:02:38.883017	2027-06-09 12:02:38.883017
105	1	ADMIN	REFLECTION_SAVED	ATTEMPT	25678892-cd80-4b08-a855-6ab699170939	{"method": "save_reflection", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 13:41:30.067964	2027-06-09 13:41:30.067964
106	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	25678892-cd80-4b08-a855-6ab699170939	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 13:45:11.572929	2027-06-09 13:45:11.572929
107	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 13:45:26.592208	2027-06-09 13:45:26.591171
169	1	ADMIN	DECISION_SELECTED	ATTEMPT	81f54ee6-d126-4ab5-9163-e510c23e4e8e	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:27:23.97892	2027-06-09 14:27:23.972461
170	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	81f54ee6-d126-4ab5-9163-e510c23e4e8e	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:27:26.466615	2027-06-09 14:27:26.466615
171	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:27:32.316744	2027-06-09 14:27:32.316744
172	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:33:31.753044	2027-06-09 14:33:31.751046
234	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	edb4fa89-f9d9-4c1c-9b13-222be05bb86f	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:36:24.78052	2027-06-09 14:36:24.78052
235	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:36:35.049762	2027-06-09 14:36:35.049762
236	1	ADMIN	REFLECTION_SAVED	ATTEMPT	2e03a487-2e0b-491b-b948-ad685c6cde47	{"method": "save_reflection", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:40:04.987771	2027-06-09 14:40:04.986752
237	1	ADMIN	DECISION_SELECTED	ATTEMPT	2e03a487-2e0b-491b-b948-ad685c6cde47	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:41:05.53215	2027-06-09 14:41:05.531068
238	1	ADMIN	DECISION_SELECTED	ATTEMPT	2e03a487-2e0b-491b-b948-ad685c6cde47	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:41:43.075323	2027-06-09 14:41:43.07431
239	1	ADMIN	DECISION_SELECTED	ATTEMPT	2e03a487-2e0b-491b-b948-ad685c6cde47	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:42:42.096925	2027-06-09 14:42:42.096925
240	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	2e03a487-2e0b-491b-b948-ad685c6cde47	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:51:05.109001	2027-06-09 14:51:05.108386
241	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:51:13.222552	2027-06-09 14:51:13.222552
242	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	064d93ac-fad1-4a6b-97ab-bd05a64866a6	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:51:14.514382	2027-06-09 14:51:14.514382
243	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:51:59.202366	2027-06-09 14:51:59.202366
244	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	dfcd7956-8c39-4146-96e4-dbcf52e8226b	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:52:00.898481	2027-06-09 14:52:00.89741
245	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 14:52:03.899319	2027-06-09 14:52:03.899319
700	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:24:18.576472	2027-06-10 07:24:18.575352
703	1	ADMIN	DECISION_SELECTED	ATTEMPT	9df4b7ce-506c-4749-894b-8894db491434	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:30:50.25567	2027-06-10 07:30:50.25567
706	1	ADMIN	DECISION_SELECTED	ATTEMPT	9df4b7ce-506c-4749-894b-8894db491434	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:33:22.692059	2027-06-10 07:33:22.691054
709	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:34:10.090571	2027-06-10 07:34:10.090571
424	1	ADMIN	DECISION_SELECTED	ATTEMPT	5b100243-9d8b-44d2-9c77-19f1c433b3b1	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:02:10.333648	2027-06-09 22:02:10.333648
427	1	ADMIN	DECISION_SELECTED	ATTEMPT	5b100243-9d8b-44d2-9c77-19f1c433b3b1	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:06:09.405281	2027-06-09 22:06:09.405281
928	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 08:28:28.755992	2027-06-10 08:28:28.755347
931	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	5ed34a91-60fe-4aa8-b734-86024a4feff6	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 08:30:24.333616	2027-06-10 08:30:24.333616
934	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 12:34:06.151844	2027-06-10 12:34:06.15067
937	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	3	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 14:17:38.666425	2027-06-10 14:17:38.666425
446	1	ADMIN	DECISION_SELECTED	ATTEMPT	d48bdc13-9450-469d-9532-0f655af2cc7d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:25:57.277911	2027-06-09 22:25:57.277373
449	1	ADMIN	DECISION_SELECTED	ATTEMPT	d48bdc13-9450-469d-9532-0f655af2cc7d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:27:16.785031	2027-06-09 22:27:16.785031
701	1	ADMIN	DECISION_SELECTED	ATTEMPT	9df4b7ce-506c-4749-894b-8894db491434	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:30:24.459888	2027-06-10 07:30:24.459302
704	1	ADMIN	DECISION_SELECTED	ATTEMPT	9df4b7ce-506c-4749-894b-8894db491434	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:32:40.628369	2027-06-10 07:32:40.627351
707	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:34:04.847754	2027-06-10 07:34:04.847198
710	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	496021e4-7629-4a2e-bb1a-1bd1537f0e33	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:34:17.459974	2027-06-10 07:34:17.459974
926	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 08:18:00.103	2027-06-10 08:18:00.100407
929	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	50b76ebc-445d-4b3c-950c-41b5e3dbeff7	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 08:28:36.41119	2027-06-10 08:28:36.41119
932	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 12:32:56.804865	2027-06-10 12:32:56.804865
935	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	191b9419-13c9-4486-9a96-c37a39c6af84	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 12:35:09.916468	2027-06-10 12:35:09.915469
938	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	ad93c443-40f2-4323-b77a-5a971b68621b	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 14:17:48.036952	2027-06-10 14:17:48.036255
940	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	902279c4-b26f-40fb-9b48-96b863e142d7	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 18:32:04.457811	2027-06-10 18:32:04.457811
942	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.12603.1 Chrome/148.0.7778.254 Electron/42.4.0 Safari/537.36	2026-06-15 19:41:55.306265	2027-06-10 19:41:55.304755
944	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.12603.1 Chrome/148.0.7778.254 Electron/42.4.0 Safari/537.36	2026-06-15 19:44:44.25971	2027-06-10 19:44:44.25971
425	1	ADMIN	DECISION_SELECTED	ATTEMPT	5b100243-9d8b-44d2-9c77-19f1c433b3b1	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:02:26.250325	2027-06-09 22:02:26.249661
428	1	ADMIN	DECISION_SELECTED	ATTEMPT	5b100243-9d8b-44d2-9c77-19f1c433b3b1	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:06:34.459155	2027-06-09 22:06:34.458607
444	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:24:19.206084	2027-06-09 22:24:19.205054
447	1	ADMIN	DECISION_SELECTED	ATTEMPT	d48bdc13-9450-469d-9532-0f655af2cc7d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:26:08.15347	2027-06-09 22:26:08.15347
450	1	ADMIN	DECISION_SELECTED	ATTEMPT	d48bdc13-9450-469d-9532-0f655af2cc7d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:27:25.190451	2027-06-09 22:27:25.189905
370	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:49:22.430515	2027-06-09 15:49:22.429514
371	1	ADMIN	DECISION_SELECTED	ATTEMPT	305ec1b6-fedd-4ce7-9c5a-98d76a665905	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:50:27.701865	2027-06-09 15:50:27.700763
372	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	305ec1b6-fedd-4ce7-9c5a-98d76a665905	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:50:29.455061	2027-06-09 15:50:29.45429
373	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:50:52.600979	2027-06-09 15:50:52.600979
374	1	ADMIN	DECISION_SELECTED	ATTEMPT	573eb61c-e963-4a94-8533-9fb2ad723d2f	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:51:25.041789	2027-06-09 15:51:25.041227
375	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	573eb61c-e963-4a94-8533-9fb2ad723d2f	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:52:25.67648	2027-06-09 15:52:25.67648
376	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:52:38.578073	2027-06-09 15:52:38.577567
377	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	5068f196-9abe-4ef5-a982-1a184985691a	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 15:54:10.656737	2027-06-09 15:54:10.655224
378	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 16:13:38.760564	2027-06-09 16:13:38.760564
702	1	ADMIN	DECISION_SELECTED	ATTEMPT	9df4b7ce-506c-4749-894b-8894db491434	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:30:41.83478	2027-06-10 07:30:41.833675
705	1	ADMIN	DECISION_SELECTED	ATTEMPT	9df4b7ce-506c-4749-894b-8894db491434	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:33:02.01328	2027-06-10 07:33:02.011759
708	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	e115205d-030e-4586-b1d8-ff229ae97bb7	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:34:07.238134	2027-06-10 07:34:07.237018
711	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 07:34:21.03411	2027-06-10 07:34:21.032804
927	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	6fefe2b0-400a-4aba-9f8b-6958418b8a00	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 08:18:18.286502	2027-06-10 08:18:18.286079
930	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 08:28:39.743131	2027-06-10 08:28:39.743131
933	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	e1054f1c-df41-4fed-ade8-8bc69d95994c	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 12:33:21.667675	2027-06-10 12:33:21.667675
936	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 14:15:25.813366	2027-06-10 14:15:25.812755
939	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 18:31:15.230853	2027-06-10 18:31:15.229722
941	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 19:41:01.586	2027-06-10 19:41:01.584981
943	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	1224046f-2838-400b-b6f0-316ee7d3c488	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.12603.1 Chrome/148.0.7778.254 Electron/42.4.0 Safari/537.36	2026-06-15 19:42:56.601077	2027-06-10 19:42:56.601077
426	1	ADMIN	DECISION_SELECTED	ATTEMPT	5b100243-9d8b-44d2-9c77-19f1c433b3b1	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:02:34.064382	2027-06-09 22:02:34.064382
429	1	ADMIN	DECISION_SELECTED	ATTEMPT	5b100243-9d8b-44d2-9c77-19f1c433b3b1	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:06:51.314239	2027-06-09 22:06:51.31373
445	1	ADMIN	DECISION_SELECTED	ATTEMPT	d48bdc13-9450-469d-9532-0f655af2cc7d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:25:41.456154	2027-06-09 22:25:41.456154
448	1	ADMIN	DECISION_SELECTED	ATTEMPT	d48bdc13-9450-469d-9532-0f655af2cc7d	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-14 22:27:04.386746	2027-06-09 22:27:04.386746
1391	1	ADMIN	DECISION_SELECTED	ATTEMPT	b7586948-a869-4f69-9707-2a93e161ea9f	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 21:06:41.855449	2027-06-10 21:06:41.855449
1393	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	b7586948-a869-4f69-9707-2a93e161ea9f	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 21:07:07.248452	2027-06-10 21:07:07.248452
1395	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-16 01:00:15.137891	2027-06-11 01:00:15.136788
1215	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 20:42:12.020236	2027-06-10 20:42:12.019485
1216	1	ADMIN	SAFE_EXIT_REQUESTED	ATTEMPT	76c124bf-d077-467a-b204-ec3343c7e9bd	{"method": "safe_exit", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 20:42:36.495317	2027-06-10 20:42:36.495317
1217	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 20:42:43.602067	2027-06-10 20:42:43.600349
1218	1	ADMIN	DECISION_SELECTED	ATTEMPT	c0423f87-e1d7-4179-98ac-2fba45f0cbac	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 20:43:21.957994	2027-06-10 20:43:21.957994
1219	1	ADMIN	DECISION_SELECTED	ATTEMPT	c0423f87-e1d7-4179-98ac-2fba45f0cbac	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 20:43:31.659576	2027-06-10 20:43:31.659576
1390	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 21:06:20.003243	2027-06-10 21:06:20.003243
1392	1	ADMIN	DECISION_SELECTED	ATTEMPT	b7586948-a869-4f69-9707-2a93e161ea9f	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 21:06:55.030632	2027-06-10 21:06:55.030632
1394	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.12603.1 Chrome/148.0.7778.254 Electron/42.4.0 Safari/537.36	2026-06-16 00:56:58.878645	2027-06-11 00:56:58.877236
1249	1	ADMIN	ATTEMPT_STARTED	CASE_VERSION	4	{"method": "start_attempt", "class": "game_service"}	127.0.0.1	Python-urllib/3.12	2026-06-15 21:03:28.721375	2027-06-10 21:03:28.720456
1250	1	ADMIN	DECISION_SELECTED	ATTEMPT	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Python-urllib/3.12	2026-06-15 21:03:28.774324	2027-06-10 21:03:28.774324
1251	1	ADMIN	DECISION_SELECTED	ATTEMPT	ccdd0ee0-70b0-46e1-bbd5-751971ab2043	{"method": "choose_decision", "class": "game_service"}	127.0.0.1	Python-urllib/3.12	2026-06-15 21:03:28.83808	2027-06-10 21:03:28.836555
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add permission	1	add_permission
2	Can change permission	1	change_permission
3	Can delete permission	1	delete_permission
4	Can view permission	1	view_permission
5	Can add group	2	add_group
6	Can change group	2	change_group
7	Can delete group	2	delete_group
8	Can view group	2	view_group
9	Can add content type	3	add_contenttype
10	Can change content type	3	change_contenttype
11	Can delete content type	3	delete_contenttype
12	Can view content type	3	view_contenttype
13	Can add student case completion	4	add_studentcasecompletion
14	Can change student case completion	4	change_studentcasecompletion
15	Can delete student case completion	4	delete_studentcasecompletion
16	Can view student case completion	4	view_studentcasecompletion
17	Can add custom user	5	add_customuser
18	Can change custom user	5	change_customuser
19	Can delete custom user	5	delete_customuser
20	Can view custom user	5	view_customuser
21	Can add grupo	6	add_grupo
22	Can change grupo	6	change_grupo
23	Can delete grupo	6	delete_grupo
24	Can view grupo	6	view_grupo
25	Can add simulation case	7	add_simulationcase
26	Can change simulation case	7	change_simulationcase
27	Can delete simulation case	7	delete_simulationcase
28	Can view simulation case	7	view_simulationcase
29	Can add case version	8	add_caseversion
30	Can change case version	8	change_caseversion
31	Can delete case version	8	delete_caseversion
32	Can view case version	8	view_caseversion
33	Can add simulation node	9	add_simulationnode
34	Can change simulation node	9	change_simulationnode
35	Can delete simulation node	9	delete_simulationnode
36	Can view simulation node	9	view_simulationnode
37	Can add decision option	10	add_decisionoption
38	Can change decision option	10	change_decisionoption
39	Can delete decision option	10	delete_decisionoption
40	Can view decision option	10	view_decisionoption
41	Can add simulation attempt	11	add_simulationattempt
42	Can change simulation attempt	11	change_simulationattempt
43	Can delete simulation attempt	11	delete_simulationattempt
44	Can view simulation attempt	11	view_simulationattempt
45	Can add attempt event	12	add_attemptevent
46	Can change attempt event	12	change_attemptevent
47	Can delete attempt event	12	delete_attemptevent
48	Can view attempt event	12	view_attemptevent
49	Can add reflection journal	13	add_reflectionjournal
50	Can change reflection journal	13	change_reflectionjournal
51	Can delete reflection journal	13	delete_reflectionjournal
52	Can view reflection journal	13	view_reflectionjournal
53	Can add attempt world state	14	add_attemptworldstate
54	Can change attempt world state	14	change_attemptworldstate
55	Can delete attempt world state	14	delete_attemptworldstate
56	Can view attempt world state	14	view_attemptworldstate
57	Can add rubric	15	add_rubric
58	Can change rubric	15	change_rubric
59	Can delete rubric	15	delete_rubric
60	Can view rubric	15	view_rubric
61	Can add rubric criterion	16	add_rubriccriterion
62	Can change rubric criterion	16	change_rubriccriterion
63	Can delete rubric criterion	16	delete_rubriccriterion
64	Can view rubric criterion	16	view_rubriccriterion
65	Can add rubric evaluation	17	add_rubricevaluation
66	Can change rubric evaluation	17	change_rubricevaluation
67	Can delete rubric evaluation	17	delete_rubricevaluation
68	Can view rubric evaluation	17	view_rubricevaluation
69	Can add criterion score	18	add_criterionscore
70	Can change criterion score	18	change_criterionscore
71	Can delete criterion score	18	delete_criterionscore
72	Can view criterion score	18	view_criterionscore
73	Can add publication checklist	19	add_publicationchecklist
74	Can change publication checklist	19	change_publicationchecklist
75	Can delete publication checklist	19	delete_publicationchecklist
76	Can view publication checklist	19	view_publicationchecklist
77	Can add publication checklist item	20	add_publicationchecklistitem
78	Can change publication checklist item	20	change_publicationchecklistitem
79	Can delete publication checklist item	20	delete_publicationchecklistitem
80	Can view publication checklist item	20	view_publicationchecklistitem
81	Can add audit log	21	add_auditlog
82	Can change audit log	21	change_auditlog
83	Can delete audit log	21	delete_auditlog
84	Can view audit log	21	view_auditlog
85	Can add scene map	22	add_scenemap
86	Can change scene map	22	change_scenemap
87	Can delete scene map	22	delete_scenemap
88	Can view scene map	22	view_scenemap
89	Can add map object	23	add_mapobject
90	Can change map object	23	change_mapobject
91	Can delete map object	23	delete_mapobject
92	Can view map object	23	view_mapobject
93	Can add collision zone	24	add_collisionzone
94	Can change collision zone	24	change_collisionzone
95	Can delete collision zone	24	delete_collisionzone
96	Can view collision zone	24	view_collisionzone
97	Can add dialogue tree	25	add_dialoguetree
98	Can change dialogue tree	25	change_dialoguetree
99	Can delete dialogue tree	25	delete_dialoguetree
100	Can view dialogue tree	25	view_dialoguetree
101	Can add dialogue line	26	add_dialogueline
102	Can change dialogue line	26	change_dialogueline
103	Can delete dialogue line	26	delete_dialogueline
104	Can view dialogue line	26	view_dialogueline
105	Can add dialogue choice	27	add_dialoguechoice
106	Can change dialogue choice	27	change_dialoguechoice
107	Can delete dialogue choice	27	delete_dialoguechoice
108	Can view dialogue choice	27	view_dialoguechoice
109	Can add clinical tool	28	add_clinicaltool
110	Can change clinical tool	28	change_clinicaltool
111	Can delete clinical tool	28	delete_clinicaltool
112	Can view clinical tool	28	view_clinicaltool
113	Can add access request	29	add_accessrequest
114	Can change access request	29	change_accessrequest
115	Can delete access request	29	delete_accessrequest
116	Can view access request	29	view_accessrequest
117	Can add simulation rubric assignment	30	add_simulationrubricassignment
118	Can change simulation rubric assignment	30	change_simulationrubricassignment
119	Can delete simulation rubric assignment	30	delete_simulationrubricassignment
120	Can view simulation rubric assignment	30	view_simulationrubricassignment
\.


--
-- Data for Name: case_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_versions (id, simulation_case_id, semantic_version, status, narrative_context, cloned_from_id, published_at, created_by, created_at, version, world_schema_version) FROM stdin;
1	1	1.0.0	ARCHIVED	Caso formativo sobre atencion psicologica, seguridad, marco normativo colombiano, riesgo de feminicidio, NNA y cierre psicosocial integral.	\N	2026-06-05 22:36:23.470238	2	2026-06-05 22:36:23.470238	0	2
4	1	2.0.0	PUBLISHED	Barrio con altas condiciones de vulnerabilidad. Un hombre de 28 años ataca con arma cortopunzante a su pareja de 22 años (28 heridas) y a la hija de ambos de 3 años, quien fallece. El recorrido cubre la urgencia vital y la crisis familiar en el hospital y, quince días después, el restablecimiento de derechos en la Comisaría de Familia.	\N	2026-06-14 10:40:27.480913	2	2026-06-14 10:40:27.485459	0	1
3	3	1.0.0	ARCHIVED	Estrategia de gamificacion estructurada como juego de roles. El caso integra normativa colombiana: Ley 1257 de 2008, Ley 1098 de 2006, Ley 2126 de 2021 y Resolucion 459 de 2012, protocolo de atencion integral en salud para victimas de violencia sexual y de genero.	\N	2026-06-12 08:26:14.838205	1	2026-06-12 08:26:14.838749	0	1
59	14	0.1.0	DRAFT	llllllllllllllllllllllllllllllll	\N	\N	1	2026-06-15 21:22:59.694474	0	2
\.


--
-- Data for Name: casos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.casos (id, titulo, descripcion, contexto_narrativo, activo, created_by, created_at) FROM stdin;
1	Violencia Familiar y Tentativa de Feminicidio	Caso clínico sobre atención psicológica en contexto de violencia intrafamiliar grave con riesgo de feminicidio.	Una mujer de 34 años, con dos hijos menores de edad (7 y 10 años), acude al servicio de urgencias del hospital con hematomas visibles en rostro y brazos. Refiere que su pareja la agredió físicamente durante la madrugada. Esta es la tercera vez que acude al servicio en seis meses. Expresa temor por su vida y la de sus hijos. Su pareja tiene antecedentes de consumo de alcohol y amenazas previas con arma blanca.	t	1	2026-06-05 22:36:22.75206
\.


--
-- Data for Name: clinical_tools; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinical_tools (id, case_version_id, tool_code, label, icon, category, description, active) FROM stdin;
1	1	PAP	Primeros Auxilios Psicologicos	psychology	contencion	Escucha activa, validacion emocional, respiracion y orientacion inmediata.	t
2	1	SPIKES	SPIKES	forum	comunicacion	Comunicacion cuidadosa para entregar informacion sensible sin revictimizar.	t
3	1	RISK_METER	Medidor de riesgo	monitoring	riesgo	Busca armas, amenazas, reincidencia, aislamiento y otros factores de riesgo.	t
4	1	SAFETY_ROUTE	Ruta de proteccion	health_and_safety	proteccion	Prioriza medidas de proteccion, red de apoyo y articulacion institucional.	t
5	1	REFLECTION_JOURNAL	Bitacora reflexiva	edit_note	reflexion	Registra razonamiento profesional, hipotesis y criterios eticos.	t
16	3	PAP	Primeros Auxilios Psicologicos	volunteer_activism	crisis	Contencion emocional inicial, duelo inicial y estabilizacion de crisis.	t
17	3	EPICEE	EPICEE / SPIKES	forum	comunicacion	Protocolo para comunicar malas noticias con cuidado y verificacion emocional.	t
18	3	PROTOCOLO_459	Resolucion 459 de 2012	medical_services	normativa	Atencion integral en salud para violencias sexuales y basadas en genero.	t
19	3	LEY_1257	Ley 1257 de 2008	gavel	normativa	Prevencion, proteccion y sancion frente a violencias contra mujeres.	t
20	3	LEY_1098	Ley 1098 de 2006	child_care	normativa	Proteccion integral de ninas, ninos y adolescentes.	t
21	3	LEY_2126	Ley 2126 de 2021	account_balance	normativa	Marco de fortalecimiento de Comisarias de Familia.	t
22	3	VAL_RIESGO_FEM	Valoracion de riesgo de feminicidio	warning	riesgo	Identificacion del riesgo letal y medidas urgentes de proteccion.	t
23	3	RUTA_PROTECCION	Medidas de proteccion y derechos	shield	proteccion	Proteccion, derechos economicos, justicia y seguimiento institucional.	t
24	3	DERIVACION_SALUD_MENTAL	Rutas de salud y salud mental	psychology	salud	Remision a salud, salud mental, psicologia clinica o psiquiatria segun el caso.	t
25	3	INTERDISCIPLINAR	Manejo interdisciplinar	groups	coordinacion	Coordinacion para decisiones clinicas, psicosociales y de proteccion.	t
196	4	PAP	Primeros Auxilios Psicológicos	healing	crisis	Contención y estabilización emocional en crisis.	t
197	4	SPIKES	Protocolo EPICEE/SPIKES	description	comunicacion	Comunicación protocolizada de noticias difíciles.	t
198	4	RISK_METER	Valoración de riesgo	monitor_heart	evaluacion	Valoración estructurada del riesgo de feminicidio.	t
199	4	SAFETY_ROUTE	Ruta de protección	alt_route	proteccion	Activación de medidas de protección y rutas institucionales.	t
200	4	REFLECTION_JOURNAL	Bitácora reflexiva	edit_note	reflexion	Registro reflexivo del proceso de intervención.	t
\.


--
-- Data for Name: collision_zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.collision_zones (id, scene_map_id, zone_key, label, position_x, position_y, width, height) FROM stdin;
1	1	registro	Mesa de registro	133	107	210	78
2	1	valoracion	Area de valoracion	648	112	193	92
3	1	escucha	Espacio de escucha	374	320	230	88
4	2	registro	Mesa de registro	133	107	210	78
5	2	valoracion	Area de valoracion	648	112	193	92
6	2	escucha	Espacio de escucha	374	320	230	88
7	3	registro	Mesa de registro	133	107	210	78
8	3	valoracion	Area de valoracion	648	112	193	92
9	3	escucha	Espacio de escucha	374	320	230	88
10	4	registro	Mesa de registro	133	107	210	78
11	4	valoracion	Area de valoracion	648	112	193	92
12	4	escucha	Espacio de escucha	374	320	230	88
13	5	registro	Mesa de registro	133	107	210	78
14	5	valoracion	Area de valoracion	648	112	193	92
15	5	escucha	Espacio de escucha	374	320	230	88
16	6	registro	Mesa de registro	133	107	210	78
17	6	valoracion	Area de valoracion	648	112	193	92
18	6	escucha	Espacio de escucha	374	320	230	88
2333	297	pared-fondo	pared-fondo	0	0	960	236
2334	297	borde-frontal	borde-frontal	0	486	960	42
2335	297	pared-izquierda	pared-izquierda	0	0	96	528
2336	297	pared-derecha	pared-derecha	864	0	96	528
2337	297	mostrador-triage	Mostrador de triage	380	252	220	56
2338	297	sillas-espera	Sillas de espera	120	308	150	38
2339	297	camilla	Camilla	700	300	110	46
2340	297	planta-urgencias	Planta	800	380	44	40
2341	298	pared-fondo	pared-fondo	0	0	960	236
2342	298	borde-frontal	borde-frontal	0	486	960	42
2343	298	pared-izquierda	pared-izquierda	0	0	96	528
2344	298	pared-derecha	pared-derecha	864	0	96	528
2345	298	sofa-escucha	Sofá de escucha	130	300	130	64
2346	298	mesa-centro	Mesa de centro	280	370	90	36
2347	298	estante-protocolos	Estante de protocolos	600	256	150	44
2348	298	silla-profesional	Silla	680	330	56	36
2349	299	pared-fondo	pared-fondo	0	0	960	236
2350	299	borde-frontal	borde-frontal	0	486	960	42
2351	299	pared-izquierda	pared-izquierda	0	0	96	528
2352	299	pared-derecha	pared-derecha	864	0	96	528
2353	299	sofa-escucha	Sofá de escucha	130	300	130	64
2354	299	mesa-centro	Mesa de centro	280	370	90	36
2355	299	estante-protocolos	Estante de protocolos	600	256	150	44
2356	299	silla-profesional	Silla	680	330	56	36
2357	300	pared-fondo	pared-fondo	0	0	960	236
2358	300	borde-frontal	borde-frontal	0	486	960	42
2359	300	pared-izquierda	pared-izquierda	0	0	96	528
2360	300	pared-derecha	pared-derecha	864	0	96	528
2361	300	sofa-escucha	Sofá de escucha	130	300	130	64
2362	300	mesa-centro	Mesa de centro	280	370	90	36
2363	300	estante-protocolos	Estante de protocolos	600	256	150	44
2364	300	silla-profesional	Silla	680	330	56	36
2365	301	pared-fondo	pared-fondo	0	0	960	236
2366	301	borde-frontal	borde-frontal	0	486	960	42
2367	301	pared-izquierda	pared-izquierda	0	0	96	528
54	14	wall-n	Pared norte	0	0	960	22
55	14	wall-s	Pared sur	0	618	960	22
56	14	wall-w	Pared oeste	0	0	22	640
57	14	wall-e	Pared este	938	0	22	640
58	14	desk-block	Modulo central	340	330	265	62
59	15	wall-n	Pared norte	0	0	960	22
60	15	wall-s	Pared sur	0	618	960	22
61	15	wall-w	Pared oeste	0	0	22	640
62	15	wall-e	Pared este	938	0	22	640
63	15	desk-block	Modulo central	340	330	265	62
64	16	wall-n	Pared norte	0	0	960	22
65	16	wall-s	Pared sur	0	618	960	22
66	16	wall-w	Pared oeste	0	0	22	640
67	16	wall-e	Pared este	938	0	22	640
68	16	desk-block	Modulo central	340	330	265	62
69	17	wall-n	Pared norte	0	0	960	22
70	17	wall-s	Pared sur	0	618	960	22
71	17	wall-w	Pared oeste	0	0	22	640
72	17	wall-e	Pared este	938	0	22	640
73	17	desk-block	Modulo central	340	330	265	62
74	18	wall-n	Pared norte	0	0	960	22
75	18	wall-s	Pared sur	0	618	960	22
76	18	wall-w	Pared oeste	0	0	22	640
77	18	wall-e	Pared este	938	0	22	640
78	18	desk-block	Modulo central	340	330	265	62
79	19	wall-n	Pared norte	0	0	960	22
80	19	wall-s	Pared sur	0	618	960	22
81	19	wall-w	Pared oeste	0	0	22	640
82	19	wall-e	Pared este	938	0	22	640
83	19	desk-block	Modulo central	340	330	265	62
84	20	wall-n	Pared norte	0	0	960	22
85	20	wall-s	Pared sur	0	618	960	22
86	20	wall-w	Pared oeste	0	0	22	640
87	20	wall-e	Pared este	938	0	22	640
88	20	desk-block	Modulo central	340	330	265	62
2368	301	pared-derecha	pared-derecha	864	0	96	528
2369	301	mostrador-recepcion	Mostrador de recepción	380	252	220	56
2370	301	archivadores	Archivadores	700	250	130	46
2371	301	sillas-espera-comisaria	Sillas de espera	120	308	150	38
2372	302	pared-fondo	pared-fondo	0	0	960	236
2373	302	borde-frontal	borde-frontal	0	486	960	42
2374	302	pared-izquierda	pared-izquierda	0	0	96	528
2375	302	pared-derecha	pared-derecha	864	0	96	528
2376	302	escritorio-consultorio	Escritorio	430	268	200	60
2377	302	archivador-consultorio	Archivador	760	254	90	44
2378	302	silla-izquierda	Silla	380	352	44	32
2379	302	silla-derecha	Silla	560	352	44	32
2380	302	planta-consultorio	Planta	110	380	44	40
2381	303	pared-fondo	pared-fondo	0	0	960	236
2382	303	borde-frontal	borde-frontal	0	486	960	42
2383	303	pared-izquierda	pared-izquierda	0	0	96	528
2384	303	pared-derecha	pared-derecha	864	0	96	528
2385	303	escritorio-consultorio	Escritorio	430	268	200	60
2386	303	archivador-consultorio	Archivador	760	254	90	44
2387	303	silla-izquierda	Silla	380	352	44	32
2388	303	silla-derecha	Silla	560	352	44	32
2389	303	planta-consultorio	Planta	110	380	44	40
2390	304	pared-fondo	pared-fondo	0	0	960	236
2391	304	borde-frontal	borde-frontal	0	486	960	42
2392	304	pared-izquierda	pared-izquierda	0	0	96	528
2393	304	pared-derecha	pared-derecha	864	0	96	528
2394	304	escritorio-consultorio	Escritorio	430	268	200	60
2395	304	archivador-consultorio	Archivador	760	254	90	44
2396	304	silla-izquierda	Silla	380	352	44	32
2397	304	silla-derecha	Silla	560	352	44	32
2398	304	planta-consultorio	Planta	110	380	44	40
\.


--
-- Data for Name: criterion_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.criterion_scores (id, rubric_evaluation_id, rubric_criterion_id, score, comment, evidence_json) FROM stdin;
\.


--
-- Data for Name: decision_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.decision_options (id, case_version_id, option_key, source_node_id, target_node_id, text, classification, score_delta, stress_delta, prohibited_penalty, immediate_feedback, prohibited_conduct, prohibition_reason) FROM stdin;
1	1	n1-policia	1	2	Llamar a la Policia antes de explicar a la consultante lo que ocurre y sin evaluar riesgo inmediato.	RISKY	0	12	-50	Puede ser necesario activar autoridades, pero debe hacerse con explicacion, valoracion de riesgo y cuidado para no aumentar el peligro.	f	\N
2	1	n1-instrumento	1	2	Aplicar de inmediato un cuestionario extenso para documentar evidencia antes de contener emocionalmente.	INADEQUATE	-10	20	-50	La documentacion es importante, pero en fase aguda puede saturar a la victima. Primero se estabiliza y luego se evalua con cuidado.	f	\N
3	1	n1-pap	1	2	Aplicar Primeros Auxilios Psicologicos: escucha activa, validacion emocional, respiracion guiada y verificacion de seguridad inmediata.	ADEQUATE	10	-5	-50	Decision adecuada. En crisis, la prioridad es estabilizar emocionalmente, reducir activacion fisiologica y construir una base de seguridad para decisiones posteriores.	f	\N
4	1	n2-psiquiatria	2	3	Remitir solo a psiquiatria y postergar la activacion de la ruta de proteccion hasta tener diagnostico clinico.	RISKY	-5	15	-50	La atencion especializada puede aportar, pero no reemplaza la proteccion inmediata ni la articulacion institucional.	f	\N
5	1	n2-mediacion	2	3	Contactar al agresor para proponer una mediacion familiar antes de avanzar con medidas de proteccion.	INADEQUATE	-10	25	-70	Conducta prohibida y de alto riesgo. La mediacion en violencia de genero puede revictimizar y aumentar el peligro para la victima.	t	Ley 1257 de 2008: prohibicion de mecanismos alternativos de solucion de conflictos en violencia contra la mujer.
6	1	n2-ruta-vbg	2	3	Activar ruta VBG: Comisaria de Familia, trabajo social, valoracion de riesgo, medidas de proteccion y coordinacion interinstitucional.	ADEQUATE	10	-5	-50	Decision adecuada. La ruta institucional protege derechos, evita que la carga recaiga solo en la victima y permite medidas proporcionales al riesgo.	f	\N
7	1	n3-dsm	3	4	Registrar solo diagnostico DSM y sintomas observados durante la consulta.	INADEQUATE	-10	16	-50	El diagnostico aislado es insuficiente. El caso exige valoracion de riesgo, medidas de seguridad y articulacion institucional.	f	\N
8	1	n3-informe-integral	3	4	Incluir motivo de consulta, estado mental, riesgo de feminicidio, medidas activadas, red de apoyo, proteccion de NNA y plan de seguimiento.	ADEQUATE	10	-5	-50	Decision adecuada. El informe debe ser tecnico, integral y util para la continuidad de la ruta sin exponer de mas a la victima.	f	\N
9	1	n4-citar-agresor	4	5	Citar al agresor antes de otorgar medidas para escuchar su version.	INADEQUATE	-10	25	-70	Conducta de alto riesgo. Alertar al agresor antes de medidas de proteccion puede escalar el peligro.	t	Las medidas de proteccion se orientan por riesgo y seguridad; citar al agresor prematuramente puede aumentar el peligro.
10	1	n4-riesgo-estructurado	4	5	Aplicar valoracion estructurada de riesgo, identificar armas, amenazas, reincidencia y proponer medidas de proteccion inmediatas.	ADEQUATE	10	-5	-50	Decision adecuada. La valoracion estructurada ayuda a priorizar medidas de proteccion proporcionales al riesgo alto.	f	\N
11	1	n5-minimizar	5	6	Registrar que los menores estuvieron presentes, pero no activar ruta porque no fueron agredidos fisicamente.	INADEQUATE	-10	20	-50	Presenciar violencia tambien puede constituir afectacion psicologica. Se requiere proteccion integral.	f	\N
12	1	n5-ruta-nna	5	6	Activar ruta de proteccion NNA, atencion psicosocial para los menores y coordinacion con ICBF si hay riesgo para su integridad.	ADEQUATE	10	-5	-50	Decision adecuada. Los NNA que presencian violencia tambien requieren proteccion, escucha y atencion diferenciada.	f	\N
32	3	h1-a	14	15	Notificar a la madre y la familia sobre la muerte de la nina de inmediato.	RISKY	-8	12	0	La notificacion inmediata sin estabilizacion previa puede aumentar la crisis y desbordar el duelo inicial.	f	\N
33	3	h1-b	14	15	Contencion emocional a la familia, acompanamiento en el duelo inicial y estabilizacion de la crisis mediante Primeros Auxilios Psicologicos (PAP).	ADEQUATE	15	-8	0	Centrada en urgencia vital, contencion emocional y estabilizacion de crisis, como pide el escenario hospitalario.	f	\N
34	3	h1-c	14	15	Interrogar a la victima herida para obtener detalles del agresor antes de que entre a cirugia.	INADEQUATE	-14	16	10	Antes de cirugia y estabilizacion, interrogar para detalles del agresor desplaza la prioridad clinica y puede revictimizar.	t	Interrogatorio revictimizante en urgencia vital.
35	3	h2-a	15	16	Resolucion 459 de 2012: Protocolo de atencion integral a violencias sexuales y basadas en genero.	RISKY	-4	6	0	La Resolucion 459 es pertinente, pero el documento tambien exige integrar Ley 1257 de 2008.	f	\N
36	3	h2-b	15	16	Resolucion 459 de 2012 y Ley 1257 de 2008.	ADEQUATE	12	-5	0	Integra el protocolo de salud y el marco colombiano de violencias contra las mujeres.	f	\N
37	3	h2-c	15	16	Resolucion 459 de 2012 y Ley 1448 de 2011.	INADEQUATE	-8	7	0	La Ley 1448 no es el eje normativo del caso planteado en el documento.	f	\N
38	3	h3-a	16	17	Escucha activa sin juicios, intervenir la disonancia cognitiva, preguntar sobre los antecedentes de la relacion y activar ruta por psicologia clinica y psiquiatria.	RISKY	-2	5	0	Aporta escucha y ruta clinica, pero omite PAP a la familia y protocolo EPICEE/SPIKES para comunicar el fallecimiento.	f	\N
39	3	h3-b	16	17	Primeros auxilios psicologicos para la familia, escucha activa y sin juicios a la victima cuando este consciente, y activar protocolo EPICEE/SPIKES para dar la noticia del fallecimiento de la menor.	RISKY	5	-2	0	Es una base pertinente, pero el documento incluye ademas ciclo de violencia, factores protectores y manejo interdisciplinar.	f	\N
40	3	h3-c	16	17	Primeros auxilios psicologicos para la familia, escucha activa y sin juicios a la victima, protocolo EPICEE/SPIKES, antecedentes de la relacion para determinar ciclo de violencia y manejo interdisciplinar.	RISKY	9	-3	0	La respuesta avanza, pero falta la evaluacion psicosocial familiar de factores protectores y de riesgo en el duelo.	f	\N
41	3	h3-d	16	17	Primeros auxilios psicologicos para la familia, escucha activa y sin juicios a la victima, protocolo EPICEE/SPIKES, evaluacion psicosocial familiar de factores protectores y de riesgo, y manejo interdisciplinar.	ADEQUATE	16	-8	0	Es la opcion mas integral del documento: combina PAP, comunicacion cuidadosa, evaluacion psicosocial y decisiones interdisciplinarias.	f	\N
42	3	c1-a	17	18	Instar a la mujer para que escuche al agresor en pro de la union familiar, mediacion y perdon.	INADEQUATE	-18	18	10	Esta opcion desconoce el riesgo, promueve revictimizacion y no prioriza proteccion.	t	Mediacion y presion de perdon en violencia grave de genero.
43	3	c1-b	17	18	Valoracion del riesgo de feminicidio, activacion de medidas de proteccion y asesoria sobre sus derechos economicos y de justicia.	ADEQUATE	16	-7	0	Corresponde a la prioridad del documento: riesgo de feminicidio, proteccion y derechos.	f	\N
44	3	c1-c	17	18	Realizar una psicoterapia para encontrar los patrones de infancia que desencadenan su eleccion de pareja.	RISKY	-10	10	0	Puede culpabilizar o desplazar la atencion del riesgo actual; la prioridad es proteccion y derechos.	f	\N
45	3	c2-a	18	19	Ley 2126 de 2021, Ley 1098 de 2006 y Ley 1257 de 2008.	ADEQUATE	14	-5	0	Integra Comisarias de Familia, proteccion de ninas, ninos y adolescentes, y violencias contra mujeres.	f	\N
46	3	c2-b	18	19	Ley 1098 de 2006 y Ley 1257 de 2008.	RISKY	3	2	0	Son normas pertinentes, pero falta Ley 2126 de 2021 para el marco de Comisaria de Familia.	f	\N
47	3	c2-c	18	19	Ley 1098 de 2006, Ley 1257 de 2008 y Ley 1148 de 2011.	INADEQUATE	-8	6	0	Incluye una norma que no corresponde al marco tecnico principal indicado en el documento.	f	\N
48	3	c3-a	19	20	Escucha activa sin juicios, intervenir la disonancia cognitiva, preguntar sobre los antecedentes de la relacion para detectar ciclos de violencia, aplicar valoracion de riesgo de feminicidio y activar ruta por psicologia clinica y psiquiatria.	RISKY	2	2	0	Incluye elementos utiles, pero no contempla la valoracion inicial de personas dependientes ni el nivel de vulneracion de derechos.	f	\N
49	3	c3-b	19	20	Realizar valoracion inicial psicologica y emocional de la victima, dependientes o personas vulnerables; escucha activa sin juicios; antecedentes de la relacion; y activar rutas de salud y salud mental si es necesario.	RISKY	6	-2	0	Es pertinente, pero falta establecer nivel de riesgo de vulneracion de derechos y aplicar riesgo de feminicidio.	f	\N
50	3	c3-c	19	20	Realizar valoracion inicial psicologica y emocional de la victima y personas vulnerables; establecer nivel de riesgo de vulneracion de derechos; aplicar valoracion de riesgo de feminicidio; y activar rutas de salud y salud mental.	ADEQUATE	18	-8	0	Es la opcion mas completa del documento para Comisaria: protege derechos, evalua riesgo feminicida y activa rutas de salud.	f	\N
697	4	h1-noticia-sin-protocolo	299	300	Notificar de inmediato la muerte de la niña a la abuela y la familia, sin estabilización previa ni protocolo.	INADEQUATE	-10	25	-5	La noticia de una muerte exige protocolo (EPICEE/SPIKES), contención y estabilización previa. Sin eso, la crisis escala.	t	Comunicar una muerte sin protocolo ni contención aumenta el daño y revictimiza a la familia.
698	4	h1-pap-contencion	299	300	Brindar contención emocional, acompañamiento en el duelo inicial y estabilización de la crisis mediante Primeros Auxilios Psicológicos (PAP).	ADEQUATE	10	-5	0	Los PAP son la primera línea en crisis: estabilizan, contienen y preparan a la familia para el proceso de duelo.	f	\N
699	4	h1-interrogar-victima	299	300	Interrogar a la víctima herida para obtener detalles del agresor antes de que entre a cirugía.	INADEQUATE	-10	25	-5	La urgencia vital y la estabilización van primero: interrogar a una víctima en shock la revictimiza.	t	Priorizar la información sobre la estabilización vulnera la dignidad de la víctima y la revictimiza.
700	4	h2-solo-459	300	301	Aplicar solo la Resolución 459 de 2012 (protocolo de atención integral a víctimas de violencia sexual y de género).	RISKY	3	4	0	La Resolución 459 aplica, pero sola queda incompleta: la Ley 1257 de 2008 es el eje de protección frente a las violencias contra la mujer.	f	\N
701	4	h2-459-1257	300	301	Resolución 459 de 2012 + Ley 1257 de 2008.	ADEQUATE	10	-5	0	Correcto: protocolo de atención integral en salud más el marco de protección de la Ley 1257 de 2008.	f	\N
702	4	h2-459-1448	300	301	Resolución 459 de 2012 + Ley 1448 de 2011 como eje principal.	RISKY	-5	8	0	La Ley 1448 (víctimas del conflicto armado) no es el eje de este caso: el marco correcto es la Ley 1257 de 2008.	f	\N
703	4	h3-parcial-disonancia	301	302	Escucha activa sin juicios, intervenir la disonancia cognitiva, indagar antecedentes de la relación y activar ruta por psicología clínica y psiquiatría.	RISKY	0	8	0	Parcial: falta protocolo de noticia difícil, PAP a la familia y articulación interdisciplinaria.	f	\N
704	4	h3-pap-epicee	301	302	PAP a la familia + escucha activa y sin juicios a la víctima (cuando esté consciente) + protocolo EPICEE/SPIKES para comunicar el fallecimiento de la menor.	RISKY	5	0	0	Buena base, pero incompleta: falta la evaluación psicosocial familiar y el manejo interdisciplinario.	f	\N
705	4	h3-epicee-ciclo	301	302	Lo anterior + antecedentes de la relación para determinar el ciclo de la violencia + manejo interdisciplinario del caso.	RISKY	6	0	0	Sólida, pero aún sin la evaluación psicosocial de factores protectores y de riesgo en el afrontamiento del duelo.	f	\N
706	4	h3-integral-psicosocial	301	302	PAP + escucha activa + EPICEE/SPIKES + evaluación psicosocial de la familia (factores protectores y de riesgo en el duelo) + decisiones interdisciplinarias (derivación a psiquiatría y psicoterapia).	ADEQUATE	12	-5	0	Intervención integral: contención, protocolo de noticia difícil, evaluación psicosocial e interdisciplina.	f	\N
707	4	c1-mediacion-perdon	302	303	Instar a la mujer a escuchar al agresor en pro de la unidad familiar (mediación) y el perdón.	INADEQUATE	-10	25	-5	La Ley 2126 de 2021 y los estándares de VBG prohíben la mediación: eleva el riesgo y revictimiza.	t	La mediación/conciliación con el agresor está proscrita en violencia de género: aumenta el riesgo de feminicidio.
708	4	c1-riesgo-proteccion-derechos	302	303	Valorar el riesgo de feminicidio, activar medidas de protección y asesorar sobre sus derechos económicos y de justicia.	ADEQUATE	12	-5	0	Prioridad correcta: valoración de riesgo, protección efectiva y enfoque de derechos.	f	\N
709	4	c1-patrones-infancia	302	303	Centrar la intervención en psicoterapia para hallar los patrones de infancia que desencadenan su elección de pareja.	RISKY	-5	10	0	Enfoque desviado: psicologizar la elección de pareja desplaza la responsabilidad del agresor y pospone la protección.	f	\N
710	4	c2-2126-1098-1257	303	304	Ley 2126 de 2021 + Ley 1098 de 2006 + Ley 1257 de 2008.	ADEQUATE	10	-5	0	Correcto: competencia de las comisarías (Ley 2126), protección de NNA (Ley 1098) y protección de la mujer (Ley 1257).	f	\N
711	4	c2-1098-1257	303	304	Ley 1098 de 2006 + Ley 1257 de 2008.	RISKY	3	4	0	Incompleto: falta la Ley 2126 de 2021, que regula la actuación de las Comisarías de Familia.	f	\N
712	4	c2-eje-1448	303	304	Ley 1098 de 2006 + Ley 1257 de 2008 + Ley 1448 de 2011 como eje principal.	RISKY	-5	8	0	La Ley 1448 no es el eje de este caso: el restablecimiento se rige por 2126 + 1098 + 1257.	f	\N
713	4	c3-parcial-clinica	304	305	Escucha activa, intervenir la disonancia, antecedentes y ciclos de violencia, valoración de riesgo de feminicidio y ruta por psicología clínica y psiquiatría.	RISKY	0	8	0	Parcial: omite la valoración de dependientes y el nivel de vulneración de derechos.	f	\N
714	4	c3-valoracion-dependientes	304	305	Valoración inicial psicológica y emocional de la víctima y de las personas dependientes o en situación de vulnerabilidad + escucha activa + antecedentes y ciclos + rutas de derivación a salud y salud mental.	RISKY	5	0	0	Buena, pero falta establecer el nivel de riesgo de vulneración de derechos y la valoración de feminicidio.	f	\N
715	4	c3-integral-derechos	304	305	Lo anterior + establecer el nivel de riesgo de vulneración de derechos + valoración del riesgo de feminicidio + rutas de derivación a salud y salud mental.	ADEQUATE	12	-5	0	Actuación integral: víctima y dependientes valorados, riesgos establecidos y rutas activadas.	f	\N
\.


--
-- Data for Name: dialogue_choices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dialogue_choices (id, dialogue_tree_id, choice_key, text, decision_option_id, required_tool_code, effect_json, display_order) FROM stdin;
1	1	execute	Preparar esta intervencion	1	\N	{}	1
2	2	execute	Preparar esta intervencion	2	\N	{}	1
3	3	execute	Preparar esta intervencion	3	\N	{}	1
4	4	execute	Preparar esta intervencion	4	\N	{}	1
5	5	execute	Preparar esta intervencion	5	\N	{}	1
6	6	execute	Preparar esta intervencion	6	\N	{}	1
7	7	execute	Preparar esta intervencion	7	\N	{}	1
8	8	execute	Preparar esta intervencion	8	\N	{}	1
9	9	execute	Preparar esta intervencion	9	\N	{}	1
10	10	execute	Preparar esta intervencion	10	\N	{}	1
11	11	execute	Preparar esta intervencion	11	\N	{}	1
12	12	execute	Preparar esta intervencion	12	\N	{}	1
13	13	execute	Preparar esta intervencion	\N	REFLECTION_JOURNAL	{}	1
14	14	execute	Preparar esta intervencion	\N	SAFETY_ROUTE	{}	1
15	15	execute	Preparar esta intervencion	\N	SAFETY_ROUTE	{}	1
16	16	execute	Preparar esta intervencion	\N	RISK_METER	{}	1
17	17	execute	Preparar esta intervencion	\N	SAFETY_ROUTE	{}	1
18	18	execute	Preparar esta intervencion	\N	RISK_METER	{}	1
19	19	execute	Preparar esta intervencion	\N	SAFETY_ROUTE	{}	1
20	20	execute	Preparar esta intervencion	\N	RISK_METER	{}	1
21	21	execute	Preparar esta intervencion	\N	REFLECTION_JOURNAL	{}	1
22	22	execute	Preparar esta intervencion	\N	PAP	{}	1
42	29	choice-h1-a	Notificar a la madre y la familia sobre la muerte de la nina de inmediato.	32	\N	{"classification": "RISKY", "prohibited": false}	0
43	29	choice-h1-b	Contencion emocional a la familia, acompanamiento en el duelo inicial y estabilizacion de la crisis mediante Primeros Auxilios Psicologicos (PAP).	33	\N	{"classification": "ADEQUATE", "prohibited": false}	1
44	29	choice-h1-c	Interrogar a la victima herida para obtener detalles del agresor antes de que entre a cirugia.	34	\N	{"classification": "INADEQUATE", "prohibited": true}	2
45	30	choice-h2-a	Resolucion 459 de 2012: Protocolo de atencion integral a violencias sexuales y basadas en genero.	35	\N	{"classification": "RISKY", "prohibited": false}	0
46	30	choice-h2-b	Resolucion 459 de 2012 y Ley 1257 de 2008.	36	\N	{"classification": "ADEQUATE", "prohibited": false}	1
47	30	choice-h2-c	Resolucion 459 de 2012 y Ley 1448 de 2011.	37	\N	{"classification": "INADEQUATE", "prohibited": false}	2
48	31	choice-h3-a	Escucha activa sin juicios, intervenir la disonancia cognitiva, preguntar sobre los antecedentes de la relacion y activar ruta por psicologia clinica y psiquiatria.	38	\N	{"classification": "RISKY", "prohibited": false}	0
49	31	choice-h3-b	Primeros auxilios psicologicos para la familia, escucha activa y sin juicios a la victima cuando este consciente, y activar protocolo EPICEE/SPIKES para dar la noticia del fallecimiento de la menor.	39	\N	{"classification": "RISKY", "prohibited": false}	1
50	31	choice-h3-c	Primeros auxilios psicologicos para la familia, escucha activa y sin juicios a la victima, protocolo EPICEE/SPIKES, antecedentes de la relacion para determinar ciclo de violencia y manejo interdisciplinar.	40	\N	{"classification": "RISKY", "prohibited": false}	2
51	31	choice-h3-d	Primeros auxilios psicologicos para la familia, escucha activa y sin juicios a la victima, protocolo EPICEE/SPIKES, evaluacion psicosocial familiar de factores protectores y de riesgo, y manejo interdisciplinar.	41	\N	{"classification": "ADEQUATE", "prohibited": false}	3
52	32	choice-c1-a	Instar a la mujer para que escuche al agresor en pro de la union familiar, mediacion y perdon.	42	\N	{"classification": "INADEQUATE", "prohibited": true}	0
53	32	choice-c1-b	Valoracion del riesgo de feminicidio, activacion de medidas de proteccion y asesoria sobre sus derechos economicos y de justicia.	43	\N	{"classification": "ADEQUATE", "prohibited": false}	1
54	32	choice-c1-c	Realizar una psicoterapia para encontrar los patrones de infancia que desencadenan su eleccion de pareja.	44	\N	{"classification": "RISKY", "prohibited": false}	2
55	33	choice-c2-a	Ley 2126 de 2021, Ley 1098 de 2006 y Ley 1257 de 2008.	45	\N	{"classification": "ADEQUATE", "prohibited": false}	0
56	33	choice-c2-b	Ley 1098 de 2006 y Ley 1257 de 2008.	46	\N	{"classification": "RISKY", "prohibited": false}	1
57	33	choice-c2-c	Ley 1098 de 2006, Ley 1257 de 2008 y Ley 1148 de 2011.	47	\N	{"classification": "INADEQUATE", "prohibited": false}	2
58	34	choice-c3-a	Escucha activa sin juicios, intervenir la disonancia cognitiva, preguntar sobre los antecedentes de la relacion para detectar ciclos de violencia, aplicar valoracion de riesgo de feminicidio y activar ruta por psicologia clinica y psiquiatria.	48	\N	{"classification": "RISKY", "prohibited": false}	0
59	34	choice-c3-b	Realizar valoracion inicial psicologica y emocional de la victima, dependientes o personas vulnerables; escucha activa sin juicios; antecedentes de la relacion; y activar rutas de salud y salud mental si es necesario.	49	\N	{"classification": "RISKY", "prohibited": false}	1
60	34	choice-c3-c	Realizar valoracion inicial psicologica y emocional de la victima y personas vulnerables; establecer nivel de riesgo de vulneracion de derechos; aplicar valoracion de riesgo de feminicidio; y activar rutas de salud y salud mental.	50	\N	{"classification": "ADEQUATE", "prohibited": false}	2
1355	687	h1-a	Notificar de inmediato la muerte de la niña a la familia	697	\N	{}	1
1356	687	h1-b	Aplicar PAP: contención emocional, acompañamiento en duelo y estabilización de la crisis	698	\N	{}	2
1357	687	h1-c	Interrogar a la víctima herida sobre el agresor antes de cirugía	699	\N	{}	3
1358	688	h2-a	Aplicar solo la Resolución 459 de 2012	700	\N	{}	1
1359	688	h2-b	Resolución 459 de 2012 + Ley 1257 de 2008	701	\N	{}	2
1360	688	h2-c	Resolución 459 de 2012 + Ley 1448 de 2011 como eje	702	\N	{}	3
1361	689	h3-a	Escucha activa + disonancia + antecedentes + ruta clínica/psiquiátrica	703	\N	{}	1
1362	689	h3-b	PAP a la familia + escucha sin juicios + EPICEE/SPIKES	704	\N	{}	2
1363	689	h3-c	Lo anterior + ciclo de la violencia + manejo interdisciplinario	705	\N	{}	3
1364	689	h3-d	PAP + escucha + EPICEE/SPIKES + evaluación psicosocial familiar + interdisciplina	706	\N	{}	4
1365	690	h1-a	Notificar de inmediato la muerte de la niña a la familia	697	\N	{}	1
1366	690	h1-b	Aplicar PAP: contención emocional, acompañamiento en duelo y estabilización de la crisis	698	\N	{}	2
1367	690	h1-c	Interrogar a la víctima herida sobre el agresor antes de cirugía	699	\N	{}	3
1368	691	h2-a	Aplicar solo la Resolución 459 de 2012	700	\N	{}	1
1369	691	h2-b	Resolución 459 de 2012 + Ley 1257 de 2008	701	\N	{}	2
1370	691	h2-c	Resolución 459 de 2012 + Ley 1448 de 2011 como eje	702	\N	{}	3
1371	692	h3-a	Escucha activa + disonancia + antecedentes + ruta clínica/psiquiátrica	703	\N	{}	1
1372	692	h3-b	PAP a la familia + escucha sin juicios + EPICEE/SPIKES	704	\N	{}	2
1373	692	h3-c	Lo anterior + ciclo de la violencia + manejo interdisciplinario	705	\N	{}	3
1374	692	h3-d	PAP + escucha + EPICEE/SPIKES + evaluación psicosocial familiar + interdisciplina	706	\N	{}	4
1375	697	c1-a	Instar a escuchar al agresor por la unidad familiar (mediación y perdón)	707	\N	{}	1
1376	697	c1-b	Valorar riesgo de feminicidio + medidas de protección + derechos	708	\N	{}	2
1377	697	c1-c	Psicoterapia centrada en patrones de infancia y elección de pareja	709	\N	{}	3
1378	698	c2-a	Ley 2126 de 2021 + Ley 1098 de 2006 + Ley 1257 de 2008	710	\N	{}	1
1379	698	c2-b	Ley 1098 de 2006 + Ley 1257 de 2008	711	\N	{}	2
1380	698	c2-c	Ley 1098 + Ley 1257 + Ley 1448 de 2011 como eje	712	\N	{}	3
1381	699	c3-a	Escucha + disonancia + ciclos + valoración de feminicidio + ruta clínica	713	\N	{}	1
1382	699	c3-b	Valoración de víctima y dependientes + escucha + ciclos + rutas de salud	714	\N	{}	2
1383	699	c3-c	Lo anterior + nivel de vulneración de derechos + valoración de feminicidio + rutas	715	\N	{}	3
1384	700	c1-a	Instar a escuchar al agresor por la unidad familiar (mediación y perdón)	707	\N	{}	1
1385	700	c1-b	Valorar riesgo de feminicidio + medidas de protección + derechos	708	\N	{}	2
1386	700	c1-c	Psicoterapia centrada en patrones de infancia y elección de pareja	709	\N	{}	3
1387	701	c2-a	Ley 2126 de 2021 + Ley 1098 de 2006 + Ley 1257 de 2008	710	\N	{}	1
1388	701	c2-b	Ley 1098 de 2006 + Ley 1257 de 2008	711	\N	{}	2
1389	701	c2-c	Ley 1098 + Ley 1257 + Ley 1448 de 2011 como eje	712	\N	{}	3
1390	702	c3-a	Escucha + disonancia + ciclos + valoración de feminicidio + ruta clínica	713	\N	{}	1
1391	702	c3-b	Valoración de víctima y dependientes + escucha + ciclos + rutas de salud	714	\N	{}	2
1392	702	c3-c	Lo anterior + nivel de vulneración de derechos + valoración de feminicidio + rutas	715	\N	{}	3
\.


--
-- Data for Name: dialogue_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dialogue_lines (id, dialogue_tree_id, display_order, speaker_name, text, emotion) FROM stdin;
1	1	1	Alerta de riesgo	La autoridad puede ser necesaria, pero debe explicarse y valorarse el riesgo inmediato.	alerta
2	2	1	Objeto del entorno	El expediente esta disponible, pero iniciar con un cuestionario extenso puede aumentar angustia.	neutral
3	3	1	Consultante	Acercate a la consultante, valida su emocion y estabiliza antes de documentar.	vulnerable
4	4	1	Objeto del entorno	La remision clinica no reemplaza la ruta de proteccion inmediata.	neutral
5	5	1	Alerta de riesgo	Contactar al agresor para mediar es una conducta prohibida y de alto riesgo.	alerta
6	6	1	Ruta institucional	Ruta institucional VBG: comisaria, trabajo social, medidas y coordinacion.	neutral
7	7	1	Objeto del entorno	Un diagnostico aislado no cubre riesgo, red de apoyo ni medidas activadas.	neutral
8	8	1	Objeto del entorno	Construye un informe tecnico, integral y no revictimizante.	neutral
9	9	1	Alerta de riesgo	Citar al agresor antes de medidas puede escalar el peligro.	alerta
10	10	1	Objeto del entorno	Identifica armas, amenazas, reincidencia y medidas de proteccion proporcionales.	neutral
11	11	1	Alerta de riesgo	Presenciar violencia tambien puede constituir afectacion psicologica.	alerta
12	12	1	Ruta institucional	Activa ruta NNA, atencion psicosocial y coordinacion con ICBF si aplica.	neutral
13	13	1	Herramienta profesional	Registra proteccion integral y plan de seguimiento.	neutral
14	14	1	Herramienta profesional	Ruta diferenciada para NNA.	neutral
15	15	1	Herramienta profesional	Medidas de proteccion proporcionales.	neutral
16	16	1	Herramienta profesional	Instrumento de valoracion estructurada.	neutral
17	17	1	Herramienta profesional	Checklist de medidas activadas.	neutral
18	18	1	Herramienta profesional	Medidor de riesgo para documentacion tecnica.	neutral
19	19	1	Herramienta profesional	Guia de articulacion institucional.	neutral
20	20	1	Herramienta profesional	Medidor de riesgo para factores agravantes.	neutral
21	21	1	Herramienta profesional	Registra el razonamiento profesional durante la escena.	neutral
22	22	1	Herramienta profesional	Herramienta de contencion inicial para crisis.	neutral
1363	685	1	Abuela de la niña	¡Déjenme pasar! ¡Quiero ver a mi nieta y a mi hija! ¿Por qué nadie nos dice nada?	anxious
1364	685	2	Abuela de la niña	Llegamos apenas supimos… ¿están bien? ¡Dígame que están bien!	anxious
29	29	0	Equipo de crisis hospitalaria	Pregunta 1 del Hospital: En que centrar la intervencion inmediata?	serious
30	30	0	Coordinacion normativa	Pregunta 2 del Hospital: Que marco normativo y tecnico debe seguir?	serious
31	31	0	Mesa interdisciplinaria	Pregunta 3 del Hospital: Que se debe hacer y que se debe evitar tecnica y eticamente?	serious
32	32	0	Entrevista de proteccion	Pregunta 1 de Comisaria: Cual es la prioridad en la asesoria psicosocial?	serious
33	33	0	Marco de competencia	Pregunta 2 de Comisaria: Que marco normativo y tecnico debe seguir?	serious
34	34	0	Equipo psicosocial	Pregunta 3 de Comisaria: Que se debe hacer y que se debe evitar tecnica y eticamente?	serious
1365	685	3	Abuela de la niña	(La familia necesita contención antes de cualquier información difícil. La sala de escucha está al fondo a la derecha.)	neutral
1366	686	1	Acceso a quirófano	Acceso restringido: la sobreviviente está en cirugía (28 heridas con arma cortopunzante). El personal pide manejar la información con prudencia: la niña de 3 años falleció y la familia aún no lo sabe con certeza.	neutral
1367	687	1	Abuela de la niña	¡Por favor! Nadie nos dice nada de la niña… ¿dónde está mi nieta? ¡Quiero verla!	anxious
1368	687	2	Abuela de la niña	Mi hija sigue en cirugía… dicen que son 28 heridas. ¿Quién pudo hacerle esto?	negative
1369	687	3	Abuela de la niña	(La familia está en crisis. Define el foco inmediato de tu intervención.)	neutral
1370	688	1	Marco normativo y técnico	Disponibles: Resolución 459 de 2012 (protocolo de atención integral a violencias sexuales y de género), Ley 1257 de 2008, Ley 1448 de 2011.	neutral
1371	688	2	Marco normativo y técnico	(Define el marco normativo y técnico que orienta la atención.)	neutral
1372	689	1	Psicóloga hospitalaria	La familia sigue en la sala y la sobreviviente saldrá de cirugía en unas horas. El equipo espera tu propuesta.	neutral
1373	689	2	Psicóloga hospitalaria	(Define qué hacer —y qué evitar— técnica y éticamente.)	neutral
1374	690	1	Abuela de la niña	¡Por favor! Nadie nos dice nada de la niña… ¿dónde está mi nieta? ¡Quiero verla!	anxious
1375	690	2	Abuela de la niña	Mi hija sigue en cirugía… dicen que son 28 heridas. ¿Quién pudo hacerle esto?	negative
1376	690	3	Abuela de la niña	(La familia está en crisis. Define el foco inmediato de tu intervención.)	neutral
1377	691	1	Marco normativo y técnico	Disponibles: Resolución 459 de 2012 (protocolo de atención integral a violencias sexuales y de género), Ley 1257 de 2008, Ley 1448 de 2011.	neutral
1378	691	2	Marco normativo y técnico	(Define el marco normativo y técnico que orienta la atención.)	neutral
1379	692	1	Psicóloga hospitalaria	La familia sigue en la sala y la sobreviviente saldrá de cirugía en unas horas. El equipo espera tu propuesta.	neutral
1380	692	2	Psicóloga hospitalaria	(Define qué hacer —y qué evitar— técnica y éticamente.)	neutral
1381	693	1	Abuela de la niña	Gracias por no dejarnos solas en esto…	sad
1382	693	2	Abuela de la niña	Sé que viene un camino largo. ¿Qué sigue ahora para mi hija?	neutral
1383	694	1	Registro hospitalario	Bloque hospitalario registrado: contención realizada, marco normativo definido y articulación interdisciplinaria en curso. La salida institucional hacia la Comisaría de Familia está habilitada.	neutral
1384	695	1	Expediente del caso	Expediente: mujer de 22 años, sobreviviente de tentativa de feminicidio (28 heridas con arma cortopunzante). Su hija de 3 años fue asesinada por la pareja, hombre de 28 años. Alta médica hace 15 días; secuelas físicas y trauma complejo. Se requiere valoración de riesgo, medidas de protección y asesoría de derechos.	neutral
1385	696	1	Funcionaria de recepción	Bienvenida. El caso llegó remitido desde el hospital con la historia clínica y la denuncia.	neutral
1386	696	2	Funcionaria de recepción	La comisaría puede dictar medidas de protección y orientar derechos económicos y de justicia. El consultorio queda al fondo a la derecha; revisa primero el expediente.	neutral
1387	697	1	Sobreviviente (22 años)	Salí del hospital hace unos días… las heridas duelen menos que todo lo demás.	sad
1388	697	2	Sobreviviente (22 años)	Su familia me busca para que lo perdone, dicen que la familia se respeta. Yo solo quiero estar segura.	anxious
1389	697	3	Sobreviviente (22 años)	(Define la prioridad de la asesoría psicosocial.)	neutral
1390	698	1	Marco normativo y técnico	Disponibles: Ley 2126 de 2021 (Comisarías de Familia), Ley 1098 de 2006 (infancia y adolescencia), Ley 1257 de 2008, Ley 1448 de 2011.	neutral
1391	698	2	Marco normativo y técnico	(Define el marco normativo del restablecimiento de derechos.)	neutral
1392	699	1	Profesional psicosocial	Cerramos la valoración: queda definir la actuación técnica y ética con la sobreviviente y su red familiar.	neutral
1393	699	2	Profesional psicosocial	(Define qué hacer —y qué evitar— en el restablecimiento de derechos.)	neutral
1394	700	1	Sobreviviente (22 años)	Salí del hospital hace unos días… las heridas duelen menos que todo lo demás.	sad
1395	700	2	Sobreviviente (22 años)	Su familia me busca para que lo perdone, dicen que la familia se respeta. Yo solo quiero estar segura.	anxious
1396	700	3	Sobreviviente (22 años)	(Define la prioridad de la asesoría psicosocial.)	neutral
1397	701	1	Marco normativo y técnico	Disponibles: Ley 2126 de 2021 (Comisarías de Familia), Ley 1098 de 2006 (infancia y adolescencia), Ley 1257 de 2008, Ley 1448 de 2011.	neutral
1398	701	2	Marco normativo y técnico	(Define el marco normativo del restablecimiento de derechos.)	neutral
1399	702	1	Profesional psicosocial	Cerramos la valoración: queda definir la actuación técnica y ética con la sobreviviente y su red familiar.	neutral
1400	702	2	Profesional psicosocial	(Define qué hacer —y qué evitar— en el restablecimiento de derechos.)	neutral
1401	703	1	Cierre del caso	Caso cerrado: revisa tu reporte final con métricas, decisiones y final alcanzado.	neutral
\.


--
-- Data for Name: dialogue_trees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dialogue_trees (id, scene_map_id, map_object_id, tree_key, speaker_name, portrait_key, emotion, created_at) FROM stdin;
1	1	1	aviso-policial	Alerta de riesgo	aviso-policial	alerta	2026-06-05 22:36:23.555317
2	1	2	cuestionario-prematuro	Objeto del entorno	cuestionario-prematuro	neutral	2026-06-05 22:36:23.555317
3	1	3	escucha-segura	Consultante	escucha-segura	vulnerable	2026-06-05 22:36:23.555317
4	2	4	psiquiatria-aislada	Objeto del entorno	psiquiatria-aislada	neutral	2026-06-05 22:36:23.555317
5	2	5	mediacion-prohibida	Alerta de riesgo	mediacion-prohibida	alerta	2026-06-05 22:36:23.555317
6	2	6	ruta-vbg	Ruta institucional	ruta-vbg	neutral	2026-06-05 22:36:23.555317
7	3	7	dsm-aislado	Objeto del entorno	dsm-aislado	neutral	2026-06-05 22:36:23.555317
8	3	8	informe-integral	Objeto del entorno	informe-integral	neutral	2026-06-05 22:36:23.555317
9	4	9	contacto-agresor	Alerta de riesgo	contacto-agresor	alerta	2026-06-05 22:36:23.555317
10	4	10	riesgo-estructurado	Objeto del entorno	riesgo-estructurado	neutral	2026-06-05 22:36:23.555317
11	5	11	nna-sin-ruta	Alerta de riesgo	nna-sin-ruta	alerta	2026-06-05 22:36:23.555317
12	5	12	ruta-nna	Ruta institucional	ruta-nna	neutral	2026-06-05 22:36:23.555317
13	5	13	tool-bitacora	Herramienta profesional	tool-bitacora	neutral	2026-06-05 22:36:23.555317
14	5	14	tool-ruta	Herramienta profesional	tool-ruta	neutral	2026-06-05 22:36:23.555317
15	4	15	tool-ruta	Herramienta profesional	tool-ruta	neutral	2026-06-05 22:36:23.555317
16	4	16	tool-riesgo	Herramienta profesional	tool-riesgo	neutral	2026-06-05 22:36:23.555317
17	3	17	tool-ruta	Herramienta profesional	tool-ruta	neutral	2026-06-05 22:36:23.555317
18	3	18	tool-riesgo	Herramienta profesional	tool-riesgo	neutral	2026-06-05 22:36:23.555317
19	2	19	tool-ruta	Herramienta profesional	tool-ruta	neutral	2026-06-05 22:36:23.555317
20	2	20	tool-riesgo	Herramienta profesional	tool-riesgo	neutral	2026-06-05 22:36:23.555317
21	1	21	tool-bitacora	Herramienta profesional	tool-bitacora	neutral	2026-06-05 22:36:23.555317
22	1	22	tool-pap	Herramienta profesional	tool-pap	neutral	2026-06-05 22:36:23.555317
29	14	58	dialogo-hospital-crisis	Equipo de crisis hospitalaria	social_case	serious	2026-06-12 08:26:14.976654
30	15	62	dialogo-hospital-marco	Coordinacion normativa	social_case	serious	2026-06-12 08:26:15.0247
31	16	67	dialogo-hospital-etica	Mesa interdisciplinaria	social_case	serious	2026-06-12 08:26:15.056071
32	17	73	dialogo-comisaria-prioridad	Entrevista de proteccion	social_case	serious	2026-06-12 08:26:15.086709
33	18	78	dialogo-comisaria-marco	Marco de competencia	social_case	serious	2026-06-12 08:26:15.109547
34	19	84	dialogo-comisaria-etica	Equipo psicosocial	social_case	serious	2026-06-12 08:26:15.134621
685	297	1483	familia-crisis	Abuela de la niña	\N	neutral	2026-06-15 19:57:01.069774
686	297	1484	zona-restringida	Acceso a quirófano	\N	neutral	2026-06-15 19:57:01.093759
687	298	1487	familia-duelo	Abuela de la niña	\N	neutral	2026-06-15 19:57:01.128374
688	298	1488	marco-normativo-hospital	Marco normativo y técnico	\N	neutral	2026-06-15 19:57:01.15084
689	298	1489	psicologa-acompanante	Psicóloga hospitalaria	\N	neutral	2026-06-15 19:57:01.170432
690	299	1495	familia-duelo	Abuela de la niña	\N	neutral	2026-06-15 19:57:01.225852
691	299	1496	marco-normativo-hospital	Marco normativo y técnico	\N	neutral	2026-06-15 19:57:01.245699
692	299	1497	psicologa-acompanante	Psicóloga hospitalaria	\N	neutral	2026-06-15 19:57:01.263536
693	300	1503	familia-duelo	Abuela de la niña	\N	neutral	2026-06-15 19:57:01.321266
694	300	1504	resumen-bloque	Registro hospitalario	\N	neutral	2026-06-15 19:57:01.33103
695	301	1508	expediente-caso	Expediente del caso	\N	neutral	2026-06-15 19:57:01.366047
696	301	1509	funcionaria-recepcion	Funcionaria de recepción	\N	neutral	2026-06-15 19:57:01.37557
697	302	1511	sobreviviente-consulta	Sobreviviente (22 años)	\N	neutral	2026-06-15 19:57:01.413974
698	302	1512	marco-normativo-comisaria	Marco normativo y técnico	\N	neutral	2026-06-15 19:57:01.438001
699	302	1513	profesional-psicosocial	Profesional psicosocial	\N	neutral	2026-06-15 19:57:01.456811
700	303	1517	sobreviviente-consulta	Sobreviviente (22 años)	\N	neutral	2026-06-15 19:57:01.515266
701	303	1518	marco-normativo-comisaria	Marco normativo y técnico	\N	neutral	2026-06-15 19:57:01.547157
702	303	1519	profesional-psicosocial	Profesional psicosocial	\N	neutral	2026-06-15 19:57:01.574598
703	304	1523	cierre-resumen	Cierre del caso	\N	neutral	2026-06-15 19:57:01.644971
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	auth	permission
2	auth	group
3	contenttypes	contenttype
4	progression	studentcasecompletion
5	users	customuser
6	grupos	grupo
7	simulation	simulationcase
8	simulation	caseversion
9	simulation	simulationnode
10	simulation	decisionoption
11	simulation	simulationattempt
12	simulation	attemptevent
13	simulation	reflectionjournal
14	simulation	attemptworldstate
15	simulation	rubric
16	simulation	rubriccriterion
17	simulation	rubricevaluation
18	simulation	criterionscore
19	simulation	publicationchecklist
20	simulation	publicationchecklistitem
21	simulation	auditlog
22	simulation	scenemap
23	simulation	mapobject
24	simulation	collisionzone
25	simulation	dialoguetree
26	simulation	dialogueline
27	simulation	dialoguechoice
28	simulation	clinicaltool
29	users	accessrequest
30	simulation	simulationrubricassignment
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-06-14 15:40:20.845609+00
2	contenttypes	0002_remove_content_type_name	2026-06-14 15:40:20.864476+00
3	auth	0001_initial	2026-06-14 15:40:20.98746+00
4	auth	0002_alter_permission_name_max_length	2026-06-14 15:40:20.995486+00
5	auth	0003_alter_user_email_max_length	2026-06-14 15:40:21.001078+00
6	auth	0004_alter_user_username_opts	2026-06-14 15:40:21.008482+00
7	auth	0005_alter_user_last_login_null	2026-06-14 15:40:21.015694+00
8	auth	0006_require_contenttypes_0002	2026-06-14 15:40:21.020916+00
9	auth	0007_alter_validators_add_error_messages	2026-06-14 15:40:21.028608+00
10	auth	0008_alter_user_username_max_length	2026-06-14 15:40:21.037853+00
11	auth	0009_alter_user_last_name_max_length	2026-06-14 15:40:21.048218+00
12	auth	0010_alter_group_name_max_length	2026-06-14 15:40:21.061512+00
13	auth	0011_update_proxy_permissions	2026-06-14 15:40:21.071061+00
14	auth	0012_alter_user_first_name_max_length	2026-06-14 15:40:21.081804+00
15	users	0001_initial	2026-06-14 15:40:21.0918+00
16	grupos	0001_initial	2026-06-14 15:40:21.101714+00
17	progression	0001_initial	2026-06-14 15:40:21.145241+00
18	simulation	0001_initial	2026-06-14 15:40:21.14976+00
19	grupos	0002_grupo_case_version	2026-06-15 02:57:46.240213+00
20	grupos	0003_initial	2026-06-16 06:36:01.758486+00
21	simulation	0002_initial	2026-06-16 06:36:01.8113+00
22	simulation	0003_rubric_management	2026-06-16 06:36:01.882589+00
23	simulation	0004_simulationrubricassignment	2026-06-16 06:36:01.888626+00
24	users	0002_initial	2026-06-16 06:36:01.894733+00
25	users	0002_accessrequest	2026-06-16 06:37:11.156975+00
26	users	0003_merge_0002_accessrequest_0002_initial	2026-06-16 06:37:11.180489+00
\.


--
-- Data for Name: escenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.escenarios (id, caso_id, orden, nombre, contexto, mapa_key) FROM stdin;
1	1	1	Sala de Urgencias del Hospital	La psicóloga atiende a la víctima en una sala privada del servicio de urgencias. La paciente está asustada, con llanto contenido y dificultad para hablar. Los niños están en la sala de espera con una enfermera.	hospital
2	1	2	Comisaría de Familia	Al día siguiente, la víctima asiste a la Comisaría de Familia acompañada por la psicóloga del hospital. Se realiza la valoración integral del riesgo y se coordinan las rutas de protección interinstitucional.	comisaria
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	init schema	SQL	V1__init_schema.sql	-95649748	psychosim	2026-06-05 22:36:22.171445	388	t
2	2	seed roles	SQL	V2__seed_roles.sql	1997038612	psychosim	2026-06-05 22:36:22.663704	8	t
3	3	seed caso1	SQL	V3__seed_caso1.sql	1201140196	psychosim	2026-06-05 22:36:22.707802	43	t
4	4	simulation hexagonal foundation	SQL	V4__simulation_hexagonal_foundation.sql	523802180	psychosim	2026-06-05 22:36:22.81081	605	t
5	5	seed playable simulation case	SQL	V5__seed_playable_simulation_case.sql	-125418384	psychosim	2026-06-05 22:36:23.454039	36	t
6	6	configurable serious game world	SQL	V6__configurable_serious_game_world.sql	1291261011	psychosim	2026-06-05 22:36:23.523393	605	t
7	7	world authoring hardening	SQL	V7__world_authoring_hardening.sql	1480562904	psychosim	2026-06-05 22:36:24.180767	22	t
8	8	simulation metrics and trace	SQL	V8__simulation_metrics_and_trace.sql	-129296809	psychosim	2026-06-05 22:36:24.233322	11	t
9	9	seed demo group assignment	SQL	V9__seed_demo_group_assignment.sql	-1551791824	psychosim	2026-06-05 22:36:24.271693	12	t
\.


--
-- Data for Name: grupo_case_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grupo_case_version (grupo_id, case_version_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: grupo_estudiante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grupo_estudiante (grupo_id, estudiante_id) FROM stdin;
1	3
10	198
2	1648
2	1649
2	1650
2	1651
2	1652
2	1653
2	1654
2	1655
2	1656
2	1657
2	1658
2	1659
2	1660
2	1661
2	1662
2	1663
2	1664
2	1665
2	1666
2	1667
2	1668
2	1669
2	1670
2	1671
2	1672
2	1673
2	1674
2	1675
2	1676
2	1677
\.


--
-- Data for Name: grupos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grupos (id, nombre, codigo, profesor_id, activo, created_at) FROM stdin;
1	Grupo Demo SIEP	DEMO-SIEP-01	2	t	2026-06-05 22:36:24.27754
2	Grupo 1	1234	2	t	2026-06-12 08:42:57.671334
10	Stad	3535	2	t	2026-06-14 21:49:57.558272
\.


--
-- Data for Name: map_objects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.map_objects (id, scene_map_id, object_key, label, object_type, position_x, position_y, width, height, color_hex, icon, short_code, collision, visible, interaction_prompt, interaction_text, decision_option_id, tool_code, unlock_condition_json, created_at, updated_at, z_index, facing, movement_pattern_json, metadata_json) FROM stdin;
1	1	aviso-policial	Aviso policial	WARNING	744	262	48	48	#A99BD6	monitoring	RISK	f	t	Valorar riesgo	La autoridad puede ser necesaria, pero debe explicarse y valorarse el riesgo inmediato.	1	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
2	1	cuestionario-prematuro	Cuestionario prematuro	OBJECT	246	226	48	48	#6F8490	clinical_notes	DOC	f	t	Registrar sin contener	El expediente esta disponible, pero iniciar con un cuestionario extenso puede aumentar angustia.	2	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
3	1	escucha-segura	Escucha segura	PERSON	502	292	48	48	#4FA3A5	self_improvement	PAP	f	t	Contener y estabilizar	Acercate a la consultante, valida su emocion y estabiliza antes de documentar.	3	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
4	2	psiquiatria-aislada	Psiquiatria aislada	OBJECT	654	96	48	48	#A99BD6	medical_services	SAL	f	t	Remitir atencion	La remision clinica no reemplaza la ruta de proteccion inmediata.	4	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
5	2	mediacion-prohibida	Mediacion prohibida	WARNING	108	186	48	48	#A85062	warning	ALRT	f	t	Intervenir vinculo	Contactar al agresor para mediar es una conducta prohibida y de alto riesgo.	5	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
6	2	ruta-vbg	Ruta VBG	ROUTE	850	322	48	48	#4FA3A5	health_and_safety	RUTA	f	t	Activar proteccion	Ruta institucional VBG: comisaria, trabajo social, medidas y coordinacion.	6	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
7	3	dsm-aislado	DSM aislado	OBJECT	330	126	48	48	#6F8490	clinical_notes	DSM	f	t	Registrar tecnicamente	Un diagnostico aislado no cubre riesgo, red de apoyo ni medidas activadas.	7	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
8	3	informe-integral	Informe integral	OBJECT	246	226	48	48	#4FA3A5	clinical_notes	DOC	f	t	Registrar tecnicamente	Construye un informe tecnico, integral y no revictimizante.	8	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
9	4	contacto-agresor	Contacto agresor	WARNING	108	186	48	48	#A85062	warning	ALRT	f	t	Intervenir vinculo	Citar al agresor antes de medidas puede escalar el peligro.	9	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
10	4	riesgo-estructurado	Riesgo estructurado	OBJECT	744	262	48	48	#4FA3A5	monitoring	RISK	f	t	Valorar riesgo	Identifica armas, amenazas, reincidencia y medidas de proteccion proporcionales.	10	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
11	5	nna-sin-ruta	NNA sin ruta	WARNING	246	226	48	48	#6F8490	warning	NNA	f	t	Minimizar afectacion	Presenciar violencia tambien puede constituir afectacion psicologica.	11	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
12	5	ruta-nna	Ruta NNA	ROUTE	850	322	48	48	#4FA3A5	child_care	NNA	f	t	Activar proteccion	Activa ruta NNA, atencion psicosocial y coordinacion con ICBF si aplica.	12	\N	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
13	5	tool-bitacora	Bitacora	TOOL	340	455	48	48	#4FA3A5	edit_note	BIT	f	t	Tomar herramienta	Registra proteccion integral y plan de seguimiento.	\N	REFLECTION_JOURNAL	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
14	5	tool-ruta	Ruta	TOOL	230	455	48	48	#4FA3A5	health_and_safety	RUTA	f	t	Tomar herramienta	Ruta diferenciada para NNA.	\N	SAFETY_ROUTE	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
15	4	tool-ruta	Ruta	TOOL	340	455	48	48	#4FA3A5	health_and_safety	RUTA	f	t	Tomar herramienta	Medidas de proteccion proporcionales.	\N	SAFETY_ROUTE	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
16	4	tool-riesgo	Riesgo	TOOL	230	455	48	48	#4FA3A5	monitoring	RISK	f	t	Tomar herramienta	Instrumento de valoracion estructurada.	\N	RISK_METER	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
17	3	tool-ruta	Ruta	TOOL	340	455	48	48	#4FA3A5	health_and_safety	RUTA	f	t	Tomar herramienta	Checklist de medidas activadas.	\N	SAFETY_ROUTE	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
18	3	tool-riesgo	Riesgo	TOOL	230	455	48	48	#4FA3A5	monitoring	RISK	f	t	Tomar herramienta	Medidor de riesgo para documentacion tecnica.	\N	RISK_METER	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
19	2	tool-ruta	Ruta	TOOL	340	455	48	48	#4FA3A5	health_and_safety	RUTA	f	t	Tomar herramienta	Guia de articulacion institucional.	\N	SAFETY_ROUTE	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
20	2	tool-riesgo	Riesgo	TOOL	230	455	48	48	#4FA3A5	monitoring	RISK	f	t	Tomar herramienta	Medidor de riesgo para factores agravantes.	\N	RISK_METER	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
21	1	tool-bitacora	Bitacora	TOOL	340	455	48	48	#4FA3A5	edit_note	BIT	f	t	Tomar herramienta	Registra el razonamiento profesional durante la escena.	\N	REFLECTION_JOURNAL	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
22	1	tool-pap	PAP	TOOL	230	455	48	48	#4FA3A5	psychology	PAP	f	t	Tomar herramienta	Herramienta de contencion inicial para crisis.	\N	PAP	{}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317	0	down	{}	{}
56	14	camilla	Camilla de urgencias	OBJECT	235	190	140	62	#6cc0c7	local_hospital	URG	t	t	Observar camilla	Zona de estabilizacion fisica y emocional.	\N	\N	{}	2026-06-12 08:26:14.965475	2026-06-12 08:26:14.965475	252	down	{}	{"seed": "SOC-FEM-001"}
57	14	familia	Familia en crisis	WARNING	690	210	84	84	#e06d5f	warning	FAM	f	t	Leer clima familiar	La familia llega alterada y exige ver a la nina; requiere contencion y comunicacion gradual.	\N	\N	{}	2026-06-12 08:26:14.971505	2026-06-12 08:26:14.971505	294	down	{}	{"seed": "SOC-FEM-001"}
58	14	decision-hospital-crisis	Equipo de crisis hospitalaria	PERSON	474	245	64	72	#7c4dff	psychology	DEC	t	t	Abrir decision	Pregunta 1 del Hospital: En que centrar la intervencion inmediata?	\N	\N	{}	2026-06-12 08:26:14.973023	2026-06-12 08:26:14.973023	317	down	{}	{"seed": "SOC-FEM-001"}
59	14	tool-pap	PAP	TOOL	135	280	54	54	#45c49a	construction	PAP	f	t	Recoger herramienta	Herramienta disponible: PAP.	\N	PAP	{}	2026-06-12 08:26:14.997284	2026-06-12 08:26:14.997284	334	down	{}	{"seed": "SOC-FEM-001"}
60	15	camilla	Camilla de urgencias	OBJECT	235	190	140	62	#6cc0c7	local_hospital	URG	t	t	Observar camilla	Zona de estabilizacion fisica y emocional.	\N	\N	{}	2026-06-12 08:26:15.015465	2026-06-12 08:26:15.015465	252	down	{}	{"seed": "SOC-FEM-001"}
61	15	familia	Familia en crisis	WARNING	690	210	84	84	#e06d5f	warning	FAM	f	t	Leer clima familiar	La familia llega alterada y exige ver a la nina; requiere contencion y comunicacion gradual.	\N	\N	{}	2026-06-12 08:26:15.018488	2026-06-12 08:26:15.018488	294	down	{}	{"seed": "SOC-FEM-001"}
62	15	decision-hospital-marco	Coordinacion normativa	PERSON	474	245	64	72	#7c4dff	psychology	DEC	t	t	Abrir decision	Pregunta 2 del Hospital: Que marco normativo y tecnico debe seguir?	\N	\N	{}	2026-06-12 08:26:15.021073	2026-06-12 08:26:15.021073	317	down	{}	{"seed": "SOC-FEM-001"}
63	15	tool-protocolo_459	Res. 459	TOOL	135	280	54	54	#45c49a	construction	PROTOC	f	t	Recoger herramienta	Herramienta disponible: Res. 459.	\N	PROTOCOLO_459	{}	2026-06-12 08:26:15.03742	2026-06-12 08:26:15.03742	334	down	{}	{"seed": "SOC-FEM-001"}
64	15	tool-ley_1257	Ley 1257	TOOL	247	280	54	54	#45c49a	construction	LEY_12	f	t	Recoger herramienta	Herramienta disponible: Ley 1257.	\N	LEY_1257	{}	2026-06-12 08:26:15.039421	2026-06-12 08:26:15.039421	334	down	{}	{"seed": "SOC-FEM-001"}
65	16	camilla	Camilla de urgencias	OBJECT	235	190	140	62	#6cc0c7	local_hospital	URG	t	t	Observar camilla	Zona de estabilizacion fisica y emocional.	\N	\N	{}	2026-06-12 08:26:15.05191	2026-06-12 08:26:15.05191	252	down	{}	{"seed": "SOC-FEM-001"}
66	16	familia	Familia en crisis	WARNING	690	210	84	84	#e06d5f	warning	FAM	f	t	Leer clima familiar	La familia llega alterada y exige ver a la nina; requiere contencion y comunicacion gradual.	\N	\N	{}	2026-06-12 08:26:15.053457	2026-06-12 08:26:15.053457	294	down	{}	{"seed": "SOC-FEM-001"}
67	16	decision-hospital-etica	Mesa interdisciplinaria	PERSON	474	245	64	72	#7c4dff	psychology	DEC	t	t	Abrir decision	Pregunta 3 del Hospital: Que se debe hacer y que se debe evitar tecnica y eticamente?	\N	\N	{}	2026-06-12 08:26:15.054521	2026-06-12 08:26:15.054521	317	down	{}	{"seed": "SOC-FEM-001"}
68	16	tool-pap	PAP	TOOL	135	280	54	54	#45c49a	construction	PAP	f	t	Recoger herramienta	Herramienta disponible: PAP.	\N	PAP	{}	2026-06-12 08:26:15.067111	2026-06-12 08:26:15.067111	334	down	{}	{"seed": "SOC-FEM-001"}
69	16	tool-epicee	EPICEE	TOOL	247	280	54	54	#45c49a	construction	EPICEE	f	t	Recoger herramienta	Herramienta disponible: EPICEE.	\N	EPICEE	{}	2026-06-12 08:26:15.069493	2026-06-12 08:26:15.069493	334	down	{}	{"seed": "SOC-FEM-001"}
70	16	tool-interdisciplinar	Mesa	TOOL	359	280	54	54	#45c49a	construction	INTERD	f	t	Recoger herramienta	Herramienta disponible: Mesa.	\N	INTERDISCIPLINAR	{}	2026-06-12 08:26:15.071184	2026-06-12 08:26:15.071184	334	down	{}	{"seed": "SOC-FEM-001"}
71	17	archivo-derechos	Archivo de derechos	OBJECT	230	185	110	76	#6cc0c7	folder_shared	DER	t	t	Consultar archivo	Documentos de proteccion, derechos economicos, justicia y seguimiento.	\N	\N	{}	2026-06-12 08:26:15.081433	2026-06-12 08:26:15.081433	261	down	{}	{"seed": "SOC-FEM-001"}
72	17	sala-espera	Sala de espera	WARNING	700	205	88	88	#e06d5f	groups	ESP	f	t	Observar sala	El entorno puede aumentar ansiedad; protege privacidad y evita revictimizacion.	\N	\N	{}	2026-06-12 08:26:15.083286	2026-06-12 08:26:15.083286	293	down	{}	{"seed": "SOC-FEM-001"}
73	17	decision-comisaria-prioridad	Entrevista de proteccion	PERSON	474	245	64	72	#7c4dff	psychology	DEC	t	t	Abrir decision	Pregunta 1 de Comisaria: Cual es la prioridad en la asesoria psicosocial?	\N	\N	{}	2026-06-12 08:26:15.085113	2026-06-12 08:26:15.085113	317	down	{}	{"seed": "SOC-FEM-001"}
74	17	tool-val_riesgo_fem	Riesgo fem.	TOOL	135	280	54	54	#45c49a	construction	VAL_RI	f	t	Recoger herramienta	Herramienta disponible: Riesgo fem..	\N	VAL_RIESGO_FEM	{}	2026-06-12 08:26:15.094281	2026-06-12 08:26:15.094281	334	down	{}	{"seed": "SOC-FEM-001"}
75	17	tool-ruta_proteccion	Proteccion	TOOL	247	280	54	54	#45c49a	construction	RUTA_P	f	t	Recoger herramienta	Herramienta disponible: Proteccion.	\N	RUTA_PROTECCION	{}	2026-06-12 08:26:15.096319	2026-06-12 08:26:15.096319	334	down	{}	{"seed": "SOC-FEM-001"}
76	18	archivo-derechos	Archivo de derechos	OBJECT	230	185	110	76	#6cc0c7	folder_shared	DER	t	t	Consultar archivo	Documentos de proteccion, derechos economicos, justicia y seguimiento.	\N	\N	{}	2026-06-12 08:26:15.10493	2026-06-12 08:26:15.10493	261	down	{}	{"seed": "SOC-FEM-001"}
77	18	sala-espera	Sala de espera	WARNING	700	205	88	88	#e06d5f	groups	ESP	f	t	Observar sala	El entorno puede aumentar ansiedad; protege privacidad y evita revictimizacion.	\N	\N	{}	2026-06-12 08:26:15.106874	2026-06-12 08:26:15.106874	293	down	{}	{"seed": "SOC-FEM-001"}
78	18	decision-comisaria-marco	Marco de competencia	PERSON	474	245	64	72	#7c4dff	psychology	DEC	t	t	Abrir decision	Pregunta 2 de Comisaria: Que marco normativo y tecnico debe seguir?	\N	\N	{}	2026-06-12 08:26:15.108487	2026-06-12 08:26:15.108487	317	down	{}	{"seed": "SOC-FEM-001"}
79	18	tool-ley_2126	Ley 2126	TOOL	135	280	54	54	#45c49a	construction	LEY_21	f	t	Recoger herramienta	Herramienta disponible: Ley 2126.	\N	LEY_2126	{}	2026-06-12 08:26:15.117018	2026-06-12 08:26:15.117018	334	down	{}	{"seed": "SOC-FEM-001"}
80	18	tool-ley_1098	Ley 1098	TOOL	247	280	54	54	#45c49a	construction	LEY_10	f	t	Recoger herramienta	Herramienta disponible: Ley 1098.	\N	LEY_1098	{}	2026-06-12 08:26:15.118759	2026-06-12 08:26:15.118759	334	down	{}	{"seed": "SOC-FEM-001"}
81	18	tool-ley_1257	Ley 1257	TOOL	359	280	54	54	#45c49a	construction	LEY_12	f	t	Recoger herramienta	Herramienta disponible: Ley 1257.	\N	LEY_1257	{}	2026-06-12 08:26:15.119808	2026-06-12 08:26:15.119808	334	down	{}	{"seed": "SOC-FEM-001"}
82	19	archivo-derechos	Archivo de derechos	OBJECT	230	185	110	76	#6cc0c7	folder_shared	DER	t	t	Consultar archivo	Documentos de proteccion, derechos economicos, justicia y seguimiento.	\N	\N	{}	2026-06-12 08:26:15.130168	2026-06-12 08:26:15.130168	261	down	{}	{"seed": "SOC-FEM-001"}
83	19	sala-espera	Sala de espera	WARNING	700	205	88	88	#e06d5f	groups	ESP	f	t	Observar sala	El entorno puede aumentar ansiedad; protege privacidad y evita revictimizacion.	\N	\N	{}	2026-06-12 08:26:15.131954	2026-06-12 08:26:15.131954	293	down	{}	{"seed": "SOC-FEM-001"}
84	19	decision-comisaria-etica	Equipo psicosocial	PERSON	474	245	64	72	#7c4dff	psychology	DEC	t	t	Abrir decision	Pregunta 3 de Comisaria: Que se debe hacer y que se debe evitar tecnica y eticamente?	\N	\N	{}	2026-06-12 08:26:15.133572	2026-06-12 08:26:15.133572	317	down	{}	{"seed": "SOC-FEM-001"}
85	19	tool-val_riesgo_fem	Riesgo	TOOL	135	280	54	54	#45c49a	construction	VAL_RI	f	t	Recoger herramienta	Herramienta disponible: Riesgo.	\N	VAL_RIESGO_FEM	{}	2026-06-12 08:26:15.142717	2026-06-12 08:26:15.142717	334	down	{}	{"seed": "SOC-FEM-001"}
86	19	tool-derivacion_salud_mental	Salud mental	TOOL	247	280	54	54	#45c49a	construction	DERIVA	f	t	Recoger herramienta	Herramienta disponible: Salud mental.	\N	DERIVACION_SALUD_MENTAL	{}	2026-06-12 08:26:15.144448	2026-06-12 08:26:15.144448	334	down	{}	{"seed": "SOC-FEM-001"}
87	20	bitacora	Bitacora de aprendizaje	OBJECT	420	220	150	82	#6cc0c7	menu_book	BIT	t	t	Revisar bitacora	Integra reflexion etica, decisiones y rutas activadas.	\N	\N	{}	2026-06-12 08:26:15.153704	2026-06-12 08:26:15.153704	302	down	{}	{"seed": "SOC-FEM-001"}
88	20	cierre-informe	Informe final	OBJECT	470	235	120	80	#6cc0c7	assignment	CIERRE	f	t	Revisar cierre	Revisa decisiones, aprendizajes, proteccion de derechos y riesgos de revictimizacion.	\N	\N	{}	2026-06-12 08:26:15.154713	2026-06-12 08:26:15.154713	315	down	{}	{"seed": "SOC-FEM-001"}
1483	297	familia-crisis	Familia en crisis	PERSON	190	420	48	48	#7FB3D5	person	FAM	f	t	Hablar con la familia en crisis	La abuela de la niña y los hermanos de la sobreviviente exigen verla.	\N	\N	{}	2026-06-15 19:57:01.060486	2026-06-15 19:57:01.060486	0		{}	{}
1484	297	zona-restringida	Acceso a quirófano	OBJECT	660	268	48	48	#7FB3D5	do_not_disturb_on	RES	f	t	Observar la zona restringida	Acceso restringido: la sobreviviente está en cirugía (28 heridas con arma cortopunzante). El personal pide manejar la información con prudencia: la niña de 3 años falleció y la familia aún no lo sabe con certeza.	\N	\N	{}	2026-06-15 19:57:01.09095	2026-06-15 19:57:01.09095	0		{}	{}
1485	297	tool-pap	Kit PAP	TOOL	318	428	48	48	#7FB3D5	healing	PAP	f	t	Tomar el kit de Primeros Auxilios Psicológicos	Primeros Auxilios Psicológicos: contención, estabilización y enlace.	\N	PAP	{}	2026-06-15 19:57:01.098765	2026-06-15 19:57:01.098765	0		{}	{}
1486	297	puerta-sala-escucha	Sala de escucha familiar	EXIT	838	440	36	48	#B69CFF	door_front	EXIT	f	t	Entrar a la sala de escucha familiar	Sala de escucha familiar	\N	\N	{}	2026-06-15 19:57:01.101613	2026-06-15 19:57:01.101613	0		{}	{"targetNodeKey": "hospital-sala-escucha", "entryX": 160, "entryY": 452, "label": "Sala de escucha familiar", "requiresInspected": ["familia-crisis"], "lockedMessage": "Primero identifica la necesidad de contenci\\u00f3n: habla con la familia en crisis."}
1487	298	familia-duelo	Familia en crisis	PERSON	168	408	48	48	#7FB3D5	person	FAM	f	t	Acompañar a la familia	La abuela de la niña y los hermanos de la sobreviviente esperan noticias.	\N	\N	{}	2026-06-15 19:57:01.126199	2026-06-15 19:57:01.126199	0		{}	{}
1488	298	marco-normativo-hospital	Marco normativo	OBJECT	660	320	48	48	#7FB3D5	menu_book	LEY	f	t	Revisar el marco normativo	Protocolos y normas disponibles en el servicio de urgencias.	\N	\N	{}	2026-06-15 19:57:01.148278	2026-06-15 19:57:01.149314	0		{}	{}
1489	298	psicologa-acompanante	Psicóloga hospitalaria	PERSON	740	400	48	48	#7FB3D5	psychology	PSI	f	t	Definir la actuación con la psicóloga	La psicóloga hospitalaria coordina la propuesta de intervención.	\N	\N	{}	2026-06-15 19:57:01.166693	2026-06-15 19:57:01.166693	0		{}	{}
1490	298	tool-pap	Kit PAP	TOOL	318	430	48	48	#7FB3D5	healing	PAP	f	t	Tomar el kit de Primeros Auxilios Psicológicos	Primeros Auxilios Psicológicos: contención, estabilización y enlace.	\N	PAP	{}	2026-06-15 19:57:01.1879	2026-06-15 19:57:01.1879	0		{}	{}
1491	298	tool-spikes	Protocolo EPICEE	TOOL	480	300	48	48	#7FB3D5	description	EPI	f	t	Revisar el protocolo EPICEE/SPIKES	Protocolo EPICEE (SPIKES): comunicación de noticias difíciles por etapas.	\N	SPIKES	{}	2026-06-15 19:57:01.191551	2026-06-15 19:57:01.191551	0		{}	{}
1492	298	tool-bitacora	Bitácora	TOOL	560	430	48	48	#7FB3D5	edit_note	BIT	f	t	Tomar la bitácora reflexiva	Registra una reflexión breve del bloque hospitalario.	\N	REFLECTION_JOURNAL	{}	2026-06-15 19:57:01.194406	2026-06-15 19:57:01.194406	0		{}	{}
1493	298	puerta-urgencias	Sala de urgencias	EXIT	122	460	36	48	#B69CFF	door_front	EXIT	f	t	Volver a urgencias	Sala de urgencias	\N	\N	{}	2026-06-15 19:57:01.1972	2026-06-15 19:57:01.1972	0		{}	{"targetNodeKey": "hospital-urgencias", "entryX": 786, "entryY": 440, "label": "Sala de urgencias"}
1494	298	salida-institucional	Salida institucional	EXIT	838	440	36	48	#B69CFF	door_front	EXIT	f	t	Iniciar la ruta institucional	Comisaría de Familia	\N	\N	{}	2026-06-15 19:57:01.199433	2026-06-15 19:57:01.199433	0		{}	{"targetNodeKey": "comisaria-recepcion", "entryX": 160, "entryY": 452, "label": "Comisar\\u00eda de Familia", "requiresNodes": ["hospital-cierre-bloque"], "lockedMessage": "La ruta institucional a\\u00fan no est\\u00e1 lista. Completa la contenci\\u00f3n y registra la decisi\\u00f3n hospitalaria."}
1495	299	familia-duelo	Familia en crisis	PERSON	168	408	48	48	#7FB3D5	person	FAM	f	t	Acompañar a la familia	La abuela de la niña y los hermanos de la sobreviviente esperan noticias.	\N	\N	{}	2026-06-15 19:57:01.22359	2026-06-15 19:57:01.22359	0		{}	{}
1496	299	marco-normativo-hospital	Marco normativo	OBJECT	660	320	48	48	#7FB3D5	menu_book	LEY	f	t	Revisar el marco normativo	Protocolos y normas disponibles en el servicio de urgencias.	\N	\N	{}	2026-06-15 19:57:01.243491	2026-06-15 19:57:01.243491	0		{}	{}
1497	299	psicologa-acompanante	Psicóloga hospitalaria	PERSON	740	400	48	48	#7FB3D5	psychology	PSI	f	t	Definir la actuación con la psicóloga	La psicóloga hospitalaria coordina la propuesta de intervención.	\N	\N	{}	2026-06-15 19:57:01.261392	2026-06-15 19:57:01.261392	0		{}	{}
1498	299	tool-pap	Kit PAP	TOOL	318	430	48	48	#7FB3D5	healing	PAP	f	t	Tomar el kit de Primeros Auxilios Psicológicos	Primeros Auxilios Psicológicos: contención, estabilización y enlace.	\N	PAP	{}	2026-06-15 19:57:01.281248	2026-06-15 19:57:01.281248	0		{}	{}
1499	299	tool-spikes	Protocolo EPICEE	TOOL	480	300	48	48	#7FB3D5	description	EPI	f	t	Revisar el protocolo EPICEE/SPIKES	Protocolo EPICEE (SPIKES): comunicación de noticias difíciles por etapas.	\N	SPIKES	{}	2026-06-15 19:57:01.283589	2026-06-15 19:57:01.283589	0		{}	{}
1500	299	tool-bitacora	Bitácora	TOOL	560	430	48	48	#7FB3D5	edit_note	BIT	f	t	Tomar la bitácora reflexiva	Registra una reflexión breve del bloque hospitalario.	\N	REFLECTION_JOURNAL	{}	2026-06-15 19:57:01.286459	2026-06-15 19:57:01.286459	0		{}	{}
1501	299	puerta-urgencias	Sala de urgencias	EXIT	122	460	36	48	#B69CFF	door_front	EXIT	f	t	Volver a urgencias	Sala de urgencias	\N	\N	{}	2026-06-15 19:57:01.28947	2026-06-15 19:57:01.28947	0		{}	{"targetNodeKey": "hospital-urgencias", "entryX": 786, "entryY": 440, "label": "Sala de urgencias"}
1502	299	salida-institucional	Salida institucional	EXIT	838	440	36	48	#B69CFF	door_front	EXIT	f	t	Iniciar la ruta institucional	Comisaría de Familia	\N	\N	{}	2026-06-15 19:57:01.293702	2026-06-15 19:57:01.293702	0		{}	{"targetNodeKey": "comisaria-recepcion", "entryX": 160, "entryY": 452, "label": "Comisar\\u00eda de Familia", "requiresNodes": ["hospital-cierre-bloque"], "lockedMessage": "La ruta institucional a\\u00fan no est\\u00e1 lista. Completa la contenci\\u00f3n y registra la decisi\\u00f3n hospitalaria."}
1503	300	familia-duelo	Familia acompañada	PERSON	168	408	48	48	#7FB3D5	person	FAM	f	t	Despedirte de la familia	La familia quedó contenida y orientada.	\N	\N	{}	2026-06-15 19:57:01.316696	2026-06-15 19:57:01.316696	0		{}	{}
1504	300	resumen-bloque	Registro hospitalario	OBJECT	480	360	48	48	#7FB3D5	assignment_turned_in	REG	f	t	Revisar el registro hospitalario	Bloque hospitalario registrado: contención realizada, marco normativo definido y articulación interdisciplinaria en curso. La salida institucional hacia la Comisaría de Familia está habilitada.	\N	\N	{}	2026-06-15 19:57:01.328516	2026-06-15 19:57:01.328516	0		{}	{}
1505	300	tool-bitacora	Bitácora	TOOL	560	430	48	48	#7FB3D5	edit_note	BIT	f	t	Registrar una reflexión	Registra una reflexión breve antes de la ruta institucional.	\N	REFLECTION_JOURNAL	{}	2026-06-15 19:57:01.336598	2026-06-15 19:57:01.336598	0		{}	{}
1506	300	puerta-urgencias	Sala de urgencias	EXIT	122	460	36	48	#B69CFF	door_front	EXIT	f	t	Volver a urgencias	Sala de urgencias	\N	\N	{}	2026-06-15 19:57:01.339614	2026-06-15 19:57:01.339614	0		{}	{"targetNodeKey": "hospital-urgencias", "entryX": 786, "entryY": 440, "label": "Sala de urgencias"}
1507	300	salida-institucional	Salida institucional	EXIT	838	440	36	48	#B69CFF	door_front	EXIT	f	t	Iniciar la ruta institucional	Comisaría de Familia	\N	\N	{}	2026-06-15 19:57:01.342855	2026-06-15 19:57:01.342855	0		{}	{"targetNodeKey": "comisaria-recepcion", "entryX": 160, "entryY": 452, "label": "Comisar\\u00eda de Familia"}
1508	301	expediente-caso	Expediente del caso	OBJECT	740	312	48	48	#7FB3D5	folder_open	EXP	f	t	Revisar el expediente	Expediente: mujer de 22 años, sobreviviente de tentativa de feminicidio (28 heridas con arma cortopunzante). Su hija de 3 años fue asesinada por la pareja, hombre de 28 años. Alta médica hace 15 días; secuelas físicas y trauma complejo. Se requiere valoración de riesgo, medidas de protección y asesoría de derechos.	\N	\N	{}	2026-06-15 19:57:01.364053	2026-06-15 19:57:01.364053	0		{}	{}
1509	301	funcionaria-recepcion	Funcionaria de recepción	PERSON	480	332	48	48	#7FB3D5	support_agent	REC	f	t	Recibir orientación de ingreso	La funcionaria orienta el ingreso del caso.	\N	\N	{}	2026-06-15 19:57:01.372573	2026-06-15 19:57:01.372573	0		{}	{}
1510	301	puerta-consultorio	Consultorio	EXIT	838	440	36	48	#B69CFF	door_front	EXIT	f	t	Entrar al consultorio	Consultorio	\N	\N	{}	2026-06-15 19:57:01.381637	2026-06-15 19:57:01.381637	0		{}	{"targetNodeKey": "comisaria-consultorio", "entryX": 160, "entryY": 452, "label": "Consultorio", "requiresInspected": ["expediente-caso"], "lockedMessage": "Revisa primero el expediente y la orientaci\\u00f3n de ingreso."}
1511	302	sobreviviente-consulta	Sobreviviente	PERSON	220	408	48	48	#7FB3D5	person	SOB	f	t	Escuchar a la sobreviviente	Mujer de 22 años; alta médica hace 15 días, secuelas físicas y trauma complejo.	\N	\N	{}	2026-06-15 19:57:01.411751	2026-06-15 19:57:01.411751	0		{}	{}
1512	302	marco-normativo-comisaria	Marco normativo	OBJECT	790	318	48	48	#7FB3D5	menu_book	LEY	f	t	Revisar el marco normativo	Normas del restablecimiento de derechos.	\N	\N	{}	2026-06-15 19:57:01.43383	2026-06-15 19:57:01.43383	0		{}	{}
1513	302	profesional-psicosocial	Profesional psicosocial	PERSON	700	400	48	48	#7FB3D5	psychology	PRO	f	t	Cerrar la actuación técnica	El equipo psicosocial de la comisaría consolida el plan.	\N	\N	{}	2026-06-15 19:57:01.452577	2026-06-15 19:57:01.452577	0		{}	{}
1514	302	tool-riesgo	Valoración de riesgo	TOOL	318	436	48	48	#7FB3D5	monitor_heart	RIE	f	t	Tomar el instrumento de valoración de riesgo	Instrumento estructurado de valoración del riesgo de feminicidio.	\N	RISK_METER	{}	2026-06-15 19:57:01.472326	2026-06-15 19:57:01.472326	0		{}	{}
1515	302	tool-ruta	Ruta de protección	TOOL	610	436	48	48	#7FB3D5	alt_route	RUT	f	t	Tomar la ruta de protección	Medidas de protección y articulación institucional disponibles.	\N	SAFETY_ROUTE	{}	2026-06-15 19:57:01.476002	2026-06-15 19:57:01.476002	0		{}	{}
1516	302	puerta-recepcion	Recepción	EXIT	122	460	36	48	#B69CFF	door_front	EXIT	f	t	Volver a recepción	Recepción	\N	\N	{}	2026-06-15 19:57:01.478358	2026-06-15 19:57:01.478358	0		{}	{"targetNodeKey": "comisaria-recepcion", "entryX": 786, "entryY": 440, "label": "Recepci\\u00f3n"}
1517	303	sobreviviente-consulta	Sobreviviente	PERSON	220	408	48	48	#7FB3D5	person	SOB	f	t	Escuchar a la sobreviviente	Mujer de 22 años; alta médica hace 15 días, secuelas físicas y trauma complejo.	\N	\N	{}	2026-06-15 19:57:01.512562	2026-06-15 19:57:01.512562	0		{}	{}
1518	303	marco-normativo-comisaria	Marco normativo	OBJECT	790	318	48	48	#7FB3D5	menu_book	LEY	f	t	Revisar el marco normativo	Normas del restablecimiento de derechos.	\N	\N	{}	2026-06-15 19:57:01.543628	2026-06-15 19:57:01.543628	0		{}	{}
1519	303	profesional-psicosocial	Profesional psicosocial	PERSON	700	400	48	48	#7FB3D5	psychology	PRO	f	t	Cerrar la actuación técnica	El equipo psicosocial de la comisaría consolida el plan.	\N	\N	{}	2026-06-15 19:57:01.571452	2026-06-15 19:57:01.571452	0		{}	{}
1520	303	tool-riesgo	Valoración de riesgo	TOOL	318	436	48	48	#7FB3D5	monitor_heart	RIE	f	t	Tomar el instrumento de valoración de riesgo	Instrumento estructurado de valoración del riesgo de feminicidio.	\N	RISK_METER	{}	2026-06-15 19:57:01.595071	2026-06-15 19:57:01.595071	0		{}	{}
1521	303	tool-ruta	Ruta de protección	TOOL	610	436	48	48	#7FB3D5	alt_route	RUT	f	t	Tomar la ruta de protección	Medidas de protección y articulación institucional disponibles.	\N	SAFETY_ROUTE	{}	2026-06-15 19:57:01.598197	2026-06-15 19:57:01.598197	0		{}	{}
1522	303	puerta-recepcion	Recepción	EXIT	122	460	36	48	#B69CFF	door_front	EXIT	f	t	Volver a recepción	Recepción	\N	\N	{}	2026-06-15 19:57:01.603724	2026-06-15 19:57:01.603724	0		{}	{"targetNodeKey": "comisaria-recepcion", "entryX": 786, "entryY": 440, "label": "Recepci\\u00f3n"}
1523	304	cierre-resumen	Cierre del caso	OBJECT	480	360	48	48	#7FB3D5	assignment_turned_in	FIN	f	t	Revisar el cierre del caso	Caso cerrado: revisa tu reporte final con métricas, decisiones y final alcanzado.	\N	\N	{}	2026-06-15 19:57:01.641477	2026-06-15 19:57:01.641477	0		{}	{}
\.


--
-- Data for Name: opciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.opciones (id, pregunta_id, texto, es_correcta, feedback_texto, normativa_ref) FROM stdin;
1	1	Aplicar de inmediato el cuestionario estandarizado de violencia intrafamiliar para recolectar evidencia.	f	La aplicación de instrumentos estandarizados no es prioritaria en la fase aguda. La víctima necesita primero estabilización emocional antes de cualquier evaluación formal.	\N
2	1	Aplicar Primeros Auxilios Psicológicos (PAP) con técnicas de contención emocional: escucha activa, validación del dolor, reducción de la activación fisiológica y establecimiento de seguridad inmediata.	t	¡Correcto! Los PAP son la intervención de primera línea en crisis. El objetivo es estabilizar emocionalmente, garantizar la seguridad y restablecer la capacidad de toma de decisiones de la víctima.	Protocolo de Atención Integral a Víctimas de Violencia Sexual y de Género — Ministerio de Salud Colombia
3	1	Llamar inmediatamente a la Policía Nacional para documentar el hecho antes de realizar cualquier intervención psicológica.	f	Aunque el reporte policial es importante, la primera prioridad es la estabilización emocional de la víctima. La decisión de denunciar debe tomarse junto con ella, salvo riesgo inminente de vida.	\N
4	1	Informar a la paciente sobre sus derechos legales y entregarle el directorio de casas de refugio disponibles en la ciudad.	f	La información sobre recursos es importante pero prematura como primera intervención. La víctima en estado de shock no puede procesar información compleja. Primero: contención emocional.	\N
5	2	Únicamente registrar el caso en la historia clínica y recomendar a la paciente que interponga la denuncia por sus propios medios en la Fiscalía.	f	El profesional de salud tiene obligación legal de activar la ruta de atención. Dejar esta responsabilidad exclusivamente a la víctima incumple el deber institucional y puede aumentar el riesgo.	\N
6	2	Activar la ruta de atención a víctimas de violencia basada en género: notificación a la Comisaría de Familia, coordinación con trabajo social, aplicación del protocolo Resolución 459/2012 del MSPS y garantía de los derechos establecidos en la Ley 1257 de 2008.	t	¡Correcto! La Resolución 459/2012 establece el protocolo de atención integral para víctimas de violencia sexual y de género en el sector salud. La Ley 1257/2008 garantiza los derechos de las mujeres a una vida libre de violencias.	Resolución 459/2012 MSPS — Protocolo de Atención Integral Víctimas VBG; Ley 1257 de 2008
7	2	Contactar al agresor para realizar una sesión de mediación familiar en el hospital antes de tomar otras medidas.	f	La mediación con el agresor está contraindicada en casos de violencia con riesgo para la vida. Puede aumentar el peligro para la víctima y revictimizarla. Está expresamente prohibida por la Ley 1257/2008.	Ley 1257 de 2008, Art. 8 — Prohibición de mecanismos alternativos de solución de conflictos en casos de violencia contra la mujer
8	2	Remitir el caso únicamente al servicio de psiquiatría para evaluación del trastorno de estrés postraumático y postergar la ruta de protección.	f	La evaluación psiquiátrica puede ser parte del proceso, pero no debe postergar la activación de la ruta de protección. La seguridad inmediata de la víctima es prioritaria.	\N
9	3	Solo el diagnóstico clínico DSM-5 y la descripción de los síntomas observados durante la consulta.	f	Un informe de urgencias en contexto de VBG requiere elementos adicionales: descripción de lesiones, valoración de riesgo, red de apoyo, recursos activados y recomendaciones de seguridad.	\N
10	3	Descripción objetiva de la situación, estado mental observado, sintomatología presente, diagnóstico provisional y medicación sugerida exclusivamente.	f	La medicación no es competencia del psicólogo. Además, el informe debe incluir valoración de riesgo, protección de menores y coordinación interinstitucional.	\N
11	3	Motivo de consulta, estado mental, factores de riesgo y protección, impacto psicológico de las agresiones, evaluación del riesgo para los menores y recomendaciones de intervención.	f	Este es un buen informe pero le faltan elementos clave: la valoración del riesgo de feminicidio, las medidas de seguridad concretas activadas y la coordinación interinstitucional.	\N
12	3	Todos los anteriores más: valoración específica del riesgo de feminicidio, medidas de seguridad adoptadas, red de apoyo disponible, coordinación interinstitucional activada y plan de seguimiento psicosocial.	t	¡Correcto! Un informe integral en VBG debe incluir la valoración del riesgo de feminicidio (usando instrumentos validados), las acciones de protección adoptadas y el plan de articulación con otras instituciones.	Protocolo de Atención Integral VBG — MSPS; Lineamientos para la Práctica de la Psicología Forense en Colombia — Colegio Colombiano de Psicólogos
13	4	Realizar únicamente una entrevista clínica no estructurada para evaluar el estado emocional actual de la víctima.	f	La entrevista clínica es insuficiente para la valoración del riesgo de feminicidio. Se requieren instrumentos validados y un análisis de factores de riesgo específicos.	\N
14	4	Aplicar instrumento validado de valoración de riesgo de feminicidio (como el Danger Assessment), identificar factores agravantes (armas, amenazas previas, consumo de sustancias) y proponer medidas de protección inmediata proporcionales al nivel de riesgo.	t	¡Correcto! La valoración estructurada del riesgo permite determinar medidas de protección proporcionales. Los factores presentes (arma blanca, amenazas, reincidencia, consumo de alcohol) indican riesgo alto.	Ley 1761 de 2015 — Rosa Elvira Cely; Protocolo Nacional de Valoración de Riesgo de Feminicidio
15	4	Solicitar a la víctima que redacte por escrito el relato completo de todos los episodios de violencia para construir el expediente jurídico.	f	Obligar a la víctima a redactar repetidamente su historia de violencia es una forma de revictimización. El profesional debe tomar el registro, no la víctima.	\N
16	4	Citar al agresor a la Comisaría para escuchar su versión antes de determinar medidas de protección.	f	Citar al agresor antes de establecer medidas de protección puede alertarlo y aumentar el riesgo para la víctima. Las medidas de protección se otorgan con base en la valoración del riesgo.	Ley 1257 de 2008, Art. 17 — Medidas de protección inmediata
17	5	Activar la ruta de protección para niños, niñas y adolescentes conforme a la Ley 2126/2021 (sistema nacional de convivencia familiar) en articulación con la Ley 1098/2006 (Código de Infancia y Adolescencia) y la Ley 1257/2008, notificando al ICBF si hay riesgo para su integridad.	t	¡Correcto! Los NNA que presencian violencia son víctimas directas. La Ley 2126/2021 actualiza el sistema de atención a violencias en el hogar. La Ley 1098/2006 establece la obligación de denunciar y proteger a los menores. El ICBF debe ser notificado.	Ley 2126 de 2021; Ley 1098 de 2006 — Código de Infancia y Adolescencia; Ley 1257 de 2008
18	5	Registrar en el informe que los menores estuvieron presentes pero que al no ser agredidos físicamente no requieren intervención inmediata.	f	Presenciar violencia intrafamiliar es una forma de violencia psicológica para los NNA. Tienen derecho a atención psicosocial independientemente de si sufrieron agresión física directa.	Ley 1098 de 2006, Art. 18 — Derecho a la integridad personal
19	5	Separar a los menores de la madre e internarlos provisionalmente en un hogar de paso del ICBF mientras se resuelve la situación.	f	La separación de la madre no es la primera medida. El interés superior del niño indica mantener el vínculo materno-filial cuando la madre es la víctima. El ICBF debe evaluar alternativas que preserven este vínculo.	\N
20	5	Remitir únicamente a los menores a consulta de psicología infantil en el hospital, sin activar ninguna otra ruta institucional.	f	La atención psicológica es necesaria, pero insuficiente. Debe activarse la ruta de protección integral que incluye al ICBF, la Comisaría y las medidas de seguridad para el núcleo familiar.	\N
21	6	Programar citas mensuales de psicología para la víctima y esperar que ella reporte nuevas agresiones.	f	Un plan mensual es insuficiente ante un riesgo alto de feminicidio. Se requiere seguimiento activo, articulación interinstitucional y medidas de seguridad concretas.	\N
22	6	Plan de seguridad personalizado para la víctima, atención psicosocial semanal para ella y los menores, articulación con casa de refugio si el riesgo es alto, seguimiento activo por parte de la Comisaría y coordinación con Fiscalía para medidas de protección legal.	f	Este plan es sólido pero no incluye la valoración integral de los derechos de los menores ni la activación explícita de las rutas de protección para NNA.	\N
23	6	Plan de seguridad personalizado + atención psicosocial para la víctima y los menores + articulación interinstitucional (ICBF, Fiscalía, Comisaría, casa refugio) + seguimiento activo del caso + valoración integral del riesgo para los derechos de los NNA y activación de rutas de protección específicas.	t	¡Correcto! El plan integral debe incluir todas estas dimensiones: seguridad física, atención psicosocial diferenciada, protección legal, protección de los NNA y coordinación entre todas las instituciones responsables.	Ley 1257 de 2008; Ley 2126 de 2021; Ley 1098 de 2006; Modelo de Atención Integral a Víctimas de Violencias Basadas en Género — MSPS
24	6	Derivar el caso completamente a la Fiscalía y cerrar la intervención psicosocial una vez activada la denuncia penal.	f	La denuncia penal es un paso importante, pero no reemplaza la intervención psicosocial continua. El proceso judicial puede ser largo y la víctima necesita acompañamiento durante todo ese tiempo.	\N
\.


--
-- Data for Name: preguntas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.preguntas (id, escenario_id, orden, enunciado, puntos_correcta) FROM stdin;
1	1	1	La paciente se encuentra en estado de shock emocional, con llanto contenido y dificultad para comunicarse. ¿Cuál es la primera intervención psicológica más adecuada en este momento?	10
2	1	2	La paciente revela que esta es la tercera agresión física en seis meses y que su pareja la amenazó con un cuchillo la semana anterior. ¿Qué ruta de atención y marco normativo debe activar el profesional de salud?	10
3	1	3	Al elaborar el informe psicológico de urgencias, ¿qué elementos debe incluir obligatoriamente para garantizar una evaluación integral conforme a los estándares colombianos?	10
4	2	1	En la Comisaría de Familia, la psicóloga debe realizar la valoración del riesgo. ¿Cuál es el procedimiento correcto?	10
5	2	2	Los dos hijos de la víctima (7 y 10 años) presenciaron las agresiones. ¿Qué marco legal obliga a protegerlos y cuál es la ruta correcta?	10
6	2	3	Al cierre de la atención en la Comisaría, ¿cuál debe ser el plan de intervención psicosocial más completo para esta familia?	10
\.


--
-- Data for Name: publication_checklist_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.publication_checklist_items (id, checklist_id, code, label, required, fulfilled, evidence_note) FROM stdin;
\.


--
-- Data for Name: publication_checklists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.publication_checklists (id, case_version_id, submitted_by, completion_ratio, status, submitted_at, completed_at) FROM stdin;
1	1	2	100.00	COMPLETE	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
66	59	1	0.00	PENDING	2026-06-15 21:22:59.703086	\N
\.


--
-- Data for Name: reflection_journals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reflection_journals (id, attempt_id, node_id, encrypted_text, encryption_key_ref, locked, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: respuestas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.respuestas (id, sesion_id, pregunta_id, opcion_id, es_correcta, tiempo_respuesta_ms, respondida_en) FROM stdin;
\.


--
-- Data for Name: rubric_criteria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rubric_criteria (id, rubric_id, competency, title, description, max_score, display_order, weight, active) FROM stdin;
1	1	RIESGO	Valoracion de riesgo	Identifica amenazas, armas, reincidencia y medidas proporcionales.	5	3	5.00	t
2	1	RUTA	Activacion de rutas	Articula comisaria, salud, trabajo social, proteccion y red de apoyo.	5	4	5.00	t
3	1	ETICA	Etica y no revictimizacion	Evita mediacion, contacto prematuro con agresor y preguntas revictimizantes.	5	2	5.00	t
4	1	PAP	Contencion inicial	Aplica escucha activa, validacion emocional y estabilizacion antes de documentar.	5	1	5.00	t
5	1	NNA	Proteccion de NNA	Reconoce afectacion de menores y activa respuesta diferenciada.	5	5	5.00	t
6	2	PAP	Contencion inicial	Aplica escucha activa, validacion emocional y estabilizacion antes de documentar.	5	1	5.00	t
7	2	ETICA	Etica y no revictimizacion	Evita mediacion, contacto prematuro con agresor y preguntas revictimizantes.	5	2	5.00	t
8	2	RIESGO	Valoracion de riesgo	Identifica amenazas, armas, reincidencia y medidas proporcionales.	5	3	5.00	t
9	2	RUTA	Activacion de rutas	Articula comisaria, salud, trabajo social, proteccion y red de apoyo.	5	4	5.00	t
10	2	NNA	Proteccion de NNA	Reconoce afectacion de menores y activa respuesta diferenciada.	5	5	5.00	t
\.


--
-- Data for Name: rubric_evaluations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rubric_evaluations (id, attempt_id, rubric_id, instructor_id, total_score, comment, evaluated_at, status, snapshot_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rubrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rubrics (id, case_version_id, name, description, active, created_by, created_at, version, is_default, updated_at) FROM stdin;
1	1	Rubrica integral VBG	Evalua contencion, comunicacion, etica, riesgo, documentacion y rutas de proteccion.	t	2	2026-06-05 22:36:23.555317	1.0	f	\N
2	4	Rubrica integral VBG	Evalua contencion, comunicacion, etica, riesgo, documentacion y rutas de proteccion.	t	2	2026-06-14 10:40:27.840632	1.0	f	\N
\.


--
-- Data for Name: scene_maps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scene_maps (id, case_version_id, node_id, map_key, title, width, height, theme, spawn_x, spawn_y, ambient_json, created_at, updated_at) FROM stdin;
1	1	1	urgencias-crisis	Sala de urgencias: primera escucha	960	540	clinical-soft	145	430	{"music":"none","mood":"calm-institutional"}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
2	1	2	ruta-proteccion	Revelacion de riesgo alto	960	540	protection-route	145	430	{"music":"none","mood":"calm-institutional"}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
3	1	3	informe-integral	Informe psicologico de urgencias	960	540	technical-record	145	430	{"music":"none","mood":"calm-institutional"}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
4	1	4	valoracion-comisaria	Comisaria de Familia: valoracion del riesgo	960	540	risk-assessment	145	430	{"music":"none","mood":"calm-institutional"}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
5	1	5	proteccion-nna	Proteccion de ninos, ninas y adolescentes	960	540	child-protection	145	430	{"music":"none","mood":"calm-institutional"}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
6	1	6	cierre-seguimiento	Cierre del caso y plan de seguimiento	960	540	follow-up	145	430	{"music":"none","mood":"calm-institutional"}	2026-06-05 22:36:23.555317	2026-06-05 22:36:23.555317
297	4	299	hospital-urgencias	Hospital — Urgencias	960	528	hospital-urgencias	480	430	{"music": "none", "mood": "clinical-urgent"}	2026-06-15 19:57:01.025023	2026-06-15 19:57:01.025023
298	4	300	hospital-sala-escucha	Hospital — Sala de escucha familiar	960	528	hospital-escucha	480	430	{"music": "none", "mood": "warm-private"}	2026-06-15 19:57:01.105093	2026-06-15 19:57:01.105093
299	4	301	hospital-sala-escucha-accion	Hospital — Sala de escucha familiar	960	528	hospital-escucha	480	430	{"music": "none", "mood": "warm-private"}	2026-06-15 19:57:01.202642	2026-06-15 19:57:01.202642
300	4	302	hospital-sala-escucha-cierre	Hospital — Sala de escucha familiar	960	528	hospital-escucha	480	430	{"music": "none", "mood": "warm-private"}	2026-06-15 19:57:01.296713	2026-06-15 19:57:01.296713
301	4	306	comisaria-recepcion	Comisaría de Familia — Recepción	960	528	comisaria-recepcion	160	452	{"music": "none", "mood": "institutional", "transitionText": "Quince d\\u00edas despu\\u00e9s, tras el alta m\\u00e9dica, inicia la ruta de restablecimiento de derechos."}	2026-06-15 19:57:01.345177	2026-06-15 19:57:01.345177
302	4	303	comisaria-consultorio	Comisaría de Familia — Consultorio	960	528	comisaria-consultorio	480	430	{"music": "none", "mood": "reserved"}	2026-06-15 19:57:01.384171	2026-06-15 19:57:01.384171
303	4	304	comisaria-consultorio-marco	Comisaría de Familia — Consultorio	960	528	comisaria-consultorio	480	430	{"music": "none", "mood": "reserved"}	2026-06-15 19:57:01.480977	2026-06-15 19:57:01.480977
14	3	14	social-hospital-crisis	Urgencias hospitalarias	960	640	hospital	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:14.944228	2026-06-12 08:26:14.944228
15	3	15	social-hospital-marco	Puesto de coordinacion clinica	960	640	hospital	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:15.000353	2026-06-12 08:26:15.000353
16	3	16	social-hospital-etica	Sala de comunicacion familiar	960	640	hospital	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:15.040421	2026-06-12 08:26:15.040421
17	3	17	social-comisaria-prioridad	Comisaria de Familia	960	640	comisaria	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:15.072184	2026-06-12 08:26:15.072184
18	3	18	social-comisaria-marco	Despacho de restablecimiento	960	640	comisaria	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:15.098324	2026-06-12 08:26:15.098324
19	3	19	social-comisaria-etica	Sala psicosocial	960	640	comisaria	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:15.121342	2026-06-12 08:26:15.121342
20	3	20	social-cierre	Cierre y trazabilidad	960	640	follow-up	145	440	{"engine": "babylon", "source": "Caso juego social PSICOLOGIA SOCIAL.pdf"}	2026-06-12 08:26:15.145447	2026-06-12 08:26:15.145447
304	4	305	comisaria-consultorio-cierre	Comisaría de Familia — Consultorio	960	528	comisaria-consultorio	480	430	{"music": "none", "mood": "reserved"}	2026-06-15 19:57:01.609287	2026-06-15 19:57:01.609287
583	59	592	escena-inicial	Escena inicial	960	540	clinical-soft	145	430	{}	2026-06-15 21:22:59.699078	2026-06-15 21:22:59.699078
\.


--
-- Data for Name: sesiones_juego; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sesiones_juego (id, estudiante_id, caso_id, fecha_inicio, fecha_fin, puntaje_total, completado) FROM stdin;
\.


--
-- Data for Name: simulation_attempts_v2; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_attempts_v2 (id, attempt_token_hash, case_version_id, student_id, current_node_id, status, accumulated_score, stress_index, started_at, ended_at, locked_at, victim_risk, user_trust, institutional_route_activated, revictimization_risk) FROM stdin;
76c124bf-d077-467a-b204-ec3343c7e9bd	ys2QonVas_ySXRzO7Ab7us180go5ygVLZ3UO9kq35N0	4	1	299	SAFE_EXITED	0	0	2026-06-15 20:42:12.003324	2026-06-15 20:42:36.461141	2026-06-15 20:42:36.461141	50	50	f	f
ad93c443-40f2-4323-b77a-5a971b68621b	_percdD6vCl1hiXXYcOiVdm21bd1NOzz27k8Tge9Jw4	3	1	14	SAFE_EXITED	0	0	2026-06-15 14:17:38.637928	2026-06-15 14:17:48.013259	2026-06-15 14:17:48.013259	50	50	f	f
ccdd0ee0-70b0-46e1-bbd5-751971ab2043	PGlmoVWSUTElezfQXdXGWBcU-17dStT1YoG862ghT7I	4	1	300	SAFE_EXITED	-15	65	2026-06-15 21:03:28.704661	2026-06-15 21:06:19.965698	2026-06-15 21:06:19.965698	77	18	f	t
c0423f87-e1d7-4179-98ac-2fba45f0cbac	pv8mmGNYWI64lgMqAzMiwgyCFA8cYzkrXza9z0sSB4k	4	1	299	SAFE_EXITED	0	0	2026-06-15 20:42:43.569944	2026-06-15 21:03:28.6816	2026-06-15 21:03:28.6816	50	50	f	f
c01fa38d-d259-4666-8736-b596dd9540d6	q4SwUeHzrfJ7pKwChPMnUVsTSjwshtPCQD1SAsI6s24	4	1	299	IN_PROGRESS	0	0	2026-06-16 01:00:15.116215	\N	\N	50	50	f	f
b7586948-a869-4f69-9707-2a93e161ea9f	ecnP1LY1XwgOP2zFlJ6ACGb02z9HPCBWccUMo3xDaLw	4	1	300	SAFE_EXITED	-15	65	2026-06-15 21:06:19.987734	2026-06-15 21:07:07.222855	2026-06-15 21:07:07.222855	77	18	f	t
46fa7d34-ba37-46c0-a4ee-a81d27ebcb19	gTgckfgK1SLLNRJjz_XtNBxYEsUluMIZDqWcl6yVyFE	4	1	299	SAFE_EXITED	0	0	2026-06-16 00:56:58.826735	2026-06-16 01:00:15.074302	2026-06-16 01:00:15.074302	50	50	f	f
\.


--
-- Data for Name: simulation_cases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_cases (id, code, title, description, active, created_by, created_at, updated_at) FROM stdin;
1	SIM-VBG-001	Violencia Familiar y Tentativa de Feminicidio	Caso formativo basado en el documento canónico de Psicología Social: tentativa de feminicidio con víctima de 22 años, feminicidio de su hija de 3 años, atención hospitalaria en crisis y restablecimiento de derechos en Comisaría de Familia (Resolución 459 de 2012, Ley 1257 de 2008, Ley 2126 de 2021, Ley 1098 de 2006).	t	2	2026-06-05 22:36:23.470238	2026-06-15 19:57:00.74703
3	SOC-FEM-001	Violencia familiar y tentativa de feminicidio	Caso de juego de roles para desafiar el juicio clinico y etico de estudiantes de psicologia, basado en el documento Caso juego social PSICOLOGIA SOCIAL.pdf.	f	1	2026-06-12 08:26:14.834149	2026-06-12 08:26:14.834149
14	CASO-EJEMPLO	Avalancha	llllllllllllllllllllllllllllllll	t	1	2026-06-15 21:22:59.69183	2026-06-15 21:22:59.69183
\.


--
-- Data for Name: simulation_nodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_nodes (id, case_version_id, node_key, title, narrative, support_resources_json, required_tools_json, sensitive_content, safe_exit_required, warning_message, start_node, terminal_node, position_x, position_y) FROM stdin;
1	1	urgencias-crisis	Sala de urgencias: primera escucha	Una mujer de 34 anos llega al servicio de urgencias con hematomas visibles, llanto contenido y temor por su vida y la de sus dos hijos. La estudiante debe decidir la primera intervencion psicologica.	["PAP: escucha activa, validacion, estabilizacion y seguridad inmediata.", "Evitar preguntas invasivas en fase aguda."]	["PAP","REFLECTION_JOURNAL"]	t	t	Contenido sensible: violencia intrafamiliar y riesgo vital.	t	f	80	80
2	1	ruta-proteccion	Revelacion de riesgo alto	La consultante indica que esta es la tercera agresion en seis meses y que su pareja la amenazo con arma blanca. Se requiere activar ruta sin aumentar el riesgo.	["Ley 1257 de 2008.", "Resolucion 459 de 2012 y rutas VBG."]	["RISK_METER","SAFETY_ROUTE","REFLECTION_JOURNAL"]	t	t	La mediacion con agresor esta contraindicada en violencia de genero.	f	f	360	80
3	1	informe-integral	Informe psicologico de urgencias	La profesional debe dejar un registro tecnico, suficiente y no revictimizante para articular salud, comisaria y proteccion.	["Registrar hechos observables, estado mental, riesgo, red de apoyo y medidas activadas."]	["RISK_METER","SAFETY_ROUTE","REFLECTION_JOURNAL"]	t	f	\N	f	f	640	80
4	1	valoracion-comisaria	Comisaria de Familia: valoracion del riesgo	En la Comisaria se debe valorar riesgo de feminicidio, factores agravantes y medidas de proteccion proporcionales.	["Danger Assessment como referencia formativa.", "Ley 1761 de 2015."]	["RISK_METER","SAFETY_ROUTE","REFLECTION_JOURNAL"]	t	t	Decisiones que alerten al agresor pueden aumentar el riesgo.	f	f	920	80
5	1	proteccion-nna	Proteccion de ninos, ninas y adolescentes	Los hijos de 7 y 10 anos presenciaron las agresiones. La estudiante debe decidir como protegerlos sin romper vinculos protectores.	["Ley 1098 de 2006.", "Ley 2126 de 2021.", "Interes superior del nino."]	["SAFETY_ROUTE","REFLECTION_JOURNAL"]	t	f	\N	f	f	1200	80
6	1	cierre-seguimiento	Cierre del caso y plan de seguimiento	El caso queda consolidado con plan de seguridad, articulacion interinstitucional, atencion psicosocial y seguimiento activo. La bitacora se bloquea al finalizar el intento.	["Plan de seguridad personalizado.", "Coordinacion con ICBF, Fiscalia, Comisaria y red de apoyo."]	["REFLECTION_JOURNAL"]	f	f	\N	f	t	1480	80
299	4	hospital-urgencias	Urgencias: crisis y contención	Son las 11 de la noche. Una mujer de 22 años ingresa a urgencias con 28 heridas de arma cortopunzante tras una tentativa de feminicidio; su hija de 3 años falleció en el ataque. La madre de la sobreviviente y sus hermanos llegan alterados exigiendo ver a la niña. Estabiliza emocionalmente a la familia y evita acciones prematuras que aumenten la crisis.	[]	[]	t	f	Este caso aborda violencia de género, tentativa de feminicidio y la muerte de una niña. Puedes usar la salida segura en cualquier momento.	t	f	0	0
300	4	hospital-sala-escucha	Sala de escucha: marco normativo	Con el foco inmediato definido, establece el marco normativo y técnico que orienta la atención hospitalaria de este caso.	[]	[]	f	f	\N	f	f	0	0
301	4	hospital-accion-etica	Acción técnica y ética	La familia sigue en la sala de escucha y la sobreviviente saldrá de cirugía en unas horas. Define qué hacer —y qué evitar— técnica y éticamente.	[]	[]	f	f	\N	f	f	0	0
302	4	hospital-cierre-bloque	Quince días después	El bloque hospitalario quedó registrado. Quince días después, tras el alta médica, la sobreviviente inicia la ruta de restablecimiento de derechos. La salida institucional está habilitada: dirígete a la Comisaría de Familia.	[]	[]	f	f	\N	f	f	0	0
303	4	comisaria-consultorio	Consultorio: protección y marco	La sobreviviente presenta secuelas físicas y trauma complejo. Tras definir la prioridad psicosocial, establece el marco normativo del restablecimiento de derechos.	[]	[]	f	f	\N	f	f	0	0
304	4	comisaria-accion-final	Consultorio: acción técnica y ética	Cierra la actuación técnica y ética del restablecimiento de derechos: víctima, dependientes y rutas.	[]	[]	f	f	\N	f	f	0	0
305	4	cierre-caso	Cierre del caso	El caso queda consolidado. Revisa tu reporte final: decisiones, métricas y el final alcanzado.	[]	[]	f	f	\N	f	t	0	0
306	4	comisaria-recepcion	Comisaría de Familia: recepción	Recepción de la Comisaría de Familia: revisa el expediente y la orientación de ingreso antes de pasar al consultorio.	[]	[]	f	f	\N	f	f	0	0
14	3	hospital-crisis	Hospital: urgencia vital y crisis	Son las 11 de la noche en un barrio con altas condiciones de vulnerabilidad: pobreza, violencias urbanas, robos, expendio de drogas, presencia de grupos armados ilegales y rinas callejeras. Un hombre de aproximadamente 28 anos entra al domicilio donde reside con su pareja de 22 anos y con la hija de ella, una nina de 3 anos. En la tarde habia tenido un altercado verbal con su pareja, con groserias, maltrato psicologico, chantaje emocional y acusaciones de infidelidad. Esa noche, cuando la mujer le reclama por llegar tarde, el hombre saca una navaja, hiere a la menor y le causa la muerte inmediata. Luego hiere a la mujer con 28 heridas cortopunzantes y la deja gravemente lesionada.\n\nContexto del documento: la sobreviviente esta en shock hipovolemico y emocional. La familia llega alterada, exigiendo ver a la nina, quien fallecio, aunque ellos aun no lo saben con certeza.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	["PAP"]	t	t	Contenido sensible: violencia familiar, muerte de una nina y tentativa de feminicidio. Prioriza contencion, lenguaje no revictimizante y activacion de rutas.	t	f	120	100
15	3	hospital-marco	Hospital: marco normativo y tecnico	Pregunta del documento: el estudiante debe tener claro que marco normativo y tecnico debe seguir en la atencion hospitalaria.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	["PROTOCOLO_459", "LEY_1257"]	t	t	Contenido sensible: violencia familiar, muerte de una nina y tentativa de feminicidio. Prioriza contencion, lenguaje no revictimizante y activacion de rutas.	f	f	300	120
16	3	hospital-etica	Hospital: actuacion tecnica y etica	Pregunta del documento: el estudiante debe actuar tecnica y eticamente, definiendo que se debe hacer y que se debe evitar ante la familia, la victima y la noticia del fallecimiento de la menor.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	["PAP", "EPICEE", "INTERDISCIPLINAR"]	t	t	Contenido sensible: violencia familiar, muerte de una nina y tentativa de feminicidio. Prioriza contencion, lenguaje no revictimizante y activacion de rutas.	f	f	500	160
17	3	comisaria-prioridad	Comisaria: prioridad psicosocial	Contexto del documento: han pasado 15 dias. La mujer ha sido dada de alta, pero tiene secuelas fisicas y trauma complejo. Se debe definir la medida de proteccion y el apoyo psicologico a largo plazo.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	["VAL_RIESGO_FEM", "RUTA_PROTECCION"]	t	t	Contenido sensible: violencia familiar, muerte de una nina y tentativa de feminicidio. Prioriza contencion, lenguaje no revictimizante y activacion de rutas.	f	f	180	330
18	3	comisaria-marco	Comisaria: marco normativo y tecnico	Pregunta del documento: el estudiante debe tener claro que marco normativo y tecnico debe seguir en Comisaria de Familia para el restablecimiento de derechos.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	["LEY_2126", "LEY_1098", "LEY_1257"]	t	t	Contenido sensible: violencia familiar, muerte de una nina y tentativa de feminicidio. Prioriza contencion, lenguaje no revictimizante y activacion de rutas.	f	f	390	350
19	3	comisaria-etica	Comisaria: actuacion tecnica y etica	Pregunta del documento: el estudiante debe actuar tecnica y eticamente, definiendo valoracion psicologica, riesgo de vulneracion de derechos, riesgo de feminicidio y rutas de salud.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	["VAL_RIESGO_FEM", "DERIVACION_SALUD_MENTAL"]	t	t	Contenido sensible: violencia familiar, muerte de una nina y tentativa de feminicidio. Prioriza contencion, lenguaje no revictimizante y activacion de rutas.	f	f	600	370
20	3	cierre	Cierre formativo	Has completado el recorrido del caso. Revisa si tus decisiones cuidaron la urgencia vital, la contencion emocional, el enfoque de genero, el restablecimiento de derechos y la no revictimizacion.	["Caso juego social PSICOLOGIA SOCIAL.pdf: estrategia de gamificacion y caso 1.", "Ley 1257 de 2008: violencias contra las mujeres.", "Ley 1098 de 2006: proteccion integral de ninas, ninos y adolescentes.", "Ley 2126 de 2021: Comisarias de Familia.", "Resolucion 459 de 2012: protocolo de atencion integral en salud para violencias sexuales y basadas en genero."]	[]	f	f	\N	f	t	780	390
592	59	inicio	Inicio del caso	Describe aqui el contexto inicial que vera el estudiante.	[]	[]	f	f	\N	t	f	180	180
\.


--
-- Data for Name: simulation_rubric_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_rubric_assignments (id, case_version_id, rubric_id, assigned_by, active, assigned_at) FROM stdin;
\.


--
-- Data for Name: student_case_completion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_case_completion (id, student_id, simulation_case_id, first_completed_at, created_at) FROM stdin;
38	1	1	2026-06-15 12:33:22.5853+00	2026-06-15 12:33:22.600214+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, nombre, apellido, role, activo, created_at) FROM stdin;
1	admin@psychosim.edu.co	$2b$10$nLO9mYIN3iuPaqDg4Ef5quG0zE2jAHr.m.SsVGlVLa/YlEka0FbGK	Admin	Sistema	ADMIN	t	2026-06-05 22:36:22.678752
2	profesora@psychosim.edu.co	$2b$10$uGLpRS4NkaWYvn2WiZ2YIeH7mVxZsfMMfBAEVWjyisROdKzYpY6kG	María	González	PROFESOR	t	2026-06-05 22:36:22.75206
3	estudiante@psychosim.edu.co	$2b$10$pb5UszYfp.WuZiNzabW4rOzo/HpAJat4VkonlCWl/VATEEi.dacTu	Laura	Martinez	ESTUDIANTE	t	2026-06-05 22:36:23.470238
198	emersonangelgomez@gmail.com	$2b$10$cNGd4lT27oW/wKMT4OK4zeNULKFyvjxdG34XwprMIWX9bOqM2GVvK	Emerson	Angel	ESTUDIANTE	t	2026-06-14 16:25:14.24465
1648	sofia.garcia01@institucion.edu.co	$2b$10$U8r2f/DYdmcl8WyYBIdoJux73gzCF4fNXLgLpZVxarfBnNGowY4HG	Sofía	García Pérez	ESTUDIANTE	t	2026-06-16 01:34:41.114348
1649	mateo.martinez02@institucion.edu.co	$2b$10$i3kBgkZP17sPSle.LW7wxuTo/0r4bV79wtvinZTU7jX.TTLHGHxwm	Mateo	Martínez Rojas	ESTUDIANTE	t	2026-06-16 01:34:41.282816
1650	valentina.rodriguez03@institucion.edu.co	$2b$10$UjrXDcgBNMt7fDe2PnX5BeKshMb1pQGRvp9FFybbEWL080vcX.P1u	Valentina	Rodríguez López	ESTUDIANTE	t	2026-06-16 01:34:41.448567
1651	santiago.hernandez04@institucion.edu.co	$2b$10$oTN9sMwY.E0yXitVgws69.x1MclXfcoa4hifWCH8VZcPiUl790myC	Santiago	Hernández Díaz	ESTUDIANTE	t	2026-06-16 01:34:41.61593
1652	isabella.gomez05@institucion.edu.co	$2b$10$bGQcwMdFu4E0T/DT1GevTOtA2Y/uWmH/Uw95M1T/oyAwl9iJvn73.	Isabella	Gómez Castro	ESTUDIANTE	t	2026-06-16 01:34:41.78067
1653	samuel.morales06@institucion.edu.co	$2b$10$.57H8D00FDdbCO9x73Vwqe40PMRpZfWgTy0yFlbijAQ98fsPjOZga	Samuel	Morales Ruiz	ESTUDIANTE	t	2026-06-16 01:34:41.947842
1654	mariana.torres07@institucion.edu.co	$2b$10$70NLOJoMcku1.Vc2xlNYD.BUBjsaL26qyhdoRVqQ.5YYnyyWvNNb2	Mariana	Torres Mendoza	ESTUDIANTE	t	2026-06-16 01:34:42.11482
1655	emmanuel.ramirez08@institucion.edu.co	$2b$10$kEjbRFbw4BgNexG7g77I3.vsfXH0n4SXN/N9XgNLtoHn0.mfiqpRK	Emmanuel	Ramírez Vargas	ESTUDIANTE	t	2026-06-16 01:34:42.28176
1656	camila.cordoba09@institucion.edu.co	$2b$10$t6Ycrt7ZamdUdiiV7Ka/J.RIeleGzZBfL5pCwE0bZ9aWWGagc5qV6	Camila	Córdoba Salazar	ESTUDIANTE	t	2026-06-16 01:34:42.441989
1657	sebastian.mejia10@institucion.edu.co	$2b$10$tv8uOG108NcAx5QKl9xHR.KjkKJ5e9U8C2xobx9xq0nGKmHo8HLvq	Sebastián	Mejía Quintero	ESTUDIANTE	t	2026-06-16 01:34:42.573433
1658	gabriela.pineda11@institucion.edu.co	$2b$10$EYTEUDK5r8khjfEz316uSeCFL828CxNSB2Qg..idkFokcUBPPVNLi	Gabriela	Pineda Ortiz	ESTUDIANTE	t	2026-06-16 01:34:42.698893
1659	nicolas.suarez12@institucion.edu.co	$2b$10$11T8N3OPj.jy1CL3is4kduH1qB54sy/P/MNkkFChJjkZxtPVV8pGO	Nicolás	Suárez Castillo	ESTUDIANTE	t	2026-06-16 01:34:42.845715
1660	daniela.restrepo13@institucion.edu.co	$2b$10$16C/GNyNpe.myI5GRKxav.ZwBsuL8PU06ZV1qaF8FQlExt5spCoPS	Daniela	Restrepo Muñoz	ESTUDIANTE	t	2026-06-16 01:34:43.166728
1661	juan.cardenas14@institucion.edu.co	$2b$10$5jjHAbxs9Oa8EQyqaKWsI.HqNMkjyhXFsrAeWGj.m75w.uA7P/fhO	Juan José	Cárdenas Peña	ESTUDIANTE	t	2026-06-16 01:34:43.504761
1662	luciana.jimenez15@institucion.edu.co	$2b$10$CFYjo.FrMr.lsZyVOFV4NujrJ5qMG96n1Ykb9OPNyAEyIAxYzwDz2	Luciana	Jiménez Arias	ESTUDIANTE	t	2026-06-16 01:34:43.832363
1663	david.vega16@institucion.edu.co	$2b$10$mYic5ZbGYHO../g2S7fZRetM2NZOgPuJ.F8ubyDXCb0rdRFFZQXyG	David	Vega Moreno	ESTUDIANTE	t	2026-06-16 01:34:44.106405
1664	sara.navarro17@institucion.edu.co	$2b$10$n2LQ6HmpI2mknghQFdjmTeuTKHESaeU4Ye0KbPPQvtmabuvoLSSIS	Sara	Navarro Acosta	ESTUDIANTE	t	2026-06-16 01:34:44.254275
1665	tomas.rios18@institucion.edu.co	$2b$10$BDj.EilulMWaZLEg87Pb6eItAhRvgIbH1Nd1o2rgDpxBqeu3lYzXe	Tomás	Ríos Sánchez	ESTUDIANTE	t	2026-06-16 01:34:44.395146
1666	ana.castellanos19@institucion.edu.co	$2b$10$Cz2WTICD8TyQSk6wWun2nemljbskotp5L03m6DBZnhcJMDY6InztC	Ana María	Castellanos Gil	ESTUDIANTE	t	2026-06-16 01:34:44.538248
1667	alejandro.molina20@institucion.edu.co	$2b$10$lFSOwK7PaL0k.yYiY1CGsOUzLvAA3nzZ6bZ62L2QN6302ZbO2xCN.	Alejandro	Molina Herrera	ESTUDIANTE	t	2026-06-16 01:34:44.687258
1668	manuela.agudelo21@institucion.edu.co	$2b$10$wzNFBZJlJ/PoLNTEpeLBTe1Uilh/6wBdwY4aESGmVzttzUTYiuf76	Manuela	Agudelo Zapata	ESTUDIANTE	t	2026-06-16 01:34:44.835361
1669	miguel.bermudez22@institucion.edu.co	$2b$10$YNqqL5M8TCljHzA9ZK.8zOy3Gie9qOwoApP17NDWtY5cqu7LN3YeW	Miguel Ángel	Bermúdez León	ESTUDIANTE	t	2026-06-16 01:34:44.978809
1670	laura.ortiz23@institucion.edu.co	$2b$10$3wFjdj9bheyg6h/EXDSSi.GdguwhyaGxflfXlU/VqGWTWj6YtQ9O.	Laura	Ortiz Castaño	ESTUDIANTE	t	2026-06-16 01:34:45.120096
1671	andres.franco24@institucion.edu.co	$2b$10$abs7YSJa58rJU13/ozJLUe41f1IucBxpie.ztyjIq2i5KA10dcWxy	Andrés	Franco Álvarez	ESTUDIANTE	t	2026-06-16 01:34:45.260432
1672	paula.ospina25@institucion.edu.co	$2b$10$8aC8olEng1mYJaHWBmtD1ep22IJUiSPyIim5NeocagAWBrBp8I4Du	Paula	Ospina Gómez	ESTUDIANTE	t	2026-06-16 01:34:45.401362
1673	julian.londono26@institucion.edu.co	$2b$10$MVec.CyU0wuN8P4C6Jy1k.1qFr3DV64CauQREDwFv4RdgHzRkVYRe	Julián	Londoño Marín	ESTUDIANTE	t	2026-06-16 01:34:45.538762
1674	salome.escobar27@institucion.edu.co	$2b$10$ZtpcBUtNvU48DJNEDgKJw.Uk82M0K.2bHrW6mTNe9/ZRcSHSohaly	Salomé	Escobar Patiño	ESTUDIANTE	t	2026-06-16 01:34:45.676189
1675	felipe.cano28@institucion.edu.co	$2b$10$TfyTNdHUQOEym6BdMzVOquTTgI1GM0XDhuE0vE3MjCrpMMECcb7E6	Felipe	Cano Velásquez	ESTUDIANTE	t	2026-06-16 01:34:45.816036
1676	victoria.gutierrez29@institucion.edu.co	$2b$10$fUjfaKN2SzzAAXGec/Nz3.lND4yxhUR1oA.38kiHP7M0Rnpqv/ngG	Victoria	Gutiérrez Parra	ESTUDIANTE	t	2026-06-16 01:34:45.957208
1677	daniel.montoya30@institucion.edu.co	$2b$10$o2amzPAv6IsyhyjjeQpZuOW3Vd4TzKWWZxKUpJlxJHFNSsujP9zVu	Daniel	Montoya Mesa	ESTUDIANTE	t	2026-06-16 01:34:46.099809
\.


--
-- Name: access_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.access_requests_id_seq', 12, true);


--
-- Name: attempt_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attempt_events_id_seq', 6576, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1834, true);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 120, true);


--
-- Name: case_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.case_versions_id_seq', 100, true);


--
-- Name: casos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.casos_id_seq', 1, true);


--
-- Name: clinical_tools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clinical_tools_id_seq', 530, true);


--
-- Name: collision_zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.collision_zones_id_seq', 6754, true);


--
-- Name: criterion_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.criterion_scores_id_seq', 25, true);


--
-- Name: decision_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.decision_options_id_seq', 1969, true);


--
-- Name: dialogue_choices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dialogue_choices_id_seq', 3905, true);


--
-- Name: dialogue_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dialogue_lines_id_seq', 3980, true);


--
-- Name: dialogue_trees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dialogue_trees_id_seq', 1967, true);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 30, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 26, true);


--
-- Name: escenarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.escenarios_id_seq', 2, true);


--
-- Name: grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grupos_id_seq', 669, true);


--
-- Name: map_objects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.map_objects_id_seq', 4229, true);


--
-- Name: opciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.opciones_id_seq', 24, true);


--
-- Name: preguntas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.preguntas_id_seq', 6, true);


--
-- Name: publication_checklist_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.publication_checklist_items_id_seq', 1, false);


--
-- Name: publication_checklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.publication_checklists_id_seq', 94, true);


--
-- Name: reflection_journals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reflection_journals_id_seq', 44, true);


--
-- Name: respuestas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.respuestas_id_seq', 1, false);


--
-- Name: rubric_criteria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rubric_criteria_id_seq', 344, true);


--
-- Name: rubric_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rubric_evaluations_id_seq', 5, true);


--
-- Name: rubrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rubrics_id_seq', 72, true);


--
-- Name: scene_maps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.scene_maps_id_seq', 845, true);


--
-- Name: sesiones_juego_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sesiones_juego_id_seq', 1, false);


--
-- Name: simulation_cases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.simulation_cases_id_seq', 29, true);


--
-- Name: simulation_nodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.simulation_nodes_id_seq', 858, true);


--
-- Name: simulation_rubric_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.simulation_rubric_assignments_id_seq', 4, true);


--
-- Name: student_case_completion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_case_completion_id_seq', 99, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2184, true);


--
-- Name: access_requests access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT access_requests_pkey PRIMARY KEY (id);


--
-- Name: attempt_events attempt_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events
    ADD CONSTRAINT attempt_events_pkey PRIMARY KEY (id);


--
-- Name: attempt_world_states attempt_world_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_world_states
    ADD CONSTRAINT attempt_world_states_pkey PRIMARY KEY (attempt_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: case_versions case_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_versions
    ADD CONSTRAINT case_versions_pkey PRIMARY KEY (id);


--
-- Name: case_versions case_versions_simulation_case_id_semantic_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_versions
    ADD CONSTRAINT case_versions_simulation_case_id_semantic_version_key UNIQUE (simulation_case_id, semantic_version);


--
-- Name: casos casos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.casos
    ADD CONSTRAINT casos_pkey PRIMARY KEY (id);


--
-- Name: clinical_tools clinical_tools_case_version_id_tool_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_tools
    ADD CONSTRAINT clinical_tools_case_version_id_tool_code_key UNIQUE (case_version_id, tool_code);


--
-- Name: clinical_tools clinical_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_tools
    ADD CONSTRAINT clinical_tools_pkey PRIMARY KEY (id);


--
-- Name: collision_zones collision_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collision_zones
    ADD CONSTRAINT collision_zones_pkey PRIMARY KEY (id);


--
-- Name: collision_zones collision_zones_scene_map_id_zone_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collision_zones
    ADD CONSTRAINT collision_zones_scene_map_id_zone_key_key UNIQUE (scene_map_id, zone_key);


--
-- Name: criterion_scores criterion_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criterion_scores
    ADD CONSTRAINT criterion_scores_pkey PRIMARY KEY (id);


--
-- Name: criterion_scores criterion_scores_rubric_evaluation_id_rubric_criterion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criterion_scores
    ADD CONSTRAINT criterion_scores_rubric_evaluation_id_rubric_criterion_id_key UNIQUE (rubric_evaluation_id, rubric_criterion_id);


--
-- Name: decision_options decision_options_case_version_id_option_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_options
    ADD CONSTRAINT decision_options_case_version_id_option_key_key UNIQUE (case_version_id, option_key);


--
-- Name: decision_options decision_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_options
    ADD CONSTRAINT decision_options_pkey PRIMARY KEY (id);


--
-- Name: dialogue_choices dialogue_choices_dialogue_tree_id_choice_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_choices
    ADD CONSTRAINT dialogue_choices_dialogue_tree_id_choice_key_key UNIQUE (dialogue_tree_id, choice_key);


--
-- Name: dialogue_choices dialogue_choices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_choices
    ADD CONSTRAINT dialogue_choices_pkey PRIMARY KEY (id);


--
-- Name: dialogue_lines dialogue_lines_dialogue_tree_id_display_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_lines
    ADD CONSTRAINT dialogue_lines_dialogue_tree_id_display_order_key UNIQUE (dialogue_tree_id, display_order);


--
-- Name: dialogue_lines dialogue_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_lines
    ADD CONSTRAINT dialogue_lines_pkey PRIMARY KEY (id);


--
-- Name: dialogue_trees dialogue_trees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_trees
    ADD CONSTRAINT dialogue_trees_pkey PRIMARY KEY (id);


--
-- Name: dialogue_trees dialogue_trees_scene_map_id_tree_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_trees
    ADD CONSTRAINT dialogue_trees_scene_map_id_tree_key_key UNIQUE (scene_map_id, tree_key);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: escenarios escenarios_caso_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escenarios
    ADD CONSTRAINT escenarios_caso_id_orden_key UNIQUE (caso_id, orden);


--
-- Name: escenarios escenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escenarios
    ADD CONSTRAINT escenarios_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: grupo_case_version grupo_case_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_case_version
    ADD CONSTRAINT grupo_case_version_pkey PRIMARY KEY (grupo_id, case_version_id);


--
-- Name: grupo_estudiante grupo_estudiante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_estudiante
    ADD CONSTRAINT grupo_estudiante_pkey PRIMARY KEY (grupo_id, estudiante_id);


--
-- Name: grupos grupos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_codigo_key UNIQUE (codigo);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: map_objects map_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_objects
    ADD CONSTRAINT map_objects_pkey PRIMARY KEY (id);


--
-- Name: map_objects map_objects_scene_map_id_object_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_objects
    ADD CONSTRAINT map_objects_scene_map_id_object_key_key UNIQUE (scene_map_id, object_key);


--
-- Name: opciones opciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones
    ADD CONSTRAINT opciones_pkey PRIMARY KEY (id);


--
-- Name: preguntas preguntas_escenario_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_escenario_id_orden_key UNIQUE (escenario_id, orden);


--
-- Name: preguntas preguntas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_pkey PRIMARY KEY (id);


--
-- Name: publication_checklist_items publication_checklist_items_checklist_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklist_items
    ADD CONSTRAINT publication_checklist_items_checklist_id_code_key UNIQUE (checklist_id, code);


--
-- Name: publication_checklist_items publication_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklist_items
    ADD CONSTRAINT publication_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: publication_checklists publication_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklists
    ADD CONSTRAINT publication_checklists_pkey PRIMARY KEY (id);


--
-- Name: reflection_journals reflection_journals_attempt_id_node_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_journals
    ADD CONSTRAINT reflection_journals_attempt_id_node_id_key UNIQUE (attempt_id, node_id);


--
-- Name: reflection_journals reflection_journals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_journals
    ADD CONSTRAINT reflection_journals_pkey PRIMARY KEY (id);


--
-- Name: respuestas respuestas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas
    ADD CONSTRAINT respuestas_pkey PRIMARY KEY (id);


--
-- Name: rubric_criteria rubric_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_pkey PRIMARY KEY (id);


--
-- Name: rubric_evaluations rubric_evaluations_attempt_id_rubric_id_instructor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_attempt_id_rubric_id_instructor_id_key UNIQUE (attempt_id, rubric_id, instructor_id);


--
-- Name: rubric_evaluations rubric_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_pkey PRIMARY KEY (id);


--
-- Name: rubrics rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);


--
-- Name: scene_maps scene_maps_case_version_id_map_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_maps
    ADD CONSTRAINT scene_maps_case_version_id_map_key_key UNIQUE (case_version_id, map_key);


--
-- Name: scene_maps scene_maps_node_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_maps
    ADD CONSTRAINT scene_maps_node_id_key UNIQUE (node_id);


--
-- Name: scene_maps scene_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_maps
    ADD CONSTRAINT scene_maps_pkey PRIMARY KEY (id);


--
-- Name: sesiones_juego sesiones_juego_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_juego
    ADD CONSTRAINT sesiones_juego_pkey PRIMARY KEY (id);


--
-- Name: simulation_attempts_v2 simulation_attempts_v2_attempt_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_attempts_v2
    ADD CONSTRAINT simulation_attempts_v2_attempt_token_hash_key UNIQUE (attempt_token_hash);


--
-- Name: simulation_attempts_v2 simulation_attempts_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_attempts_v2
    ADD CONSTRAINT simulation_attempts_v2_pkey PRIMARY KEY (id);


--
-- Name: simulation_cases simulation_cases_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_cases
    ADD CONSTRAINT simulation_cases_code_key UNIQUE (code);


--
-- Name: simulation_cases simulation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_cases
    ADD CONSTRAINT simulation_cases_pkey PRIMARY KEY (id);


--
-- Name: simulation_nodes simulation_nodes_case_version_id_node_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_nodes
    ADD CONSTRAINT simulation_nodes_case_version_id_node_key_key UNIQUE (case_version_id, node_key);


--
-- Name: simulation_nodes simulation_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_nodes
    ADD CONSTRAINT simulation_nodes_pkey PRIMARY KEY (id);


--
-- Name: simulation_rubric_assignments simulation_rubric_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_rubric_assignments
    ADD CONSTRAINT simulation_rubric_assignments_pkey PRIMARY KEY (id);


--
-- Name: student_case_completion student_case_completion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_case_completion
    ADD CONSTRAINT student_case_completion_pkey PRIMARY KEY (id);


--
-- Name: student_case_completion uq_student_case_completion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_case_completion
    ADD CONSTRAINT uq_student_case_completion UNIQUE (student_id, simulation_case_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_attempt_events_attempt_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempt_events_attempt_time ON public.attempt_events USING btree (attempt_id, occurred_at);


--
-- Name: idx_attempt_world_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempt_world_scene ON public.attempt_world_states USING btree (scene_map_id);


--
-- Name: idx_attempts_student_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempts_student_status ON public.simulation_attempts_v2 USING btree (student_id, status);


--
-- Name: idx_audit_logs_retention; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_retention ON public.audit_logs USING btree (retention_until);


--
-- Name: idx_audit_logs_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_time ON public.audit_logs USING btree (occurred_at);


--
-- Name: idx_case_versions_case_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_versions_case_status ON public.case_versions USING btree (simulation_case_id, status);


--
-- Name: idx_criterion_scores_eval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criterion_scores_eval ON public.criterion_scores USING btree (rubric_evaluation_id);


--
-- Name: idx_decision_options_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decision_options_source ON public.decision_options USING btree (source_node_id);


--
-- Name: idx_dialogue_lines_tree; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dialogue_lines_tree ON public.dialogue_lines USING btree (dialogue_tree_id, display_order);


--
-- Name: idx_escenarios_caso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escenarios_caso ON public.escenarios USING btree (caso_id);


--
-- Name: idx_map_objects_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_map_objects_scene ON public.map_objects USING btree (scene_map_id);


--
-- Name: idx_opciones_pregunta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opciones_pregunta ON public.opciones USING btree (pregunta_id);


--
-- Name: idx_preguntas_escenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preguntas_escenario ON public.preguntas USING btree (escenario_id);


--
-- Name: idx_reflection_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reflection_attempt ON public.reflection_journals USING btree (attempt_id);


--
-- Name: idx_respuestas_sesion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_respuestas_sesion ON public.respuestas USING btree (sesion_id);


--
-- Name: idx_scene_maps_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scene_maps_version ON public.scene_maps USING btree (case_version_id);


--
-- Name: idx_sesiones_caso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_caso ON public.sesiones_juego USING btree (caso_id);


--
-- Name: idx_sesiones_estudiante; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_estudiante ON public.sesiones_juego USING btree (estudiante_id);


--
-- Name: idx_simulation_nodes_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_nodes_version ON public.simulation_nodes USING btree (case_version_id);


--
-- Name: uq_active_case_version_rubric_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_active_case_version_rubric_assignment ON public.simulation_rubric_assignments USING btree (case_version_id) WHERE (active = true);


--
-- Name: attempt_events attempt_events_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events
    ADD CONSTRAINT attempt_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.simulation_attempts_v2(id) ON DELETE CASCADE;


--
-- Name: attempt_events attempt_events_decision_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events
    ADD CONSTRAINT attempt_events_decision_option_id_fkey FOREIGN KEY (decision_option_id) REFERENCES public.decision_options(id);


--
-- Name: attempt_events attempt_events_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events
    ADD CONSTRAINT attempt_events_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.simulation_nodes(id);


--
-- Name: attempt_world_states attempt_world_states_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_world_states
    ADD CONSTRAINT attempt_world_states_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.simulation_attempts_v2(id) ON DELETE CASCADE;


--
-- Name: attempt_world_states attempt_world_states_scene_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_world_states
    ADD CONSTRAINT attempt_world_states_scene_map_id_fkey FOREIGN KEY (scene_map_id) REFERENCES public.scene_maps(id);


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: case_versions case_versions_cloned_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_versions
    ADD CONSTRAINT case_versions_cloned_from_id_fkey FOREIGN KEY (cloned_from_id) REFERENCES public.case_versions(id);


--
-- Name: case_versions case_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_versions
    ADD CONSTRAINT case_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: case_versions case_versions_simulation_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_versions
    ADD CONSTRAINT case_versions_simulation_case_id_fkey FOREIGN KEY (simulation_case_id) REFERENCES public.simulation_cases(id);


--
-- Name: casos casos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.casos
    ADD CONSTRAINT casos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: clinical_tools clinical_tools_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_tools
    ADD CONSTRAINT clinical_tools_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: collision_zones collision_zones_scene_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collision_zones
    ADD CONSTRAINT collision_zones_scene_map_id_fkey FOREIGN KEY (scene_map_id) REFERENCES public.scene_maps(id) ON DELETE CASCADE;


--
-- Name: criterion_scores criterion_scores_rubric_criterion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criterion_scores
    ADD CONSTRAINT criterion_scores_rubric_criterion_id_fkey FOREIGN KEY (rubric_criterion_id) REFERENCES public.rubric_criteria(id) ON DELETE CASCADE;


--
-- Name: criterion_scores criterion_scores_rubric_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criterion_scores
    ADD CONSTRAINT criterion_scores_rubric_evaluation_id_fkey FOREIGN KEY (rubric_evaluation_id) REFERENCES public.rubric_evaluations(id) ON DELETE CASCADE;


--
-- Name: decision_options decision_options_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_options
    ADD CONSTRAINT decision_options_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: decision_options decision_options_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_options
    ADD CONSTRAINT decision_options_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.simulation_nodes(id) ON DELETE CASCADE;


--
-- Name: decision_options decision_options_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_options
    ADD CONSTRAINT decision_options_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.simulation_nodes(id) ON DELETE CASCADE;


--
-- Name: dialogue_choices dialogue_choices_decision_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_choices
    ADD CONSTRAINT dialogue_choices_decision_option_id_fkey FOREIGN KEY (decision_option_id) REFERENCES public.decision_options(id) ON DELETE SET NULL;


--
-- Name: dialogue_choices dialogue_choices_dialogue_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_choices
    ADD CONSTRAINT dialogue_choices_dialogue_tree_id_fkey FOREIGN KEY (dialogue_tree_id) REFERENCES public.dialogue_trees(id) ON DELETE CASCADE;


--
-- Name: dialogue_lines dialogue_lines_dialogue_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_lines
    ADD CONSTRAINT dialogue_lines_dialogue_tree_id_fkey FOREIGN KEY (dialogue_tree_id) REFERENCES public.dialogue_trees(id) ON DELETE CASCADE;


--
-- Name: dialogue_trees dialogue_trees_map_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_trees
    ADD CONSTRAINT dialogue_trees_map_object_id_fkey FOREIGN KEY (map_object_id) REFERENCES public.map_objects(id) ON DELETE CASCADE;


--
-- Name: dialogue_trees dialogue_trees_scene_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialogue_trees
    ADD CONSTRAINT dialogue_trees_scene_map_id_fkey FOREIGN KEY (scene_map_id) REFERENCES public.scene_maps(id) ON DELETE CASCADE;


--
-- Name: escenarios escenarios_caso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escenarios
    ADD CONSTRAINT escenarios_caso_id_fkey FOREIGN KEY (caso_id) REFERENCES public.casos(id) ON DELETE CASCADE;


--
-- Name: grupo_case_version grupo_case_version_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_case_version
    ADD CONSTRAINT grupo_case_version_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: grupo_case_version grupo_case_version_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_case_version
    ADD CONSTRAINT grupo_case_version_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: grupo_estudiante grupo_estudiante_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_estudiante
    ADD CONSTRAINT grupo_estudiante_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.users(id);


--
-- Name: grupo_estudiante grupo_estudiante_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_estudiante
    ADD CONSTRAINT grupo_estudiante_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);


--
-- Name: grupos grupos_profesor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES public.users(id);


--
-- Name: map_objects map_objects_decision_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_objects
    ADD CONSTRAINT map_objects_decision_option_id_fkey FOREIGN KEY (decision_option_id) REFERENCES public.decision_options(id) ON DELETE SET NULL;


--
-- Name: map_objects map_objects_scene_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_objects
    ADD CONSTRAINT map_objects_scene_map_id_fkey FOREIGN KEY (scene_map_id) REFERENCES public.scene_maps(id) ON DELETE CASCADE;


--
-- Name: opciones opciones_pregunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones
    ADD CONSTRAINT opciones_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.preguntas(id) ON DELETE CASCADE;


--
-- Name: preguntas preguntas_escenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_escenario_id_fkey FOREIGN KEY (escenario_id) REFERENCES public.escenarios(id) ON DELETE CASCADE;


--
-- Name: publication_checklist_items publication_checklist_items_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklist_items
    ADD CONSTRAINT publication_checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.publication_checklists(id) ON DELETE CASCADE;


--
-- Name: publication_checklists publication_checklists_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklists
    ADD CONSTRAINT publication_checklists_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: publication_checklists publication_checklists_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_checklists
    ADD CONSTRAINT publication_checklists_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: reflection_journals reflection_journals_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_journals
    ADD CONSTRAINT reflection_journals_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.simulation_attempts_v2(id) ON DELETE CASCADE;


--
-- Name: reflection_journals reflection_journals_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_journals
    ADD CONSTRAINT reflection_journals_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.simulation_nodes(id);


--
-- Name: respuestas respuestas_opcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas
    ADD CONSTRAINT respuestas_opcion_id_fkey FOREIGN KEY (opcion_id) REFERENCES public.opciones(id);


--
-- Name: respuestas respuestas_pregunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas
    ADD CONSTRAINT respuestas_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.preguntas(id);


--
-- Name: respuestas respuestas_sesion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas
    ADD CONSTRAINT respuestas_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES public.sesiones_juego(id);


--
-- Name: rubric_criteria rubric_criteria_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE CASCADE;


--
-- Name: rubric_evaluations rubric_evaluations_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.simulation_attempts_v2(id);


--
-- Name: rubric_evaluations rubric_evaluations_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: rubric_evaluations rubric_evaluations_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id);


--
-- Name: rubrics rubrics_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id);


--
-- Name: rubrics rubrics_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scene_maps scene_maps_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_maps
    ADD CONSTRAINT scene_maps_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: scene_maps scene_maps_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_maps
    ADD CONSTRAINT scene_maps_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.simulation_nodes(id) ON DELETE CASCADE;


--
-- Name: sesiones_juego sesiones_juego_caso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_juego
    ADD CONSTRAINT sesiones_juego_caso_id_fkey FOREIGN KEY (caso_id) REFERENCES public.casos(id);


--
-- Name: sesiones_juego sesiones_juego_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_juego
    ADD CONSTRAINT sesiones_juego_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.users(id);


--
-- Name: simulation_attempts_v2 simulation_attempts_v2_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_attempts_v2
    ADD CONSTRAINT simulation_attempts_v2_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id);


--
-- Name: simulation_attempts_v2 simulation_attempts_v2_current_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_attempts_v2
    ADD CONSTRAINT simulation_attempts_v2_current_node_id_fkey FOREIGN KEY (current_node_id) REFERENCES public.simulation_nodes(id);


--
-- Name: simulation_attempts_v2 simulation_attempts_v2_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_attempts_v2
    ADD CONSTRAINT simulation_attempts_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: simulation_cases simulation_cases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_cases
    ADD CONSTRAINT simulation_cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: simulation_nodes simulation_nodes_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_nodes
    ADD CONSTRAINT simulation_nodes_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: simulation_rubric_assignments simulation_rubric_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_rubric_assignments
    ADD CONSTRAINT simulation_rubric_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: simulation_rubric_assignments simulation_rubric_assignments_case_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_rubric_assignments
    ADD CONSTRAINT simulation_rubric_assignments_case_version_id_fkey FOREIGN KEY (case_version_id) REFERENCES public.case_versions(id) ON DELETE CASCADE;


--
-- Name: simulation_rubric_assignments simulation_rubric_assignments_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_rubric_assignments
    ADD CONSTRAINT simulation_rubric_assignments_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zCLaPXUnlsJVxM6Ep8ShRNAGno6HWz0fwCvndFIbXdg2Roq0DQVBeYXhxKwcaQJ

