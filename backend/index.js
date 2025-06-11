const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const { InfluxDB } = require('@influxdata/influxdb-client');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const geolib = require('geolib');

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

function distanceToPolygon(point, polygon) {
  const p = { latitude: point[1], longitude: point[0] };
  let min = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = { latitude: polygon[i][1], longitude: polygon[i][0] };
    const b = { latitude: polygon[(i + 1) % polygon.length][1], longitude: polygon[(i + 1) % polygon.length][0] };
    const d = geolib.getDistanceFromLine(p, a, b);
    if (d < min) min = d;
  }
  return min;
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

    if (sid && token && from) {
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
    db.run('ALTER TABLE users ADD COLUMN phone TEXT');
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
    db.run('ALTER TABLE nodes ADD COLUMN rssi REAL');
  }
  if (!names.includes('state')) {
    db.run('ALTER TABLE nodes ADD COLUMN state INTEGER DEFAULT 0');
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
    db.run('ALTER TABLE dashboards ADD COLUMN layout TEXT');
  }
  if (!names.includes('is_default')) {
    db.run('ALTER TABLE dashboards ADD COLUMN is_default INTEGER DEFAULT 0');
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

//registrar
app.post('/register', (req, res) => {
  const { username, password, email, phone } = req.body;
  if (!username || !password || !email || !phone) {
    return res.status(400).send({ error: 'Campos incompletos' });
  }

  db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, email], (err, existingUser) => {
    if (err) return res.status(500).send({ error: 'Error al comprobar usuario' });
    if (existingUser) return res.status(400).send({ error: 'Usuario o correo ya existe' });

    const hash = bcrypt.hashSync(password, 10);

    db.run(
      `INSERT INTO users (username, email, password, phone, verified) VALUES (?, ?, ?, ?, ?)`,
      [username, email, hash, phone, 0],
      function (err) {
        if (err) return res.status(500).send({ error: 'Error al crear usuario' });

        const userId = this.lastID;
        const verificationToken = jwt.sign({ id: userId }, SECRET, { expiresIn: '1d' });
        const verificationLink = `http://3.66.72.52:3010/verify-email?token=${verificationToken}`;

        const mailOptions = {
          from: 'cordobadrian1996@gmail.com',
          to: email,
          subject: 'Verifica tu cuenta',
          html: `
            <h3>¡Bienvenido, ${username}!</h3>
            <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
            <a href="${verificationLink}">Verificar mi cuenta</a>
          `
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('❌ Error al enviar el correo:', error);
            return res.status(500).send({ error: 'Error al enviar el correo de verificación' });
          } else {
            console.log('📨 Correo enviado:', info.response);
            return res.send({ message: 'Usuario creado. Revisa tu correo para verificar la cuenta.' });
          }
        });
      }
    );
  });
});


// ✅ Verificación de email
app.get('/verify-email', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Falta el token de verificación.');
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(400).send('Token inválido o expirado.');
    }

    const userId = decoded.id;

    db.run(`UPDATE users SET verified = 1 WHERE id = ?`, [userId], function (err) {
      if (err) {
        console.error('❌ Error al actualizar email_verified:', err);
        return res.status(500).send('Error al verificar el correo.');
      }

      res.send(`
        <h2>✅ Correo verificado correctamente</h2>
        <p>Ya puedes acceder a tu cuenta. <a href="http://localhost:5173/login">Iniciar sesión</a></p>
      `);
    });
  });
});
// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).send({ error: 'Credenciales incorrectas' });
    }

    if (user.verified !== 1) {
        return res.status(403).send({ error: 'Verifica tu correo electrónico antes de iniciar sesión.' });
    }

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' });
    res.send({ token, username: user.username });
});

});

