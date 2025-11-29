import { performance } from "node:perf_hooks";
import duckdb, { ColumnInfo } from "duckdb";

type DuckRow = Record<string, unknown>;

export type ColumnMeta = {
  name: string;
  type: string;
};

export type TableSummary = {
  columns: ColumnMeta[];
  rowCount: number;
};

export type QueryResultPayload = {
  columns: ColumnMeta[];
  rows: DuckRow[];
  truncated: boolean;
  executionTimeMs: number;
};

const MAX_QUERY_ROWS = 1000;

function sanitizePath(filePath: string) {
  return filePath.replace(/'/g, "''");
}

async function withConnection<T>(
  dbPath: string,
  handler: (conn: duckdb.Connection) => Promise<T>,
): Promise<T> {
  const db = new duckdb.Database(dbPath);
  const conn = db.connect();
  try {
    return await handler(conn);
  } finally {
    await new Promise<void>((resolve, reject) => {
      conn.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        db.close((closeErr) => {
          if (closeErr) {
            reject(closeErr);
            return;
          }
          resolve();
        });
      });
    });
  }
}

function exec(conn: duckdb.Connection, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

function queryRows<T = DuckRow>(
  conn: duckdb.Connection,
  sql: string,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

export async function ingestCsv(
  csvPath: string,
  dbPath: string,
): Promise<TableSummary> {
  return withConnection(dbPath, async (conn) => {
    await exec(conn, "DROP TABLE IF EXISTS tablename");
    const escaped = sanitizePath(csvPath);
    await exec(
      conn,
      `CREATE TABLE tablename AS SELECT * FROM read_csv_auto('${escaped}', SAMPLE_SIZE=-1)`,
    );

    const columns = (await queryRows<{ column_name: string; data_type: string }>(
      conn,
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'tablename'
       ORDER BY ordinal_position`,
    )).map((col) => ({
      name: col.column_name,
      type: col.data_type,
    }));

    const [{ row_count }] = await queryRows<{ row_count: number }>(
      conn,
      "SELECT COUNT(*)::BIGINT AS row_count FROM tablename",
    );

    return { columns, rowCount: Number(row_count) };
  });
}

function mapColumns(meta: ColumnInfo[]): ColumnMeta[] {
  return meta.map((col) => ({
    name: col.name,
    type: col.type.sql_type,
  }));
}

export async function runUserQuery(
  dbPath: string,
  sql: string,
): Promise<QueryResultPayload> {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!trimmed) {
    throw new Error("SQL cannot be empty");
  }
  if (!/^select/i.test(trimmed)) {
    throw new Error("Only SELECT queries are allowed");
  }

  return withConnection(dbPath, async (conn) => {
    const statement = conn.prepare(
      `SELECT * FROM (${trimmed}) AS user_query LIMIT ${MAX_QUERY_ROWS + 1}`,
    );
    const columns = mapColumns(statement.columns());

    const start = performance.now();
    let rows: DuckRow[] = [];
    try {
      rows = await new Promise<DuckRow[]>((resolve, reject) => {
        statement.all((err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data as DuckRow[]);
          }
        });
      });
    } finally {
      statement.finalize();
    }
    const duration = performance.now() - start;

    const truncated = rows.length > MAX_QUERY_ROWS;
    if (truncated) {
      rows.length = MAX_QUERY_ROWS;
    }

    return {
      columns,
      rows,
      truncated,
      executionTimeMs: Math.round(duration),
    };
  });
}

