# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Office LAN server

The GR office PC can host the Chittorgarh data API on port `5050`:

1. Install Node.js LTS, then run `npm install` once in this project folder.
2. Double-click `START_OFFICE_SERVER.bat`. On first startup, copy the generated **Office Access Key** from the server console. The key is saved locally in `server/data/office_access.token`; do not share it outside authorized office devices.
3. Keep the GR PC and authorized devices on the trusted office LAN. If Windows Firewall prompts, allow access only on the Private network.
4. On each client, choose **Direct Office Login**, enter the GR PC URL (for example `http://192.168.1.10:5050`) and the Office Access Key.

The server binds to `0.0.0.0` for LAN access, but all district-data API requests require the generated bearer key and the API is restricted to Chittorgarh. `/api/health` is public and returns service status only. Keep the server off public/untrusted networks; this HTTP setup is intended for a trusted office LAN.

When the server is unreachable, the app continues using the device's IndexedDB and retries LAN sync periodically. The offline demo credentials (`admin` / `123456`) open a separate demo data store, never the office district database.
