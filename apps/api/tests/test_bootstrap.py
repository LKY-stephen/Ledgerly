from fastapi.testclient import TestClient

from creator_cfo_api.app import app


def test_bootstrap_summary_exposes_foundation_scope() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/bootstrap/summary")
    payload = response.json()

    assert response.status_code == 200
    assert payload["product_name"] == "Creator CFO"
    assert "Tax Forecast" in payload["product_modules"]
    assert len(payload["supported_platforms"]) >= 6

