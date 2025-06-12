# Project Overview

This repository contains a LoRa node management platform composed of a **Node.js** backend and a **Vue 3** frontend.

- **Backend** (`/backend`)
  - Express server with SQLite storage
  - MQTT listener for node data
  - REST API for nodes, dashboards, zones and alert settings
  - WebSocket server for real‑time updates
  - Optional integrations: InfluxDB, email via Gmail and WhatsApp via Twilio
- **Frontend** (`/frontend`)
  - Vite + Vue 3 application with Vuetify
  - Components to manage nodes on a map, dashboards and user settings
  - Communicates with the backend via REST and WebSocket

The backend is started on port **3010** and exposes WebSocket events on the same port. The frontend uses Axios to talk to the API and Leaflet to display nodes and zones on a map.
