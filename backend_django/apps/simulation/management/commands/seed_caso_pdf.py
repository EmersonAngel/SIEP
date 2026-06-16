"""Seed del caso canónico del PDF: «Violencia Familiar y Tentativa de Feminicidio».

Reconstruye (idempotente) la versión jugable del caso SIM-VBG-001 según el
documento fuente (Caso juego social PSICOLOGIA SOCIAL):

- 4 salas mínimas conectadas por puertas EXIT backend-driven:
  hospital-urgencias ⇄ hospital-sala-escucha → comisaria-recepcion ⇄
  comisaria-consultorio;
- 6 decisiones canónicas (Hospital 1-3, Comisaría 1-3) con opciones
  correctas, parciales y críticas/prohibidas jugables;
- flags/métricas del efecto mariposa (apps.simulation.services.case_effects);
- 4 finales calculados al completar.

Modelo de salas: el motor exige 1 SceneMap por nodo, así que las etapas del
DAG que comparten sala física usan COPIAS del mapa (mismo renderer frontend):
hospital-sala-escucha{,-accion,-cierre} y comisaria-consultorio{,-marco,-cierre}.
`comisaria-recepcion` es un nodo-sala (sin decisiones propias) al que solo se
llega por puerta.

Idempotencia: la versión 2.0.0 se reconstruye desde cero en cada corrida
(se BORRAN los intentos existentes de esa versión). Las demás versiones
PUBLISHED del caso pasan a ARCHIVED para que el catálogo muestre solo esta.
"""
import json

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.simulation.models import (
    CaseVersion,
    ClinicalTool,
    CollisionZone,
    DecisionOption,
    DialogueChoice,
    DialogueLine,
    DialogueTree,
    MapObject,
    Rubric,
    RubricCriterion,
    SceneMap,
    SimulationAttempt,
    SimulationCase,
    SimulationNode,
)

CASE_CODE = "SIM-VBG-001"
#: Casos legacy del mismo dominio que deben retirarse del catálogo al sembrar
#: el canónico (evita que aparezcan casos de feminicidio duplicados).
LEGACY_DUPLICATE_CASE_CODES = ("SOC-FEM-001", "VBG-001")
CASE_TITLE = "Violencia Familiar y Tentativa de Feminicidio"
CASE_DESCRIPTION = (
    "Caso formativo basado en el documento canónico de Psicología Social: "
    "tentativa de feminicidio con víctima de 22 años, feminicidio de su hija "
    "de 3 años, atención hospitalaria en crisis y restablecimiento de derechos "
    "en Comisaría de Familia (Resolución 459 de 2012, Ley 1257 de 2008, "
    "Ley 2126 de 2021, Ley 1098 de 2006)."
)
NARRATIVE_CONTEXT = (
    "Barrio con altas condiciones de vulnerabilidad. Un hombre de 28 años "
    "ataca con arma cortopunzante a su pareja de 22 años (28 heridas) y a la "
    "hija de ambos de 3 años, quien fallece. El recorrido cubre la urgencia "
    "vital y la crisis familiar en el hospital y, quince días después, el "
    "restablecimiento de derechos en la Comisaría de Familia."
)

ROOM_W, ROOM_H = 960, 528

#: Bandas de pared compartidas (la zona caminable es el trapecio y≈236-486).
WALL_ZONES = [
    ("pared-fondo", 0, 0, ROOM_W, 236),
    ("borde-frontal", 0, 486, ROOM_W, 42),
    ("pared-izquierda", 0, 0, 96, ROOM_H),
    ("pared-derecha", 864, 0, 96, ROOM_H),
]

TIME_JUMP_TEXT = (
    "Quince días después, tras el alta médica, inicia la ruta de "
    "restablecimiento de derechos."
)

LOCKED_ESCUCHA = (
    "Primero identifica la necesidad de contención: habla con la familia en crisis."
)
LOCKED_INSTITUCIONAL = (
    "La ruta institucional aún no está lista. Completa la contención y "
    "registra la decisión hospitalaria."
)
LOCKED_CONSULTORIO = "Revisa primero el expediente y la orientación de ingreso."

# ─── Nodos del DAG (en orden de juego) ────────────────────────────────────────
NODES = [
    {
        "key": "hospital-urgencias",
        "title": "Urgencias: crisis y contención",
        "start": True,
        "narrative": (
            "Son las 11 de la noche. Una mujer de 22 años ingresa a urgencias "
            "con 28 heridas de arma cortopunzante tras una tentativa de "
            "feminicidio; su hija de 3 años falleció en el ataque. La madre de "
            "la sobreviviente y sus hermanos llegan alterados exigiendo ver a "
            "la niña. Estabiliza emocionalmente a la familia y evita acciones "
            "prematuras que aumenten la crisis."
        ),
        "sensitive": True,
        "warning": (
            "Este caso aborda violencia de género, tentativa de feminicidio y "
            "la muerte de una niña. Puedes usar la salida segura en cualquier momento."
        ),
    },
    {
        "key": "hospital-sala-escucha",
        "title": "Sala de escucha: marco normativo",
        "narrative": (
            "Con el foco inmediato definido, establece el marco normativo y "
            "técnico que orienta la atención hospitalaria de este caso."
        ),
    },
    {
        "key": "hospital-accion-etica",
        "title": "Acción técnica y ética",
        "narrative": (
            "La familia sigue en la sala de escucha y la sobreviviente saldrá "
            "de cirugía en unas horas. Define qué hacer —y qué evitar— técnica "
            "y éticamente."
        ),
    },
    {
        "key": "hospital-cierre-bloque",
        "title": "Quince días después",
        "narrative": (
            "El bloque hospitalario quedó registrado. Quince días después, "
            "tras el alta médica, la sobreviviente inicia la ruta de "
            "restablecimiento de derechos. La salida institucional está "
            "habilitada: dirígete a la Comisaría de Familia."
        ),
    },
    {
        "key": "comisaria-consultorio",
        "title": "Consultorio: protección y marco",
        "narrative": (
            "La sobreviviente presenta secuelas físicas y trauma complejo. "
            "Tras definir la prioridad psicosocial, establece el marco "
            "normativo del restablecimiento de derechos."
        ),
    },
    {
        "key": "comisaria-accion-final",
        "title": "Consultorio: acción técnica y ética",
        "narrative": (
            "Cierra la actuación técnica y ética del restablecimiento de "
            "derechos: víctima, dependientes y rutas."
        ),
    },
    {
        "key": "cierre-caso",
        "title": "Cierre del caso",
        "terminal": True,
        "narrative": (
            "El caso queda consolidado. Revisa tu reporte final: decisiones, "
            "métricas y el final alcanzado."
        ),
    },
    # Nodo-sala (solo navegación espacial; sin decisiones propias).
    {
        "key": "comisaria-recepcion",
        "title": "Comisaría de Familia: recepción",
        "narrative": (
            "Recepción de la Comisaría de Familia: revisa el expediente y la "
            "orientación de ingreso antes de pasar al consultorio."
        ),
    },
]

