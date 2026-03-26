from fastapi import APIRouter

from creator_cfo_api.schemas import BootstrapSummaryResponse

router = APIRouter(prefix="/bootstrap", tags=["bootstrap"])


@router.get("/summary", response_model=BootstrapSummaryResponse, summary="Bootstrap summary")
async def get_bootstrap_summary() -> BootstrapSummaryResponse:
    return BootstrapSummaryResponse(
        product_name="Creator CFO",
        supported_platforms=[
            "YouTube",
            "TikTok",
            "Bilibili",
            "X",
            "Patreon",
            "Shopify",
        ],
        product_modules=[
            "Revenue Hub",
            "Invoice Desk",
            "Cost Journal",
            "Tax Forecast",
            "Stablecoin Settlement",
        ],
        contract_version="0.1.0",
    )

