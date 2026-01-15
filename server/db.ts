import { and, eq, gte, lt } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as mysqlDrizzle } from "drizzle-orm/mysql2";
import type { InsertTodo, InsertUser } from "../drizzle/schema";
import * as mysqlSchema from "../drizzle/schema";
import * as sqliteSchema from "../drizzle/schema.sqlite";
import { ENV } from "./_core/env";

type DbDialect = "mysql" | "sqlite";
type DbClient = ReturnType<typeof mysqlDrizzle> | ReturnType<typeof sqliteDrizzle>;
type SchemaTables = typeof mysqlSchema;

const schemas: Record<DbDialect, SchemaTables> = {
  mysql: mysqlSchema,
  sqlite: sqliteSchema as unknown as SchemaTables,
};

let _db: DbClient | null = null;
let _dialect: DbDialect | null = null;

function resolveDialect(databaseUrl: string): DbDialect {
  const override = process.env.DB_DIALECT?.toLowerCase();
  if (override === "mysql" || override === "sqlite") {
    return override;
  }
  if (databaseUrl.startsWith("sqlite:") || databaseUrl.startsWith("file:")) {
    return "sqlite";
  }
  if (/\.(db|sqlite|sqlite3)$/i.test(databaseUrl)) {
    return "sqlite";
  }
  return "mysql";
}

function normalizeSqlitePath(databaseUrl: string): string {
  if (!databaseUrl) {
    return ":memory:";
  }
  if (databaseUrl === ":memory:" || databaseUrl === "file::memory:") {
    return ":memory:";
  }
  let normalized = databaseUrl;
  if (normalized.startsWith("sqlite:")) {
    normalized = normalized.slice("sqlite:".length);
  }
  if (normalized.startsWith("file:")) {
    normalized = normalized.slice("file:".length);
  }
  if (normalized.startsWith("//")) {
    normalized = normalized.slice(2);
  }
  return normalized || ":memory:";
}

function getDialect(): DbDialect | null {
  if (_dialect) {
    return _dialect;
  }
  const databaseUrl = ENV.databaseUrl || process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    return null;
  }
  _dialect = resolveDialect(databaseUrl);
  return _dialect;
}

function getSchema(): SchemaTables {
  const dialect = getDialect() ?? "mysql";
  return schemas[dialect];
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  const databaseUrl = ENV.databaseUrl || process.env.DATABASE_URL;
  if (!_db && databaseUrl) {
    try {
      const dialect = resolveDialect(databaseUrl);
      _dialect = dialect;
      if (dialect === "sqlite") {
        const filename = normalizeSqlitePath(databaseUrl);
        const sqlite = new Database(filename);
        _db = sqliteDrizzle(sqlite);
      } else {
        _db = mysqlDrizzle(databaseUrl);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  name?: string | null;
  email?: string | null;
  role?: InsertUser["role"];
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  const now = new Date();
  const values: InsertUser = {
    username: input.username,
    passwordHash: input.passwordHash,
    name: input.name ?? null,
    email: input.email ?? null,
    role: input.role ?? "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };

  return await (db as any).insert(schema.users).values(values);
}

export async function updateUserLastSignedIn(userId: number, signedInAt = new Date()) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  return await (db as any)
    .update(schema.users)
    .set({ lastSignedIn: signedInAt, updatedAt: signedInAt })
    .where(eq(schema.users.id, userId));
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const schema = getSchema();
  const result = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const schema = getSchema();
  const result = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Todo queries
 */
export async function createTodo(userId: number, todo: InsertTodo) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  const result = await (db as any).insert(schema.todos).values({
    ...todo,
    userId,
  });

  return result;
}

export async function getTodosByUserId(userId: number, dueDate?: Date) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  if (dueDate) {
    // Get todos for a specific date (from 00:00 to 23:59:59)
    const startOfDay = new Date(dueDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dueDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await (db as any)
      .select()
      .from(schema.todos)
      .where(
        and(
          eq(schema.todos.userId, userId),
          gte(schema.todos.dueDate, startOfDay),
          lt(schema.todos.dueDate, new Date(endOfDay.getTime() + 1))
        )
      )
      .orderBy(schema.todos.createdAt);
  }

  // Get all todos for user
  return await (db as any)
    .select()
    .from(schema.todos)
    .where(eq(schema.todos.userId, userId))
    .orderBy(schema.todos.createdAt);
}

export async function getTodoById(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  const result = await (db as any)
    .select()
    .from(schema.todos)
    .where(and(eq(schema.todos.id, id), eq(schema.todos.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTodo(id: number, userId: number, updates: Partial<InsertTodo>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  const nextUpdates = {
    ...updates,
  };
  if (nextUpdates.updatedAt === undefined) {
    nextUpdates.updatedAt = new Date();
  }

  return await (db as any)
    .update(schema.todos)
    .set(nextUpdates)
    .where(and(eq(schema.todos.id, id), eq(schema.todos.userId, userId)));
}

export async function deleteTodo(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  return await (db as any)
    .delete(schema.todos)
    .where(and(eq(schema.todos.id, id), eq(schema.todos.userId, userId)));
}

export async function getTodosDateRange(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const schema = getSchema();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return await (db as any)
    .select()
    .from(schema.todos)
    .where(
      and(
        eq(schema.todos.userId, userId),
        gte(schema.todos.dueDate, start),
        lt(schema.todos.dueDate, new Date(end.getTime() + 1))
      )
    )
    .orderBy(schema.todos.dueDate, schema.todos.createdAt);
}
