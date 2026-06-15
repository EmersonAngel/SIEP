from rest_framework import serializers


class CrearGrupoSerializer(serializers.Serializer):
    nombre = serializers.CharField()
    codigo = serializers.CharField()


class AgregarEstudianteSerializer(serializers.Serializer):
    email = serializers.EmailField()


class AsignarCasoSerializer(serializers.Serializer):
    caseVersionId = serializers.IntegerField()