// Crear nodo
app.post('/nodes/create', authenticateToken, (req, res) => {
    const { name, location, identifier, voltage, current, rssi, state } = req.body;
    db.run(
        `INSERT INTO nodes (user_id, name, location, identifier, voltage, current, rssi, state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, name, location || null, identifier || null, voltage || null, current || null, rssi || null, state || 0],
        function (err) {
            if (err) return res.status(500).send({ error: 'Error al insertar nodo' });
            res.send({
                id: this.lastID,
                name,
                location,
                identifier,
                voltage,
                current,
                rssi: rssi || null,
                state: state || 0
            });
        }
    );
});

// Obtener nodos del usuario
app.get('/nodes', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM nodes WHERE user_id = ?`, [req.user.id], (err, rows) => {
        res.send(rows);
    });
});

// Actualizar voltaje y corriente desde frontend
app.post('/nodes/updateData', authenticateToken, (req, res) => {
    const { nodeId, voltage, current, rssi } = req.body;
    if (!nodeId || voltage == null || current == null) {
        return res.status(400).send({ error: 'Datos incompletos' });
    }

    db.run(
        `UPDATE nodes SET voltage = ?, current = ?, rssi = ? WHERE id = ? AND user_id = ?`,
        [voltage, current, rssi, nodeId, req.user.id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: 'Error al guardar los datos' });
            }
            res.send({ message: 'Datos guardados correctamente' });
        }
    );
});

// Cambiar estado del nodo
app.post('/nodes/:identifier/state', authenticateToken, (req, res) => {
    const { identifier } = req.params;
    const { state } = req.body;
    db.run(
        `UPDATE nodes SET state = ? WHERE identifier = ? AND user_id = ?`,
        [state, identifier, req.user.id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: 'Error al actualizar estado' });
            }

            mqttClient.publish(`nodos/${identifier}/set`, JSON.stringify({ state }));
            res.send({ message: 'Estado actualizado' });
        }
    );
});

// Actualizar ubicacion del nodo
app.post('/nodes/:identifier/location', authenticateToken, (req, res) => {
    const { identifier } = req.params;
    const { location } = req.body;
    if (!location) {
        return res.status(400).send({ error: 'Falta la ubicacion' });
    }

    db.run(
        `UPDATE nodes SET location = ? WHERE identifier = ? AND user_id = ?`,
        [location, identifier, req.user.id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: 'Error al actualizar ubicacion' });
            }

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ msg: 'Nodo actualizado', identifier, location }));
                }
            });

            res.send({ message: 'Ubicacion actualizada' });
        }
    );
});

// Historial desde InfluxDB
const influx = new InfluxDB({ url: 'http://localhost:8086', token: 'TOKEN_AQUI' });
const queryApi = influx.getQueryApi('iot');

app.get('/nodes/:identifier', authenticateToken, (req, res) => {
    const { identifier } = req.params;
    const flux = `from(bucket: "mi-bucket")
        |> range(start: -1h)
        |> filter(fn: (r) => r["_measurement"] == "${identifier}")`;

    const results = [];
    queryApi.queryRows(flux, {
        next(row, tableMeta) {
            results.push(tableMeta.toObject(row));
        },
        complete() {
            res.send(results);
        },
        error(error) {
            res.status(500).send({ error: 'Error consultando InfluxDB' });
        }
    });
});

// MQTT listener para nodos/IDENTIFIER/data
const mqttClient = mqtt.connect('mqtt://localhost');

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
// Recupconst crypto = require('crypto');

