"""In-memory metrics collection for SchemaGuard Health AI."""

from __future__ import annotations


class MetricsService:
    """Track lightweight service metrics without a persistent datastore."""

    total_validations = 0
    validation_failures = 0
    quality_score_total = 0
    fhir_compliant_total = 0
    ai_suggestions_total = 0
    ai_suggestions_accepted = 0

    @classmethod
    def record_validation(cls, quality_score: int, fhir_compliant: bool, has_errors: bool) -> None:
        """Record a validation outcome for aggregate metrics."""

        cls.total_validations += 1
        cls.quality_score_total += quality_score
        cls.fhir_compliant_total += int(fhir_compliant)
        cls.validation_failures += int(has_errors)

    @classmethod
    def record_suggestion(cls, accepted: bool = False) -> None:
        """Record a suggestion generation or acceptance event."""

        cls.ai_suggestions_total += 1
        cls.ai_suggestions_accepted += int(accepted)

    @classmethod
    def snapshot(cls) -> dict[str, float | int]:
        """Return a computed metrics snapshot."""

        total = cls.total_validations or 1
        suggestion_total = cls.ai_suggestions_total or 1
        return {
            "total_validations": cls.total_validations,
            "error_rate": round(cls.validation_failures / total, 4),
            "avg_quality_score": round(cls.quality_score_total / total, 2),
            "fhir_compliance_rate": round(cls.fhir_compliant_total / total, 4),
            "ai_suggestion_acceptance": round(cls.ai_suggestions_accepted / suggestion_total, 4),
        }

    @classmethod
    def prometheus_text(cls) -> str:
        """Render metrics in Prometheus exposition format."""

        snapshot = cls.snapshot()
        return "\n".join(
            [
                '# HELP schema_guard_total_validations Total validation requests processed.',
                '# TYPE schema_guard_total_validations counter',
                f'schema_guard_total_validations {snapshot["total_validations"]}',
                '# HELP schema_guard_error_rate Validation error rate.',
                '# TYPE schema_guard_error_rate gauge',
                f'schema_guard_error_rate {snapshot["error_rate"]}',
                '# HELP schema_guard_avg_quality_score Average record quality score.',
                '# TYPE schema_guard_avg_quality_score gauge',
                f'schema_guard_avg_quality_score {snapshot["avg_quality_score"]}',
                '# HELP schema_guard_fhir_compliance_rate FHIR compliance rate.',
                '# TYPE schema_guard_fhir_compliance_rate gauge',
                f'schema_guard_fhir_compliance_rate {snapshot["fhir_compliance_rate"]}',
                '# HELP schema_guard_ai_suggestion_acceptance AI suggestion acceptance rate.',
                '# TYPE schema_guard_ai_suggestion_acceptance gauge',
                f'schema_guard_ai_suggestion_acceptance {snapshot["ai_suggestion_acceptance"]}',
            ]
        )
