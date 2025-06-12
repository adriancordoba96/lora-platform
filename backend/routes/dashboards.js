const express = require('express');

module.exports = function(db, authenticateToken) {
  const router = express.Router();

  // Get dashboards
  router.get('/', authenticateToken, (req, res) => {
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

  // Create or update dashboard
  router.post('/', authenticateToken, (req, res) => {
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

  return router;
};
