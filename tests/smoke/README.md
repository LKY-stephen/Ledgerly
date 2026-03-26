# Smoke Checklist

Use this checklist after dependency installation:

1. Run the API service and request `GET /api/v1/health`.
2. Run the web service and confirm the dashboard shell renders:
   - product modules
   - supported creator platforms
   - architecture guardrails
3. Run `python3 -m uv run --directory apps/api python scripts/export_openapi.py --check` and verify no contract drift is reported.
