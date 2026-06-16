import pytest
import zipfile
from io import BytesIO
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.simulation.models import CaseVersion

User = get_user_model()


@pytest.fixture
def profesor(db):
    return User.objects.create_user(
        email="prof_g@x.com", password="pass1234", nombre="P", apellido="F", role="PROFESOR"
    )


@pytest.fixture
def otro_profesor(db):
    return User.objects.create_user(
        email="prof_g2@x.com", password="pass1234", nombre="P2", apellido="F", role="PROFESOR"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_g@x.com", password="pass1234", nombre="E", apellido="S", role="ESTUDIANTE"
    )


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_g@x.com", password="pass1234", nombre="A", apellido="D", role="ADMIN"
    )


def cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _xlsx_upload(rows, name="estudiantes.xlsx"):
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

    def col_name(index):
        index += 1
        name = ""
        while index:
            index, rem = divmod(index - 1, 26)
            name = chr(65 + rem) + name
        return name

    sheet_rows = []
    for r_idx, row in enumerate(rows, start=1):
        cells = []
        for c_idx, value in enumerate(row):
            ref = f"{col_name(c_idx)}{r_idx}"
            safe = str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{safe}</t></is></c>')
        sheet_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')

    data = BytesIO()
    with zipfile.ZipFile(data, "w") as zf:
        zf.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""")
        zf.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")
        zf.writestr("xl/workbook.xml", """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Estudiantes" sheetId="1" r:id="rId1"/></sheets>
</workbook>""")
        zf.writestr("xl/_rels/workbook.xml.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""")
        zf.writestr("xl/worksheets/sheet1.xml", f"""<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="{ns}"><sheetData>{''.join(sheet_rows)}</sheetData></worksheet>""")
    return SimpleUploadedFile(
        name,
        data.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def test_list_forbidden_for_estudiante(estudiante):
    assert cl(estudiante).get("/api/grupos").status_code == 403


def test_list_forbidden_for_admin(admin):
    assert cl(admin).get("/api/grupos").status_code == 403


def test_create_forbidden_for_admin(admin):
    resp = cl(admin).post("/api/grupos", {"nombre": "Admin", "codigo": "ADM1"}, format="json")
    assert resp.status_code == 403


def test_create_grupo_201(profesor):
    resp = cl(profesor).post("/api/grupos", {"nombre": "G1", "codigo": "ABC123"}, format="json")
    assert resp.status_code == 201
    assert resp.data["message"] == "Grupo creado"
    assert resp.data["data"] == {
        "id": resp.data["data"]["id"], "nombre": "G1", "codigo": "ABC123", "totalEstudiantes": 0
    }


def test_create_duplicate_codigo_400(profesor):
    cl(profesor).post("/api/grupos", {"nombre": "G1", "codigo": "DUP1"}, format="json")
    resp = cl(profesor).post("/api/grupos", {"nombre": "G2", "codigo": "DUP1"}, format="json")
    assert resp.status_code == 400
    assert resp.data["message"] == "Ya existe un grupo con el código: DUP1"


def test_add_student_increments_total(profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "ADD1"}, format="json").data["data"]
    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes", {"email": estudiante.email}, format="json"
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Estudiante agregado"
    assert resp.data["data"]["totalEstudiantes"] == 1


def test_import_students_from_xlsx_creates_and_assigns(profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "XLS1"}, format="json").data["data"]
    upload = _xlsx_upload([
        ["nombre", "apellido", "email", "password"],
        ["Ana", "Rojas", "ana.rojas@x.com", "Clave1234"],
        ["Luis", "Perez", "luis.perez@x.com", ""],
        [estudiante.nombre, estudiante.apellido, estudiante.email, ""],
    ])

    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes/import/",
        {"file": upload},
        format="multipart",
    )

    assert resp.status_code == 200
    data = resp.data["data"]
    assert data["created"] == 2
    assert data["existing"] == 1
    assert data["assigned"] == 3
    assert data["associated"] == 3
    assert data["skipped"] == 0
    assert data["duplicated"] == 0
    assert data["grupo"]["totalEstudiantes"] == 3
    assert data["defaultPassword"] == "Siep2026!"
    assert User.objects.get(email="ana.rojas@x.com").role == "ESTUDIANTE"
    assert User.objects.get(email="luis.perez@x.com").check_password("Siep2026!")

    students = cl(profesor).get(f"/api/grupos/{grupo['id']}/estudiantes").data["data"]
    emails = {s["email"] for s in students}
    assert {"ana.rojas@x.com", "luis.perez@x.com", estudiante.email} <= emails


