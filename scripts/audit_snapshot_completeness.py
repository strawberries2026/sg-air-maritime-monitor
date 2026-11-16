#!/usr/bin/env python3
"""Read-only diagnostic of published public-feed snapshots; no API calls or secrets."""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data"
NOW = dt.datetime.now(dt.timezone.utc)


def timestamp(value):
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else None
    except (ValueError, TypeError):
        return None


def inspect_feed(filename):
    data = json.loads((ROOT / filename).read_text(encoding="utf-8"))
    rows = data.get("items", [])
    if not isinstance(rows, list):
        raise ValueError(f"{filename}: items must be a list")
    updated = timestamp(data.get("updatedAt"))
    valid = 0
    invalid = 0
    unique = set()
    for row in rows:
        if not isinstance(row, dict):
            invalid += 1
            continue
        ident = row.get("id")
        reported = timestamp(row.get("reportedAt"))
        lat, lon = row.get("lat"), row.get("lon")
        if (not ident or not reported or not isinstance(lat, (int, float))
                or isinstance(lat, bool) or not isinstance(lon, (int, float))
                or isinstance(lon, bool) or not (-90 <= lat <= 90)
                or not (-180 <= lon <= 180)):
            invalid += 1
            continue
        valid += 1
        unique.add(str(ident))
    return {
        "feed": filename,
        "snapshot_age_minutes": round((NOW - updated).total_seconds() / 60, 1) if updated else None,
        "published_records": len(rows),
        "valid_records": valid,
        "invalid_records": invalid,
        "unique_identifiers": len(unique),
        "source_error": data.get("error") or None,
    }


def inspect_history():
    data = json.loads((ROOT / "history.json").read_text(encoding="utf-8"))
    tracks = data.get("tracks", {})
    if not isinstance(tracks, dict):
        raise ValueError("history.json: tracks must be an object")
    summary = {}
    for prefix in ("air:", "ship:"):
        observed = set()
        for key, points in tracks.items():
            if not key.startswith(prefix) or not isinstance(points, list):
                continue
            for point in points:
                if isinstance(point, dict):
                    at = timestamp(point.get("at"))
                    if at and dt.timedelta(0) <= NOW - at <= dt.timedelta(hours=24):
                        observed.add(key)
                        break
        summary[prefix[:-1] + "_unique_24h"] = len(observed)
    return summary


if __name__ == "__main__":
    print(json.dumps({
        "generated_at": NOW.isoformat(),
        "feeds": [inspect_feed("aircraft.json"), inspect_feed("vessels.json")],
        "history": inspect_history(),
        "limitations": "Partial public observations only; not official movement totals or coverage percentage.",
    }, indent=2))
