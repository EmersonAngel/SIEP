from rest_framework import serializers


class CrearGrupoSerializer(serializers.Serializer):
    nombre = serializers.CharField()
    codigo = serializers.CharField()


class ActualizarGrupoSerializer(serializers.Serializer):
    nombre = serializers.CharField(required=False)
    codigo = serializers.CharField(required=False)

    def validate(self, attrs):
        if "nombre" not in attrs and "codigo" not in attrs:
            raise serializers.ValidationError("Envía nombre o código para actualizar")
        return attrs


class AgregarEstudianteSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ImportarEstudiantesSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        name = (value.name or "").lower()
        if not name.endswith(".xlsx"):
            raise serializers.ValidationError("Carga un archivo .xlsx")
        return value


class AsignarCasoSerializer(serializers.Serializer):
    caseVersionId = serializers.IntegerField()