# ─── Decisiones canónicas del PDF ────────────────────────────────────────────
# (source, target, opciones). classification: ADEQUATE/RISKY/INADEQUATE;
# la severidad pedagógica vive en case_effects.OPTION_EFFECTS por option_key.
DECISIONS = [
    {
        "source": "hospital-urgencias",
        "target": "hospital-sala-escucha",
        "options": [
            {
                "key": "h1-noticia-sin-protocolo",
                "text": (
                    "Notificar de inmediato la muerte de la niña a la abuela y la "
                    "familia, sin estabilización previa ni protocolo."
                ),
                "classification": "INADEQUATE",
                "prohibited": True,
                "score": -10, "stress": 25, "penalty": -5,
                "reason": (
                    "Comunicar una muerte sin protocolo ni contención aumenta el "
                    "daño y revictimiza a la familia."
                ),
                "feedback": (
                    "La noticia de una muerte exige protocolo (EPICEE/SPIKES), "
                    "contención y estabilización previa. Sin eso, la crisis escala."
                ),
            },
            {
                "key": "h1-pap-contencion",
                "text": (
                    "Brindar contención emocional, acompañamiento en el duelo "
                    "inicial y estabilización de la crisis mediante Primeros "
                    "Auxilios Psicológicos (PAP)."
                ),
                "classification": "ADEQUATE",
                "score": 10, "stress": -5,
                "feedback": (
                    "Los PAP son la primera línea en crisis: estabilizan, "
                    "contienen y preparan a la familia para el proceso de duelo."
                ),
            },
            {
                "key": "h1-interrogar-victima",
                "text": (
                    "Interrogar a la víctima herida para obtener detalles del "
                    "agresor antes de que entre a cirugía."
                ),
                "classification": "INADEQUATE",
                "prohibited": True,
                "score": -10, "stress": 25, "penalty": -5,
                "reason": (
                    "Priorizar la información sobre la estabilización vulnera la "
                    "dignidad de la víctima y la revictimiza."
                ),
                "feedback": (
                    "La urgencia vital y la estabilización van primero: "
                    "interrogar a una víctima en shock la revictimiza."
                ),
            },
        ],
    },
    {
        "source": "hospital-sala-escucha",
        "target": "hospital-accion-etica",
        "options": [
            {
                "key": "h2-solo-459",
                "text": (
                    "Aplicar solo la Resolución 459 de 2012 (protocolo de "
                    "atención integral a víctimas de violencia sexual y de género)."
                ),
                "classification": "RISKY",
                "score": 3, "stress": 4,
                "feedback": (
                    "La Resolución 459 aplica, pero sola queda incompleta: la "
                    "Ley 1257 de 2008 es el eje de protección frente a las "
                    "violencias contra la mujer."
                ),
            },
            {
                "key": "h2-459-1257",
                "text": "Resolución 459 de 2012 + Ley 1257 de 2008.",
                "classification": "ADEQUATE",
                "score": 10, "stress": -5,
                "feedback": (
                    "Correcto: protocolo de atención integral en salud más el "
                    "marco de protección de la Ley 1257 de 2008."
                ),
            },
            {
                "key": "h2-459-1448",
                "text": (
                    "Resolución 459 de 2012 + Ley 1448 de 2011 como eje principal."
                ),
                "classification": "RISKY",
                "score": -5, "stress": 8,
                "feedback": (
                    "La Ley 1448 (víctimas del conflicto armado) no es el eje de "
                    "este caso: el marco correcto es la Ley 1257 de 2008."
                ),
            },
        ],
    },
    {
        "source": "hospital-accion-etica",
        "target": "hospital-cierre-bloque",
        "options": [
            {
                "key": "h3-parcial-disonancia",
                "text": (
                    "Escucha activa sin juicios, intervenir la disonancia "
                    "cognitiva, indagar antecedentes de la relación y activar "
                    "ruta por psicología clínica y psiquiatría."
                ),
                "classification": "RISKY",
                "score": 0, "stress": 8,
                "feedback": (
                    "Parcial: falta protocolo de noticia difícil, PAP a la "
                    "familia y articulación interdisciplinaria."
                ),
            },
            {
                "key": "h3-pap-epicee",
                "text": (
                    "PAP a la familia + escucha activa y sin juicios a la víctima "
                    "(cuando esté consciente) + protocolo EPICEE/SPIKES para "
                    "comunicar el fallecimiento de la menor."
                ),
                "classification": "RISKY",
                "score": 5, "stress": 0,
                "feedback": (
                    "Buena base, pero incompleta: falta la evaluación psicosocial "
                    "familiar y el manejo interdisciplinario."
                ),
            },
            {
                "key": "h3-epicee-ciclo",
                "text": (
                    "Lo anterior + antecedentes de la relación para determinar el "
                    "ciclo de la violencia + manejo interdisciplinario del caso."
                ),
                "classification": "RISKY",
                "score": 6, "stress": 0,
                "feedback": (
                    "Sólida, pero aún sin la evaluación psicosocial de factores "
                    "protectores y de riesgo en el afrontamiento del duelo."
                ),
            },
            {
                "key": "h3-integral-psicosocial",
                "text": (
                    "PAP + escucha activa + EPICEE/SPIKES + evaluación psicosocial "
                    "de la familia (factores protectores y de riesgo en el duelo) "
                    "+ decisiones interdisciplinarias (derivación a psiquiatría y "
                    "psicoterapia)."
                ),
                "classification": "ADEQUATE",
                "score": 12, "stress": -5,
                "feedback": (
                    "Intervención integral: contención, protocolo de noticia "
                    "difícil, evaluación psicosocial e interdisciplina."
                ),
            },
        ],
    },
    {
        "source": "hospital-cierre-bloque",
        "target": "comisaria-consultorio",
        "options": [
            {
                "key": "c1-mediacion-perdon",
                "text": (
                    "Instar a la mujer a escuchar al agresor en pro de la unidad "
                    "familiar (mediación) y el perdón."
                ),
                "classification": "INADEQUATE",
                "prohibited": True,
                "score": -10, "stress": 25, "penalty": -5,
                "reason": (
                    "La mediación/conciliación con el agresor está proscrita en "
                    "violencia de género: aumenta el riesgo de feminicidio."
                ),
                "feedback": (
                    "La Ley 2126 de 2021 y los estándares de VBG prohíben la "
                    "mediación: eleva el riesgo y revictimiza."
                ),
            },
            {
                "key": "c1-riesgo-proteccion-derechos",
                "text": (
                    "Valorar el riesgo de feminicidio, activar medidas de "
                    "protección y asesorar sobre sus derechos económicos y de justicia."
                ),
                "classification": "ADEQUATE",
                "score": 12, "stress": -5,
                "feedback": (
                    "Prioridad correcta: valoración de riesgo, protección "
                    "efectiva y enfoque de derechos."
                ),
            },
            {
                "key": "c1-patrones-infancia",
                "text": (
                    "Centrar la intervención en psicoterapia para hallar los "
                    "patrones de infancia que desencadenan su elección de pareja."
                ),
                "classification": "RISKY",
                "score": -5, "stress": 10,
                "feedback": (
                    "Enfoque desviado: psicologizar la elección de pareja "
                    "desplaza la responsabilidad del agresor y pospone la protección."
                ),
            },
        ],
    },
    {
        "source": "comisaria-consultorio",
        "target": "comisaria-accion-final",
        "options": [
            {
                "key": "c2-2126-1098-1257",
                "text": "Ley 2126 de 2021 + Ley 1098 de 2006 + Ley 1257 de 2008.",
                "classification": "ADEQUATE",
                "score": 10, "stress": -5,
                "feedback": (
                    "Correcto: competencia de las comisarías (Ley 2126), "
                    "protección de NNA (Ley 1098) y protección de la mujer (Ley 1257)."
                ),
            },
            {
                "key": "c2-1098-1257",
                "text": "Ley 1098 de 2006 + Ley 1257 de 2008.",
                "classification": "RISKY",
                "score": 3, "stress": 4,
                "feedback": (
                    "Incompleto: falta la Ley 2126 de 2021, que regula la "
                    "actuación de las Comisarías de Familia."
                ),
            },
            {
                "key": "c2-eje-1448",
                "text": (
                    "Ley 1098 de 2006 + Ley 1257 de 2008 + Ley 1448 de 2011 como "
                    "eje principal."
                ),
                "classification": "RISKY",
                "score": -5, "stress": 8,
                "feedback": (
                    "La Ley 1448 no es el eje de este caso: el restablecimiento "
                    "se rige por 2126 + 1098 + 1257."
                ),
            },
        ],
    },
    {
        "source": "comisaria-accion-final",
        "target": "cierre-caso",
        "options": [
            {
                "key": "c3-parcial-clinica",
                "text": (
                    "Escucha activa, intervenir la disonancia, antecedentes y "
                    "ciclos de violencia, valoración de riesgo de feminicidio y "
                    "ruta por psicología clínica y psiquiatría."
                ),
                "classification": "RISKY",
                "score": 0, "stress": 8,
                "feedback": (
                    "Parcial: omite la valoración de dependientes y el nivel de "
                    "vulneración de derechos."
                ),
            },
            {
                "key": "c3-valoracion-dependientes",
                "text": (
                    "Valoración inicial psicológica y emocional de la víctima y "
                    "de las personas dependientes o en situación de vulnerabilidad "
                    "+ escucha activa + antecedentes y ciclos + rutas de "
                    "derivación a salud y salud mental."
                ),
                "classification": "RISKY",
                "score": 5, "stress": 0,
                "feedback": (
                    "Buena, pero falta establecer el nivel de riesgo de "
                    "vulneración de derechos y la valoración de feminicidio."
                ),
            },
            {
                "key": "c3-integral-derechos",
                "text": (
                    "Lo anterior + establecer el nivel de riesgo de vulneración "
                    "de derechos + valoración del riesgo de feminicidio + rutas "
                    "de derivación a salud y salud mental."
                ),
                "classification": "ADEQUATE",
                "score": 12, "stress": -5,
                "feedback": (
                    "Actuación integral: víctima y dependientes valorados, "
                    "riesgos establecidos y rutas activadas."
                ),
            },
        ],
    },
]

