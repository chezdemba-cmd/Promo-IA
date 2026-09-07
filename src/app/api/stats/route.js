/**
 * GET /api/stats — statistiques globales pour le dashboard agence.
 * Une erreur Supabase remonte en 503 : jamais de zéro silencieux (audit R18).
 */
import { NextResponse } from 'next/server';
import { api, HttpError } from '@/lib/api';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function count(result) {
  if (result.error) throw new HttpError(503, 'Le service de données est indisponible. Réessayez ultérieurement.');
  return result.count || 0;
}

export const GET = api(async () => {
  const supa = db();

  const [clients, campaigns, sent, replies, reservations, optouts, failed, scheduled] = await Promise.all([
    supa.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'actif'),
    supa.from('campaigns').select('id', { count: 'exact', head: true }).in('status', ['programme', 'envoye']),
    supa.from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'out')
      .in('status', ['sent', 'delivered', 'read', 'simulated']),
    supa.from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'in'),
    supa.from('reservations').select('id', { count: 'exact', head: true }),
    supa.from('optouts').select('id', { count: 'exact', head: true }),
    supa.from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'failed'),
    supa.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'programme'),
  ]);

  const toHandle = await supa.from('messages')
    .select('id, body, intent, created_at, contacts(first_name, last_name, phone), clients(name)')
    .eq('direction', 'in').eq('handled', false)
    .order('created_at', { ascending: false }).limit(10);
  if (toHandle.error) throw new HttpError(503, 'Le service de données est indisponible. Réessayez ultérieurement.');

  return NextResponse.json({
    activeClients: count(clients),
    activeCampaigns: count(campaigns),
    scheduledCampaigns: count(scheduled),
    messagesSent: count(sent),
    repliesReceived: count(replies),
    reservations: count(reservations),
    optouts: count(optouts),
    sendErrors: count(failed),
    toHandle: toHandle.data || [],
  });
});
