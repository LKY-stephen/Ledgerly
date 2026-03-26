from fastapi import FastAPI

from creator_cfo_api.config import get_settings
from creator_cfo_api.routes import bootstrap_router, health_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
    )
    app.include_router(health_router, prefix=settings.api_prefix)
    app.include_router(bootstrap_router, prefix=settings.api_prefix)
    return app


app = create_app()

