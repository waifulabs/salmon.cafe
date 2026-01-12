import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/salmon.db'
  }
};