# ─── Salas (1 SceneMap por nodo) ─────────────────────────────────────────────
# La geometría espeja case-pdf-rooms.geometry.ts (frontend) — si se mueve un
# mueble allá, hay que moverlo aquí.
FURNITURE = {
    "hospital-urgencias": [
        ("mostrador-triage", "Mostrador de triage", 380, 252, 220, 56),
        ("sillas-espera", "Sillas de espera", 120, 308, 150, 38),
        ("camilla", "Camilla", 700, 300, 110, 46),
        ("planta-urgencias", "Planta", 800, 380, 44, 40),
    ],
    "hospital-sala-escucha": [
        ("sofa-escucha", "Sofá de escucha", 130, 300, 130, 64),
        ("mesa-centro", "Mesa de centro", 280, 370, 90, 36),
        ("estante-protocolos", "Estante de protocolos", 600, 256, 150, 44),
        ("silla-profesional", "Silla", 680, 330, 56, 36),
    ],
    "comisaria-recepcion": [
        ("mostrador-recepcion", "Mostrador de recepción", 380, 252, 220, 56),
        ("archivadores", "Archivadores", 700, 250, 130, 46),
        ("sillas-espera-comisaria", "Sillas de espera", 120, 308, 150, 38),
    ],
    "comisaria-consultorio": [
        ("escritorio-consultorio", "Escritorio", 430, 268, 200, 60),
        ("archivador-consultorio", "Archivador", 760, 254, 90, 44),
        ("silla-izquierda", "Silla", 380, 352, 44, 32),
        ("silla-derecha", "Silla", 560, 352, 44, 32),
        ("planta-consultorio", "Planta", 110, 380, 44, 40),
    ],
}

