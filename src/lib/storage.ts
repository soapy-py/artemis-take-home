import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

function ensureUploadsRoot() {
  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  }
}

export type WorkspacePaths = {
  uploadId: string;
  workspaceDir: string;
  csvPath: string;
  dbPath: string;
};

export function createWorkspace(): WorkspacePaths {
  ensureUploadsRoot();
  const uploadId = randomUUID();
  const workspaceDir = path.join(UPLOADS_ROOT, uploadId);
  fs.mkdirSync(workspaceDir, { recursive: true });
  return {
    uploadId,
    workspaceDir,
    csvPath: path.join(workspaceDir, "source.csv"),
    dbPath: path.join(workspaceDir, "data.duckdb"),
  };
}

export function resolveWorkspace(uploadId: string): WorkspacePaths {
  if (!/^[a-f0-9-]{36}$/i.test(uploadId)) {
    throw new Error("Invalid upload id");
  }
  ensureUploadsRoot();
  const workspaceDir = path.join(UPLOADS_ROOT, uploadId);
  if (!fs.existsSync(workspaceDir)) {
    throw new Error("Upload not found");
  }
  return {
    uploadId,
    workspaceDir,
    csvPath: path.join(workspaceDir, "source.csv"),
    dbPath: path.join(workspaceDir, "data.duckdb"),
  };
}

