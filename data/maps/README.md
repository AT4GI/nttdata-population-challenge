# Prefecture map data

`prefecture-map-data.js` contains simplified prefecture outlines and representative
points for the municipality cards. It is generated from the Ministry of Land,
Infrastructure, Transport and Tourism's National Land Numerical Information
administrative-area dataset (N03), dated January 1, 2026.

- Source: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html
- Dataset: `N03-20260101_GML.zip`
- Coordinate system: Japan Geodetic Datum / geographic coordinates

The original nationwide dataset is intentionally not stored in this repository.
Only the card-sized, simplified paths and representative points are committed.

To regenerate the module, use Mapshaper to dissolve the source Shapefile into
prefecture outlines and municipality interior points, then run:

```sh
node scripts/generate-prefecture-map-data.mjs \
  /path/to/prefecture-outlines.geojson \
  /path/to/municipality-points.geojson \
  data/municipalities/municipalities.js \
  data/maps/prefecture-map-data.js
```

When publishing or redistributing the generated data, follow the source site's
terms of use and retain the source attribution above.
