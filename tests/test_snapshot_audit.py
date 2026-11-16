"""Offline regression tests for the read-only snapshot audit."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import audit_snapshot_completeness as audit


class SnapshotAuditTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.now = dt.datetime(2026, 11, 17, 0, 0, tzinfo=dt.timezone.utc)
        root_patch = patch.object(audit, "ROOT", self.root)
        now_patch = patch.object(audit, "NOW", self.now)
        root_patch.start()
        now_patch.start()
        self.addCleanup(root_patch.stop)
        self.addCleanup(now_patch.stop)

    def inspect(self, age=10, rows=None, error=None, updated_at=None):
        if rows is None:
            rows = [{"id": "abc", "reportedAt": self.now.isoformat(),
                     "lat": 1.3, "lon": 103.8}]
        stamp = updated_at if updated_at is not None else (
            self.now - dt.timedelta(minutes=age)).isoformat()
        (self.root / "aircraft.json").write_text(json.dumps({
            "updatedAt": stamp, "items": rows, "error": error
        }), encoding="utf-8")
        return audit.inspect_feed("aircraft.json")

    def test_fresh_at_threshold(self):
        result = self.inspect(age=45)
        self.assertEqual(result["freshness_status"], "fresh")
        self.assertEqual(result["freshness_threshold_minutes"], 45)

    def test_stale_after_threshold(self):
        self.assertEqual(self.inspect(age=46)["freshness_status"], "stale")

    def test_missing_timestamp(self):
        self.assertEqual(self.inspect(updated_at="invalid")["freshness_status"], "unknown")

    def test_future_timestamp(self):
        self.assertEqual(self.inspect(age=-3)["freshness_status"], "future_timestamp")

    def test_duplicate_ids(self):
        row = {"id": "abc", "reportedAt": self.now.isoformat(),
               "lat": 1.3, "lon": 103.8}
        result = self.inspect(rows=[row, dict(row)])
        self.assertEqual(result["valid_records"], 2)
        self.assertEqual(result["unique_identifiers"], 1)
        self.assertEqual(result["duplicate_identifiers"], 1)

    def test_invalid_row_excluded(self):
        row = {"id": "abc", "reportedAt": self.now.isoformat(),
               "lat": 999, "lon": 103.8}
        result = self.inspect(rows=[row])
        self.assertEqual(result["invalid_records"], 1)
        self.assertEqual(result["duplicate_identifiers"], 0)

    def test_source_error(self):
        result = self.inspect(error="source temporarily unavailable")
        self.assertEqual(result["source_status"], "error")
        self.assertEqual(result["source_error"], "source temporarily unavailable")

    def test_no_reported_error(self):
        self.assertEqual(self.inspect()["source_status"], "no_reported_error")


if __name__ == "__main__":
    unittest.main()
