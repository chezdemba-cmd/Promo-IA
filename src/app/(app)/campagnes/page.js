'use client';
/** Page 5 — Campagnes : liste, statut, statistiques rapides. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from '@/lib/constants';

export default function CampagnesPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/campaigns')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setCampaigns(Array.isArray(d) ? d : []))
      .catch(() => setError('Impossible de charger les campagnes. Réessayez.'));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campagnes</h1>
        <Link href="/campagnes/nouvelle" className="btn">+ Créer une campagne</Link>
      </div>

      {error && <p role="alert" className="card border-red-200 bg-red-50 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr><th className="th">Campagne</th><th className="th">Client</th><th className="th">Type</th>
              <th className="th">Événement</th><th className="th">Statut</th>
              <th className="th">Envoyés</th><th className="th">Réponses</th><th className="th">Résa</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const st = CAMPAIGN_STATUSES[c.status] || CAMPAIGN_STATUSES.brouillon;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="td">
                    <Link href={`/campagnes/${c.id}`} className="font-medium text-brand hover:underline">{c.name}</Link>
                  </td>
                  <td className="td">{c.clients?.name}</td>
                  <td className="td">{CAMPAIGN_TYPES.find((t) => t.value === c.type)?.label || c.type}</td>
                  <td className="td text-xs">{c.event_at ? new Date(c.event_at).toLocaleString('fr-FR') : '—'}</td>
                  <td className="td"><span className={`badge ${st.color}`}>{st.label}</span></td>
                  <td className="td">{c.stats?.sent ?? 0}</td>
                  <td className="td">{c.stats?.replies ?? 0}</td>
                  <td className="td">{c.stats?.bookings ?? 0}</td>
                </tr>
              );
            })}
            {!campaigns.length && <tr><td className="td py-6 text-center text-gray-500" colSpan={8}>Aucune campagne. Créez la première !</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
