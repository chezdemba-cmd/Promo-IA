'use client';
/** Page 4 — Contacts : filtrés par client, import CSV, recherche, filtres. */
import { useEffect, useState, useCallback } from 'react';
import Field from '@/components/Field';
import { CONTACT_CATEGORIES, CONTACT_STATUSES } from '@/lib/constants';

const EMPTY = { first_name: '', last_name: '', phone: '', email: '', category: 'clients_habitues', city: '', consent: false, consent_source: '' };

export default function ContactsPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [form, setForm] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((cs) => {
      setClients(cs);
      if (cs.length && !clientId) setClientId(cs[0].id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    if (!clientId) return;
    const params = new URLSearchParams({ client_id: clientId });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    fetch(`/api/contacts?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { setContacts(Array.isArray(d) ? d : []); setListError(''); })
      .catch(() => { setContacts([]); setListError('Impossible de charger les contacts. Réessayez.'); });
  }, [clientId, q, status, category]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault(); setError('');
    const isEdit = Boolean(form.id);
    const res = await fetch(isEdit ? `/api/contacts/${form.id}` : '/api/contacts', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, client_id: clientId }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(null); load();
  }

  async function importCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const csv = await file.text();
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, csv }),
    });
    setImportReport(await res.json());
    e.target.value = '';
    load();
  }

  async function remove(id) {
    if (!confirm('Supprimer ce contact ? (droit à l’effacement RGPD)')) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/contacts/template" className="btn-outline">⬇ Modèle CSV</a>
          <label className="btn-outline cursor-pointer focus-within:ring-2 focus-within:ring-brand">
            ⬆ Importer CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={importCsv} disabled={!clientId} />
          </label>
          <button className="btn" onClick={() => setForm(EMPTY)} disabled={!clientId}>+ Ajouter</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card grid gap-3 md:grid-cols-4">
        <Field label="Client">
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></Field>
        <Field label="Recherche">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou numéro…" /></Field>
        <Field label="Statut">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous</option>
            {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></Field>
        <Field label="Catégorie">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Toutes</option>
            {CONTACT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select></Field>
      </div>

      {listError && <p role="alert" className="card border-red-200 bg-red-50 text-sm text-red-700">{listError}</p>}

      {/* Rapport d'import */}
      {importReport && (
        <div className="card border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Import : {importReport.inserted ?? 0} contact(s) ajouté(s), {importReport.rejected?.length || 0} rejeté(s) sur {importReport.total ?? 0}.
            </p>
            <button className="text-sm text-gray-500" onClick={() => setImportReport(null)}>✕</button>
          </div>
          {importReport.error && <p className="mt-1 text-sm text-red-600">{importReport.error}</p>}
          {importReport.rejected?.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-gray-600">
              {importReport.rejected.slice(0, 10).map((r, i) => (
                <li key={i}>Ligne {r.ligne} : {r.raison} ({r.valeur})</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Formulaire */}
      {form && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold">{form.id ? 'Modifier le contact' : 'Nouveau contact'}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Prénom"><input className="input" value={form.first_name || ''} onChange={set('first_name')} /></Field>
            <Field label="Nom"><input className="input" value={form.last_name || ''} onChange={set('last_name')} /></Field>
            <Field label="Téléphone WhatsApp *"><input className="input" value={form.phone || ''} onChange={set('phone')} placeholder="+33612345678" required /></Field>
            <Field label="Email"><input className="input" value={form.email || ''} onChange={set('email')} /></Field>
            <Field label="Catégorie">
              <select className="input" value={form.category} onChange={set('category')}>
                {CONTACT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></Field>
            <Field label="Ville"><input className="input" value={form.city || ''} onChange={set('city')} /></Field>
            <Field label="Source du consentement">
              <input className="input" value={form.consent_source || ''} onChange={set('consent_source')} placeholder="formulaire boutique, inscription soirée…" /></Field>
            {form.id && <Field label="Statut">
              <select className="input" value={form.status} onChange={set('status')}>
                {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></Field>}
          </div>
          {!form.id && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.consent} onChange={set('consent')} />
              Ce contact a donné son <b>consentement marketing</b> (obligatoire — RGPD)
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button className="btn">Enregistrer</button>
            <button type="button" className="btn-outline" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr><th className="th">Contact</th><th className="th">Téléphone</th><th className="th">Catégorie</th>
              <th className="th">Consentement</th><th className="th">Statut</th><th className="th"></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="td font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="td font-mono text-xs">{c.phone}</td>
                <td className="td">{CONTACT_CATEGORIES.find((x) => x.value === c.category)?.label || c.category}</td>
                <td className="td">{c.consent ? <span className="badge bg-green-100 text-green-700">Oui</span> : <span className="badge bg-red-100 text-red-700">Non</span>}</td>
                <td className="td">
                  <span className={`badge ${c.status === 'stop' ? 'bg-red-100 text-red-700' : c.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="td text-right">
                  <button className="text-sm text-brand hover:underline" onClick={() => setForm(c)}>Modifier</button>
                  <button className="ml-3 text-sm text-red-500 hover:underline" onClick={() => remove(c.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {!contacts.length && <tr><td className="td py-6 text-center text-gray-500" colSpan={6}>Aucun contact pour ce client.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        {contacts.length} contact(s) affiché(s). Les contacts en statut STOP ne recevront jamais de message.
      </p>
    </div>
  );
}
