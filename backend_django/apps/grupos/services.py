"""Mirrors Spring GrupoService 1:1.

GrupoDTO = {id, nombre, codigo, totalEstudiantes}. Permission/role failures use
IllegalArgumentException semantics -> 400 (ValidationError), not 403.
"""
import csv
import io
import re
import zipfile
from dataclasses import dataclass
from xml.etree import ElementTree as ET

from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.db import connection, transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.simulation.models import CaseVersion, SimulationNode
from apps.simulation.serializers import game_dtos as simulation_dto
from apps.users.serializers import normalize_email_value, validate_common_email_domain

from .import_contract import (
    REQUIRED_STUDENT_IMPORT_COLUMNS,
    STUDENT_IMPORT_COLUMNS,
    STUDENT_IMPORT_TEMPLATE_FILENAME,
)
from .models import Grupo

User = get_user_model()

DEFAULT_IMPORTED_STUDENT_PASSWORD = "Siep2026!"
IMPORT_HEADER_ALIASES = {
    "email": "email",
    "correo": "email",
    "correo electronico": "email",
    "correo electrónico": "email",
    "correo institucional": "email",
    "mail": "email",
    "nombre": "nombre",
    "nombres": "nombre",
    "name": "nombre",
    "apellido": "apellido",
    "apellidos": "apellido",
    "last name": "apellido",
    "password": "password",
    "contraseña": "password",
    "contrasena": "password",
    "contraseña temporal": "password",
    "contrasena temporal": "password",
    "clave": "password",
    "clave temporal": "password",
    "n": "_skip",
    "no": "_skip",
    "numero": "_skip",
    "número": "_skip",
    "#": "_skip",
}
REQUIRED_IMPORT_FIELDS = {"email", "nombre", "apellido"}


@dataclass
class ImportValidationError(Exception):
    result: dict


def _total_estudiantes(grupo_id):
    with connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM grupo_estudiante WHERE grupo_id = %s", [grupo_id])
        return cur.fetchone()[0]


def grupo_dto(grupo):
    return {
        "id": grupo.id,
        "nombre": grupo.nombre,
        "codigo": grupo.codigo,
        "totalEstudiantes": _total_estudiantes(grupo.id),
    }


def listar_de_profesor(profesor_id):
    grupos = Grupo.objects.filter(profesor_id=profesor_id, activo=True)
    return [grupo_dto(g) for g in grupos]


def _require_grupo(grupo_id, profesor):
    grupo = Grupo.objects.filter(pk=grupo_id).first()
    if not grupo:
        raise NotFound(f"Grupo no encontrado: {grupo_id}")
    if grupo.profesor_id != profesor.id:
        raise ValidationError("No tiene permiso sobre este grupo")
    return grupo


def _student_dto(user):
    return {
        "id": user.id,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "email": user.email,
        "role": user.role,
        "activo": user.activo,
    }


def _normalize_header(value):
    value = str(value or "").strip().lower()
    value = value.replace("°", "").replace("º", "").replace("#", "")
    value = re.sub(r"[\s_\-]+", " ", value).strip()
    return IMPORT_HEADER_ALIASES.get(value, value)


def _cell_text(cell):
    if cell is None:
        return ""
    value = str(cell).strip()
    if value.endswith(".0") and value[:-2].isdigit():
        return value[:-2]
    return value


def _parse_csv_rows(uploaded_file):
    raw = uploaded_file.read()
    text = raw.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text))
    return [[_cell_text(cell) for cell in row] for row in reader]


def _xlsx_shared_strings(zf):
    try:
        xml = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(xml)
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values = []
    for si in root.findall("x:si", ns):
        parts = [node.text or "" for node in si.findall(".//x:t", ns)]
        values.append("".join(parts))
    return values


