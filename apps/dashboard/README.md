# Invoice Intelligence Frontend

Next.js App Router frontend for the end-to-end invoice workflow: upload, status tracking, review/correction, approval, and export.

## Requirements

- Node.js 22+
- npm 10+

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values below:

```bash
# Clerk auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Backend/API base (optional; defaults to http://localhost:8000)
NEXT_PUBLIC_API_URL=http://localhost:8000

# GCP integrations used by upload routes
GCP_PROJECT_ID=
GCS_BUCKET_NAME=
PUBSUB_TOPIC=
# Optional: local credential file path for Google SDK
GOOGLE_APPLICATION_CREDENTIALS=
```

## Local Development

From `frontend/client/`:

```bash
npm ci
npm run dev
```

App runs at `http://localhost:3000`.

## Quality Gates

From `frontend/client/`:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Workflow Behavior

### Upload + Status Progression

- Upload accepts PDF files only (`<=10MB` each, max `20` valid files per batch).
- `POST /api/invoices/upload` returns:
  - compatibility fields: `uploaded`, `invoiceIds`
  - deterministic per-file `results[]` (`queued` or `failed` with reason)
- UI renders per-file progress cards immediately from `results[]`.
- For queued files with `invoiceId`, UI polls `GET /api/invoices/{id}/status` every 2 seconds.
- Polling stops per file on terminal status or on polling failure/timeout with an inline fallback message.

### Review + Correction Persistence

- Invoice review page is side-by-side: PDF viewer + editable metadata/line-items.
- Metadata edits and line-item edits are staged in one shared draft.
- Save lifecycle is visible in UI:
  - `Unsaved changes`
  - `Saving changes...`
  - `All changes saved`
  - `Save failed`
- `Save Changes` sends metadata + full `line_items` in one `PUT /api/invoices/{id}` request.
- Approve/export/reject/retry actions remain available in the review action bar.
