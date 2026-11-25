import { randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { existsSync, promises as fs } from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  createOneDriveBackendBridge,
  matchesOneDriveAccessToken,
  normalizeOneDriveDistrict
} from "./oneDriveBackendBridge.js";

const OFFICE_DISTRICT = "CHITTORGARH";
const SERVER_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIRECTORY = path.join(SERVER_DIRECTORY, "data");
const DEFAULT_DATABASE_FILE = path.join(DATA_DIRECTORY, "chittorgarh_db.json");
const TOKEN_FILE = path.join(DATA_DIRECTORY, "office_access.token");
const FRONTEND_DIRECTORY = path.resolve(SERVER_DIRECTORY, "..", "dist");

function isPrivateLanAddress(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".local") || !normalized.includes(".")) return true;
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split(".").map(Number);
    return first === 10
      || first === 127
      || (first === 169 && second === 254)
      || (first === 192 && second === 168)
      || (first === 172 && second >= 16 && second <= 31);
  }
  if (isIP(normalized) === 6) {
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return false;
}

function allowedOrigin(origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && isPrivateLanAddress(parsed.hostname);
  } catch {
    return false;
  }
}

function matchesToken(candidate, expected) {
  const provided = Buffer.from(String(candidate || ""));
  const configured = Buffer.from(expected);
  return provided.length === configured.length && timingSafeEqual(provided, configured);
}

