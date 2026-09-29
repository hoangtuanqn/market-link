"""Run: python3 -m unittest scripts/geo/test_build_geo_migration.py"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import build_geo_migration as geo  # noqa: E402


class CleanStreetTest(unittest.TestCase):
    def test_drops_a_redundant_road_prefix_before_a_name(self):
        self.assertEqual(geo.clean_street('Đường Lê Lợi'), 'Lê Lợi')

    def test_keeps_the_prefix_when_it_belongs_to_the_name(self):
        self.assertEqual(geo.clean_street('Đường Số 12'), 'Đường số 12')
        self.assertEqual(geo.clean_street('Đường D1'), 'Đường D1')
        self.assertEqual(geo.clean_street('Đường tỉnh 749A'), 'Đường tỉnh 749A')
        self.assertEqual(geo.clean_street('Đường huyện 507'), 'Đường huyện 507')
        self.assertEqual(geo.clean_street('Đường số P8'), 'Đường số P8')
        self.assertEqual(geo.clean_street('Đường liên ấp 2-3'), 'Đường liên ấp 2-3')

    def test_capitalises_a_name_osm_wrote_in_lower_case(self):
        self.assertEqual(geo.clean_street('số 4-IV'), 'Đường số 4-IV')
        self.assertEqual(geo.clean_street('bình nhâm 42'), 'Bình nhâm 42')

    def test_keeps_streets_named_after_a_wharf(self):
        self.assertEqual(geo.clean_street('Bến Vân Đồn'), 'Bến Vân Đồn')
        self.assertEqual(geo.clean_street('Bến Chương Dương'), 'Bến Chương Dương')

    def test_drops_alleys_bridges_and_roundabouts(self):
        for raw in ['Hẻm 12 Lê Lợi', 'Cầu Sài Gòn', 'Vòng xoay Dân Chủ', 'Bến xe Miền Đông', 'Bến phà Bình Khánh']:
            self.assertIsNone(geo.clean_street(raw), raw)


class ReadStreetsTest(unittest.TestCase):
    def test_reads_overpass_csv_quoting(self):
        with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write('Lê Lợi\n"Đường số 5, KP.7"\n\n')
            path = f.name
        try:
            self.assertEqual(geo.read_street_names(path), ['Lê Lợi', 'Đường số 5, KP.7'])
        finally:
            os.unlink(path)


class StreetsFromTest(unittest.TestCase):
    def test_keeps_one_spelling_per_folded_name(self):
        names = geo.streets_from(['Bình Giã', 'Bình Giã', 'Bĩnh Giã', 'Đường 12', 'Đướng 12'])
        self.assertEqual(names, ['Bình Giã', 'Đường 12'])

    def test_treats_x_and_duong_x_as_one_street(self):
        self.assertEqual(geo.streets_from(['Đường D1', 'D1', 'Đường D1']), ['Đường D1'])


if __name__ == '__main__':
    unittest.main()
