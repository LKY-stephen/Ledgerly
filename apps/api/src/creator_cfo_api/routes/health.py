from fastapi import APIRouter

from creator_cfo_api.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Health check")
async def get_health() -> HealthResponse:
    return HealthResponse(status="ok", service="creator-cfo-api")

