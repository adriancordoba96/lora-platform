const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const { InfluxDB } = require('@influxdata/influxdb-client');
const nodemailer = require('nodemailer');
let twilio;
try {
  twilio = require('twilio');
} catch (err) {
  console.warn('⚠️  Twilio module not installed, WhatsApp alerts disabled');
  twilio = null;
}
let geolib;
try {
  geolib = require('geolib');
} catch (err) {
  console.warn('⚠️  geolib module not installed, using fallback distance calc');
  geolib = null;
}

// Twilio credentials are now configured directly in code instead of
// relying on environment variables.
const TWILIO_SID = 'your_twilio_sid';
const TWILIO_TOKEN = 'your_twilio_token';
const TWILIO_FROM = 'whatsapp:+1234567890';

// Twilio credentials are now configured directly in code instead of
// relying on environment variables.
const TWILIO_SID = 'your_twilio_sid';
const TWILIO_TOKEN = 'your_twilio_token';
const TWILIO_FROM = 'whatsapp:+1234567890';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'cordobadrian1996@gmail.com',
    pass: 'wevjahijowhlmysq'
  }
});

const app = express();
const port = 3010;
const SECRET = 'changeme_por_algo_fuerte';

app.use(cors());
app.use(express.json());

const nodeZoneStatus = {};

function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceBetween(a, b) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distanceToSegment(p, a, b) {
  const x0 = p.longitude, y0 = p.latitude;
  const x1 = a.longitude, y1 = a.latitude;
  const x2 = b.longitude, y2 = b.latitude;
  const A = x0 - x1;
  const B = y0 - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  return distanceBetween(p, { latitude: yy, longitude: xx });
}

function distanceToPolygon(point, polygon) {
  const p = { latitude: point[1], longitude: point[0] };
  if (geolib && geolib.getDistanceFromLine) {
    let min = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const a = { latitude: polygon[i][1], longitude: polygon[i][0] };
      const b = { latitude: polygon[(i + 1) % polygon.length][1], longitude: polygon[(i + 1) % polygon.length][0] };
      const d = geolib.getDistanceFromLine(p, a, b);
      if (d < min) min = d;
    }
    return min;
  } else {
    let min = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const a = { latitude: polygon[i][1], longitude: polygon[i][0] };
      const b = { latitude: polygon[(i + 1) % polygon.length][1], longitude: polygon[(i + 1) % polygon.length][0] };
      const d = distanceToSegment(p, a, b);
      if (d < min) min = d;
    }
    return min;
  }
}

function sendAlerts(userId, message) {
  db.get('SELECT * FROM alert_settings WHERE user_id = ?', [userId], (err, row) => {
    if (err) return;
    if (row && row.email) {
      transporter.sendMail(
        { from: 'cordobadrian1996@gmail.com', to: row.email, subject: 'Alerta de zona', text: message },
        err => err && console.error('❌ Mail:', err)
      );
    }
    if (row && row.telegram_token && row.telegram_chat_id) {
      const url = `https://api.telegram.org/bot${row.telegram_token}/sendMessage`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: row.telegram_chat_id, text: message })
      }).catch(e => console.error('❌ Telegram:', e));
    }

    // Use the hardcoded Twilio credentials defined at the top of the file.
    const sid = TWILIO_SID || (row && row.whatsapp_sid);
    const token = TWILIO_TOKEN || (row && row.whatsapp_token);
    const from = TWILIO_FROM || (row && row.whatsapp_from);

    if (twilio && sid && token && from) {
      db.get('SELECT phone FROM users WHERE id = ?', [userId], (pErr, uRow) => {
        if (pErr || !uRow || !uRow.phone) return;
        const to = `whatsapp:${uRow.phone}`;
        const client = twilio(sid, token);
        client.messages
          .create({ from: `whatsapp:${from}`, to, body: message })
          .catch(e => console.error('❌ WhatsApp:', e));
      });
    }
  });
}

