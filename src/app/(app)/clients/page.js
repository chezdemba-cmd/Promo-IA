'use client';
/** Page 3 — Clients : liste + ajout/modification (formulaire inline). */
import { useEffect, useState } from 'react';
import Field from '@/components/Field';
import { SECTORS, TONES } from '@/lib/constants';

const EMPTY = {
  name: '', sector: 'restaurant', city: '', whatsapp_phone: '', email: '',
  status: 'test', tone: 'chaleureux', demo_mode: true,
  wa_phone_number_id: '', wa_business_account_id: '', wa_access_token: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(null); // null = fermé, objet = ouvert
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');

  const load = () => fetch('/api/clients')
    .then((r) => (r.ok ? r.json() : Promise.reject(r)))
    .then((d) => { setClients(Array.isArray(d) ? d : []); setListError(''); })
    .catch(() => setListError('Impossible de charger les clients. Réessayez.'));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault(); setError('');
    const isEdit = Boolean(form.id);
    const res = await fetch(isEdit ? `/api/clients/${form.id}` : '/api/clients', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(null); load();
  }

  async function remove(id) {
    if (!confirm('Supprimer ce client et TOUTES ses données (contacts, campagnes) ?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button className="btn" onClick={() => setForm(EMPTY)}>+ Ajouter un client</button>
      </div>

      {listError && <p role="alert" className="card border-red-200 bg-red-50 text-sm text-red-700">{listError}</p>}

      {form && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold">{form.id ? 'Modifier le client' : 'Nouveau client'}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nom de l'entreprise *">
              <input className="input" value={form.name} onChange={set('name')} required placeholder="Chez Demba" /></Field>
            <Field label="Secteur">
              <select className="input" value={form.sector} onChange={set('sector')}>
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></Field>
            <Field label="Ville">
              <input className="input" value={form.city || ''} onChange={set('city')} placeholder="Angers" /></Field>
            <Field label="Téléphone WhatsApp affiché">
              <input className="input" value={form.whatsapp_phone || ''} onChange={set('whatsapp_phone')} placeholder="+33612345678" /></Field>
            <Field label="Email">
              <input className="input" type="email" value={form.email || ''} onChange={set('email')} /></Field>
            <Field label="Ton des messages">
              <select className="input" value={form.tone} onChange={set('tone')}>
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></Field>
            <Field label="Statut">
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="actif">Actif</option><option value="pause">Pause</option><option value="test">Test</option>
              </select></Field>
          </div>

          <details className="rounded-lg border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-600">
              WhatsApp Cloud API (Option B : un numéro par client) — laisser vide = mode démo
            </summary>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <Field label="Phone Number ID">
                <input className="input" value={form.wa_phone_number_id || ''} onChange={set('wa_phone_number_id')} /></Field>
              <Field label="WhatsApp Business Account ID">
                <input className="input" value={form.wa_business_account_id || ''} onChange={set('wa_business_account_id')} /></Field>
              <Field label="Access Token">
                <input className="input" type="password" value={form.wa_access_token || ''} onChange={set('wa_access_token')} /></Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.demo_mode} onChange={set('demo_mode')} />
              Mode démo (envois simulés, aucun vrai message)
            </label>
          </details>

          {error && <p className="text-sm text-red-600" role="alert" aria-live="polite">{error}</p>}
          <div className="flex gap-2">
            <button className="btn">Enregistrer</button>
            <button type="button" className="btn-outline" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr><th className="th">Entreprise</th><th className="th">Secteur</th><th className="th">Ville</th>
              <th className="th">Statut</th><th className="th">Mode</th><th className="th"></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="td font-medium">{c.name}</td>
                <td className="td">{SECTORS.find((s) => s.value === c.sector)?.label || c.sector}</td>
                <td className="td">{c.city || '—'}</td>
                <td className="td">
                  <span className={`badge ${c.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </td>
                <td className="td">
                  <span className={`badge ${c.demo_mode ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.demo_mode ? 'Démo' : 'Réel'}
                  </span>
                </td>
                <td className="td text-right">
                  <button className="text-sm text-brand hover:underline" onClick={() => setForm(c)}>Modifier</button>
                  <button className="ml-3 text-sm text-red-500 hover:underline" onClick={() => remove(c.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {!clients.length && <tr><td className="td py-6 text-center text-gray-500" colSpan={6}>Aucun client. Ajoutez votre premier client ou exécutez le seed de démo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
