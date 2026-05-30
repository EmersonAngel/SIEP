import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin_t4@psychosim.edu.co",
        password="Admin123!",
        nombre="Admin",
        apellido="Test",
        role="ADMIN",
    )


def test_login_returns_token_and_user(client, admin_user):
    resp = client.post(
        "/api/auth/login",
        {"email": admin_user.email, "password": "Admin123!"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert "message" not in resp.data  # Spring ApiResponse.ok(data) omits message
    assert "token" in resp.data["data"]
    assert resp.data["data"]["user"]["role"] == "ADMIN"
    assert resp.data["data"]["user"]["email"] == admin_user.email
    # UserSummary field order/contents
    assert set(resp.data["data"]["user"].keys()) == {
        "id", "nombre", "apellido", "email", "role"
    }


def test_login_bad_credentials_401(client, admin_user):
    resp = client.post(
        "/api/auth/login",
        {"email": admin_user.email, "password": "wrong"},
        format="json",
    )
    assert resp.status_code == 401
    assert resp.data == {"success": False, "message": "Credenciales inválidas"}


def test_login_inactive_user_401(client, admin_user):
    admin_user.activo = False
    admin_user.save()
    resp = client.post(
        "/api/auth/login",
        {"email": admin_user.email, "password": "Admin123!"},
        format="json",
    )
    assert resp.status_code == 401


def test_token_carries_spring_claims(client, admin_user):
    resp = client.post(
        "/api/auth/login",
        {"email": admin_user.email, "password": "Admin123!"},
        format="json",
    )
    decoded = AccessToken(resp.data["data"]["token"])
    assert decoded["userId"] == admin_user.id
    assert decoded["role"] == "ADMIN"
    assert decoded["sub"] == admin_user.email


def test_me_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_login_then_me_with_bearer(client, admin_user):
    login = client.post(
        "/api/auth/login",
        {"email": admin_user.email, "password": "Admin123!"},
        format="json",
    )
    token = login.data["data"]["token"]
    c2 = APIClient()
    c2.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    me = c2.get("/api/auth/me")
    assert me.status_code == 200
    assert me.data["data"]["id"] == admin_user.id
    assert me.data["data"]["email"] == admin_user.email


def test_register_requires_authentication(client):
    resp = client.post(
        "/api/auth/register",
        {"email": "x@x.com", "password": "Passw0rd!", "nombre": "N",
         "apellido": "A", "role": "ESTUDIANTE"},
        format="json",
    )
    assert resp.status_code == 401


def test_register_forbidden_for_non_admin(client, db):
    student = User.objects.create_user(
        email="stu_t4@x.com", password="Passw0rd!", nombre="S", apellido="T",
        role="ESTUDIANTE",
    )
    client.force_authenticate(user=student)
    resp = client.post(
        "/api/auth/register",
        {"email": "y@x.com", "password": "Passw0rd!", "nombre": "N",
         "apellido": "A", "role": "ESTUDIANTE"},
        format="json",
    )
    assert resp.status_code == 403
    assert resp.data["message"] == "No tiene permisos para realizar esta acción"


def test_register_creates_user(client, admin_user):
    client.force_authenticate(user=admin_user)
    resp = client.post(
        "/api/auth/register",
        {"email": "new_t4@x.com", "password": "Passw0rd!", "nombre": "Nuevo",
         "apellido": "Usuario", "role": "ESTUDIANTE"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["message"] == "Usuario creado exitosamente"
    assert resp.data["data"]["email"] == "new_t4@x.com"
    assert User.objects.filter(email="new_t4@x.com").exists()


def test_register_duplicate_email_400(client, admin_user):
    client.force_authenticate(user=admin_user)
    resp = client.post(
        "/api/auth/register",
        {"email": admin_user.email, "password": "Passw0rd!", "nombre": "N",
         "apellido": "A", "role": "ESTUDIANTE"},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "El email ya está registrado"
