from pydantic import BaseModel


class BootstrapSummaryResponse(BaseModel):
    product_name: str
    supported_platforms: list[str]
    product_modules: list[str]
    contract_version: str

