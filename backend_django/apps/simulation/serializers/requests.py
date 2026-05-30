from rest_framework import serializers


class StartAttemptRequest(serializers.Serializer):
    caseVersionId = serializers.IntegerField()
    forceNew = serializers.BooleanField(required=False, default=False)


class SelectDecisionRequest(serializers.Serializer):
    attemptToken = serializers.CharField()
    decisionOptionId = serializers.IntegerField()


class ReflectionRequest(serializers.Serializer):
    attemptToken = serializers.CharField()
    nodeId = serializers.IntegerField()
    text = serializers.CharField(allow_blank=True, trim_whitespace=False)


class SafeExitRequest(serializers.Serializer):
    attemptToken = serializers.CharField()
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
