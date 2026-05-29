"""FastAPI application entrypoint for SchemaGuard Health AI.

This module defines the ASGI application object, shared middleware, and the
base HTTP configuration used by the rest of the service.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import Response

from app.core.logging import configure_logging
from app.core.settings import get_settings
from app.routers.validation import router as validation_router
from app.routers.suggestions import router as suggestions_router
from app.routers.fhir import router as fhir_router
from app.routers.metrics import router as metrics_router


settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger("schemaguard")


def _dependency_status() -> dict[str, str]:
    """Return lightweight dependency checks for the /health endpoint."""

    llm_status = "available" if settings.llm_api_key else "validation-only"
    try:
        __import__("fhir.resources.patient")
        fhir_status = "available"
    except Exception:
        fhir_status = "missing"

    return {"llm": llm_status, "fhir_validator": fhir_status, "db": "not_configured"}


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-assisted healthcare data validation and FHIR compatibility checks for OpenMRS 3.",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.enable_gzip:
    app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(validation_router)
app.include_router(suggestions_router)
app.include_router(fhir_router)
app.include_router(metrics_router)


@app.middleware("http")
async def add_correlation_id(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Attach a per-request correlation id for traceability."""

    correlation_id = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))
    start_time = time.perf_counter()

    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Correlation-Id"] = correlation_id
    response.headers["X-Process-Time-ms"] = f"{duration_ms:.2f}"
    logger.info(
        "request_complete",
        extra={
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown",
        },
    )
    return response


@app.get("/health", tags=["health"])
async def health() -> dict[str, object]:
    """Return a simple health check response for container orchestration."""

    return {"status": "ok", "service": settings.app_name, "dependencies": _dependency_status()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)