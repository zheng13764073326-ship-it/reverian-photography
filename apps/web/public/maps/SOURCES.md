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
