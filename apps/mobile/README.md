# Mobile Routes

This workspace uses Expo Router. The current pure-UI Figma-aligned slice maps routes to screens and design nodes as follows.

| Route | Screen component | Figma node |
|---|---|---|
| `/login` | `src/features/auth/login-screen.tsx` | `2320:3` |
| `/` | `src/features/home/home-screen.tsx` | `2330:12` |
| `/ledger` | `src/features/ledger/ledger-screen.tsx` | `2330:6` |
| `/ledger/upload` | `src/features/ledger/ledger-upload-screen.tsx` | `2330:9` |
| `/ledger/parse` | `src/features/ledger/ledger-parse-screen.tsx` | `2330:18` |

## Notes

- The `ledger/upload` and `ledger/parse` routes are root stack pages outside the tabs group, so the bottom tab bar is hidden while moving through the Ledger subflow.
- This slice is pure UI only: all upload and parse data is mocked in `src/features/ledger/ledger-mocks.ts`.
- No SQLite, file-vault, schema, or contract changes are part of this route set.
