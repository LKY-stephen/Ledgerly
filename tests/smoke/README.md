# Smoke Checklist

Use this checklist after dependency installation:

1. Run `pnpm --filter @creator-cfo/mobile start` and open the app in Expo Go, iOS, Android, or web.
2. Confirm the dashboard shell renders:
   - product modules
   - supported creator platforms
   - local persistence architecture cards
3. Confirm the local bootstrap reports both SQLite and file-vault readiness.
4. Run `pnpm contract:check` and verify the storage contracts still pass.
