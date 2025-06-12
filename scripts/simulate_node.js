const mqtt = require('mqtt');
const fs = require('fs');

const apiUrl = process.env.API_URL || 'http://localhost:3010';
const apiToken = process.env.API_TOKEN || null;

const brokerUrl = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const topic = process.env.MQTT_TOPIC || 'nodos/demo/data';
const polygonFile = process.env.ZONE_POLYGON || null;
const identifier = topic.split('/')[1];

let polygon = [
  [37.7749, -122.4194],
  [37.7758, -122.4194],
  [37.7758, -122.4178],
  [37.7749, -122.4178]
];
if (polygonFile) {
  try {
    const data = fs.readFileSync(polygonFile, 'utf8');
    polygon = JSON.parse(data);
  } catch (e) {
    console.error('Failed to load polygon from', polygonFile, e.message);
  }
}

async function loadPolygon() {
  if (!apiToken) return;
  try {
    const res = await fetch(`${apiUrl}/zones`, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    if (res.ok) {
      const zones = await res.json();
      if (zones && zones.length) {
        polygon = zones[0].polygon;
        console.log('Loaded polygon from API');
      } else {
        console.warn('No zones returned, using default polygon');
      }
    } else {
      console.warn('Failed to fetch zones:', res.status);
    }
  } catch (e) {
    console.error('Error fetching zones:', e.message);
  }
}

function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function bounds(poly) {
  const lats = poly.map(p => p[0]);
  const lngs = poly.map(p => p[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
}

function randomIn(min, max) {
  return Math.random() * (max - min) + min;
}

function randomPointInside(poly) {
  const b = bounds(poly);
  for (let i = 0; i < 100; i++) {
    const p = [randomIn(b.minLat, b.maxLat), randomIn(b.minLng, b.maxLng)];
    if (pointInPolygon(p, poly)) return p;
  }
  return [b.minLat, b.minLng];
}

function randomPointOutside(poly) {
  const b = bounds(poly);
  const latSpan = b.maxLat - b.minLat;
  const lngSpan = b.maxLng - b.minLng;
  for (let i = 0; i < 100; i++) {
    const p = [randomIn(b.minLat - latSpan, b.maxLat + latSpan),
               randomIn(b.minLng - lngSpan, b.maxLng + lngSpan)];
    if (!pointInPolygon(p, poly)) return p;
  }
  return [b.maxLat + latSpan, b.maxLng + lngSpan];
}

let outsideSteps = 0;

let client;

async function start() {
  await loadPolygon();
  client = mqtt.connect(brokerUrl);
  client.on('connect', () => {
    console.log('Connected to', brokerUrl);
    send();
    setInterval(send, 30000);
  });
}

start();

function send() {
  const voltage = randomIn(218, 235).toFixed(2);
  const current = randomIn(1, 5).toFixed(2);
  const rssi = (randomIn(-100, -50)).toFixed(0);
  if (outsideSteps > 0) outsideSteps--; else if (Math.random() < 0.1) outsideSteps = 4;
  const coords = outsideSteps > 0 ? randomPointOutside(polygon) : randomPointInside(polygon);
  const location = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
  const payload = { voltage, current, rssi, location };
  client.publish(topic, JSON.stringify(payload));
  console.log('Published', identifier, payload);
}