#: room_kind por mapa (qué set de muebles/colisiones usa).
MAPS = [
    {
        "node": "hospital-urgencias",
        "key": "hospital-urgencias",
        "title": "Hospital — Urgencias",
        "kind": "hospital-urgencias",
        "spawn": (480, 430),
        "theme": "hospital-urgencias",
        "ambient": {"music": "none", "mood": "clinical-urgent"},
    },
    {
        "node": "hospital-sala-escucha",
        "key": "hospital-sala-escucha",
        "title": "Hospital — Sala de escucha familiar",
        "kind": "hospital-sala-escucha",
        "spawn": (480, 430),
        "theme": "hospital-escucha",
        "ambient": {"music": "none", "mood": "warm-private"},
    },
    {
        "node": "hospital-accion-etica",
        "key": "hospital-sala-escucha-accion",
        "title": "Hospital — Sala de escucha familiar",
        "kind": "hospital-sala-escucha",
        "spawn": (480, 430),
        "theme": "hospital-escucha",
        "ambient": {"music": "none", "mood": "warm-private"},
    },
    {
        "node": "hospital-cierre-bloque",
        "key": "hospital-sala-escucha-cierre",
        "title": "Hospital — Sala de escucha familiar",
        "kind": "hospital-sala-escucha",
        "spawn": (480, 430),
        "theme": "hospital-escucha",
        "ambient": {"music": "none", "mood": "warm-private"},
    },
    {
        "node": "comisaria-recepcion",
        "key": "comisaria-recepcion",
        "title": "Comisaría de Familia — Recepción",
        "kind": "comisaria-recepcion",
        "spawn": (160, 452),
        "theme": "comisaria-recepcion",
        "ambient": {"music": "none", "mood": "institutional",
                     "transitionText": TIME_JUMP_TEXT},
    },
    {
        "node": "comisaria-consultorio",
        "key": "comisaria-consultorio",
        "title": "Comisaría de Familia — Consultorio",
        "kind": "comisaria-consultorio",
        "spawn": (480, 430),
        "theme": "comisaria-consultorio",
        "ambient": {"music": "none", "mood": "reserved"},
    },
    {
        "node": "comisaria-accion-final",
        "key": "comisaria-consultorio-marco",
        "title": "Comisaría de Familia — Consultorio",
        "kind": "comisaria-consultorio",
        "spawn": (480, 430),
        "theme": "comisaria-consultorio",
        "ambient": {"music": "none", "mood": "reserved"},
    },
    {
        "node": "cierre-caso",
        "key": "comisaria-consultorio-cierre",
        "title": "Comisaría de Familia — Consultorio",
        "kind": "comisaria-consultorio",
        "spawn": (480, 430),
        "theme": "comisaria-consultorio",
        "ambient": {"music": "none", "mood": "reserved"},
    },
]

# ─── Objetos por mapa ────────────────────────────────────────────────────────
# type: PERSON/OBJECT/TOOL/EXIT. dialogue: (speaker, [(texto, emocion)...]).
# choices: [(choice_key, texto, option_key|None)] — option_key referencia DECISIONS.

_H1_CHOICES = [
    ("h1-a", "Notificar de inmediato la muerte de la niña a la familia",
     "h1-noticia-sin-protocolo"),
    ("h1-b", "Aplicar PAP: contención emocional, acompañamiento en duelo y "
             "estabilización de la crisis", "h1-pap-contencion"),
    ("h1-c", "Interrogar a la víctima herida sobre el agresor antes de cirugía",
     "h1-interrogar-victima"),
]
_H2_CHOICES = [
    ("h2-a", "Aplicar solo la Resolución 459 de 2012", "h2-solo-459"),
    ("h2-b", "Resolución 459 de 2012 + Ley 1257 de 2008", "h2-459-1257"),
    ("h2-c", "Resolución 459 de 2012 + Ley 1448 de 2011 como eje", "h2-459-1448"),
]
_H3_CHOICES = [
    ("h3-a", "Escucha activa + disonancia + antecedentes + ruta clínica/psiquiátrica",
     "h3-parcial-disonancia"),
    ("h3-b", "PAP a la familia + escucha sin juicios + EPICEE/SPIKES",
     "h3-pap-epicee"),
    ("h3-c", "Lo anterior + ciclo de la violencia + manejo interdisciplinario",
     "h3-epicee-ciclo"),
    ("h3-d", "PAP + escucha + EPICEE/SPIKES + evaluación psicosocial familiar + "
             "interdisciplina", "h3-integral-psicosocial"),
]
_C1_CHOICES = [
    ("c1-a", "Instar a escuchar al agresor por la unidad familiar (mediación y perdón)",
     "c1-mediacion-perdon"),
    ("c1-b", "Valorar riesgo de feminicidio + medidas de protección + derechos",
     "c1-riesgo-proteccion-derechos"),
    ("c1-c", "Psicoterapia centrada en patrones de infancia y elección de pareja",
     "c1-patrones-infancia"),
]
_C2_CHOICES = [
    ("c2-a", "Ley 2126 de 2021 + Ley 1098 de 2006 + Ley 1257 de 2008",
     "c2-2126-1098-1257"),
    ("c2-b", "Ley 1098 de 2006 + Ley 1257 de 2008", "c2-1098-1257"),
    ("c2-c", "Ley 1098 + Ley 1257 + Ley 1448 de 2011 como eje", "c2-eje-1448"),
]
_C3_CHOICES = [
    ("c3-a", "Escucha + disonancia + ciclos + valoración de feminicidio + ruta clínica",
     "c3-parcial-clinica"),
    ("c3-b", "Valoración de víctima y dependientes + escucha + ciclos + rutas de salud",
     "c3-valoracion-dependientes"),
    ("c3-c", "Lo anterior + nivel de vulneración de derechos + valoración de "
             "feminicidio + rutas", "c3-integral-derechos"),
]

_ESCUCHA_DECISION_OBJECTS = [
    {
        "key": "familia-duelo", "label": "Familia en crisis", "type": "PERSON",
        "pos": (168, 408), "icon": "person", "short": "FAM",
        "prompt": "Acompañar a la familia",
        "text": "La abuela de la niña y los hermanos de la sobreviviente esperan noticias.",
        "dialogue": ("Abuela de la niña", [
            ("¡Por favor! Nadie nos dice nada de la niña… ¿dónde está mi nieta? ¡Quiero verla!", "anxious"),
            ("Mi hija sigue en cirugía… dicen que son 28 heridas. ¿Quién pudo hacerle esto?", "negative"),
            ("(La familia está en crisis. Define el foco inmediato de tu intervención.)", "neutral"),
        ]),
        "choices": _H1_CHOICES,
    },
    {
        "key": "marco-normativo-hospital", "label": "Marco normativo", "type": "OBJECT",
        "pos": (660, 320), "icon": "menu_book", "short": "LEY",
        "prompt": "Revisar el marco normativo",
        "text": "Protocolos y normas disponibles en el servicio de urgencias.",
        "dialogue": ("Marco normativo y técnico", [
            ("Disponibles: Resolución 459 de 2012 (protocolo de atención integral a "
             "violencias sexuales y de género), Ley 1257 de 2008, Ley 1448 de 2011.", "neutral"),
            ("(Define el marco normativo y técnico que orienta la atención.)", "neutral"),
        ]),
        "choices": _H2_CHOICES,
    },
    {
        "key": "psicologa-acompanante", "label": "Psicóloga hospitalaria", "type": "PERSON",
        "pos": (740, 400), "icon": "psychology", "short": "PSI",
        "prompt": "Definir la actuación con la psicóloga",
        "text": "La psicóloga hospitalaria coordina la propuesta de intervención.",
        "dialogue": ("Psicóloga hospitalaria", [
            ("La familia sigue en la sala y la sobreviviente saldrá de cirugía en unas "
             "horas. El equipo espera tu propuesta.", "neutral"),
            ("(Define qué hacer —y qué evitar— técnica y éticamente.)", "neutral"),
        ]),
        "choices": _H3_CHOICES,
    },
    {
        "key": "tool-pap", "label": "Kit PAP", "type": "TOOL",
        "pos": (318, 430), "icon": "healing", "short": "PAP", "tool": "PAP",
        "prompt": "Tomar el kit de Primeros Auxilios Psicológicos",
        "text": "Primeros Auxilios Psicológicos: contención, estabilización y enlace.",
    },
    {
        "key": "tool-spikes", "label": "Protocolo EPICEE", "type": "TOOL",
        "pos": (480, 300), "icon": "description", "short": "EPI", "tool": "SPIKES",
        "prompt": "Revisar el protocolo EPICEE/SPIKES",
        "text": "Protocolo EPICEE (SPIKES): comunicación de noticias difíciles por etapas.",
    },
    {
        "key": "tool-bitacora", "label": "Bitácora", "type": "TOOL",
        "pos": (560, 430), "icon": "edit_note", "short": "BIT", "tool": "REFLECTION_JOURNAL",
        "prompt": "Tomar la bitácora reflexiva",
        "text": "Registra una reflexión breve del bloque hospitalario.",
    },
]

