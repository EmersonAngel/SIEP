from rest_framework import serializers


class IniciarSesionSerializer(serializers.Serializer):
    casoId = serializers.IntegerField()


class RespuestaSerializer(serializers.Serializer):
    preguntaId = serializers.IntegerField()
    opcionId = serializers.IntegerField()
    tiempoMs = serializers.IntegerField(required=False, allow_null=True, default=None)
