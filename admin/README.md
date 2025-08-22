# Admin / dataset utilities

This `admin` folder holds small utilities for preparing and importing the recipes dataset.

## What is here

- `TransformCsvToJSON.ps1` — PowerShell script that converts a CSV of recipes into a JSON array. It also produces a token dictionary mapping normalized ingredient words → integer ids.
- `bulkLoad.ts` — TypeScript script (if present) that bulk-uploads generated recipes into Firestore using the Firebase Admin SDK.
- `serviceAccountKey.json` — (not committed) service account key used by the Admin SDK (if present locally).
- `package.json` — admin-side dependencies for the bulk loader (if any).
- `data/` — folder containing sample input/output:
  - `data/recipes.csv` — source CSV
  - `data/recipes.json` — transformed output JSON
  - `data/tokenDictionary.json` — generated word→int dictionary

## Quick steps

### 1) Transform CSV → JSON

Run the transformer from the `admin` directory (or pass full paths):

```powershell
# transforms data/recipes.csv -> data/recipes.json and writes tokenDictionary.json
./TransformCsvToJSON.ps1 -InputCsv data/recipes.csv -OutputJson data/recipes.json -Pretty
```

Notes:
- The script strips special characters when building the token dictionary and writes `tokenDictionary.json` (in `data/`) with the mapping word → integer id.

### 2) Upload recipes to Firestore

If `bulkLoad.ts` is present and expects `serviceAccountKey.json` in this folder, run:

```bash
# from admin/
npx ts-node bulkLoad.ts
```

If your environment requires an explicit credentials path, set the `GOOGLE_APPLICATION_CREDENTIALS` env var:

```bash
# zsh / bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/serviceAccountKey.json"
npx ts-node bulkLoad.ts
```

## Service account key (how to obtain and where to place it)

1. Open the Firebase Console for your project.
2. Project Settings → Service accounts → Generate new private key.
3. Save the downloaded JSON as `serviceAccountKey.json` and place it into this `admin/` folder (or set `GOOGLE_APPLICATION_CREDENTIALS` to its path).

## Security

- Never commit `serviceAccountKey.json` to source control. Add it to `.gitignore`.
- Use CI/CD secrets or environment variables for automated deployments.

## Troubleshooting

- If `TransformCsvToJSON.ps1` errors on encoding, run it with PowerShell Core (`pwsh`) or ensure your shell supports PowerShell script execution.
- If the bulk loader fails to authenticate, verify the `serviceAccountKey.json` path or set `GOOGLE_APPLICATION_CREDENTIALS`.

## Extras I can add

- `bulkLoad.sample.ts` — example that shows how to initialize Firebase Admin from `serviceAccountKey.json` and write `data/recipes.json` to Firestore.
- A small validator that checks `data/recipes.json` conforms to your TypeScript `Recipe` interface.

If you want either of those, tell me which and I'll add it.
