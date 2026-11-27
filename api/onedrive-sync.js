import { Buffer } from "node:buffer";
import process from "node:process";
import { createOneDriveBackendBridge, matchesOneDriveAccessToken, normalizeOneDriveDistrict } from "../server/oneDriveBackendBridge.js";

const MAX_BODY_BYTES = 4_000_000;

function getRequestUrl(request) {
  const host = request.headers.host || "localhost";
  return new URL(request.url || "/", `http://${host}`);
}

function makeRequestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readRequestBuffer(request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (request.body instanceof Uint8Array) return Buffer.from(request.body);
  if (typeof request.body === "string") {
    const body = Buffer.from(request.body);
    if (body.byteLength > MAX_BODY_BYTES) throw makeRequestError("Request body exceeds the 4 MB serverless limit.", 413);
    return body;
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_BODY_BYTES) throw makeRequestError("Request body exceeds the 4 MB serverless limit.", 413);
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, totalBytes);
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    const serialized = JSON.stringify(request.body);
    if (Buffer.byteLength(serialized) > MAX_BODY_BYTES) {
      throw makeRequestError("Request body exceeds the 4 MB serverless limit.", 413);
    }
    return request.body;
  }
  const body = await readRequestBuffer(request);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw makeRequestError("Request body must contain valid JSON.");
  }
}

function getHeader(request, name) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function decodeFileName(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    throw makeRequestError("Storage filename is invalid.");
  }
}

export function createOneDriveSyncHandler({
  env = process.env,
  bridge = createOneDriveBackendBridge({
    env,
    refreshTokenFile: "/tmp/police-force-onedrive.refresh.token",
    databasePathForDistrict: (district) => `PoliceForcePortal/${district}_master_db.json`
  })
} = {}) {
  return async function oneDriveSyncHandler(request, response) {
    response.setHeader("Cache-Control", "no-store, private");
    response.setHeader("X-Content-Type-Options", "nosniff");

    if (request.method === "OPTIONS") {
      response.setHeader("Allow", "GET, POST, OPTIONS");
      return response.status(204).end();
    }
    if (request.method !== "GET" && request.method !== "POST") {
      response.setHeader("Allow", "GET, POST, OPTIONS");
      return response.status(405).json({ error: "Method not allowed." });
    }

    const hasOneDriveEnv = Boolean(
      String(env.ONEDRIVE_CLIENT_ID || "").trim()
      && String(env.ONEDRIVE_REFRESH_TOKEN || "").trim()
    );
    const expectedToken = String(env.OFFICE_SERVER_TOKEN || "").trim();
    const authorization = String(getHeader(request, "authorization") || "");
    const candidateToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";

    if (!hasOneDriveEnv) {
      if (expectedToken.length < 32) {
        return response.status(503).json({ error: "OneDrive sync API is not configured." });
      }
      if (!matchesOneDriveAccessToken(candidateToken, expectedToken)) {
        return response.status(401).json({ error: "Valid Office Access Key required." });
      }
    } else if (candidateToken && expectedToken.length >= 32 && !matchesOneDriveAccessToken(candidateToken, expectedToken)) {
      return response.status(401).json({ error: "Valid Office Access Key required." });
    }

    try {
      const url = getRequestUrl(request);
      const action = url.searchParams.get("action");
      if (request.method === "POST" && action === "exchange_token") {
        const body = await readJsonBody(request);
        const result = await bridge.exchangePkceCode({
          code: body?.code,
          codeVerifier: body?.code_verifier,
          redirectUri: body?.redirect_uri,
          clientId: body?.client_id
        });
        return response.status(200).json(result);
      }
      const district = normalizeOneDriveDistrict(url.searchParams.get("district"));
      const resource = url.searchParams.get("resource") || "database";

      if (request.method === "GET") {
        if (resource === "config-status") {
          return response.status(200).json({ configuration: await bridge.getConfigurationStatus() });
        }
        if (resource === "active-devices") {
          return response.status(200).json({ devices: await bridge.readActiveDevices() });
        }
        if (resource === "database") {
          const database = await bridge.readDistrictDatabase(district);
          if (Buffer.byteLength(JSON.stringify({ database })) > MAX_BODY_BYTES) {
            throw makeRequestError("The district database exceeds the 4 MB serverless transfer limit.", 413);
          }
          return response.status(200).json({ database });
        }
        if (resource === "storage") {
          const files = await bridge.listStorageFiles(district);
          return response.status(200).json({ files });
        }
        if (resource === "storage-file") {
          const fileId = url.searchParams.get("fileId");
          const data = await bridge.downloadStorageFile(district, fileId);
          if (data.byteLength > MAX_BODY_BYTES) {
            throw makeRequestError("This file exceeds the 4 MB serverless transfer limit.", 413);
          }
          response.setHeader("Content-Type", "application/octet-stream");
          response.setHeader("Content-Length", data.byteLength);
          return response.status(200).send(data);
        }
        throw makeRequestError("Unsupported OneDrive sync resource.");
      }

      if (resource === "database") {
        const body = await readJsonBody(request);
        if (!body?.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
          throw makeRequestError("Database payload must be a JSON object.");
        }
        const result = await bridge.writeDistrictDatabase(district, body.payload);
        return response.status(200).json(result);
      }
      if (resource === "active-devices") {
        const body = await readJsonBody(request);
        const devices = await bridge.upsertActiveDevice(district, body?.device);
        return response.status(200).json({ devices });
      }
      if (resource === "storage") {
        const data = await readRequestBuffer(request);
        const result = await bridge.uploadStorageFile(district, {
          fileName: decodeFileName(getHeader(request, "x-file-name")),
          contentType: getHeader(request, "x-file-type") || getHeader(request, "content-type"),
          folder: String(getHeader(request, "x-storage-folder") || ""),
          data
        });
        return response.status(200).json(result);
      }
      throw makeRequestError("Unsupported OneDrive sync resource.");
    } catch (error) {
      const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
        ? error.status
        : 502;
      return response.status(status).json({ error: error.message || "OneDrive sync failed." });
    }
  };
}

const handler = createOneDriveSyncHandler();

export const config = {
  api: {
    bodyParser: { sizeLimit: "4mb" }
  }
};

export default handler;
