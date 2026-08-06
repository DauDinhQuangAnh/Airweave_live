# District boundary GeoJSON placeholder

This folder is reserved for Vietnam administrative boundary GeoJSON files used
by the AirWeave hyper-local map.

Expected files (NOT YET PROVIDED — drop real data here):

- `hanoi-districts.geojson`  — Hà Nội district polygons (FeatureCollection)
- `hcmc-districts.geojson`   — TP.HCM district polygons (FeatureCollection)
- `hanoi-wards.geojson`      — (optional) ward-level polygons
- `hcmc-wards.geojson`       — (optional) ward-level polygons

Schema (GeoJSON FeatureCollection):

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Cầu Giấy", "code": "HN-CG" },
      "geometry": { "type": "Polygon", "coordinates": [[[lng,lat], ...]] }
    }
  ]
}
```

Until real boundaries are added, the map shows a curated list of district
center coordinates and labels overlays as **Estimated** rather than rendering
fake polygons.

Source suggestions (verify license before shipping):
- https://github.com/zhongdong-vn/vietnam-administrative-boundaries
- OpenStreetMap administrative relations exported via Overpass API