// Conexión a SQLite
const db = new sqlite3.Database('lora.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    phone TEXT,
    verified INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    identifier TEXT,
    location TEXT,
    voltage REAL,
    current REAL,
    rssi REAL,
    state INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    layout TEXT,
    is_default INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    polygon TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS alert_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    telegram_token TEXT,
    telegram_chat_id TEXT,
    email TEXT,
    whatsapp_sid TEXT,
    whatsapp_token TEXT,
    whatsapp_from TEXT,
    whatsapp_to TEXT
)`);

// Ensure phone column exists for old databases
db.all('PRAGMA table_info(users)', (err, cols) => {
  if (err) {
    console.error('❌ Error checking users schema:', err);
    return;
  }
  const names = cols.map(c => c.name);
  if (!names.includes('phone')) {
    db.run('ALTER TABLE users ADD COLUMN phone TEXT', err => {
      if (err && !/duplicate/.test(err.message)) {
        console.error('❌ Error adding phone column:', err);
      }
    });
  }
});

// Ensure newer columns exist for older databases
db.all('PRAGMA table_info(nodes)', (err, cols) => {
  if (err) {
    console.error('❌ Error checking table schema:', err);
    return;
  }
  const names = cols.map(c => c.name);
  if (!names.includes('rssi')) {
    db.run('ALTER TABLE nodes ADD COLUMN rssi REAL', err => {
      if (err && !/duplicate/.test(err.message)) {
        console.error('❌ Error adding rssi column:', err);
      }
    });
  }
  if (!names.includes('state')) {
    db.run('ALTER TABLE nodes ADD COLUMN state INTEGER DEFAULT 0', err => {
      if (err && !/duplicate/.test(err.message)) {
        console.error('❌ Error adding state column:', err);
      }
    });
  }
});

// Migration: ensure dashboards table exists and has required columns
db.all('PRAGMA table_info(dashboards)', (err, cols) => {
  if (err) {
    console.error('❌ Error checking dashboards schema:', err);
    return;
  }
  const names = cols.map(c => c.name);
  if (!names.includes('layout')) {
    db.run('ALTER TABLE dashboards ADD COLUMN layout TEXT', err => {
      if (err && !/duplicate/.test(err.message)) {
        console.error('❌ Error adding layout column:', err);
      }
    });
  }
  if (!names.includes('is_default')) {
    db.run('ALTER TABLE dashboards ADD COLUMN is_default INTEGER DEFAULT 0', err => {
      if (err && !/duplicate/.test(err.message)) {
        console.error('❌ Error adding is_default column:', err);
      }
    });
  }
});

// Middleware JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// InfluxDB setup
const influx = new InfluxDB({ url: 'http://localhost:8086', token: 'TOKEN_AQUI' });
const queryApi = influx.getQueryApi('iot');

// MQTT client
const mqttClient = mqtt.connect('mqtt://localhost');

// Routers
const authRouter = require('./routes/auth')(db, transporter, SECRET);
const nodesRouter = require('./routes/nodes')(db, authenticateToken, mqttClient, queryApi);
const dashboardsRouter = require('./routes/dashboards')(db, authenticateToken);
const zonesRouter = require('./routes/zones')(db, authenticateToken);
const alertsRouter = require('./routes/alerts')(db, authenticateToken);

app.use('/', authRouter);
app.use('/nodes', nodesRouter);
app.use('/dashboards', dashboardsRouter);
app.use('/zones', zonesRouter);
app.use('/alert-settings', alertsRouter);

// MQTT listener para nodos/IDENTIFIER/data

mqttClient.on('connect', () => {
    console.log('✅ Conectado a MQTT');
    mqttClient.subscribe('nodos/+/data', (err) => {
        if (err) console.error('❌ Error al suscribirse:', err);
        else console.log('📡 Suscrito a nodos/+/data');
    });
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const parts = topic.split('/');
    const identifier = parts[1];
    const { voltage, current, rssi } = data;

    db.run(
      `UPDATE nodes SET voltage = ?, current = ?, rssi = ? WHERE identifier = ?`,
      [voltage, current, rssi, identifier],
      (err) => {
        if (err) {
          console.error('❌ Error al actualizar nodo:', err);
        } else {
          console.log(`✅ ${identifier}: V=${voltage}, A=${current}`);

          // 🧠 AÑADE ESTA PARTE DENTRO DEL BLOQUE 'else'
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                msg: 'Nodo actualizado',
                identifier,
                voltage,
                current,
                rssi
              }));
            }
          });

          db.get('SELECT user_id, location FROM nodes WHERE identifier = ?', [identifier], (nErr, nodeRow) => {
            if (nErr || !nodeRow || !nodeRow.location) return;
            const coords = nodeRow.location.split(',').map(Number);
            if (coords.length !== 2 || coords.some(isNaN)) return;
            db.all('SELECT name, polygon FROM zones WHERE user_id = ?', [nodeRow.user_id], (zErr, zRows) => {
              if (zErr || !zRows.length) return;

              let insideName = null;
              let nearest = { dist: Infinity, name: null };

              zRows.forEach(z => {
                const poly = JSON.parse(z.polygon);
                if (pointInPolygon(coords, poly)) {
                  insideName = z.name;
                }
                const d = distanceToPolygon(coords, poly);
                if (d < nearest.dist) {
                  nearest = { dist: d, name: z.name };
                }
              });

              const status = nodeZoneStatus[identifier] || { inside: true, count: 0, zone: nearest.name };

              if (insideName) {
                if (!status.inside) {
                  sendAlerts(nodeRow.user_id, `Nodo ${identifier} ha entrado en el perímetro "${insideName}"`);
                }
                status.inside = true;
                status.count = 0;
                status.zone = insideName;
              } else {
                if (nearest.dist > 5) {
                  status.count = (status.count || 0) + 1;
                } else {
                  status.count = 0;
                }

                if (status.inside && status.count > 3) {
                  const zoneName = status.zone || nearest.name || 'zona';
                  sendAlerts(nodeRow.user_id, `Nodo ${identifier} ha salido del perímetro "${zoneName}"`);
                  status.inside = false;
                  status.count = 0;
                  status.zone = zoneName;
                }
              }

              nodeZoneStatus[identifier] = status;
            });
          });
        }
      }
    );
  } catch (err) {
    console.error('❌ Error procesando MQTT:', err);
  }
});


// WebSocket para conexión en tiempo real (ampliable)
const server = app.listen(port, () => {
    console.log(`🌐 Backend escuchando en http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
    console.log('💬 Cliente WebSocket conectado');
    ws.send(JSON.stringify({ msg: 'Conectado a tiempo real' }));
});
