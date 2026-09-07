import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

/**
 * GET /api/health — sonde publique pour l'hébergeur et le monitoring.
 * 200 = base joignable ; 503 = base injoignable ou planificateur muet.
 * Ne divulgue aucun détail interne (messages d'erreur, versions, comptes).
 */
export const dynamic = 'force-dynamic';

// vercel.json = cron quotidien (limite plan Hobby). Un cron externe (cron-job.org)
// qui appelle /api/cron/scheduler plus souvent réduit d'autant ce délai réel.
const STALE_SCHEDULER_MS = Number(process.env.SCHEDULER_STALE_MS) || 26 * 60 * 60 * 1000;

export async function GET() {
  const checks = { database: 'down', scheduler: 'unknown' };
  try {
    const probe = await db().from('settings').select('key, value').eq('key', 'scheduler_last_success').maybeSingle();
    if (probe.error) throw probe.error;
    checks.database = 'ok';
    const last = probe.data?.value ? Date.parse(probe.data.value) : NaN;
    checks.scheduler = Number.isFinite(last) && Date.now() - last < STALE_SCHEDULER_MS ? 'ok' : 'stale';
  } catch {
    checks.database = 'down';
  }
  const healthy = checks.database === 'ok';
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, time: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
