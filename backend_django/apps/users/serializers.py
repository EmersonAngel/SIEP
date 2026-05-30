from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import AccessToken

from .models import UserRole

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """Matches Spring's UserSummary record: {id, nombre, apellido, email, role}."""

    class Meta:
        model = User
        fields = ["id", "nombre", "apellido", "email", "role"]


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


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100)
    role = serializers.ChoiceField(choices=UserRole.choices)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
