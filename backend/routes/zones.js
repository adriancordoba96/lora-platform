const express = require('express');

module.exports = function(db, authenticateToken) {
  const router = express.Router();

  // Get zones
  router.get('/', authenticateToken, (req, res) => {
    db.all('SELECT * FROM zones WHERE user_id = ?', [req.user.id], (err, rows) => {
      if (err) {
        console.error('❌ Error fetching zones:', err);
        return res.status(500).send({ error: 'Error al obtener zonas' });
      }
      const result = rows.map(r => ({ ...r, polygon: JSON.parse(r.polygon || '[]') }));
      res.send(result);
    });
  });

  // Create zone
  router.post('/', authenticateToken, (req, res) => {
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

  // Update zone
  router.put('/:id', authenticateToken, (req, res) => {
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

  // Delete zone
  router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM zones WHERE id = ? AND user_id = ?', [id, req.user.id], function (err) {
      if (err) {
        console.error('❌ Error deleting zone:', err);
        return res.status(500).send({ error: 'Error al eliminar zona' });
      }
      res.send({ message: 'Zona eliminada' });
    });
  });

  return router;
};
