import cors from "cors";
import express from "express";
import Busboy from "busboy";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createWorkspace, resolveWorkspace } from "./lib/storage";
import { ingestCsv, runUserQuery } from "./lib/database";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

app.post("/api/upload", async (req, res) => {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({ error: "Request must be multipart/form-data" });
    return;
  }

  const workspace = createWorkspace();
  const busboy = Busboy({
    headers: req.headers,
    limits: { fileSize: MAX_FILE_SIZE },
  });

  let fileSaved = false;
  const writePromises: Array<Promise<void>> = [];

  busboy.on("file", (_, fileStream) => {
    if (fileSaved) {
      fileStream.resume();
      return;
    }
    fileSaved = true;
    const writer = fs.createWriteStream(workspace.csvPath);
    const writePromise = pipeline(fileStream, writer);
    writePromises.push(writePromise);
  });

  const parsingPromise = new Promise<void>((resolve, reject) => {
    busboy.on("error", (err) => reject(err));
    busboy.on("finish", () => resolve());
  });

  req.pipe(busboy);
  await Promise.all([parsingPromise, ...writePromises]);

  if (!fileSaved) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const summary = await ingestCsv(workspace.csvPath, workspace.dbPath);
    res.json({ uploadId: workspace.uploadId, summary });
  } catch (error) {
    console.error("Upload failed", error);
    res.status(500).json({ error: "Failed to ingest CSV" });
  }
});

app.post("/api/query", async (req, res) => {
  const { uploadId, sql } = req.body ?? {};
  if (!uploadId || typeof uploadId !== "string") {
    res.status(400).json({ error: "uploadId is required" });
    return;
  }
  if (!sql || typeof sql !== "string") {
    res.status(400).json({ error: "sql is required" });
    return;
  }

  try {
    const workspace = resolveWorkspace(uploadId);
    const result = await runUserQuery(workspace.dbPath, sql);
    res.json(result);
  } catch (error) {
    console.error("Query failed", error);
    res.status(500).json({ error: (error as Error).message ?? "Query failed" });
  }
});

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
