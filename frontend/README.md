# Lora Platform Frontend

This directory contains the Vue 3 client built with Vite and Vuetify.

## Development

Install the dependencies and start a development server:

```bash
npm install
npm run dev
```

The app expects the backend API to be available at `http://3.66.72.52:3010`.  Update `src/plugins/axios.js` and `src/services/api.js` to change the base URL.

## Build

To create a production build run:

```bash
npm run build
```

The static files will be generated in the `dist` directory.  You can preview the build with `npm run preview`.