_CONSULTORIO_DECISION_OBJECTS = [
    {
        "key": "sobreviviente-consulta", "label": "Sobreviviente", "type": "PERSON",
        "pos": (220, 408), "icon": "person", "short": "SOB",
        "prompt": "Escuchar a la sobreviviente",
        "text": "Mujer de 22 años; alta médica hace 15 días, secuelas físicas y trauma complejo.",
        "dialogue": ("Sobreviviente (22 años)", [
            ("Salí del hospital hace unos días… las heridas duelen menos que todo lo demás.", "sad"),
            ("Su familia me busca para que lo perdone, dicen que la familia se respeta. "
             "Yo solo quiero estar segura.", "anxious"),
            ("(Define la prioridad de la asesoría psicosocial.)", "neutral"),
        ]),
        "choices": _C1_CHOICES,
    },
    {
        "key": "marco-normativo-comisaria", "label": "Marco normativo", "type": "OBJECT",
        "pos": (790, 318), "icon": "menu_book", "short": "LEY",
        "prompt": "Revisar el marco normativo",
        "text": "Normas del restablecimiento de derechos.",
        "dialogue": ("Marco normativo y técnico", [
            ("Disponibles: Ley 2126 de 2021 (Comisarías de Familia), Ley 1098 de 2006 "
             "(infancia y adolescencia), Ley 1257 de 2008, Ley 1448 de 2011.", "neutral"),
            ("(Define el marco normativo del restablecimiento de derechos.)", "neutral"),
        ]),
        "choices": _C2_CHOICES,
    },
    {
        "key": "profesional-psicosocial", "label": "Profesional psicosocial", "type": "PERSON",
        "pos": (700, 400), "icon": "psychology", "short": "PRO",
        "prompt": "Cerrar la actuación técnica",
        "text": "El equipo psicosocial de la comisaría consolida el plan.",
        "dialogue": ("Profesional psicosocial", [
            ("Cerramos la valoración: queda definir la actuación técnica y ética con la "
             "sobreviviente y su red familiar.", "neutral"),
            ("(Define qué hacer —y qué evitar— en el restablecimiento de derechos.)", "neutral"),
        ]),
        "choices": _C3_CHOICES,
    },
    {
        "key": "tool-riesgo", "label": "Valoración de riesgo", "type": "TOOL",
        "pos": (318, 436), "icon": "monitor_heart", "short": "RIE", "tool": "RISK_METER",
        "prompt": "Tomar el instrumento de valoración de riesgo",
        "text": "Instrumento estructurado de valoración del riesgo de feminicidio.",
    },
    {
        "key": "tool-ruta", "label": "Ruta de protección", "type": "TOOL",
        "pos": (610, 436), "icon": "alt_route", "short": "RUT", "tool": "SAFETY_ROUTE",
        "prompt": "Tomar la ruta de protección",
        "text": "Medidas de protección y articulación institucional disponibles.",
    },
]

