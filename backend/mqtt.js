// backend/mqtt.js

const mqtt = require('mqtt')
const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./db.sqlite')

// 🧠 Conexión al broker (ajusta si tienes otro)
const client = mqtt.connect('mqtt://localhost:1883') // o IP pública si es remoto

client.on('connect', () => {
  console.log('✅ Conectado a MQTT')

  // ✨ Suscripción genérica para todos los nodos
  client.subscribe('nodo/+/data', (err) => {
    if (err) console.error('❌ Error al suscribirse a MQTT:', err)
  })
})

client.on('message', (topic, message) => {
  try {
    const [, identifier] = topic.split('/') // nodo/IDENTIFIER/data
    const payload = JSON.parse(message.toString())
    const { voltage, current } = payload

    console.log(`📩 MQTT mensaje recibido de ${identifier}:`, voltage, current)

    db.run(
      `UPDATE nodes SET voltage = ?, current = ? WHERE identifier = ?`,
      [voltage, current, identifier],
      function (err) {
        if (err) return console.error('❌ SQLite error:', err.message)
        if (this.changes === 0) console.warn('⚠️ Nodo no encontrado:', identifier)
        else console.log('✅ Nodo actualizado:', identifier)
      }
    )
  } catch (err) {
    console.error('❌ Error procesando mensaje MQTT:', err)
  }
})
