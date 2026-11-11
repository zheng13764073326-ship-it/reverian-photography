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