MAP_OBJECTS = {
    "hospital-urgencias": [
        {
            "key": "familia-crisis", "label": "Familia en crisis", "type": "PERSON",
            "pos": (190, 420), "icon": "person", "short": "FAM",
            "prompt": "Hablar con la familia en crisis",
            "text": "La abuela de la niña y los hermanos de la sobreviviente exigen verla.",
            "dialogue": ("Abuela de la niña", [
                ("¡Déjenme pasar! ¡Quiero ver a mi nieta y a mi hija! ¿Por qué nadie nos dice nada?", "anxious"),
                ("Llegamos apenas supimos… ¿están bien? ¡Dígame que están bien!", "anxious"),
                ("(La familia necesita contención antes de cualquier información difícil. "
                 "La sala de escucha está al fondo a la derecha.)", "neutral"),
            ]),
        },
        {
            "key": "zona-restringida", "label": "Acceso a quirófano", "type": "OBJECT",
            "pos": (660, 268), "icon": "do_not_disturb_on", "short": "RES",
            "prompt": "Observar la zona restringida",
            "text": (
                "Acceso restringido: la sobreviviente está en cirugía (28 heridas con arma "
                "cortopunzante). El personal pide manejar la información con prudencia: la "
                "niña de 3 años falleció y la familia aún no lo sabe con certeza."
            ),
        },
        {
            "key": "tool-pap", "label": "Kit PAP", "type": "TOOL",
            "pos": (318, 428), "icon": "healing", "short": "PAP", "tool": "PAP",
            "prompt": "Tomar el kit de Primeros Auxilios Psicológicos",
            "text": "Primeros Auxilios Psicológicos: contención, estabilización y enlace.",
        },
        {
            "key": "puerta-sala-escucha", "label": "Sala de escucha familiar", "type": "EXIT",
            "pos": (838, 440),
            "prompt": "Entrar a la sala de escucha familiar",
            "text": "Sala de escucha familiar",
            "meta": {
                "targetNodeKey": "hospital-sala-escucha",
                "entryX": 160, "entryY": 452,
                "label": "Sala de escucha familiar",
                "requiresInspected": ["familia-crisis"],
                "lockedMessage": LOCKED_ESCUCHA,
            },
        },
    ],
    "hospital-sala-escucha": _ESCUCHA_DECISION_OBJECTS + [
        {
            "key": "puerta-urgencias", "label": "Sala de urgencias", "type": "EXIT",
            "pos": (122, 460),
            "prompt": "Volver a urgencias",
            "text": "Sala de urgencias",
            "meta": {
                "targetNodeKey": "hospital-urgencias",
                "entryX": 786, "entryY": 440,
                "label": "Sala de urgencias",
            },
        },
        {
            "key": "salida-institucional", "label": "Salida institucional", "type": "EXIT",
            "pos": (838, 440),
            "prompt": "Iniciar la ruta institucional",
            "text": "Comisaría de Familia",
            "meta": {
                "targetNodeKey": "comisaria-recepcion",
                "entryX": 160, "entryY": 452,
                "label": "Comisaría de Familia",
                "requiresNodes": ["hospital-cierre-bloque"],
                "lockedMessage": LOCKED_INSTITUCIONAL,
            },
        },
    ],
    "hospital-sala-escucha-accion": _ESCUCHA_DECISION_OBJECTS + [
        {
            "key": "puerta-urgencias", "label": "Sala de urgencias", "type": "EXIT",
            "pos": (122, 460),
            "prompt": "Volver a urgencias",
            "text": "Sala de urgencias",
            "meta": {
                "targetNodeKey": "hospital-urgencias",
                "entryX": 786, "entryY": 440,
                "label": "Sala de urgencias",
            },
        },
        {
            "key": "salida-institucional", "label": "Salida institucional", "type": "EXIT",
            "pos": (838, 440),
            "prompt": "Iniciar la ruta institucional",
            "text": "Comisaría de Familia",
            "meta": {
                "targetNodeKey": "comisaria-recepcion",
                "entryX": 160, "entryY": 452,
                "label": "Comisaría de Familia",
                "requiresNodes": ["hospital-cierre-bloque"],
                "lockedMessage": LOCKED_INSTITUCIONAL,
            },
        },
    ],
    "hospital-sala-escucha-cierre": [
        {
            "key": "familia-duelo", "label": "Familia acompañada", "type": "PERSON",
            "pos": (168, 408), "icon": "person", "short": "FAM",
            "prompt": "Despedirte de la familia",
            "text": "La familia quedó contenida y orientada.",
            "dialogue": ("Abuela de la niña", [
                ("Gracias por no dejarnos solas en esto…", "sad"),
                ("Sé que viene un camino largo. ¿Qué sigue ahora para mi hija?", "neutral"),
            ]),
        },
        {
            "key": "resumen-bloque", "label": "Registro hospitalario", "type": "OBJECT",
            "pos": (480, 360), "icon": "assignment_turned_in", "short": "REG",
            "prompt": "Revisar el registro hospitalario",
            "text": (
                "Bloque hospitalario registrado: contención realizada, marco normativo "
                "definido y articulación interdisciplinaria en curso. La salida "
                "institucional hacia la Comisaría de Familia está habilitada."
            ),
        },
        {
            "key": "tool-bitacora", "label": "Bitácora", "type": "TOOL",
            "pos": (560, 430), "icon": "edit_note", "short": "BIT", "tool": "REFLECTION_JOURNAL",
            "prompt": "Registrar una reflexión",
            "text": "Registra una reflexión breve antes de la ruta institucional.",
        },
        {
            "key": "puerta-urgencias", "label": "Sala de urgencias", "type": "EXIT",
            "pos": (122, 460),
            "prompt": "Volver a urgencias",
            "text": "Sala de urgencias",
            "meta": {
                "targetNodeKey": "hospital-urgencias",
                "entryX": 786, "entryY": 440,
                "label": "Sala de urgencias",
            },
        },
        {
            "key": "salida-institucional", "label": "Salida institucional", "type": "EXIT",
            "pos": (838, 440),
            "prompt": "Iniciar la ruta institucional",
            "text": "Comisaría de Familia",
            "meta": {
                "targetNodeKey": "comisaria-recepcion",
                "entryX": 160, "entryY": 452,
                "label": "Comisaría de Familia",
            },
        },
    ],
    "comisaria-recepcion": [
        {
            "key": "expediente-caso", "label": "Expediente del caso", "type": "OBJECT",
            "pos": (740, 312), "icon": "folder_open", "short": "EXP",
            "prompt": "Revisar el expediente",
            "text": (
                "Expediente: mujer de 22 años, sobreviviente de tentativa de feminicidio "
                "(28 heridas con arma cortopunzante). Su hija de 3 años fue asesinada por "
                "la pareja, hombre de 28 años. Alta médica hace 15 días; secuelas físicas "
                "y trauma complejo. Se requiere valoración de riesgo, medidas de "
                "protección y asesoría de derechos."
            ),
        },
        {
            "key": "funcionaria-recepcion", "label": "Funcionaria de recepción", "type": "PERSON",
            "pos": (480, 332), "icon": "support_agent", "short": "REC",
            "prompt": "Recibir orientación de ingreso",
            "text": "La funcionaria orienta el ingreso del caso.",
            "dialogue": ("Funcionaria de recepción", [
                ("Bienvenida. El caso llegó remitido desde el hospital con la historia "
                 "clínica y la denuncia.", "neutral"),
                ("La comisaría puede dictar medidas de protección y orientar derechos "
                 "económicos y de justicia. El consultorio queda al fondo a la derecha; "
                 "revisa primero el expediente.", "neutral"),
            ]),
        },
        {
            "key": "puerta-consultorio", "label": "Consultorio", "type": "EXIT",
            "pos": (838, 440),
            "prompt": "Entrar al consultorio",
            "text": "Consultorio",
            "meta": {
                "targetNodeKey": "comisaria-consultorio",
                "entryX": 160, "entryY": 452,
                "label": "Consultorio",
                "requiresInspected": ["expediente-caso"],
                "lockedMessage": LOCKED_CONSULTORIO,
            },
        },
    ],
    "comisaria-consultorio": _CONSULTORIO_DECISION_OBJECTS + [
        {
            "key": "puerta-recepcion", "label": "Recepción", "type": "EXIT",
            "pos": (122, 460),
            "prompt": "Volver a recepción",
            "text": "Recepción",
            "meta": {
                "targetNodeKey": "comisaria-recepcion",
                "entryX": 786, "entryY": 440,
                "label": "Recepción",
            },
        },
    ],
    "comisaria-consultorio-marco": _CONSULTORIO_DECISION_OBJECTS + [
        {
            "key": "puerta-recepcion", "label": "Recepción", "type": "EXIT",
            "pos": (122, 460),
            "prompt": "Volver a recepción",
            "text": "Recepción",
            "meta": {
                "targetNodeKey": "comisaria-recepcion",
                "entryX": 786, "entryY": 440,
                "label": "Recepción",
            },
        },
    ],
    "comisaria-consultorio-cierre": [
        {
            "key": "cierre-resumen", "label": "Cierre del caso", "type": "OBJECT",
            "pos": (480, 360), "icon": "assignment_turned_in", "short": "FIN",
            "prompt": "Revisar el cierre del caso",
            "text": "Caso cerrado: revisa tu reporte final con métricas, decisiones y final alcanzado.",
        },
    ],
}

