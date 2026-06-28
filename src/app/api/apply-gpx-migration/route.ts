import { NextResponse } from 'next/server';

export async function GET() {
  const { Pool } = await import('pg');

  const pool = new Pool({
    host: 'db.lcqsbjflososfglajydw.supabase.co',
    port: 5432,
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'cn!#knv4Rte94L.',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const check = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='gear_lists' AND column_name='gpx_data'"
    );

    if (check.rows.length === 0) {
      await pool.query(
        'ALTER TABLE gear_lists ADD COLUMN gpx_data JSONB DEFAULT NULL'
      );
      await pool.end();
      return NextResponse.json({ status: 'migration applied' });
    }

    await pool.end();
    return NextResponse.json({ status: 'column already exists' });
  } catch (e: any) {
    await pool.end().catch(() => {});
    return NextResponse.json(
      { error: e.message, code: e.code },
      { status: 500 }
    );
  }
}
