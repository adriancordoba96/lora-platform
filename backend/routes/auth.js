const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = function(db, transporter, SECRET) {
  const router = express.Router();

  // Register
  router.post('/register', (req, res) => {
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
            }
            console.log('📨 Correo enviado:', info.response);
            res.send({ message: 'Usuario creado. Revisa tu correo para verificar la cuenta.' });
          });
        }
      );
    });
  });

  // Verify email
  router.get('/verify-email', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('Falta el token de verificación.');

    jwt.verify(token, SECRET, (err, decoded) => {
      if (err) return res.status(400).send('Token inválido o expirado.');
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
  router.post('/login', (req, res) => {
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

  // Recover password
  router.post('/api/recover', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Falta el correo electrónico' });

    db.get(`SELECT id, username FROM users WHERE email = ?`, [email], (err, user) => {
      if (err) return res.status(500).json({ error: 'Error interno' });
      if (!user) return res.json({ message: 'Si el correo existe, se enviará un enlace' });

      const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '15m' });
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const resetLink = `http://3.66.72.52:5173/reset?token=${token}`;
      db.run(
        `INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [user.id, token, expiresAt],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ error: 'Error al generar enlace' });

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

          transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
              console.error('❌ Error al enviar el correo:', mailErr);
              return res.status(500).json({ error: 'Error al enviar el correo' });
            }
            console.log('✅ Correo enviado:', info.response);
            res.json({ message: 'Correo de recuperación enviado si el email existe' });
          });
        }
      );
    });
  });

  // Reset password
  router.post('/api/reset', (req, res) => {
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

  return router;
};
