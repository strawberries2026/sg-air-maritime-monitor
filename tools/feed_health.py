#!/usr/bin/env python3
"""Read-only aircraft/vessel snapshot freshness check. No network or dependencies.

Usage: python3 tools/feed_health.py --aircraft path/to/aircraft.json --vessels path/to/vessels.json
Exit 0: both fresh; exit 2: stale/invalid. JSON output can be consumed by a dashboard.
"""
import argparse
import datetime as dt
import json
from pathlib import Path

KEYS = ("updatedAt", "refreshed_at", "updated_at", "timestamp", "collected_at", "generated_at", "last_updated", "last_refresh", "snapshot_time")
def parse_time(value):
    if isinstance(value, (int, float)):
        return dt.datetime.fromtimestamp(value / (1000 if value > 1e11 else 1), dt.timezone.utc)
    if isinstance(value, str):
        value = value.strip()
        if value.isdigit():
            return parse_time(int(value))
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("Timestamp must include a timezone")
        return parsed.astimezone(dt.timezone.utc)
    raise ValueError("Unsupported timestamp format")

def check(path, now, threshold):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("Expected JSON object")
        value = next((data[k] for k in KEYS if data.get(k) is not None), None)
        if value is None:
            raise ValueError("No recognized refresh timestamp")
        timestamp = parse_time(value)
        age = (now - timestamp).total_seconds() / 60
        if age < -5:
            raise ValueError("Refresh timestamp is in the future")
        if data.get("error"):
            return {"status": "error", "last_refresh_utc": timestamp.isoformat(), "age_minutes": round(age, 1), "error": str(data["error"])}
        return {"status": "stale" if age > threshold else "current", "last_refresh_utc": timestamp.isoformat(), "age_minutes": round(age, 1)}
    except (OSError, ValueError, TypeError, OverflowError, KeyError) as exc:
        return {"status": "unknown", "error": str(exc)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--aircraft", required=True)
    parser.add_argument("--vessels", required=True)
    parser.add_argument("--threshold", type=float, default=45)
    args = parser.parse_args()
    if args.threshold <= 0:
        parser.error("threshold must be positive")
    now = dt.datetime.now(dt.timezone.utc)
    feeds = {"aircraft": check(args.aircraft, now, args.threshold), "vessels": check(args.vessels, now, args.threshold)}
    print(json.dumps({"checked_at_utc": now.isoformat(), "threshold_minutes": args.threshold, "feeds": feeds}, indent=2))
    return 0 if all(feed["status"] == "current" for feed in feeds.values()) else 2

if __name__ == "__main__":
    raise SystemExit(main())
