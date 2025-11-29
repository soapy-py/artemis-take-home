"use client";

import { useEffect, useState } from "react";

type ColumnMeta = {
  name: string;
  type: string;
};

type TableSummary = {
  columns: ColumnMeta[];
  rowCount: number;
};

type QueryResult = {
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  executionTimeMs: number;
};

const DEFAULT_SQL = `SELECT
  name,
  salary,
  hire_date
FROM tablename
WHERE department = 'Engineering'
  AND hire_date < '2020-01-01'
ORDER BY salary DESC;`;

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [summary, setSummary] = useState<TableSummary | null>(null);

  const [sql, setSql] = useState(DEFAULT_SQL);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      void uploadCsv(file);
    }
  };

  const uploadCsv = async (file: File) => {
    setUploadError(null);
    setUploadStatus("uploading");
    setQueryResult(null);
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }
      setUploadStatus("processing");
      setUploadId(payload.uploadId);
      setSummary(payload.summary);
      setUploadStatus("idle");
    } catch (error) {
      setUploadStatus("idle");
      setUploadId(null);
      setUploadError((error as Error).message);
    }
  };

  const runQuery = async () => {
    if (!uploadId) {
      setQueryError("Upload a CSV before running queries.");
      return;
    }
    setQueryError(null);
    setIsQuerying(true);
    setQueryResult(null);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, sql }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Query failed");
      }
      setQueryResult(payload);
    } catch (error) {
      setQueryError((error as Error).message);
    } finally {
      setIsQuerying(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main
      className="relative flex min-h-screen w-full flex-col"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        setPointer({ x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) });
      }}
    >
      <GraphBackground pointer={pointer} />
      <section className="relative z-10 flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-white">
        <div className="relative z-10 max-w-5xl space-y-6">
          <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-200">
            Artemis Take Home Assignment
          </p>
          <h1 className="text-6xl font-semibold leading-tight sm:text-7xl">
            CSV and SQL tool
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-200">
            Sophie Chen
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => scrollToSection("upload-section")}
          className="rounded-full border border-white/30 bg-white/10 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-black/40 transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              Start with a CSV
            </button>
            {uploadId && (
              <span className="rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-wide text-slate-200">
                Upload ID: {uploadId}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => scrollToSection("upload-section")}
          className="relative z-10 mt-20 flex h-14 w-14 items-center justify-center rounded-full border border-white/40 text-white transition hover:border-white hover:bg-white/10"
          aria-label="Scroll down"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6"
          >
            <path d="M6 10l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      <div className="relative z-10 flex flex-1 flex-col gap-12 px-6 pb-20 pt-20 sm:px-10">
        <section
          id="upload-section"
          className="w-full rounded-2xl border border-white/10 bg-gradient-to-b from-transparent via-black/45 to-transparent p-10 text-white shadow-[0_40px_120px_-45px_rgba(0,0,0,0.8)] backdrop-blur-sm"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-lg font-semibold">
                1
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-white">Upload CSV</h2>
                <p className="text-base text-slate-200">
                  Large files stream directly to disk, keeping memory usage predictable.
                </p>
              </div>
            </div>
            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/30 bg-black/30 px-6 py-10 text-center text-white transition hover:border-white/70"
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFileChange}
              />
              <span className="text-lg font-medium">
                {selectedFile ? selectedFile.name : "Drop your CSV or click to browse"}
              </span>
              <span className="text-sm text-slate-200">
                Up to 1&nbsp;GB • Stored as <code>tablename</code>
              </span>
              {uploadStatus !== "idle" && (
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  {uploadStatus === "uploading" ? "Uploading..." : "Processing..."}
                </span>
              )}
              {uploadError && (
                <span className="text-sm text-rose-300">{uploadError}</span>
              )}
            </label>
            {summary && (
              <div className="grid gap-3 rounded-2xl border border-white/15 bg-black/30 p-4 text-sm text-slate-100">
                <div>
                  <span className="font-semibold text-white">Rows:</span>{" "}
                  {summary.rowCount.toLocaleString()}
                </div>
                <div className="leading-6">
                  <span className="font-semibold text-white">Columns:</span>{" "}
                  {summary.columns
                    .map((col) => `${col.name} (${col.type})`)
                    .join(", ")}
                </div>
              </div>
            )}
          </div>

          <div className="my-10 border-t border-white/10" />

          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-lg font-semibold">
                2
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Write SQL against tablename
                </h2>
                <p className="text-base text-slate-200">
                  Reference the dataset as{" "}  
                  <code className="rounded bg-white/20 px-1 py-0.5 font-mono text-sm text-white">
                    tablename
                  </code>{" "}
                  —only SELECT queries are allowed.
                </p>
              </div>
            </div>
            <textarea
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              className="min-h-[220px] w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-3 font-mono text-base text-white shadow-inner focus:border-white/60 focus:outline-none"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runQuery}
                disabled={isQuerying || !uploadId}
                className="rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/40"
              >
                {isQuerying ? "Running..." : "Run query"}
              </button>
              {queryError && (
                <span className="text-sm text-rose-300">{queryError}</span>
              )}
              {uploadId && !queryError && !isQuerying && (
                <span className="text-xs uppercase tracking-wide text-slate-200">
                  Upload ID: {uploadId}
                </span>
              )}
            </div>
          </div>

          <div className="my-10 border-t border-white/10" />

          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-lg font-semibold">
                3
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-white">Inspect results</h2>
                <p className="text-base text-slate-200">
                  Results are capped at 1,000 rows per query to keep responses snappy.
                </p>
              </div>
            </div>
            {queryResult ? (
              <>
                <div className="text-sm text-slate-200">
                  Returned {queryResult.rows.length.toLocaleString()} rows in{" "}
                  {queryResult.executionTimeMs} ms
                  {queryResult.truncated && " (truncated)"}
                </div>
                <div className="overflow-auto rounded-2xl border border-white/10 bg-black/30">
                  <table className="min-w-full divide-y divide-white/15 text-left text-sm text-white">
                    <thead className="bg-black/20">
                      <tr>
                        {queryResult.columns.map((col) => (
                          <th key={col.name} className="px-4 py-2 font-semibold">
                            <div>{col.name}</div>
                            <div className="text-xs font-normal text-slate-200">
                              {col.type}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {queryResult.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-white/5">
                          {queryResult.columns.map((col) => (
                            <td key={col.name} className="px-4 py-2 font-mono text-xs">
                              {formatCell(row[col.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-6 text-center text-sm text-slate-200">
                Results will appear here after you run a query.
              </div>
            )}
          </div>
        </section>
        </div>
      </main>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "∅";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type Pointer = { x: number; y: number };

// Simple deterministic pseudo-random function so the pattern is stable across reloads.
function prand(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Create a dense but organic cloud of nodes across the viewport.
const BASE_NODES = Array.from({ length: 120 }, (_, index) => {
  const jitterRadius = 6 + (index % 5);
  const radialBias = prand(index, 2.3);
  const angle = prand(index, 5.7) * Math.PI * 2;
  const radius = 8 + radialBias * 70; // reach and slightly exceed corners

  const baseX = 50 + Math.cos(angle) * radius;
  const baseY = 50 + Math.sin(angle) * radius;

  const cx = baseX + (prand(index, 9.9) - 0.5) * jitterRadius;
  const cy = baseY + (prand(index, 4.2) - 0.5) * jitterRadius;

  return { x: cx, y: cy };
});

const BASE_EDGES: Array<[number, number]> = [];
for (let i = 0; i < BASE_NODES.length; i += 1) {
  if (i + 1 < BASE_NODES.length) BASE_EDGES.push([i, i + 1]);
  if (i + 7 < BASE_NODES.length) BASE_EDGES.push([i, i + 7]);
}

function GraphBackground({ pointer }: { pointer: Pointer }) {
  const [time, setTime] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    let frame: number;
    const loop = () => {
      setTime((prev) => prev + 0.015);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    // We only need a simple "has mounted" flag to avoid SSR/client float mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Avoid rendering on the server so we don't hit hydration mismatches
    // from tiny floating point differences between Node and the browser.
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="pageGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020617" />
          <stop offset="50%" stopColor="#020617" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="edgeGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Base vertical gradient that spans the whole page area */}
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill="url(#pageGradient)"
        opacity="0.99"
      />

      {/*
        Compute the "live" node positions first so edges and nodes share the same
        coordinates. This keeps every node visually attached to its incident edges.
      */}
      {(() => {
        const px = pointer.x * 100;
        const py = pointer.y * 100;

        const adjustedNodes = BASE_NODES.map((node, index) => {
          const dx = px - node.x;
          const dy = py - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) / 100;
          const pull = Math.max(0, 1 - dist * 2.5);

          const jitterX = Math.sin(time * 2 + index) * 0.7;
          const jitterY = Math.cos(time * 1.8 + index) * 0.7;

          const x = node.x + dx * pull * 0.3 + jitterX;
          const y = node.y + dy * pull * 0.3 + jitterY;

          return { x, y, pull };
        });

        return (
          <g>
            {BASE_EDGES.map(([from, to]) => {
              const a = adjustedNodes[from];
              const b = adjustedNodes[to];

              // Bend edges slightly toward the cursor at their midpoints.
              const midX = (a.x + b.x) / 2 / 100;
              const midY = (a.y + b.y) / 2 / 100;
              const dx = pointer.x - midX;
              const dy = pointer.y - midY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const influence = Math.max(0, 1 - dist * 3);
              const bendX = dx * influence * 3;
              const bendY = dy * influence * 3;

              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${a.x} ${a.y} Q ${midX * 100 + bendX} ${
                    midY * 100 + bendY
                  } ${b.x} ${b.y}`}
                  fill="none"
                  stroke="url(#edgeGradient)"
                  strokeWidth={0.18}
                  strokeLinecap="round"
                  opacity={0.7}
                />
              );
            })}

            {adjustedNodes.map((node, index) => {
              const pulse = 0.6 + 0.4 * Math.sin(time * 2 + index * 0.7);
              const coreRadius = 0.5 + 0.35 * pulse;
              const haloRadius = 1.8 + 0.7 * pulse * node.pull;

              return (
                <g key={index} opacity={0.3 + node.pull * 0.7}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={haloRadius}
                    fill="url(#nodeGlow)"
                    opacity={0.5 + node.pull * 0.4}
                  />
                  <circle cx={node.x} cy={node.y} r={coreRadius} fill="#f8fafc" />
                </g>
              );
            })}
          </g>
        );
      })()}
    </svg>
  );
}
