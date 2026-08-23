import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const [outlinePath, pointPath, municipalitiesPath, outputPath] = process.argv.slice(2);

if (!outlinePath || !pointPath || !municipalitiesPath || !outputPath) {
  throw new Error(
    "Usage: node scripts/generate-prefecture-map-data.mjs <outlines.geojson> <points.geojson> <municipalities.js> <output.js>"
  );
}

const [outlines, points, municipalityModule] = await Promise.all([
  readJson(outlinePath),
  readJson(pointPath),
  import(pathToFileURL(municipalitiesPath).href)
]);

const WIDTH = 200;
const HEIGHT = 160;
const PADDING = 10;
const pointByCode = new Map(
  points.features.map((feature) => [feature.properties.N03_007, feature.geometry.coordinates])
);
const districtPoints = groupDistrictPoints(points.features);
const outlineByPrefecture = new Map(
  outlines.features.map((feature) => [feature.properties.pref, feature.geometry])
);
const prefectureMaps = {};
const municipalityPoints = {};
const missingCodes = [];

for (const [prefectureCode, geometry] of [...outlineByPrefecture].sort(([a], [b]) => a.localeCompare(b))) {
  const projector = createProjector(geometry);
  prefectureMaps[prefectureCode] = {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    path: geometryToPath(geometry, projector)
  };
}

for (const municipality of municipalityModule.MUNICIPALITIES) {
  const code = municipality.id.slice(0, 5);
  const prefectureCode = code.slice(0, 2);
  const outline = outlineByPrefecture.get(prefectureCode);
  if (!outline) {
    missingCodes.push(code);
    continue;
  }

  const coordinate = pointByCode.get(code)
    || getAggregatePoint(code, pointByCode)
    || averageCoordinates(districtPoints.get(`${municipality.prefecture}|${municipality.name}`));
  if (!coordinate) {
    missingCodes.push(code);
    continue;
  }

  const [x, y] = createProjector(outline)(coordinate);
  municipalityPoints[code] = [round(x), round(y)];
}

const uniqueMunicipalityCount = new Set(
  municipalityModule.MUNICIPALITIES.map((municipality) => municipality.id.slice(0, 5))
).size;
const source = `// Generated from the Ministry of Land, Infrastructure, Transport and Tourism N03 administrative-area data.\n` +
  `// Source: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html\n` +
  `export const PREFECTURE_MAPS = ${JSON.stringify(prefectureMaps)};\n\n` +
  `export const MUNICIPALITY_MAP_POINTS = ${JSON.stringify(municipalityPoints)};\n`;

await writeFile(outputPath, source);

console.log(`Prefectures: ${Object.keys(prefectureMaps).length}`);
console.log(`Municipality codes: ${Object.keys(municipalityPoints).length} / ${uniqueMunicipalityCount}`);
console.log(`Missing codes: ${[...new Set(missingCodes)].join(", ") || "none"}`);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getAggregatePoint(code, pointsByCode) {
  if (!code.endsWith("0")) return null;
  const wardPrefix = code.endsWith("00") ? code.slice(0, 3) : code.slice(0, 4);
  const wardPoints = [...pointsByCode]
    .filter(([candidateCode]) => candidateCode.startsWith(wardPrefix) && candidateCode !== code)
    .map(([, coordinate]) => coordinate);
  return averageCoordinates(wardPoints);
}

function groupDistrictPoints(features) {
  const grouped = new Map();
  for (const feature of features) {
    const district = feature.properties.N03_003;
    if (!district) continue;
    const key = `${feature.properties.N03_001}|${district}`;
    const coordinates = grouped.get(key) || [];
    coordinates.push(feature.geometry.coordinates);
    grouped.set(key, coordinates);
  }
  return grouped;
}

function averageCoordinates(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  return [
    coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / coordinates.length,
    coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length
  ];
}

function createProjector(geometry) {
  const coordinates = collectCoordinates(geometry.coordinates);
  const meanLatitude = coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length;
  const longitudeScale = Math.cos((meanLatitude * Math.PI) / 180);
  const projected = coordinates.map(([longitude, latitude]) => [longitude * longitudeScale, -latitude]);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min((WIDTH - PADDING * 2) / (maxX - minX), (HEIGHT - PADDING * 2) / (maxY - minY));
  const offsetX = (WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (HEIGHT - (maxY - minY) * scale) / 2;

  return ([longitude, latitude]) => [
    offsetX + (longitude * longitudeScale - minX) * scale,
    offsetY + (-latitude - minY) * scale
  ];
}

function geometryToPath(geometry, project) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring, project)))
    .join("");
}

function ringToPath(ring, project) {
  return ring
    .map((coordinate, index) => {
      const [x, y] = project(coordinate);
      return `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`;
    })
    .join("") + "Z";
}

function collectCoordinates(value) {
  if (typeof value[0] === "number") return [value];
  return value.flatMap(collectCoordinates);
}

function round(value) {
  return Math.round(value * 10) / 10;
}
