const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const { InfluxDB } = require('@influxdata/influxdb-client');
const nodemailer = require('nodemailer');

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

// Conexión a SQLite
const db = new sqlite3.Database('lora.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    verified INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    identifier TEXT,
    location TEXT,
    voltage REAL,
    current REAL
)`);

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
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).send({ error: 'Campos incompletos' });
  }

  db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, email], (err, existingUser) => {
    if (err) return res.status(500).send({ error: 'Error al comprobar usuario' });
    if (existingUser) return res.status(400).send({ error: 'Usuario o correo ya existe' });

    const hash = bcrypt.hashSync(password, 10);

    db.run(
      `INSERT INTO users (username, email, password, verified) VALUES (?, ?, ?, ?)`,
      [username, email, hash, 0],
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
    res.send({ token });
});

});

// Crear nodo
app.post('/nodes/create', authenticateToken, (req, res) => {
    const { name, location, identifier, voltage, current } = req.body;
    db.run(
        `INSERT INTO nodes (user_id, name, location, identifier, voltage, current)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, name, location || null, identifier || null, voltage || null, current || null],
        function (err) {
            if (err) return res.status(500).send({ error: 'Error al insertar nodo' });
            res.send({
                id: this.lastID,
                name,
                location,
                identifier,
                voltage,
                current
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
    const { nodeId, voltage, current } = req.body;
    if (!nodeId || voltage == null || current == null) {
        return res.status(400).send({ error: 'Datos incompletos' });
    }

    db.run(
        `UPDATE nodes SET voltage = ?, current = ? WHERE id = ? AND user_id = ?`,
        [voltage, current, nodeId, req.user.id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: 'Error al guardar los datos' });
            }
            res.send({ message: 'Datos guardados correctamente' });
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
    const { voltage, current } = data;

    db.run(
      `UPDATE nodes SET voltage = ?, current = ? WHERE identifier = ?`,
      [voltage, current, identifier],
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
                current
              }));
            }
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