def _xlsx_first_sheet_path(zf):
    try:
        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    except KeyError:
        raise ValidationError("El archivo Excel no tiene una hoja válida")
    ns = {
        "x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    }
    sheet = workbook.find("x:sheets/x:sheet", ns)
    if sheet is None:
        raise ValidationError("El archivo Excel no tiene hojas")
    rel_id = sheet.attrib.get(f"{{{ns['r']}}}id")
    for rel in rels.findall("rel:Relationship", ns):
        if rel.attrib.get("Id") == rel_id:
            target = rel.attrib.get("Target", "")
            if target.startswith("/"):
                return target.lstrip("/")
            return f"xl/{target}".replace("xl/worksheets/../", "xl/")
    raise ValidationError("No fue posible leer la primera hoja del Excel")


def _column_index(ref):
    letters = "".join(ch for ch in ref if ch.isalpha()).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return max(0, idx - 1)


def _parse_xlsx_rows(uploaded_file):
    try:
        with zipfile.ZipFile(uploaded_file) as zf:
            shared = _xlsx_shared_strings(zf)
            sheet_path = _xlsx_first_sheet_path(zf)
            root = ET.fromstring(zf.read(sheet_path))
    except zipfile.BadZipFile:
        raise ValidationError("El archivo .xlsx no es válido")

    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rows = []
    for row in root.findall(".//x:sheetData/x:row", ns):
        values = []
        for cell in row.findall("x:c", ns):
            idx = _column_index(cell.attrib.get("r", "A"))
            while len(values) <= idx:
                values.append("")
            cell_type = cell.attrib.get("t")
            value_node = cell.find("x:v", ns)
            inline_node = cell.find("x:is/x:t", ns)
            if cell_type == "s" and value_node is not None:
                raw = value_node.text or ""
                value = shared[int(raw)] if raw.isdigit() and int(raw) < len(shared) else ""
            elif inline_node is not None:
                value = inline_node.text or ""
            else:
                value = value_node.text if value_node is not None else ""
            values[idx] = _cell_text(value)
        rows.append(values)
    return rows


def _xml_escape(value):
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _column_name(index):
    index += 1
    name = ""
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def _worksheet_xml(rows):
    sheet_rows = []
    for r_idx, row in enumerate(rows, start=1):
        cells = []
        for c_idx, value in enumerate(row):
            ref = f"{_column_name(c_idx)}{r_idx}"
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{_xml_escape(value)}</t></is></c>')
        sheet_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')
    cols = '<cols><col min="1" max="4" width="28" customWidth="1"/></cols>'
    return f'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">{cols}<sheetData>{"".join(sheet_rows)}</sheetData></worksheet>'


def student_import_template_bytes():
    data = io.BytesIO()
    rows = [
        list(STUDENT_IMPORT_COLUMNS),
        ["Ana", "Rojas", "ana.rojas@example.edu.co", "Opcional123!"],
    ]
    instructions = [
        ["Campo", "Obligatorio", "Instruccion"],
        ["nombre", "Si", "Primer nombre o nombres del estudiante."],
        ["apellido", "Si", "Apellidos del estudiante."],
        ["email", "Si", "Correo institucional o academico valido. No debe repetirse."],
        ["password", "No", f"Si se deja vacio se usara {DEFAULT_IMPORTED_STUDENT_PASSWORD}."],
    ]
    with zipfile.ZipFile(data, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""")
        zf.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")
        zf.writestr("xl/workbook.xml", """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Estudiantes" sheetId="1" r:id="rId1"/>
    <sheet name="Instrucciones" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>""")
        zf.writestr("xl/_rels/workbook.xml.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>""")
        zf.writestr("xl/worksheets/sheet1.xml", _worksheet_xml(rows))
        zf.writestr("xl/worksheets/sheet2.xml", _worksheet_xml(instructions))
    return data.getvalue()


def _parse_student_import(uploaded_file):
    name = (uploaded_file.name or "").lower()
    if not name.endswith(".xlsx"):
        raise ValidationError("Carga un archivo .xlsx")
    rows = _parse_xlsx_rows(uploaded_file)
    rows = [row for row in rows if any(_cell_text(cell) for cell in row)]
    if not rows:
        raise ValidationError("El archivo no tiene estudiantes para importar")

    headers = [_normalize_header(cell) for cell in rows[0]]
    duplicates = sorted({
        header for header in headers
        if header and header != "_skip" and headers.count(header) > 1
    })
    if duplicates:
        raise ValidationError(f"Columnas duplicadas: {', '.join(duplicates)}")

    unknown = [
        header for header in headers
        if header and header != "_skip" and header not in STUDENT_IMPORT_COLUMNS
    ]
    if unknown:
        raise ValidationError(f"Columnas no permitidas: {', '.join(unknown)}")

    missing = [column for column in REQUIRED_STUDENT_IMPORT_COLUMNS if column not in headers]
    if missing:
        readable = ", ".join(missing)
        raise ValidationError(f"Faltan columnas obligatorias: {readable}")

    parsed = []
    for offset, row in enumerate(rows[1:], start=2):
        item = {"row": offset}
        for idx, header in enumerate(headers):
            if header in STUDENT_IMPORT_COLUMNS:
                item[header] = _cell_text(row[idx] if idx < len(row) else "")
        parsed.append(item)
    if not parsed:
        raise ValidationError("El archivo no tiene filas de estudiantes")
    return parsed


def listar_estudiantes(grupo_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT u.id
            FROM grupo_estudiante ge
            INNER JOIN users u ON u.id = ge.estudiante_id
            WHERE ge.grupo_id = %s
            ORDER BY u.apellido, u.nombre, u.email
            """,
            [grupo.id],
        )
        ids = [row[0] for row in cur.fetchall()]
    users = User.objects.filter(id__in=ids)
    by_id = {u.id: u for u in users}
    return [_student_dto(by_id[user_id]) for user_id in ids if user_id in by_id]


def _import_result(grupo, created=0, existing=0, assigned=0, skipped=0, duplicated=0, errors=None, students=None, message=""):
    return {
        "grupo": grupo_dto(grupo),
        "created": created,
        "existing": existing,
        "assigned": assigned,
        "associated": assigned,
        "skipped": skipped,
        "duplicated": duplicated,
        "errors": errors or [],
        "students": students or [],
        "defaultPassword": DEFAULT_IMPORTED_STUDENT_PASSWORD,
        "expectedColumns": list(STUDENT_IMPORT_COLUMNS),
        "message": message,
    }


def import_spec():
    return {
        "requiredColumns": list(REQUIRED_STUDENT_IMPORT_COLUMNS),
        "optionalColumns": [column for column in STUDENT_IMPORT_COLUMNS if column not in REQUIRED_STUDENT_IMPORT_COLUMNS],
        "columns": list(STUDENT_IMPORT_COLUMNS),
        "templateFilename": STUDENT_IMPORT_TEMPLATE_FILENAME,
        "acceptedExtensions": [".xlsx"],
    }


def _validate_import_rows(grupo, rows):
    errors = []
    normalized_rows = []
    seen_emails = set()
    for item in rows:
        row_number = item["row"]
        email_raw = _cell_text(item.get("email"))
        nombre = _cell_text(item.get("nombre"))
        apellido = _cell_text(item.get("apellido"))
        password = _cell_text(item.get("password")) or DEFAULT_IMPORTED_STUDENT_PASSWORD

        if not nombre:
            errors.append({"row": row_number, "field": "nombre", "email": email_raw, "message": "El nombre es obligatorio.", "error": "El nombre es obligatorio."})
        if not apellido:
            errors.append({"row": row_number, "field": "apellido", "email": email_raw, "message": "El apellido es obligatorio.", "error": "El apellido es obligatorio."})
        if not email_raw:
            errors.append({"row": row_number, "field": "email", "email": "", "message": "El email es obligatorio.", "error": "El email es obligatorio."})
            continue

        try:
            email = validate_common_email_domain(normalize_email_value(email_raw))
            validate_email(email)
        except Exception as exc:
            detail = exc.detail if isinstance(exc, ValidationError) else str(exc)
            if isinstance(detail, list):
                detail = "; ".join(str(x) for x in detail)
            errors.append({"row": row_number, "field": "email", "email": email_raw, "message": str(detail), "error": str(detail)})
            continue

        if email in seen_emails:
            errors.append({"row": row_number, "field": "email", "email": email, "message": "Correo repetido en el archivo.", "error": "Correo repetido en el archivo."})
            continue
        seen_emails.add(email)

        user = User.objects.filter(email=email).first()
        if user and user.role != "ESTUDIANTE":
            errors.append({"row": row_number, "field": "email", "email": email, "message": "El usuario existe, pero no tiene rol ESTUDIANTE.", "error": "El usuario existe, pero no tiene rol ESTUDIANTE."})
            continue

        normalized_rows.append({
            "row": row_number,
            "email": email,
            "nombre": nombre,
            "apellido": apellido,
            "password": password,
            "user": user,
        })

    if errors:
        raise ImportValidationError(_import_result(
            grupo,
            errors=errors,
            message="El archivo contiene errores.",
        ))
    return normalized_rows


@transaction.atomic
def importar_estudiantes(grupo_id, uploaded_file, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    rows = _parse_student_import(uploaded_file)
    rows = _validate_import_rows(grupo, rows)
    created = existing = assigned = skipped = 0
    imported_students = []

    for item in rows:
        user = item["user"]
        if user:
            existing += 1
        else:
            user = User.objects.create_user(
                email=item["email"],
                password=item["password"],
                nombre=item["nombre"],
                apellido=item["apellido"],
                role="ESTUDIANTE",
                activo=True,
            )
            created += 1

        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO grupo_estudiante (grupo_id, estudiante_id) VALUES (%s, %s) "
                "ON CONFLICT DO NOTHING",
                [grupo.id, user.id],
            )
            if cur.rowcount:
                assigned += 1
            else:
                skipped += 1
        imported_students.append(_student_dto(user))

    return _import_result(
        grupo,
        created=created,
        existing=existing,
        assigned=assigned,
        skipped=skipped,
        students=imported_students,
        message=f"Se procesaron correctamente {len(rows)} filas.",
    )


def _case_summary(case_version_id):
    version = (
        CaseVersion.objects.filter(pk=case_version_id)
        .select_related("simulation_case")
        .first()
    )
    if not version:
        raise NotFound(f"Version de caso no encontrada: {case_version_id}")
    node_count = SimulationNode.objects.filter(case_version_id=version.id).count()
    return simulation_dto.case_summary(version, node_count)


def listar_casos_asignados(grupo_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT case_version_id
            FROM grupo_case_version
            WHERE grupo_id = %s
            ORDER BY assigned_at DESC, case_version_id DESC
            """,
            [grupo.id],
        )
        ids = [row[0] for row in cur.fetchall()]
    return [_case_summary(case_version_id) for case_version_id in ids]


@transaction.atomic
def crear(nombre, codigo, profesor):
    if Grupo.objects.filter(codigo=codigo).exists():
        raise ValidationError(f"Ya existe un grupo con el código: {codigo}")
    grupo = Grupo.objects.create(nombre=nombre, codigo=codigo, profesor=profesor)
    return grupo_dto(grupo)


@transaction.atomic
def agregar_estudiante(grupo_id, email, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    estudiante = User.objects.filter(email=email).first()
    if not estudiante:
        raise NotFound(f"Usuario no encontrado: {email}")
    if estudiante.role != "ESTUDIANTE":
        raise ValidationError("El usuario no tiene rol de estudiante")
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO grupo_estudiante (grupo_id, estudiante_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            [grupo.id, estudiante.id],
        )
    return grupo_dto(grupo)


@transaction.atomic
def asignar_caso(grupo_id, case_version_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    version = (
        CaseVersion.objects.filter(pk=case_version_id)
        .select_related("simulation_case")
        .first()
    )
    if not version:
        raise NotFound(f"Version de caso no encontrada: {case_version_id}")
    if version.status != "PUBLISHED" or not version.simulation_case.active:
        raise ValidationError("Solo se pueden asignar casos publicados y activos")
    with connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO grupo_case_version (grupo_id, case_version_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            [grupo.id, version.id],
        )
    return listar_casos_asignados(grupo.id, profesor)


@transaction.atomic
def quitar_caso(grupo_id, case_version_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM grupo_case_version WHERE grupo_id = %s AND case_version_id = %s",
            [grupo.id, case_version_id],
        )
    return listar_casos_asignados(grupo.id, profesor)