TOOLS = [
    ("PAP", "Primeros Auxilios Psicológicos", "healing", "crisis",
     "Contención y estabilización emocional en crisis."),
    ("SPIKES", "Protocolo EPICEE/SPIKES", "description", "comunicacion",
     "Comunicación protocolizada de noticias difíciles."),
    ("RISK_METER", "Valoración de riesgo", "monitor_heart", "evaluacion",
     "Valoración estructurada del riesgo de feminicidio."),
    ("SAFETY_ROUTE", "Ruta de protección", "alt_route", "proteccion",
     "Activación de medidas de protección y rutas institucionales."),
    ("REFLECTION_JOURNAL", "Bitácora reflexiva", "edit_note", "reflexion",
     "Registro reflexivo del proceso de intervención."),
]


class Command(BaseCommand):
    help = "Reconstruye el caso PDF (4 salas, 6 decisiones, efecto mariposa). Idempotente."

    def add_arguments(self, parser):
        parser.add_argument("--case-code", default=CASE_CODE)
        parser.add_argument("--semantic-version", default="2.0.0")

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        creator = User.objects.filter(email="admin@psychosim.edu.co").first()
        if not creator:
            creator = User.objects.create_user(
                email="admin@psychosim.edu.co",
                password="Admin123!",
                nombre="Admin",
                apellido="SIEP",
                role="ADMIN",
                activo=True,
            )
        elif not creator.check_password("Admin123!"):
            creator.set_password("Admin123!")
            creator.activo = True
            creator.role = "ADMIN"
            creator.save()

        case = SimulationCase.objects.filter(code=options["case_code"]).first()
        if not case:
            case = SimulationCase.objects.create(
                code=options["case_code"],
                title=CASE_TITLE,
                description=CASE_DESCRIPTION,
                active=True,
                created_by=creator,
            )

        case.title = CASE_TITLE
        case.description = CASE_DESCRIPTION
        case.active = True
        case.save()

        version = CaseVersion.objects.filter(
            simulation_case=case, semantic_version=options["semantic_version"]
        ).first()
        if not version:
            version = CaseVersion.objects.create(
                simulation_case=case,
                semantic_version=options["semantic_version"],
                status="PUBLISHED",
                narrative_context=NARRATIVE_CONTEXT,
                published_at=timezone.now(),
                created_by=case.created_by,
            )
        else:
            version.status = "PUBLISHED"
            version.narrative_context = NARRATIVE_CONTEXT
            version.published_at = version.published_at or timezone.now()
            version.save()

        # ── Limpieza (reconstrucción total de ESTA versión) ──────────────────
        # Borrado en orden explícito hijo→padre: dialogue_choices referencia
        # decision_options con FK DO_NOTHING, así que el cascade de Django no
        # garantiza el orden y Postgres validaría la FK a mitad de camino.
        attempts = SimulationAttempt.objects.filter(case_version_id=version.id)
        n_attempts = attempts.count()
        if n_attempts:
            self.stdout.write(self.style.WARNING(
                f"Eliminando {n_attempts} intento(s) de la versión {version.semantic_version}"
            ))
            attempts.delete()
        version_maps = SceneMap.objects.filter(case_version_id=version.id)
        version_trees = DialogueTree.objects.filter(scene_map__in=version_maps)
        DialogueChoice.objects.filter(dialogue_tree__in=version_trees).delete()
        DialogueLine.objects.filter(dialogue_tree__in=version_trees).delete()
        version_trees.delete()
        MapObject.objects.filter(scene_map__in=version_maps).delete()
        CollisionZone.objects.filter(scene_map__in=version_maps).delete()
        version_maps.delete()
        DecisionOption.objects.filter(case_version_id=version.id).delete()
        SimulationNode.objects.filter(case_version_id=version.id).delete()
        ClinicalTool.objects.filter(case_version_id=version.id).delete()

        # ── Nodos ────────────────────────────────────────────────────────────
        nodes = {}
        for spec in NODES:
            nodes[spec["key"]] = SimulationNode.objects.create(
                case_version=version,
                node_key=spec["key"],
                title=spec["title"],
                narrative=spec["narrative"],
                support_resources_json="[]",
                required_tools_json="[]",
                sensitive_content=spec.get("sensitive", False),
                safe_exit_required=False,
                warning_message=spec.get("warning"),
                start_node=spec.get("start", False),
                terminal_node=spec.get("terminal", False),
            )

        # ── Decisiones ───────────────────────────────────────────────────────
        option_by_key = {}
        for block in DECISIONS:
            source = nodes[block["source"]]
            target = nodes[block["target"]]
            for opt in block["options"]:
                option_by_key[opt["key"]] = DecisionOption.objects.create(
                    case_version=version,
                    option_key=opt["key"],
                    source_node=source,
                    target_node=target,
                    text=opt["text"],
                    classification=opt["classification"],
                    score_delta=opt["score"],
                    stress_delta=opt["stress"],
                    prohibited_penalty=opt.get("penalty", 0),
                    immediate_feedback=opt["feedback"],
                    prohibited_conduct=opt.get("prohibited", False),
                    prohibition_reason=opt.get("reason"),
                )

        # ── Herramientas clínicas ────────────────────────────────────────────
        for code, label, icon, category, description in TOOLS:
            ClinicalTool.objects.create(
                case_version=version, tool_code=code, label=label, icon=icon,
                category=category, description=description, active=True,
            )

        # ── Mapas + colisiones + objetos + diálogos ──────────────────────────
        n_objects = n_doors = 0
        for spec in MAPS:
            scene_map = SceneMap.objects.create(
                case_version=version,
                node=nodes[spec["node"]],
                map_key=spec["key"],
                title=spec["title"],
                width=ROOM_W,
                height=ROOM_H,
                theme=spec["theme"],
                spawn_x=spec["spawn"][0],
                spawn_y=spec["spawn"][1],
                ambient_json=json.dumps(spec["ambient"]),
            )
            for zone_key, x, y, w, h in WALL_ZONES:
                CollisionZone.objects.create(
                    scene_map=scene_map, zone_key=zone_key, label=zone_key,
                    position_x=x, position_y=y, width=w, height=h,
                )
            for obj_key, label, x, y, w, h in FURNITURE[spec["kind"]]:
                CollisionZone.objects.create(
                    scene_map=scene_map, zone_key=obj_key, label=label,
                    position_x=x, position_y=y, width=w, height=h,
                )
            for obj in MAP_OBJECTS[spec["key"]]:
                is_exit = obj["type"] == "EXIT"
                map_object = MapObject.objects.create(
                    scene_map=scene_map,
                    object_key=obj["key"],
                    label=obj["label"],
                    object_type=obj["type"],
                    position_x=obj["pos"][0],
                    position_y=obj["pos"][1],
                    width=36 if is_exit else 48,
                    height=48,
                    color_hex="#B69CFF" if is_exit else "#7FB3D5",
                    icon=obj.get("icon", "door_front" if is_exit else "info"),
                    short_code=obj.get("short", "EXIT" if is_exit else "OBJ"),
                    collision=False,
                    visible=True,
                    interaction_prompt=obj["prompt"],
                    interaction_text=obj.get("text", obj["label"]),
                    tool_code=obj.get("tool"),
                    metadata_json=json.dumps(obj.get("meta", {})),
                )
                n_objects += 1
                n_doors += int(is_exit)
                dialogue = obj.get("dialogue")
                choices = obj.get("choices", [])
                # Interacciones exploratorias (expediente, zona restringida,
                # registros): sin diálogo explícito, su texto se muestra como
                # una línea — si no, la interacción registra pero no se VE.
                if not dialogue and not choices and obj["type"] in ("OBJECT", "PERSON"):
                    dialogue = (obj["label"], [(obj.get("text", obj["label"]), "neutral")])
                if dialogue or choices:
                    speaker = dialogue[0] if dialogue else obj["label"]
                    tree = DialogueTree.objects.create(
                        scene_map=scene_map,
                        map_object=map_object,
                        tree_key=obj["key"],
                        speaker_name=speaker,
                        portrait_key=None,
                        emotion="neutral",
                    )
                    if dialogue:
                        for order, (text, emotion) in enumerate(dialogue[1], start=1):
                            DialogueLine.objects.create(
                                dialogue_tree=tree, display_order=order,
                                speaker_name=speaker, text=text, emotion=emotion,
                            )
                    for order, (choice_key, text, option_key) in enumerate(choices, start=1):
                        DialogueChoice.objects.create(
                            dialogue_tree=tree,
                            choice_key=choice_key,
                            text=text,
                            decision_option=option_by_key[option_key] if option_key else None,
                            effect_json="{}",
                            display_order=order,
                        )

        # ── Rúbrica: clonar la de la versión previa si esta no tiene ─────────
        if not Rubric.objects.filter(case_version_id=version.id, active=True).exists():
            source_rubric = (
                Rubric.objects.filter(case_version__simulation_case=case, active=True)
                .exclude(case_version_id=version.id)
                .order_by("-case_version_id")
                .first()
            )
            if source_rubric:
                clone = Rubric.objects.create(
                    case_version=version,
                    name=source_rubric.name,
                    description=source_rubric.description,
                    active=True,
                    created_by=source_rubric.created_by,
                )
                for criterion in source_rubric.criteria.all():
                    RubricCriterion.objects.create(
                        rubric=clone,
                        competency=criterion.competency,
                        title=criterion.title,
                        description=criterion.description,
                        max_score=criterion.max_score,
                        display_order=criterion.display_order,
                    )
                self.stdout.write(f"Rúbrica clonada desde la versión {source_rubric.case_version_id}")

        # ── Archivar otras versiones publicadas (catálogo = solo esta) ───────
        if not Rubric.objects.filter(case_version_id=version.id, active=True).exists():
            rubric = Rubric.objects.create(
                case_version=version,
                name="Rubrica formativa SIM-VBG-001",
                description=(
                    "Evaluacion docente del recorrido: contencion en crisis, "
                    "marco normativo, enfoque de derechos, etica profesional "
                    "y articulacion institucional."
                ),
                active=True,
                created_by=creator,
            )
            default_criteria = [
                (
                    "INTERVENCION_CRISIS",
                    "Contencion y primeros auxilios psicologicos",
                    "Evalua estabilizacion emocional, escucha activa y manejo de noticia dificil.",
                    20,
                ),
                (
                    "MARCO_NORMATIVO",
                    "Aplicacion del marco normativo",
                    "Valora el uso pertinente de Resolucion 459, Ley 1257, Ley 2126 y Ley 1098.",
                    20,
                ),
                (
                    "ENFOQUE_DERECHOS",
                    "Proteccion, riesgo y no revictimizacion",
                    "Mide valoracion de riesgo, medidas de proteccion y rechazo de practicas revictimizantes.",
                    20,
                ),
                (
                    "ETICA_PROFESIONAL",
                    "Decision tecnica y etica",
                    "Valora confidencialidad, prudencia, limites profesionales y actuacion interdisciplinaria.",
                    20,
                ),
                (
                    "TRAZABILIDAD",
                    "Reflexion y trazabilidad del caso",
                    "Evalua coherencia del recorrido, uso de herramientas y reflexion pedagogica.",
                    20,
                ),
            ]
            for order, (competency, title, description, max_score) in enumerate(default_criteria, start=1):
                RubricCriterion.objects.create(
                    rubric=rubric,
                    competency=competency,
                    title=title,
                    description=description,
                    max_score=max_score,
                    display_order=order,
                )
            self.stdout.write("Rubrica formativa creada para SIM-VBG-001")

        archived = (
            CaseVersion.objects.filter(simulation_case=case, status="PUBLISHED")
            .exclude(pk=version.id)
            .update(status="ARCHIVED")
        )

        # ── Retirar casos legacy duplicados del mismo dominio ────────────────
        # SOC-FEM-001 es el caso de feminicidio previo (mismo PDF, código viejo)
        # que quedaba publicado junto al canónico SIM-VBG-001. Se desactiva y se
        # archivan sus versiones para que el catálogo muestre un único caso.
        legacy_cases = SimulationCase.objects.filter(
            code__in=LEGACY_DUPLICATE_CASE_CODES
        ).exclude(pk=case.id)
        legacy_versions_archived = CaseVersion.objects.filter(
            simulation_case__in=legacy_cases, status="PUBLISHED"
        ).update(status="ARCHIVED")
        legacy_deactivated = legacy_cases.update(active=False)

        self.stdout.write(self.style.SUCCESS(
            f"Caso PDF sembrado: versión {version.semantic_version} (id {version.id}) — "
            f"{len(nodes)} nodos, {len(option_by_key)} opciones, {len(MAPS)} mapas, "
            f"{n_objects} objetos ({n_doors} puertas). Versiones archivadas: {archived}. "
            f"Casos legacy retirados: {legacy_deactivated} "
            f"(versiones archivadas: {legacy_versions_archived})."
        ))
