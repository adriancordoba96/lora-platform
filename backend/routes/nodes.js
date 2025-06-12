const express = require('express');

module.exports = function(db, authenticateToken, mqttClient, queryApi) {
  const router = express.Router();

  // Create node
  router.post('/create', authenticateToken, (req, res) => {
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

  // Get user nodes
  router.get('/', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM nodes WHERE user_id = ?`, [req.user.id], (err, rows) => {
      res.send(rows);
    });
  });

  // Update node data
  router.post('/updateData', authenticateToken, (req, res) => {
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

  // Change node state
  router.post('/:identifier/state', authenticateToken, (req, res) => {
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

  // Node history from InfluxDB
  router.get('/:identifier', authenticateToken, (req, res) => {
    const { identifier } = req.params;
    const flux = `from(bucket: "mi-bucket") |> range(start: -1h) |> filter(fn: (r) => r["_measurement"] == "${identifier}")`;
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

  return router;
};
