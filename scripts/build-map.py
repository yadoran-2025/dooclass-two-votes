"""MIT 공개 선거구 경계를 독립 실행 가능한 SVG 경로 데이터로 변환한다."""
import json
import math
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REVISION = 'a51784b86e1fa58cc7691e533da1e72589b35b31'
BASE = f'https://raw.githubusercontent.com/OhmyNews/2024_22_elec_map/{REVISION}/'
raw = urllib.request.urlopen(BASE + '2024_22_Elec_simplify.json', timeout=30).read()
features = json.loads(raw)['features']
districts = json.loads(re.search(r'const DISTRICTS = (\[.*\]);', (ROOT / 'districts.js').read_text()).group(1))

def short(province):
    name = re.sub(r'특별자치도|특별자치시|특별시|광역시|도$', '', province)
    return {'전라남': '전남', '경상남': '경남', '경상북': '경북', '충청남': '충남', '충청북': '충북'}.get(name, name)

def key(province, name):
    return short(province), re.sub(r'[시군구\s]', '', name.replace('특별자치', ''))

lookup = {key(p, n): i for i, (p, n) in enumerate(districts)}
assert len(lookup) == 254
paths = [None] * 254
all_points = []
for f in features:
    p = f['properties']
    i = lookup[key(p['SIDO'], p['SGG'])]
    assert paths[i] is None, f'중복 매핑: {p}'
    geometry = f['geometry']
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    projected = []
    commands = []
    for polygon in polygons:
        for ring in polygon:
            points = []
            for lon, lat, *_ in ring:
                # Web Mercator를 정규화한다. 지적 측량이 아닌 수업용 경계 그림이다.
                x = (lon - 124) * 150
                y = (math.log(math.tan(math.pi / 4 + math.radians(39) / 2)) - math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))) * 180 / math.pi * 150
                assert math.isfinite(x) and math.isfinite(y)
                points.append([round(x, 2), round(y, 2)])
            projected.extend(points)
            commands.append('M' + ' '.join(f'{x},{y}' for x, y in points) + 'Z')
    xs, ys = zip(*projected)
    paths[i] = {'code': p['SGG_Code'], 'name': ' '.join(districts[i]), 'd': ''.join(commands), 'bounds': [min(xs), min(ys), max(xs), max(ys)]}
    all_points.extend(projected)
assert len(features) == 254 and all(paths)
xs, ys = zip(*all_points)
data = {'source': 'https://github.com/OhmyNews/2024_22_elec_map', 'revision': REVISION,
        'bounds': [min(xs)-15, min(ys)-15, max(xs)+15, max(ys)+15], 'districts': paths}
(ROOT / 'map-data.js').write_text('/* © 2024 오마이뉴스 · MIT · assets/election-map-LICENSE.txt */\nconst DISTRICT_MAP = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\nif(typeof module!=="undefined") module.exports=DISTRICT_MAP;\n')
(ROOT / 'assets' / 'election-map-LICENSE.txt').write_bytes(urllib.request.urlopen(BASE + 'LICENSE', timeout=30).read())
print(f'실제 선거구 254개를 선관위 명칭에 일대일 매핑: map-data.js {(ROOT / "map-data.js").stat().st_size:,} bytes')
