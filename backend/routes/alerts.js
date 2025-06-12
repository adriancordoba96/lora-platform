const express = require('express');

module.exports = function(db, authenticateToken) {
  const router = express.Router();

  // Get alert settings
  router.get('/', authenticateToken, (req, res) => {
    db.get('SELECT * FROM alert_settings WHERE user_id = ?', [req.user.id], (err, row) => {
      if (err) {
        console.error('❌ Error fetching alert settings:', err);
        return res.status(500).send({ error: 'Error al obtener configuracion' });
      }
      if (!row) return res.send({});
      res.send(row);
    });
  });

  // Create/update alert settings
  router.post('/', authenticateToken, (req, res) => {
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

  return router;
};
