# Feed health diagnostics (draft)

The read-only checker examines the existing `data/aircraft.json` and `data/vessels.json` snapshots. Both use `updatedAt` (UTC ISO 8601) and may include an `error` field.

## Run locally or in CI

```sh
python -m unittest discover -s tests -p 'test_feed_health.py' -v
python tools/feed_health.py --aircraft data/aircraft.json --vessels data/vessels.json --threshold 45
```

The command emits JSON with independent feed statuses, last snapshot timestamp and age. Exit code 0 means both current; exit code 2 means at least one feed is stale, has a provider error, or cannot be assessed. A fresh timestamp with a non-null `error` is **not** healthy.

## Important limitations

- This is an **offline snapshot check**. It does not query GitHub Actions, rerun collectors, send notifications or change the scheduler.
- The snapshot's `updatedAt` is the snapshot write time, not necessarily the last *successful* upstream provider refresh. Confirm provider error and data semantics before using it as a success timestamp.
- The freshness checker must run on a timer or request to evaluate age against the current time. A successful collection workflow alone does not guarantee healthy feeds.
- Do not call a feed 'live' merely because its JSON is recent: AIS messages are sampled and coverage is incomplete.
- Before deployment, validate GitHub Actions results, real JSON examples and the dashboard integration. Keep the existing external scheduler unchanged.
