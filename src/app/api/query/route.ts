import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspace } from "@/lib/storage";
import { runUserQuery } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: { uploadId?: string; sql?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const uploadId = payload.uploadId?.trim();
  const sql = payload.sql ?? "";

  if (!uploadId) {
    return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
  }

  try {
    const workspace = resolveWorkspace(uploadId);
    const result = await runUserQuery(workspace.dbPath, sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Query failure", error);
    const message = (error as Error).message ?? "Failed to run query";
    const status =
      message === "Upload not found" || message === "Invalid upload id"
        ? 404
        : message.toLowerCase().includes("select")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

