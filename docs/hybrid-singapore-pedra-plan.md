# Hybrid AIS monitoring: Singapore waters and Pedra Branca

Status: staged proposal, not deployed. Keep the existing external workflow_dispatch scheduler and 15-minute snapshots unchanged.

## Scope
- Singapore port waters and nearby Singapore Strait approaches.
- A separate Pedra Branca vicinity view.
- Clearly distinguish monitoring rectangles from legal maritime boundaries.
- Retain existing aircraft display and historical tracks.
- Do not identify or highlight security-force operational movements.

## Stage 1 — no-cost, no-disruption
1. Add two named geographic views to the map (Singapore, Pedra Branca) with easy mobile switching.
2. Keep existing collector area until the revised geographic filters are verified against actual AIS messages; filtering too early could silently lose valid observations.
3. Display each vessel's original reportedAt, snapshot updatedAt and age; never imply an old observation is live.
4. Keep last valid snapshot visible when a provider fails, marked stale. Do not replace a valid snapshot with an empty successful-looking result.
5. Validate both feeds separately; alert when either updatedAt exceeds 45 minutes.
6. Retain existing 15-minute external scheduler and native schedule, with independent event-specific monitoring.

## Stage 2 — optional near-real-time
Investigate an authorised server-side AIS streaming relay and its actual free-tier quotas, availability, license, and cost before enabling. Never embed AIS credentials in GitHub Pages. If no genuinely $0 continuously available backend exists, keep the snapshot mode; do not advertise second-by-second live tracking.

## Acceptance criteria
- Both zone buttons focus the correct map area and work on Android and keyboard.
- Pedra Branca landmark remains visible and correctly labelled.
- No artificial vessels, invented tracks, or misleading Singapore-territory claims.
- No regression in aircraft, map, PWA, history, refresh, or existing external scheduler.
- Both JSON feeds update within 45 minutes during normal collection.
- Test failure mode, stale data, no AIS observations, and missing upstream credentials.
- Merge only after review and tests; retain rollback to current main.

## Current collector observation
scripts/collect.py subscribes to AISStream for approximately 75 seconds per run and retains verified vessel reports for 90 minutes. This is a snapshot-based service, not a continuous live feed. Increasing browser refresh frequency alone cannot produce more AIS observations.
