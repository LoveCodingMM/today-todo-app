import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const override = process.env.DB_DIALECT?.toLowerCase();
const inferredDialect =
  connectionString.startsWith("sqlite:") ||
  connectionString.startsWith("file:") ||
  /\.(db|sqlite|sqlite3)$/i.test(connectionString)
    ? "sqlite"
    : "mysql";
const dialect =
  override === "sqlite" || override === "mysql" ? override : inferredDialect;

function normalizeSqliteUrl(url: string): string {
  if (url === ":memory:") {
    return "file::memory:";
  }
  if (url.startsWith("sqlite:")) {
    return `file:${url.slice("sqlite:".length)}`;
  }
  if (url.startsWith("file:")) {
    return url;
  }
  return `file:${url}`;
}

export default defineConfig({
  schema:
    dialect === "sqlite" ? "./drizzle/schema.sqlite.ts" : "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: dialect === "sqlite" ? "sqlite" : "mysql",
  dbCredentials: {
    url:
      dialect === "sqlite"
        ? normalizeSqliteUrl(connectionString)
        : connectionString,
  },
});