app.post('/api/recover', (req, res) => {
  const { email } = req.body;
  console.log('📥 Petición recibida para recuperación:', req.body.email);

  if (!email) {
    return res.status(400).json({ error: 'Falta el correo electrónico' });
  }

  db.get(`SELECT id, username FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      console.error('❌ Error al buscar usuario:', err);
      return res.status(500).json({ error: 'Error interno' });
    }

    if (!user) {
      console.log('⚠️ Correo no encontrado:', email);
      return res.json({ message: 'Si el correo existe, se enviará un enlace' });
    }

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '15m' });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const resetLink = `http://3.66.72.52:5173/reset?token=${token}`;
    console.log('🔐 Generado token para:', email);
    console.log('🔗 Enlace generado:', resetLink);

    db.run(
      `INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [user.id, token, expiresAt],
      function (insertErr) {
        if (insertErr) {
          console.error('❌ Error insertando token:', insertErr);
          return res.status(500).json({ error: 'Error al generar enlace' });
        }

        const mailOptions = {
          from: 'cordobadrian1996@gmail.com',
          to: email,
          subject: 'Recuperación de contraseña',
          html: `
            <h3>Hola, ${user.username}</h3>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p><a href="${resetLink}">Haz clic aquí para restablecerla</a></p>
            <p>Este enlace expirará en 15 minutos.</p>
          `
        };

        console.log('📦 MailOptions:', mailOptions);
        console.log('📤 Intentando enviar correo de recuperación...');

        transporter.sendMail(mailOptions, (mailErr, info) => {
          if (mailErr) {
            console.error('❌ Error al enviar el correo:', mailErr);
            return res.status(500).json({ error: 'Error al enviar el correo' });
          } else {
            console.log('✅ Correo enviado:', info.response);
            return res.json({ message: 'Correo de recuperación enviado si el email existe' });
          }
        });
      }
    );
  });
});

app.post('/api/reset', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Datos incompletos' });

  db.get('SELECT * FROM reset_tokens WHERE token = ?', [token], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Token inválido' });

    const expires = new Date(row.expires_at);
    if (expires < new Date()) return res.status(400).json({ error: 'Token expirado' });

    const hash = bcrypt.hashSync(password, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hash, row.user_id], (err) => {
      if (err) return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });

  db.run('DELETE FROM reset_tokens WHERE id = ?', [row.id]);
      res.json({ message: 'Contraseña actualizada' });
    });
  });
});

// Obtener dashboards del usuario
app.get('/dashboards', authenticateToken, (req, res) => {
  db.all('SELECT * FROM dashboards WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching dashboards:', err);
      return res.status(500).send({ error: 'Error al obtener dashboards' });
    }
    const result = { default: null, layouts: {} };
    rows.forEach(r => {
      if (r.is_default) result.default = r.name;
      try {
        result.layouts[r.name] = JSON.parse(r.layout || '[]');
      } catch {
        result.layouts[r.name] = [];
      }
    });
    res.send(result);
  });
});

// Crear o actualizar dashboard
app.post('/dashboards', authenticateToken, (req, res) => {
  const { name, layout, isDefault } = req.body;
  if (!name || !Array.isArray(layout)) {
    return res.status(400).send({ error: 'Datos incompletos' });
  }

  const saveDashboard = () => {
    db.get('SELECT id FROM dashboards WHERE user_id = ? AND name = ?', [req.user.id, name], (err, row) => {
      if (err) {
        console.error('❌ Error searching dashboard:', err);
        return res.status(500).send({ error: 'Error al guardar dashboard' });
      }

      const layoutStr = JSON.stringify(layout);
      const flag = isDefault ? 1 : 0;

      if (row) {
        db.run('UPDATE dashboards SET layout = ?, is_default = ? WHERE id = ?', [layoutStr, flag, row.id], function (uErr) {
          if (uErr) {
            console.error('❌ Error updating dashboard:', uErr);
            return res.status(500).send({ error: 'Error al guardar dashboard' });
          }
          res.send({ message: 'Dashboard actualizado' });
        });
      } else {
        db.run('INSERT INTO dashboards (user_id, name, layout, is_default) VALUES (?, ?, ?, ?)', [req.user.id, name, layoutStr, flag], function (iErr) {
          if (iErr) {
            console.error('❌ Error inserting dashboard:', iErr);
            return res.status(500).send({ error: 'Error al guardar dashboard' });
          }
          res.send({ message: 'Dashboard creado', id: this.lastID });
        });
      }
    });
  };

  if (isDefault) {
    db.run('UPDATE dashboards SET is_default = 0 WHERE user_id = ?', [req.user.id], err => {
      if (err) {
        console.error('❌ Error clearing defaults:', err);
        return res.status(500).send({ error: 'Error al guardar dashboard' });
      }
      saveDashboard();
    });
  } else {
    saveDashboard();
  }
});

// Obtener zonas del usuario
app.get('/zones', authenticateToken, (req, res) => {
  db.all('SELECT * FROM zones WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching zones:', err);
      return res.status(500).send({ error: 'Error al obtener zonas' });
    }
    const result = rows.map(r => ({ ...r, polygon: JSON.parse(r.polygon || '[]') }));
    res.send(result);
  });
});

// Crear zona
app.post('/zones', authenticateToken, (req, res) => {
  const { name, polygon } = req.body;
  if (!name || !Array.isArray(polygon)) {
    return res.status(400).send({ error: 'Datos incompletos' });
  }
  db.run('INSERT INTO zones (user_id, name, polygon) VALUES (?, ?, ?)', [req.user.id, name, JSON.stringify(polygon)], function (err) {
    if (err) {
      console.error('❌ Error inserting zone:', err);
      return res.status(500).send({ error: 'Error al guardar zona' });
    }
    res.send({ id: this.lastID });
  });
});

// Actualizar zona
app.put('/zones/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, polygon } = req.body;
  db.run('UPDATE zones SET name = ?, polygon = ? WHERE id = ? AND user_id = ?', [name, JSON.stringify(polygon), id, req.user.id], function (err) {
    if (err) {
      console.error('❌ Error updating zone:', err);
      return res.status(500).send({ error: 'Error al actualizar zona' });
    }
    res.send({ message: 'Zona actualizada' });
  });
});

// Eliminar zona
app.delete('/zones/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM zones WHERE id = ? AND user_id = ?', [id, req.user.id], function (err) {
    if (err) {
      console.error('❌ Error deleting zone:', err);
      return res.status(500).send({ error: 'Error al eliminar zona' });
    }
    res.send({ message: 'Zona eliminada' });
  });
});

// Obtener configuración de alertas
app.get('/alert-settings', authenticateToken, (req, res) => {
  db.get('SELECT * FROM alert_settings WHERE user_id = ?', [req.user.id], (err, row) => {
    if (err) {
      console.error('❌ Error fetching alert settings:', err);
      return res.status(500).send({ error: 'Error al obtener configuracion' });
    }
    if (!row) return res.send({});
    res.send(row);
  });
});

// Crear/actualizar configuración de alertas
app.post('/alert-settings', authenticateToken, (req, res) => {
  const { telegram_token, telegram_chat_id, email, whatsapp_sid, whatsapp_token, whatsapp_from, whatsapp_to } = req.body;
  db.get('SELECT id FROM alert_settings WHERE user_id = ?', [req.user.id], (err, row) => {
    if (err) {
      console.error('❌ Error searching alert settings:', err);
      return res.status(500).send({ error: 'Error al guardar configuracion' });
    }
    const params = [telegram_token, telegram_chat_id, email, whatsapp_sid, whatsapp_token, whatsapp_from, whatsapp_to, req.user.id];
    if (row) {
      db.run('UPDATE alert_settings SET telegram_token=?, telegram_chat_id=?, email=?, whatsapp_sid=?, whatsapp_token=?, whatsapp_from=?, whatsapp_to=? WHERE user_id=?', params, function (uErr) {
        if (uErr) {
          console.error('❌ Error updating alert settings:', uErr);
          return res.status(500).send({ error: 'Error al guardar configuracion' });
        }
        res.send({ message: 'Configuracion actualizada' });
      });
    } else {
      db.run('INSERT INTO alert_settings (telegram_token, telegram_chat_id, email, whatsapp_sid, whatsapp_token, whatsapp_from, whatsapp_to, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', params, function (iErr) {
        if (iErr) {
          console.error('❌ Error inserting alert settings:', iErr);
          return res.status(500).send({ error: 'Error al guardar configuracion' });
        }
        res.send({ message: 'Configuracion guardada' });
      });
    }
  });
});
