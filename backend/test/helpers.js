import { randomBytes } from 'node:crypto';
import { openDb, closeDb } from '../src/db.js';

export const TEST_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/irrisense_test';

// Database tes dengan schema acak; panggil close() di akhir tes.
export async function makeTestDb() {
  const schema = `t_${randomBytes(6).toString('hex')}`;
  const db = await openDb(TEST_URL, { schema });
  return { db, close: () => closeDb(db, { dropSchema: schema }) };
}
