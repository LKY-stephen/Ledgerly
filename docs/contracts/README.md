# Contracts

`openapi/openapi.yaml` is the machine-readable contract snapshot for the API.

The initial architecture reserves two endpoints:

- `GET /api/v1/health`: service liveliness
- `GET /api/v1/bootstrap/summary`: dashboard bootstrap metadata for the web shell

When new product flows are added, document:

1. The observable request and response shape.
2. State invariants or migration implications.
3. The matching test coverage that proves the behavior.

