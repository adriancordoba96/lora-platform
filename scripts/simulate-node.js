const API_URL = process.env.API_URL || 'http://localhost:3010';
const TOKEN = process.env.TOKEN;
const IDENTIFIER = process.argv[2];

if (!IDENTIFIER) {
  console.error('Usage: node simulate-node.js <identifier>');
  process.exit(1);
}

if (!TOKEN) {
  console.error('Please provide an auth TOKEN env variable');
  process.exit(1);
}

async function api(method, path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: data ? JSON.stringify(data) : undefined
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function getPolygon() {
  const zones = await api('GET', '/zones');
  if (!zones.length) throw new Error('No zones available');
  return zones[0].polygon;
}

function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function bounds(poly) {
  let minLat = poly[0][0];
  let maxLat = poly[0][0];
  let minLng = poly[0][1];
  let maxLng = poly[0][1];
  for (const [lat, lng] of poly) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInside(poly) {
  const b = bounds(poly);
  let p;
  do {
    p = [rand(b.minLat, b.maxLat), rand(b.minLng, b.maxLng)];
  } while (!pointInPolygon(p, poly));
  return p;
}

function randomOutside(poly) {
  const b = bounds(poly);
  const margin = 0.01;
  const outer = {
    minLat: b.minLat - margin,
    maxLat: b.maxLat + margin,
    minLng: b.minLng - margin,
    maxLng: b.maxLng + margin
  };
  let p;
  do {
    p = [rand(outer.minLat, outer.maxLat), rand(outer.minLng, outer.maxLng)];
  } while (pointInPolygon(p, poly));
  return p;
}

async function updateLocation(coords) {
  const loc = `${coords[0]},${coords[1]}`;
  await api('POST', `/nodes/${IDENTIFIER}/location`, { location: loc });
}

(async () => {
  const poly = await getPolygon();
  let minute = 0;
  let outsideLeft = 0;

  const step = async () => {
    let p;
    if (outsideLeft > 0) {
      p = randomOutside(poly);
      outsideLeft--;
    } else {
      p = randomInside(poly);
      if ((minute + 1) % 5 === 0) {
        outsideLeft = 4;
      }
    }
    minute++;
    await updateLocation(p);
    console.log(`Moved to ${p[0]},${p[1]} ${outsideLeft > 0 ? '(outside)' : ''}`);
  };

  await step();
  setInterval(step, 60_000);
})();

