"""Regression tests for genuine successful vessel collection timestamps."""
import datetime
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC=importlib.util.spec_from_file_location('collector',Path(__file__).resolve().parents[1]/'scripts'/'collect.py')
collector=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)

class VesselHealthTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  self.addCleanup(self.temp.cleanup)
  self.root=Path(self.temp.name)
  (self.root/'data').mkdir()
  self.patcher=patch.object(collector,'ROOT',self.root)
  self.patcher.start()
  self.addCleanup(self.patcher.stop)
 def read(self):
  return json.loads((self.root/'data'/'vessels.json').read_text())
 def test_failure_does_not_advance_success(self):
  now=datetime.datetime.now(datetime.timezone.utc)
  original=(now-datetime.timedelta(minutes=12)).isoformat()
  row={'kind':'ship','id':'123456789','reportedAt':original,'lat':1.2,'lon':103.8}
  (self.root/'data'/'vessels.json').write_text(json.dumps({'updatedAt':original,'items':[row],'error':None}))
  collector.merge_vessel_observations([],'handshake timeout')
  result=self.read()
  self.assertEqual(result['lastSuccessAt'],original)
  self.assertEqual(len(result['items']),1)
  self.assertEqual(result['error'],'handshake timeout')
 def test_expired_positions_are_removed(self):
  old=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(minutes=91)).isoformat()
  row={'kind':'ship','id':'123456789','reportedAt':old,'lat':1.2,'lon':103.8}
  (self.root/'data'/'vessels.json').write_text(json.dumps({'updatedAt':old,'lastSuccessAt':old,'items':[row],'error':None}))
  collector.merge_vessel_observations([],'handshake timeout')
  self.assertEqual(self.read()['items'],[])
  self.assertEqual(self.read()['lastSuccessAt'],old)
 def test_recovery_clears_error(self):
  now=datetime.datetime.now(datetime.timezone.utc).isoformat()
  row={'kind':'ship','id':'123456789','reportedAt':now,'lat':1.2,'lon':103.8}
  collector.merge_vessel_observations([row])
  result=self.read()
  self.assertIsNone(result['error'])
  self.assertEqual(len(result['items']),1)
  self.assertTrue(result['lastSuccessAt'])

if __name__=='__main__':unittest.main()
