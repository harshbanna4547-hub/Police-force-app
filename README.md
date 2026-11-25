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
4. On each client, open `http://<GR-PC-IP>:5050` and log in with the displayed Chittorgarh demo credentials. To connect that device to the shared office data, enter the Office Access Key in the sidebar's **Connect to GR Server** field. The API URL is auto-detected from the browser hostname; no IP setting is needed.

The server binds to `0.0.0.0` for LAN access, but all district-data API requests require the generated bearer key and the API is restricted to Chittorgarh. `/api/health` is public and returns service status only. Keep the server off public/untrusted networks; this HTTP setup is intended for a trusted office LAN.

When the server is unreachable, the app continues using the device's IndexedDB and retries LAN sync periodically. The login-page credentials (`admin` / `123456`) first open a separate demo store; the office access key is still required to authorize shared district data.

## OneDrive database and Storage sync

The office server can keep district databases and Excel/PDF files in the account owner's OneDrive. Microsoft credentials stay on the server; browsers never receive the client secret or refresh token.

1. Register a confidential Microsoft Entra application and add the delegated Microsoft Graph permission `Files.ReadWrite.All`. Add the exact HTTPS redirect URI `https://<server-host>/api/onedrive/auth-callback`. Microsoft only permits an HTTP redirect for localhost; if using `http://localhost:5050/api/onedrive/auth-callback`, perform the one-time authorization from the office-server PC itself.
2. Create a root `.env` file on the server with:

   ```text
   ONEDRIVE_CLIENT_ID=<application-client-id>
   ONEDRIVE_CLIENT_SECRET=<application-client-secret>
   ONEDRIVE_REDIRECT_URI=https://<server-host>/api/onedrive/auth-callback
   ONEDRIVE_TENANT_ID=common
   # Optional initial token; rotated tokens are stored in server/data/onedrive.refresh.token.
   ONEDRIVE_REFRESH_TOKEN=<refresh-token>
   ```

   Keep this file private. `.env` and the generated refresh-token file are ignored by Git.
3. Start the server, then make the one-time authorization request from an authorized computer:

   ```text
   curl.exe -X POST https://<server-host>/api/onedrive/auth-init -H "Authorization: Bearer <Office Access Key>"
   ```

   Open the returned `authorizationUrl`, sign into the intended OneDrive account once, and approve access. Microsoft redirects to the configured callback; the server stores and rotates the refresh token locally and refreshes access tokens without further Microsoft sign-in prompts. The generated token file takes precedence over `ONEDRIVE_REFRESH_TOKEN`; remove that file only when intentionally reconnecting the account.
4. On each authorized PC or mobile browser, enter the server's **Office Access Key** once under **OneDrive sync कनेक्ट करें** in the sidebar. This authorizes that browser to use the office server; it is not a Microsoft sign-in. The app then loads and syncs district data automatically, keeps edits in IndexedDB while offline, and uploads them when connectivity returns.

Database files are stored under `/PoliceForcePortal/<DISTRICT>/<DISTRICT>_db.json`; supported Excel/CSV/PDF Storage Vault files are synced under `/PoliceForcePortal/<DISTRICT>/Storage/`. The current office server is intended for a trusted private LAN and rejects non-private browser origins. Do not expose it directly to the public internet; remote access requires HTTPS and an appropriately authenticated deployment or gateway.
