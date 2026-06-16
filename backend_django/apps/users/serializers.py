from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import AccessToken

from .models import AccessRequest, AccessRequestStatus, UserRole

User = get_user_model()

COMMON_EMAIL_DOMAIN_FIXES = {
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gnail.com": "gmail.com",
    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "outlok.com": "outlook.com",
}


def normalize_email_value(value):
    return (value or "").strip().lower()


def validate_common_email_domain(value):
    domain = value.rsplit("@", 1)[-1] if "@" in value else ""
    suggestion = COMMON_EMAIL_DOMAIN_FIXES.get(domain)
    if suggestion:
        raise serializers.ValidationError(
            f"El correo parece tener un dominio mal escrito: {domain}. Usa {suggestion}."
        )
    return value


class UserSummarySerializer(serializers.ModelSerializer):
    """Matches Spring's UserSummary record: {id, nombre, apellido, email, role}."""

    class Meta:
        model = User
        fields = ["id", "nombre", "apellido", "email", "role"]


class AdminUserSerializer(serializers.ModelSerializer):
    """User shape used by the administration screen."""

    class Meta:
        model = User
        fields = ["id", "nombre", "apellido", "email", "role", "activo"]


class AdminUserWriteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100)
    role = serializers.ChoiceField(choices=UserRole.choices)
    activo = serializers.BooleanField(required=False)

    def validate_email(self, value):
        value = validate_common_email_domain(normalize_email_value(value))
        qs = User.objects.filter(email=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("El email ya está registrado")
        return value

    def validate(self, attrs):
        password = attrs.get("password", "")
        if self.instance is None and not password:
            raise serializers.ValidationError("La contraseña es obligatoria al crear usuarios.")
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", "")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AdminUserStatusSerializer(serializers.Serializer):
    activo = serializers.BooleanField()


def generate_access_token(user):
    """Access token with the same claims Spring's JwtService emits:
    sub=email, userId=id, role=role (plus simplejwt's exp/iat/jti)."""
    token = AccessToken.for_user(user)  # sets the USER_ID_CLAIM ("userId")
    token["role"] = user.role
    token["sub"] = user.email
    return str(token)


class PsychoSimTokenObtainSerializer(TokenObtainPairSerializer):
    """Referenced by SIMPLE_JWT; keeps claim parity if the obtain view is used."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["sub"] = user.email
        return token


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return normalize_email_value(value)


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100)
    role = serializers.ChoiceField(choices=UserRole.choices)

    def validate_email(self, value):
        value = validate_common_email_domain(normalize_email_value(value))
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AccessRequestCreateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100)
    email = serializers.EmailField()

    def validate_email(self, value):
        return validate_common_email_domain(normalize_email_value(value))


class AccessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessRequest
        fields = ["id", "nombre", "apellido", "email", "status", "created_at", "reviewed_at"]


class AccessRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AccessRequestStatus.choices)
