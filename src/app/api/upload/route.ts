import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import fs from "node:fs";
import Busboy from "busboy";
import { createWorkspace } from "@/lib/storage";
import { ingestCsv } from "@/lib/database";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadResponse = {
  uploadId: string;
  summary: Awaited<ReturnType<typeof ingestCsv>>;
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Request must be multipart/form-data" },
      { status: 400 },
    );
  }
  if (!req.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const workspace = createWorkspace();
  const headers = Object.fromEntries(req.headers.entries());
  const busboy = Busboy({
    headers,
    limits: { fileSize: 1024 * 1024 * 1024 },
  });

  let fileSaved = false;
  const writePromises: Promise<void>[] = [];

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

  const bodyStream = req.body as ReadableStream<Uint8Array>;
  await pipeline(Readable.fromWeb(bodyStream), busboy);
  await Promise.all([parsingPromise, ...writePromises]);

  if (!fileSaved) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const summary = await ingestCsv(workspace.csvPath, workspace.dbPath);
    const payload: UploadResponse = { uploadId: workspace.uploadId, summary };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: "Failed to ingest CSV" },
      { status: 500 },
    );
  }
}

