# Map source

China province geometry: Apache ECharts 4.9.0, `map/json/china.json`.
https://github.com/apache/echarts/blob/4.9.0/map/json/china.json

Licensed under Apache License 2.0. See LICENSE-echarts.txt and NOTICE-echarts.txt
in this directory. Original encoded geometry is retained at
scripts/data/china.echarts.json in the website repository.

Changes by Reverian Photography: decoded the geometry, applied an
equirectangular projection (35-degree standard parallel), rounded SVG path
coordinates to 0.1 units and applied the site's cream / gray palette.
The map is a city-level travel index, not a navigation or surveying product.

Rebuild with Node 24: `node scripts/build-footprint-map.mjs`.

## World country geometry

Apache ECharts 4.9.0, `map/json/world.json`.
https://github.com/apache/echarts/blob/4.9.0/map/json/world.json

Same Apache-2.0 license and notices as the China map above. Source retained at
scripts/data/world.echarts.json. SHA-256: 049b334579e5a42d5d16c72d014d380e048e39fc1504049f212acb589484d2fa.

Reverian changes: use a shared equirectangular projection with city markers;
omit Antarctica, round coordinates to 0.001 SVG units, and apply the existing
cream / gray style. Rebuild with `node scripts/build-world-map.mjs`.

## South China Sea inset

Island and surrounding coast geometry: Alibaba Cloud DataV.GeoAtlas,
https://datav.aliyun.com/portal/school/atlas/area_selector
Data endpoint: https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json
Retrieved 2026-11-26. Source SHA-256: 99adfeded5223848bbe37a0a12f8023e11ee12161c7800521c27db42fdeac275.

Only the five used features are retained, unmodified, in
scripts/data/south-china-sea.datav.json. These are a separate data source from
the Apache-licensed ECharts geometry; no ECharts license claim is made for them.
The inset uses a local equirectangular projection and clips the coastline to its
frame. The requested nine South China Sea dash polygons are those wholly south
of 22 degrees north; the separate segment east of Taiwan is not part of this inset.
The inset is schematic and does not change any travel marker coordinates.
Rebuild with the existing `node scripts/build-footprint-map.mjs` command.
