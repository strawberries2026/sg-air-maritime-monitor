# Optional external scheduler (Android-friendly)

GitHub Actions `schedule` is best-effort and can be delayed or skipped. The existing `workflow_dispatch` trigger in `.github/workflows/collect.yml` can also be called by an external scheduler.

## Before starting
- Keep the GitHub schedule enabled as a fallback.
- Do not store or paste tokens into repository files, Issues, screenshots, or this documentation.
- Use a dedicated fine-grained GitHub personal access token restricted to this repository, with **Actions: Read and write** permission, and a short expiration. Avoid a classic broad-scope token.
- Treat the token as a secret. Revoke it if exposed.
- Verify the chosen scheduler supports HTTPS POST, custom Authorization headers, and secret storage. Check its pricing and terms; a free tier may have limitations.

## Configure an external HTTPS scheduler
1. Create an account with a trusted scheduler supporting custom HTTPS requests (for example, cron-job.org, subject to its current feature limits).
2. Set the request URL to:
   `https://api.github.com/repos/strawberries2026/sg-air-maritime-monitor/actions/workflows/collect.yml/dispatches`
3. Use method `POST`.
4. Add these request headers:
   - `Authorization: Bearer YOUR_FINE_GRAINED_TOKEN`
   - `Accept: application/vnd.github+json`
   - `X-GitHub-Api-Version: 2022-11-28`
   - `Content-Type: application/json`
5. Set the JSON request body to `{"ref":"main"}`.
6. Schedule for every 15 minutes, ideally at minutes 7, 22, 37 and 52 in the scheduler's configured timezone. Verify the scheduler's timezone and minimum interval.
7. Test one request. GitHub normally returns HTTP **204 No Content** for a successful workflow dispatch.
8. Verify a new **Refresh tracking snapshots** run appears in GitHub Actions with event **workflow_dispatch**, and that its conclusion is **success**.
9. After confirming reliability, consider reducing duplicate triggers. GitHub's concurrency group prevents simultaneous runs but does not eliminate repeated sequential collections.

## Operational notes
- An HTTP 204 confirms dispatch was accepted, **not** that the collection succeeded. Inspect the workflow run and published snapshot timestamps.
- An HTTP 401/403 indicates token authentication or permission problems. A 404 can also indicate repository access issues.
- External scheduling does not guarantee data provider availability or that each position feed returns observations.
- GitHub Actions and the scheduler may impose usage limits; monitor run frequency and costs.
- Never put the token into a public query string or embed it in client-side website JavaScript.

Workflow: https://github.com/strawberries2026/sg-air-maritime-monitor/actions/workflows/collect.yml
