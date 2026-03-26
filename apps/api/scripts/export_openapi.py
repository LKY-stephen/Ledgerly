from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
API_SRC = ROOT / "apps" / "api" / "src"
OPENAPI_PATH = ROOT / "openapi" / "openapi.yaml"

if str(API_SRC) not in sys.path:
    sys.path.insert(0, str(API_SRC))


def build_openapi_yaml() -> str:
    from creator_cfo_api.app import app

    openapi_schema = app.openapi()
    return yaml.safe_dump(openapi_schema, sort_keys=False, allow_unicode=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    rendered = build_openapi_yaml()
    existing = OPENAPI_PATH.read_text() if OPENAPI_PATH.exists() else ""

    if args.check:
        if existing != rendered:
            print(
                "OpenAPI contract drift detected. "
                "Run uv run --directory apps/api python scripts/export_openapi.py"
            )
            return 1
        print("OpenAPI contract is up to date.")
        return 0

    OPENAPI_PATH.write_text(rendered)
    print(f"Wrote {OPENAPI_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