def test_import_students_rejects_duplicate_email_without_partial_writes(profesor):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "XLS2"}, format="json").data["data"]
    upload = _xlsx_upload([
        ["nombre", "apellido", "email", "password"],
        ["Ana", "Rojas", "ana.rojas@x.com", ""],
        ["Ana", "Duplicada", "ana.rojas@x.com", ""],
    ])

    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes/import/",
        {"file": upload},
        format="multipart",
    )

    assert resp.status_code == 400
    data = resp.data["data"]
    assert data["created"] == 0
    assert data["errors"][0]["field"] == "email"
    assert not User.objects.filter(email="ana.rojas@x.com").exists()


def test_import_template_download_can_be_reuploaded(profesor):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "XLS3"}, format="json").data["data"]
    template = cl(profesor).get("/api/grupos/estudiantes/import/template/")
    assert template.status_code == 200
    upload = SimpleUploadedFile(
        "plantilla_importacion_estudiantes_siep.xlsx",
        template.content,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes/import/",
        {"file": upload},
        format="multipart",
    )
    assert resp.status_code == 200
    assert resp.data["data"]["created"] == 1


def test_import_students_rejects_missing_required_column(profesor):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "XLS4"}, format="json").data["data"]
    upload = _xlsx_upload([["nombre", "email"], ["Ana", "ana.rojas@x.com"]])
    resp = cl(profesor).post(f"/api/grupos/{grupo['id']}/estudiantes/import/", {"file": upload}, format="multipart")
    assert resp.status_code == 400
    assert "Faltan columnas obligatorias" in resp.data["message"]


def test_list_students_in_group(profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "LIST1"}, format="json").data["data"]
    cl(profesor).post(f"/api/grupos/{grupo['id']}/estudiantes", {"email": estudiante.email}, format="json")

    resp = cl(profesor).get(f"/api/grupos/{grupo['id']}/estudiantes")

    assert resp.status_code == 200
    assert resp.data["data"] == [{
        "id": estudiante.id,
        "nombre": estudiante.nombre,
        "apellido": estudiante.apellido,
        "email": estudiante.email,
        "role": "ESTUDIANTE",
        "activo": True,
    }]


def test_assign_case_to_group(profesor):
    case_version_id = CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "CASE1"}, format="json").data["data"]

    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/casos",
        {"caseVersionId": case_version_id},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["message"] == "Caso asignado"
    assert resp.data["data"][0]["caseVersionId"] == case_version_id


def test_assign_case_to_foreign_group_400(profesor, otro_profesor):
    case_version_id = CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "CASE2"}, format="json").data["data"]

    resp = cl(otro_profesor).post(
        f"/api/grupos/{grupo['id']}/casos",
        {"caseVersionId": case_version_id},
        format="json",
    )

    assert resp.status_code == 400
    assert resp.data["message"] == "No tiene permiso sobre este grupo"


def test_add_student_to_foreign_group_400(profesor, otro_profesor, estudiante):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "FOR1"}, format="json").data["data"]
    resp = cl(otro_profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes", {"email": estudiante.email}, format="json"
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "No tiene permiso sobre este grupo"


def test_add_non_student_400(profesor, otro_profesor):
    grupo = cl(profesor).post("/api/grupos", {"nombre": "G", "codigo": "NS1"}, format="json").data["data"]
    resp = cl(profesor).post(
        f"/api/grupos/{grupo['id']}/estudiantes", {"email": otro_profesor.email}, format="json"
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "El usuario no tiene rol de estudiante"


def test_add_student_missing_group_404(profesor, estudiante):
    resp = cl(profesor).post(
        "/api/grupos/99999999/estudiantes", {"email": estudiante.email}, format="json"
    )
    assert resp.status_code == 404


def test_list_only_own_groups(profesor, otro_profesor):
    cl(profesor).post("/api/grupos", {"nombre": "Mio", "codigo": "OWN1"}, format="json")
    cl(otro_profesor).post("/api/grupos", {"nombre": "Suyo", "codigo": "OTH1"}, format="json")
    data = cl(profesor).get("/api/grupos").data["data"]
    codigos = {g["codigo"] for g in data}
    assert "OWN1" in codigos
    assert "OTH1" not in codigos
