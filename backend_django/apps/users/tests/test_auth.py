import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from unittest.mock import patch

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


def test_admin_users_endpoint_lists_users(client, admin_user):
    client.force_authenticate(user=admin_user)

    resp = client.get("/api/admin/users")

    assert resp.status_code == 200
    assert resp.data["success"] is True
    listed = next(user for user in resp.data["data"] if user["email"] == admin_user.email)
    assert listed["activo"] is True


def test_admin_users_endpoint_creates_user(client, admin_user):
    client.force_authenticate(user=admin_user)

    resp = client.post(
        "/api/admin/users",
        {
            "email": "admin_panel_new_t4@x.com",
            "password": "Passw0rd!",
            "nombre": "Panel",
            "apellido": "Nuevo",
            "role": "PROFESOR",
            "activo": True,
        },
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["message"] == "Usuario creado correctamente"
    assert resp.data["data"]["email"] == "admin_panel_new_t4@x.com"
    assert resp.data["data"]["activo"] is True
    assert User.objects.filter(email="admin_panel_new_t4@x.com").exists()


def test_admin_users_endpoint_rejects_common_email_domain_typo(client, admin_user):
    client.force_authenticate(user=admin_user)

    resp = client.post(
        "/api/admin/users",
        {
            "email": "nuevo@gamil.com",
            "password": "Passw0rd!",
            "nombre": "Panel",
            "apellido": "Typo",
            "role": "ESTUDIANTE",
            "activo": True,
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "gmail.com" in resp.data["message"]


def test_admin_created_user_can_login_with_assigned_role(client, admin_user):
    client.force_authenticate(user=admin_user)
    email = "admin_panel_login_t4@x.com"

    created = client.post(
        "/api/admin/users",
        {
            "email": email,
            "password": "Passw0rd!",
            "nombre": "Panel",
            "apellido": "Login",
            "role": "PROFESOR",
            "activo": True,
        },
        format="json",
    )
    assert created.status_code == 200

    login_client = APIClient()
    login = login_client.post(
        "/api/auth/login",
        {"email": email, "password": "Passw0rd!"},
        format="json",
    )

    assert login.status_code == 200
    assert login.data["data"]["user"]["role"] == "PROFESOR"
    decoded = AccessToken(login.data["data"]["token"])
    assert decoded["role"] == "PROFESOR"
    assert decoded["sub"] == email


def test_login_normalizes_email_whitespace_and_case(client, admin_user):
    user = User.objects.create_user(
        email="normalizado_t4@x.com",
        password="Passw0rd!",
        nombre="Email",
        apellido="Normalizado",
        role="ESTUDIANTE",
    )

    login = client.post(
        "/api/auth/login",
        {"email": f"  {user.email.upper()}  ", "password": "Passw0rd!"},
        format="json",
    )

    assert login.status_code == 200
    assert login.data["data"]["user"]["email"] == user.email


@override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id.apps.googleusercontent.com")
def test_google_login_returns_token_for_existing_active_user(client, admin_user):
    with patch(
        "apps.users.views.verify_google_credential",
        return_value={"email": admin_user.email.upper(), "email_verified": True, "sub": "google-sub"},
    ) as verifier:
        resp = client.post("/api/auth/google", {"credential": "valid-id-token"}, format="json")

    assert resp.status_code == 200
    verifier.assert_called_once_with("valid-id-token", "google-client-id.apps.googleusercontent.com")
    assert resp.data["data"]["user"]["email"] == admin_user.email
    decoded = AccessToken(resp.data["data"]["token"])
    assert decoded["role"] == "ADMIN"
    assert decoded["sub"] == admin_user.email


@override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id.apps.googleusercontent.com")
def test_google_login_rejects_unknown_user(client):
    with patch(
        "apps.users.views.verify_google_credential",
        return_value={"email": "sin_registro@x.com", "email_verified": True, "sub": "google-sub"},
    ):
        resp = client.post("/api/auth/google", {"credential": "valid-id-token"}, format="json")

    assert resp.status_code == 401
    assert "asociada" in resp.data["message"]


@override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id.apps.googleusercontent.com")
def test_google_login_rejects_unverified_email(client, admin_user):
    with patch(
        "apps.users.views.verify_google_credential",
        return_value={"email": admin_user.email, "email_verified": False, "sub": "google-sub"},
    ):
        resp = client.post("/api/auth/google", {"credential": "valid-id-token"}, format="json")

    assert resp.status_code == 401
    assert "verificado" in resp.data["message"]


def test_google_login_requires_backend_client_id(client):
    resp = client.post("/api/auth/google", {"credential": "valid-id-token"}, format="json")

    assert resp.status_code == 400
    assert "Google" in resp.data["message"]


def test_admin_users_endpoint_updates_user_and_optional_password(client, admin_user):
    user = User.objects.create_user(
        email="admin_panel_update_t4@x.com",
        password="Passw0rd!",
        nombre="Antes",
        apellido="Usuario",
        role="ESTUDIANTE",
    )
    client.force_authenticate(user=admin_user)

    resp = client.put(
        f"/api/admin/users/{user.id}",
        {
            "email": "admin_panel_update_t4@x.com",
            "password": "",
            "nombre": "Despues",
            "apellido": "Usuario",
            "role": "PROFESOR",
        },
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["data"]["nombre"] == "Despues"
    assert resp.data["data"]["role"] == "PROFESOR"
    user.refresh_from_db()
    assert user.check_password("Passw0rd!")


def test_admin_users_endpoint_updates_status(client, admin_user):
    user = User.objects.create_user(
        email="admin_panel_status_t4@x.com",
        password="Passw0rd!",
        nombre="Estado",
        apellido="Usuario",
        role="ESTUDIANTE",
    )
    client.force_authenticate(user=admin_user)

    resp = client.patch(f"/api/admin/users/{user.id}/status", {"activo": False}, format="json")

    assert resp.status_code == 200
    assert resp.data["data"]["activo"] is False
    user.refresh_from_db()
    assert user.activo is False
