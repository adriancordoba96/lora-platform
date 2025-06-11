# Lora Platform

This project contains a frontend built with Vue 3 and a backend written in Node.js.

## Backend

Make sure to run the backend using the provided start script so that the correct entry point (`index.js`) is used:

```bash
cd backend
npm install
npm start
```

The server will run even if optional packages like `twilio` or `geolib` are not installed, though WhatsApp alerts and distance calculations will use fallback implementations. To avoid warnings install all dependencies with `npm install`.

The backend exposes routes such as `/zones` which are required by the frontend.

## Frontend

The frontend can be started with Vite:

```bash
cd frontend
npm install
npm run dev
```

By default, the frontend Axios instance points to `http://3.66.72.52:3010`. Adjust this in `src/plugins/axios.js` if your backend runs elsewhere.
