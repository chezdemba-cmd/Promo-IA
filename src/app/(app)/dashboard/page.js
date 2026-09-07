'use client';
/** Page 2 — Dashboard agence : vue globale clients/campagnes/statistiques. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import { INTENT_LABELS } from '@/lib/constants';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques. Les chiffres ci-dessous ne sont pas fiables — réessayez.'));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link href="/campagnes/nouvelle" className="btn">+ Nouvelle campagne</Link>
      </div>

      {error && (
        <p role="alert" className="card border-red-200 bg-red-50 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon="🏪" label="Clients actifs" value={stats?.activeClients} accent />
        <StatCard icon="📣" label="Campagnes en cours" value={stats?.activeCampaigns} />
        <StatCard icon="🗓️" label="Campagnes programmées" value={stats?.scheduledCampaigns} />
        <StatCard icon="📤" label="Messages envoyés" value={stats?.messagesSent} />
        <StatCard icon="💬" label="Réponses reçues" value={stats?.repliesReceived} />
        <StatCard icon="✅" label="Réservations" value={stats?.reservations} />
        <StatCard icon="🚫" label="Désinscriptions STOP" value={stats?.optouts} />
        <StatCard icon="⚠️" label="Erreurs d'envoi" value={stats?.sendErrors} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Réponses à traiter</h2>
        {!stats?.toHandle?.length && <p className="text-sm text-gray-500">Aucune réponse en attente. 👌</p>}
        <ul className="divide-y divide-gray-100">
          {stats?.toHandle?.map((m) => {
            const intent = INTENT_LABELS[m.intent] || INTENT_LABELS.AUTRE;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">{m.contacts?.first_name || m.contacts?.phone}</span>
                    <span className="text-gray-500"> ({m.clients?.name})</span> : {m.body}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <span className={`badge ${intent.color}`}>{intent.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
