# SG Air & Maritime Monitor

A GitHub Pages static dashboard for aircraft and AIS vessel position snapshots in Singapore and surrounding areas. Flightradar24 is provided as an external link, **not scraped or embedded**.

## Setup (including Android GitHub browser)
1. Create a **public** repository named `sg-air-maritime-monitor` (or use another name). Upload the contents of this folder **at repository root**, including `.github/workflows/collect.yml` and `data/`.
2. Under **Settings → Pages**, choose **Deploy from a branch**, `main`, `/ (root)` and Save. Site URL will be `https://YOUR-USERNAME.github.io/sg-air-maritime-monitor/` for that repository name.
3. Create an OpenSky account and OAuth API client. In **Settings → Secrets and variables → Actions**, add repository secrets `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET`.
4. Register with AISStream and add `AISSTREAM_API_KEY` as a repository Actions secret.
5. Under **Actions → Refresh tracking snapshots → Run workflow**, run the collector manually. Check workflow logs for errors. The scheduled workflow is best effort, not continuous or guaranteed; GitHub may delay or disable scheduled jobs. Ensure workflow write permission in **Settings → Actions → General → Workflow permissions** (read and write), and that branch protection permits pushes.
6. After a successful commit and Pages deployment, open your site. Refresh data button reloads the most recently published JSON snapshots; it does not trigger an API fetch.

## Architecture and limitations
- OpenSky OAuth2 API provides current position vectors within a bounded area. It does **not** reliably label commercial vs private, so category defaults to **unknown**. Callsigns are not guaranteed flight numbers. No arrival/departure data is promised.
- AISStream provides **event-driven** AIS messages, not a complete current fleet listing. The collector samples ~75 seconds per scheduled run, and may show no vessels if none report in that window. Category defaults to **unknown**. AIS reception varies by vessel and area.
- Browser displays only positions reported within the last 90 minutes. No artificial/sample tracks or fabricated counters. A snapshot is not a continuous live stream. Data can be stale, missing, delayed or unavailable.
- Secrets stay in GitHub Actions, never in frontend files. Do not commit credentials. Public JSON contains vessel/aircraft positions and is accessible to everyone.
- OpenSky quota, provider license and acceptable-use terms apply; verify suitability before public or operational deployment. For commercial use, confirm provider licensing. GitHub Actions' scheduled execution and write permissions may vary.
- This is **not suitable for safety, surveillance, navigation, air traffic control, or operational decisions**.

## Files
- `index.html`, `style.css`, `app.js`: GitHub Pages website
- `data/*.json`: published position snapshots
- `scripts/collect.py`: server-side OpenSky/AISStream collector
- `.github/workflows/collect.yml`: scheduled and manual GitHub Actions collector

## Troubleshooting
- Blank map: check network access to Leaflet CDN and OpenStreetMap tile server.
- Status unavailable: inspect `data/*.json` errors and workflow logs.
- No vessels: AIS is event-driven; try another run or use a continuously running backend for better coverage.
- No aircraft: verify OAuth client credentials, API quota, geographic coverage and workflow logs.
- Data not updating: check Actions schedule, workflow permissions, and Pages deployment status.
