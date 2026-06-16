import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.users.models import AccessRequest, AccessRequestStatus


@pytest.fixture(autouse=True)
def locmem_email(settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"


@pytest.fixture
def admin(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="admin_req@x.com",
        password="Admin123!",
        nombre="Admin",
        apellido="Req",
        role="ADMIN",
    )


@pytest.fixture
def estudiante_existente(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="yaexiste@x.com",
        password="Est12345!",
        nombre="Ya",
        apellido="Existe",
        role="ESTUDIANTE",
    )


def cl(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


def test_access_request_public_201(db):
    resp = cl().post(
        "/api/auth/access-request",
        {"nombre": "Carolina", "apellido": "Mejia", "email": "carolina@psychosim.edu.co"},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["success"] is True
    assert AccessRequest.objects.filter(email="carolina@psychosim.edu.co", status="PENDING").exists()
    assert len(mail.outbox) == 1
    assert "Carolina" in mail.outbox[0].subject


def test_access_request_rejects_duplicate_pending(db):
    cl().post(
        "/api/auth/access-request",
        {"nombre": "Ana", "apellido": "Uno", "email": "dup@psychosim.edu.co"},
        format="json",
    )
    resp = cl().post(
        "/api/auth/access-request",
        {"nombre": "Ana", "apellido": "Dos", "email": "dup@psychosim.edu.co"},
        format="json",
    )
    assert resp.status_code == 400


def test_access_request_rejects_existing_user(estudiante_existente):
    resp = cl().post(
        "/api/auth/access-request",
        {"nombre": "X", "apellido": "Y", "email": estudiante_existente.email},
        format="json",
    )
    assert resp.status_code == 400


def test_admin_lists_pending_requests(admin):
    req = AccessRequest.objects.create(nombre="Luis", apellido="P", email="luis-list-test@x.com")
    resp = cl(admin).get("/api/admin/access-requests?status=PENDING")
    assert resp.status_code == 200
    emails = {item["email"] for item in resp.data["data"]}
    assert req.email in emails


def test_admin_updates_request_status(admin):
    req = AccessRequest.objects.create(nombre="Marta", apellido="Q", email="marta@x.com")
    resp = cl(admin).patch(
        f"/api/admin/access-requests/{req.id}/status",
        {"status": AccessRequestStatus.REVIEWED},
        format="json",
    )
    assert resp.status_code == 200
    req.refresh_from_db()
    assert req.status == AccessRequestStatus.REVIEWED