function readBearerToken(request) {
  const header = String(request.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function normalizeDistrict(value) {
  const district = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{1,60}$/.test(district) || district !== OFFICE_DISTRICT) {
    const error = new Error("यह सर्वर केवल Chittorgarh जिले के डेटा के लिए उपलब्ध है।");
    error.status = 404;
    throw error;
  }
  return district;
}

async function readDatabase(databaseFile) {
  try {
    const contents = await fs.readFile(databaseFile, "utf8");
    const database = JSON.parse(contents);
    if (!database || typeof database !== "object" || !database.districts || typeof database.districts !== "object") {
      throw new Error("GR server database has an invalid structure.");
    }
    return database;
  } catch (error) {
    if (error.code === "ENOENT") return { schemaVersion: 1, districts: {} };
    throw error;
  }
}

async function writeDatabase(databaseFile, database) {
  await fs.mkdir(path.dirname(databaseFile), { recursive: true });
  const temporaryFile = `${databaseFile}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryFile, JSON.stringify(database), { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryFile, databaseFile);
  } catch (error) {
    await fs.rm(temporaryFile, { force: true });
    throw error;
  }
}

export function createApp({
  token,
  databaseFile = DEFAULT_DATABASE_FILE,
  maxBodySize = "50mb",
  frontendDirectory = FRONTEND_DIRECTORY,
  oneDriveBridge = createOneDriveBackendBridge()
} = {}) {
  if (typeof token !== "string" || token.length < 32) {
    throw new Error("A 32-character Office Access Key is required to start the LAN API.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (!allowedOrigin(origin)) {
      response.status(403).json({ error: "LAN access is allowed only from local/private network origins." });
      return;
    }
    if (origin) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
    }
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-File-Name,X-File-Type");
    response.setHeader("Access-Control-Allow-Private-Network", "true");
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });
  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", service: "office-lan", district: OFFICE_DISTRICT, authRequired: true });
  });

  app.use("/api/data/:district", (request, response, next) => {
    try {
      normalizeDistrict(request.params.district);
      if (!matchesToken(readBearerToken(request), token)) {
        response.status(401).json({ error: "Valid Office Access Key required." });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(["/api/cloud-db", "/api/onedrive"], (request, response, next) => {
    if (request.method === "GET" && request.path === "/auth-callback") {
      next();
      return;
    }
    if (!matchesOneDriveAccessToken(readBearerToken(request), token)) {
      response.status(401).json({ error: "Valid Office Access Key required." });
      return;
    }
    next();
  });
  app.use(express.raw({ type: "application/octet-stream", limit: "250mb" }));
  app.use(express.json({ limit: maxBodySize, strict: true }));

  app.get("/api/cloud-db/:district", async (request, response, next) => {
    try {
      const district = normalizeOneDriveDistrict(request.params.district);
      response.json(await oneDriveBridge.readDistrictDatabase(district));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/cloud-db/:district", async (request, response, next) => {
    try {
      const payload = request.body?.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        response.status(400).json({ error: "Request must include an object payload." });
        return;
      }
      const district = normalizeOneDriveDistrict(request.params.district);
      response.json(await oneDriveBridge.writeDistrictDatabase(district, payload));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/onedrive/auth-init", async (request, response, next) => {
    try {
      response.json(await oneDriveBridge.createAuthUrl());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/onedrive/auth-callback", async (request, response, next) => {
    try {
      if (request.query.error) {
        response.status(400).type("text").send("OneDrive authorization was not completed. You may close this page.");
        return;
      }
      await oneDriveBridge.completeAuth({
        code: request.query.code,
        state: request.query.state
      });
      response.type("text").send("OneDrive is connected. You may close this page and return to the portal.");
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/onedrive/storage/:district", async (request, response, next) => {
    try {
      const district = normalizeOneDriveDistrict(request.params.district);
      response.json({ files: await oneDriveBridge.listStorageFiles(district) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/onedrive/storage/:district/:fileId/content", async (request, response, next) => {
    try {
      const district = normalizeOneDriveDistrict(request.params.district);
      const contents = await oneDriveBridge.downloadStorageFile(district, request.params.fileId);
      response.type("application/octet-stream").send(contents);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/onedrive/storage/:district", async (request, response, next) => {
    try {
      const district = normalizeOneDriveDistrict(request.params.district);
      let fileName;
      try {
        fileName = decodeURIComponent(String(request.headers["x-file-name"] || ""));
      } catch {
        const error = new Error("Storage फ़ाइल का नाम अमान्य है।");
        error.status = 400;
        throw error;
      }
      response.json(await oneDriveBridge.uploadStorageFile(district, {
        fileName,
        contentType: request.headers["x-file-type"],
        data: request.body
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/data/:district", async (request, response, next) => {
    try {
      const district = normalizeDistrict(request.params.district);
      const database = await readDatabase(databaseFile);
      const stored = database.districts[district] || null;
      response.json({
        district,
        payload: stored?.payload || null,
        updatedAt: stored?.updatedAt || null
      });
    } catch (error) {
      next(error);
    }
  });

  let writeQueue = Promise.resolve();
  app.post("/api/data/:district", async (request, response, next) => {
    try {
      const district = normalizeDistrict(request.params.district);
      const payload = request.body?.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        response.status(400).json({ error: "Request must include an object payload." });
        return;
      }
      const requestedTimestamp = Date.parse(payload.updatedAt || "");
      const updatedAt = Number.isFinite(requestedTimestamp)
        ? new Date(requestedTimestamp).toISOString()
        : new Date().toISOString();

      const operation = writeQueue.then(async () => {
        const database = await readDatabase(databaseFile);
        const current = database.districts[district];
        const currentTimestamp = Date.parse(current?.updatedAt || "") || 0;
        if (current && currentTimestamp > Date.parse(updatedAt)) {
          const conflict = new Error("A newer office-server version already exists.");
          conflict.status = 409;
          conflict.code = "CONFLICT";
          throw conflict;
        }
        database.districts[district] = { payload, updatedAt };
        await writeDatabase(databaseFile, database);
        return updatedAt;
      });
      writeQueue = operation.catch(() => undefined);
      const savedAt = await operation;
      response.json({ district, updatedAt: savedAt });
    } catch (error) {
      next(error);
    }
  });

  const frontendIndex = path.join(frontendDirectory, "index.html");
  if (existsSync(frontendIndex)) {
    app.use(express.static(frontendDirectory, { index: false }));
    app.get(/^(?!\/api(?:\/|$)).*/, (request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }
      response.sendFile(frontendIndex, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    const status = Number(error.status || error.statusCode) || 500;
    if (status >= 500) {
      console.error("Office LAN API request failed:", request.method, request.path, error);
    }
    response.status(status).json({
      error: status >= 500 ? "Office server could not process the request." : error.message,
      ...(error.code ? { code: error.code } : {})
    });
  });

  return app;
}

async function loadOrCreateOfficeToken() {
  const configuredToken = String(process.env.OFFICE_SERVER_TOKEN || "").trim();
  if (configuredToken) {
    if (configuredToken.length < 32) {
      throw new Error("OFFICE_SERVER_TOKEN must contain at least 32 characters.");
    }
    return { token: configuredToken, generated: false };
  }

  await fs.mkdir(DATA_DIRECTORY, { recursive: true });
  try {
    const token = (await fs.readFile(TOKEN_FILE, "utf8")).trim();
    if (token.length < 32) throw new Error("Saved Office Access Key is invalid; remove it and restart to generate a new key.");
    return { token, generated: false };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const token = randomBytes(32).toString("base64url");
  try {
    await fs.writeFile(TOKEN_FILE, `${token}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return { token, generated: true };
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const savedToken = (await fs.readFile(TOKEN_FILE, "utf8")).trim();
    if (savedToken.length < 32) {
      throw new Error("Saved Office Access Key is invalid.", { cause: error });
    }
    return { token: savedToken, generated: false };
  }
}

async function startServer() {
  const { token, generated } = await loadOrCreateOfficeToken();
  const port = Number(process.env.PORT || 5050);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
  const app = createApp({ token });
  app.listen(port, "0.0.0.0", () => {
    console.info(`Office LAN server listening on 0.0.0.0:${port}`);
    console.info(`Health check: http://<GR-PC-IP>:${port}/api/health`);
    if (generated) {
      console.info("New Office Access Key (copy it into each authorized device; it is not shown again):");
      console.info(token);
      console.info(`The key is stored locally at ${TOKEN_FILE}`);
    } else if (process.env.OFFICE_SERVER_TOKEN) {
      console.info("Office Access Key loaded from OFFICE_SERVER_TOKEN.");
    }
  });
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  startServer().catch((error) => {
    console.error("Office LAN server could not start:", error);
    process.exitCode = 1;
  });
}
