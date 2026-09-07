'use client';
/**
 * Page 7 — Détail campagne : statistiques, envoi, simulation démo,
 * messages envoyés, réponses classées, réservations, STOP, erreurs.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import StatCard from '@/components/StatCard';
import WhatsAppPreview from '@/components/WhatsAppPreview';
import { CAMPAIGN_STATUSES, INTENT_LABELS } from '@/lib/constants';

export default function DetailCampagnePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState({});

  const load = useCallback(() => {
    fetch(`/api/campaigns/${id}`).then((r) => r.json()).then(setData);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!data?.campaign) return <p className="text-gray-500">Chargement…</p>;
  const { campaign, messages, reservations, stats } = data;
  const st = CAMPAIGN_STATUSES[campaign.status] || CAMPAIGN_STATUSES.brouillon;
  const isDemo = campaign.clients?.demo_mode;

  const replies = messages.filter((m) => m.direction === 'in');
  const outbound = messages.filter((m) => m.direction === 'out');
  const errors = outbound.filter((m) => m.status === 'failed');
  const responseRate = stats?.sent ? Math.round(((stats.replies || 0) / stats.sent) * 100) : 0;
  const bookingRate = stats?.sent ? Math.round(((stats.bookings || 0) / stats.sent) * 100) : 0;
  // Coût estimé : ~0,08 € par template marketing délivré (hors mode démo)
  const estCost = isDemo ? 0 : Math.round((stats?.sent || 0) * 0.08 * 100) / 100;

  async function action(url, label) {
    setBusy(label); setNotice('');
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await res.json();
    setBusy('');
    setNotice(res.ok ? `✓ ${label} : ${JSON.stringify(d)}` : `Erreur : ${d.error}`);
    load();
  }

  async function patch(url, body, label) {
    setBusy(label); setNotice('');
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setBusy('');
    if (!res.ok) setNotice(`Erreur : ${d.error}`);
    load();
  }

  async function sendReply(m) {
    const text = (drafts[m.id] ?? m.suggestion ?? '').trim();
    if (!text) return;
    setBusy('reply-' + m.id); setNotice('');
    const res = await fetch(`/api/messages/${m.id}/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    const d = await res.json();
    setBusy('');
    if (res.ok) {
      setDrafts((prev) => { const next = { ...prev }; delete next[m.id]; return next; });
      setNotice(d.simulated ? '✓ Réponse simulée (mode démo)' : '✓ Réponse envoyée');
    } else {
      setNotice(`Erreur : ${d.error}`);
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-gray-500">
            {campaign.clients?.name} · <span className={`badge ${st.color}`}>{st.label}</span>
            {isDemo && <span className="badge ml-2 bg-amber-100 text-amber-700">🎭 Mode démo</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!campaign.main_sent_at && (
            <button className="btn" disabled={!!busy} onClick={() => action(`/api/campaigns/${id}/send`, 'Envoi')}>
              {isDemo ? '🎭 Simuler l’envoi' : '📤 Envoyer maintenant'}
            </button>
          )}
          {isDemo && campaign.main_sent_at && (
            <button className="btn-outline" disabled={!!busy}
              onClick={() => action(`/api/campaigns/${id}/simulate-replies`, 'Simulation réponses')}>
              🎭 Simuler des réponses
            </button>
          )}
        </div>
      </div>

      {notice && <p className="rounded-lg bg-gray-100 p-3 text-xs text-gray-600">{notice}</p>}

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon="🎯" label="Contacts ciblés / programmés" value={stats?.programmed ?? 0} />
        <StatCard icon="📤" label="Envoyés" value={stats?.sent ?? 0} accent />
        <StatCard icon="⚠️" label="Échecs" value={stats?.failed ?? 0} />
        <StatCard icon="💬" label={`Réponses (${responseRate}%)`} value={stats?.replies ?? 0} />
        <StatCard icon="✅" label={`Réservations (${bookingRate}%)`} value={stats?.bookings ?? 0} />
        <StatCard icon="👍" label="Intéressés" value={stats?.interested ?? 0} />
        <StatCard icon="🚫" label="STOP" value={stats?.stops ?? 0} />
        <StatCard icon="💶" label="Coût estimé" value={`${estCost} €`} />
        {campaign.reminder_at && (
          <div className="card col-span-2 flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-sm font-medium">Rappel {campaign.reminder_sent_at ? 'envoyé' : 'programmé'}</p>
              <p className="text-xs text-gray-500">{new Date(campaign.reminder_at).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Réservations */}
          <div className="card">
            <h2 className="mb-3 font-semibold">Réservations ({reservations.length})</h2>
            {!reservations.length && <p className="text-sm text-gray-500">Aucune réservation pour l&apos;instant.</p>}
            <ul className="divide-y divide-gray-100">
              {reservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span><b>{r.contacts?.first_name || r.contacts?.phone}</b> — « {r.details} »</span>
                  <span className="flex items-center gap-2">
                    <span className={`badge ${r.status === 'a_traiter' ? 'bg-amber-100 text-amber-700' : r.status === 'confirmee' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status === 'a_traiter' ? 'à traiter' : r.status}
                    </span>
                    {r.status !== 'confirmee' && (
                      <button className="text-xs text-brand hover:underline" disabled={!!busy}
                        onClick={() => patch(`/api/reservations/${r.id}`, { status: 'confirmee' }, 'Réservation confirmée')}>Confirmer</button>
                    )}
                    {r.status !== 'annulee' && (
                      <button className="text-xs text-red-500 hover:underline" disabled={!!busy}
                        onClick={() => patch(`/api/reservations/${r.id}`, { status: 'annulee' }, 'Réservation annulée')}>Annuler</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Réponses */}
          <div className="card">
            <h2 className="mb-3 font-semibold">
              Réponses reçues ({replies.length}) · <span className="text-amber-700">{replies.filter((m) => !m.handled).length} à traiter</span>
            </h2>
            {!replies.length && <p className="text-sm text-gray-500">Aucune réponse pour l&apos;instant.</p>}
            <ul className="divide-y divide-gray-100">
              {replies.map((m) => {
                const it = INTENT_LABELS[m.intent] || INTENT_LABELS.AUTRE;
                return (
                  <li key={m.id} className={`py-2 text-sm ${m.handled ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <b>{m.contacts?.first_name || m.contacts?.phone}</b> : {m.body}
                      </span>
                      <span className={`badge shrink-0 ${it.color}`}>{it.label}</span>
                    </div>
                    {!m.handled && (
                      <div className="mt-2 space-y-1">
                        <textarea
                          className="input text-xs" rows={2}
                          value={drafts[m.id] ?? m.suggestion ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Votre réponse…"
                        />
                        <div className="flex gap-3">
                          <button className="btn px-3 py-1 text-xs" disabled={!!busy}
                            onClick={() => sendReply(m)}>
                            {isDemo ? '🎭 Envoyer (simulé)' : '↳ Envoyer la réponse'}
                          </button>
                          <button className="text-xs text-gray-500 hover:underline" disabled={!!busy}
                            onClick={() => patch(`/api/messages/${m.id}`, { handled: true }, 'Réponse classée sans suite')}>
                            Classer sans répondre
                          </button>
                        </div>
                      </div>
                    )}
                    {m.handled && (
                      <button className="mt-1 text-xs text-brand hover:underline" disabled={!!busy}
                        onClick={() => patch(`/api/messages/${m.id}`, { handled: false }, 'Réponse rouverte')}>
                        ↺ Rouvrir
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Erreurs */}
          {errors.length > 0 && (
            <div className="card border-red-200">
              <h2 className="mb-3 font-semibold text-red-700">Erreurs d&apos;envoi ({errors.length})</h2>
              <ul className="divide-y divide-gray-100 text-sm">
                {errors.map((m) => (
                  <li key={m.id} className="py-2">{m.contacts?.phone} — {m.error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Journal des envois */}
          <div className="card">
            <h2 className="mb-3 font-semibold">Messages envoyés ({outbound.length})</h2>
            <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto text-sm">
              {outbound.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span>{m.contacts?.first_name || m.contacts?.phone} <span className="text-xs text-gray-500">({m.kind === 'reminder' ? 'rappel' : 'principal'})</span></span>
                  <span className={`badge ${m.status === 'failed' ? 'bg-red-100 text-red-700' : m.status === 'simulated' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Aperçu du message */}
        <div className="space-y-3">
          <WhatsAppPreview
            message={campaign.message_main?.replaceAll('{{prenom}}', 'Awa')}
            imageUrl={campaign.image_url}
            senderName={campaign.clients?.name}
          />
          {campaign.message_reminder && (
            <details className="card">
              <summary className="cursor-pointer text-sm font-medium">Message de rappel</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{campaign.message_reminder}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
