# Lora Platform

This repository hosts a simple IoT platform to manage LoRa nodes.  It is split into two main folders:

- `backend` – an Express server storing data in SQLite and exposing a REST API
- `frontend` – a Vue 3 application (built with Vite and Vuetify) that consumes the API

Both parts require **Node.js 18+**.

## Backend

The backend listens on port **3010**.  Start it with the included script so `index.js` is used as the entry point:

```bash
cd backend
npm install
npm start
```

The server supports MQTT ingestion, WebSocket notifications and optional integrations with InfluxDB, email and WhatsApp.  Credentials for these services are defined at the top of `backend/index.js` and should be adjusted before deployment.  Edit the `TWILIO_*` constants, the Gmail `transporter` credentials and the InfluxDB token as needed.

## Frontend

Launch the web client with Vite:

```bash
cd frontend
npm install
npm run dev
```

By default the frontend assumes the backend is reachable at `http://3.66.72.52:3010`.  Update `src/plugins/axios.js` and `src/services/api.js` if your API runs elsewhere.  A WebSocket connection is opened to the same host to receive live node updates.

## Additional notes

Running the project will create a local `lora.db` SQLite database.  The `docs/overview.md` file contains a short summary of the architecture.

## Node simulation

The `scripts/simulate_node.js` file can publish fake sensor data to the MQTT
broker every 30&nbsp;seconds.  It sends voltage, current, RSSI and a `location`
string (`"lat,lng"`).  By default the script uses a small square as zone but you
can provide your own polygon via the `ZONE_POLYGON` environment variable (path
to a JSON file containing an array of `[lat, lng]` pairs).

Example usage:

```bash
node scripts/simulate_node.js \
  MQTT_TOPIC="nodos/demo/data" \
  MQTT_BROKER="mqtt://localhost:1883" \
  ZONE_POLYGON=./myZone.json
```

The simulated node mostly stays inside the zone but occasionally leaves it for a
couple of minutes so that alert notifications can be tested.
