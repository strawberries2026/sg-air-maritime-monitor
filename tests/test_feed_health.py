"""Unit tests for the read-only feed health utility."""
import datetime as dt
import tempfile
import unittest
from pathlib import Path
from tools.feed_health import check, parse_time

UTC = dt.timezone.utc

class FeedHealthTests(unittest.TestCase):
    def test_iso_timestamp(self):
        self.assertEqual(parse_time("2026-11-06T00:00:00Z").tzinfo, UTC)

    def test_fresh_stale_and_unknown(self):
        now = dt.datetime(2026, 11, 6, tzinfo=UTC)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "feed.json"
            path.write_text('{"updated_at":"2026-11-05T23:30:00Z"}')
            self.assertEqual(check(path, now, 45)["status"], "current")
            path.write_text('{"updated_at":"2026-11-05T23:00:00Z"}')
            self.assertEqual(check(path, now, 45)["status"], "stale")
            path.write_text('{"updatedAt":"2026-11-05T23:30:00Z","items":[],"error":null}')
            self.assertEqual(check(path, now, 45)["status"], "current")
            path.write_text('{"updatedAt":"2026-11-05T23:30:00Z","error":"provider timeout"}')
            self.assertEqual(check(path, now, 45)["status"], "error")
            path.write_text('{"other":"no timestamp"}')
            self.assertEqual(check(path, now, 45)["status"], "unknown")


    def test_threshold_boundary_and_future_timestamp(self):
        now = dt.datetime(2026, 11, 6, tzinfo=UTC)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "feed.json"
            path.write_text('{"updatedAt":"2026-11-05T23:15:00Z","error":null}')
            self.assertEqual(check(path, now, 45)["status"], "current")
            path.write_text('{"updatedAt":"2026-11-05T23:14:59Z","error":null}')
            self.assertEqual(check(path, now, 45)["status"], "stale")
            path.write_text('{"updatedAt":"2026-11-06T00:10:00Z","error":null}')
            self.assertEqual(check(path, now, 45)["status"], "unknown")
            path.write_text('{"updatedAt":"2026-11-06T00:00:00","error":null}')
            self.assertEqual(check(path, now, 45)["status"], "unknown")

if __name__ == "__main__":
    unittest.main()
