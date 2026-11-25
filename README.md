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

1. Install Node.js LTS on the GR PC.
2. Double-click `START_OFFICE_SERVER.bat`. It installs dependencies if missing, builds the frontend, and serves the app and API on port `5050`. On first startup, copy the generated **Office Access Key** from the server console. The key is saved locally in `server/data/office_access.token`; do not share it outside authorized office devices.
3. Keep the GR PC and authorized devices on the trusted office LAN. If Windows Firewall prompts, allow access only on the Private network.
4. On each authorized client, open `http://<GR-PC-IP>:5050` and log in with the displayed Chittorgarh demo credentials. A browser must already have the Office Access Key saved to use shared office data; the removed sidebar key form no longer provisions new browsers.

The server binds to `0.0.0.0` for LAN access, but all district-data API requests require the generated bearer key and the API is restricted to Chittorgarh. `/api/health` is public and returns service status only. Keep the server off public/untrusted networks; this HTTP setup is intended for a trusted office LAN.

When the server is unreachable, the app continues using the device's IndexedDB and retries LAN sync periodically. The login-page credentials (`admin` / `123456`) first open a separate demo store; the office access key is still required to authorize shared district data.

## OneDrive database and Storage sync

The Vercel serverless API syncs district data and Excel/PDF files to the OneDrive account configured by the administrator. Microsoft credentials stay server-side; the browser does not use MSAL or receive Microsoft tokens.

1. Register a confidential Microsoft Entra application with delegated Microsoft Graph `Files.ReadWrite.All` permission. A trusted administrator can obtain the initial refresh token through the existing protected office-server `/api/onedrive/auth-init` flow and copy `server/data/onedrive.refresh.token` securely into Vercel. This is a one-time administrator setup; end-user browsers do not open Microsoft login. Do not put credentials in any `VITE_` variable.
2. In Vercel project settings, configure these server-only environment variables:
   - `ONEDRIVE_CLIENT_ID`
   - `ONEDRIVE_CLIENT_SECRET`
   - `ONEDRIVE_REFRESH_TOKEN`
   - `OFFICE_SERVER_TOKEN` (the existing Office Access Key, at least 32 characters)
3. Deploy the project. Vercel serves `api/onedrive-sync.js` at `/api/onedrive-sync`. The API requires the Office Access Key as a bearer token. Existing browsers that already saved this key continue to sync silently; a new browser must be provisioned by an administrator before it can call the API. Do not embed the key in frontend environment variables or public source.
4. The app reads and writes `/PoliceForcePortal/<DISTRICT>_master_db.json`; Storage Vault files are listed under `/PoliceForcePortal/<DISTRICT>/Storage/`. Offline edits are also backed up in IndexedDB and queued under `/PoliceForcePortal/<DISTRICT>/Storage/Backup/`, then synchronized when the browser comes online and during the 20-second polling cycle. The serverless function has a 4 MB transfer limit per request/response, so larger files need a separate large-file upload workflow.

The shared module export control offers styled Excel (`DevLys 010` / `Times New Roman`), Word, PDF download, and Print actions. PDF generation runs in the browser.

Vercel's `/tmp` cache is ephemeral, so rotated refresh tokens are not durable across cold starts. If Microsoft invalidates the configured refresh token, an administrator must update `ONEDRIVE_REFRESH_TOKEN` in Vercel; durable token rotation needs a persistent secret store.

The existing Office LAN server remains available for trusted private-network use. Its local OneDrive database path is retained for compatibility with the LAN API.

## Development Services

The sidebar's Development Services panel reports GitHub, deployment reachability, Azure credential configuration, OneDrive sync status, and active devices. Configure `VITE_PORTAL_URL` to display a known production URL when the deployment is not running on a `*.vercel.app` hostname. The backend reports only whether Microsoft credentials are configured; Client Secrets and Refresh Tokens must remain in server-side environment variables and are never exposed in the browser. Account email and the current device name are optional browser-local references.
