"""Metrics endpoint for SchemaGuard Health AI."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from app.services.metrics_service import MetricsService


router = APIRouter(prefix="", tags=["metrics"])


@router.get("/metrics", summary="Service metrics")
async def metrics() -> Response:
    """Return Prometheus exposition text for service metrics."""

    return Response(content=MetricsService.prometheus_text(), media_type="text/plain; version=0.0.4")
