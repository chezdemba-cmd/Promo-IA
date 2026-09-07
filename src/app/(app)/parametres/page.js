'use client';
/**
 * Page 8 — Paramètres : état de la configuration (env), rappel des étapes,
 * mode démo. Les secrets se configurent dans .env.local / Vercel,
 * jamais depuis le navigateur (sécurité MVP).
 */
import { useEffect, useState } from 'react';

export default function ParametresPage() {
  const [clients, setClients] = useState([]);
  useEffect(() => { fetch('/api/clients').then((r) => r.json()).then(setClients); }, []);

  const configured = clients.filter((c) => c.wa_phone_number_id && !c.demo_mode);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <div className="card space-y-2">
        <h2 className="font-semibold">🔐 Clés et secrets</h2>
        <p className="text-sm text-gray-600">
          Les clés API (Supabase, Claude, secret webhook Meta, mot de passe admin) se configurent dans le fichier
          <code className="mx-1 rounded bg-gray-100 px-1">.env.local</code> en local, ou dans
          <b> Vercel → Settings → Environment Variables</b> en production. Elles ne sont jamais éditables depuis
          cette interface pour éviter toute fuite.
        </p>
        <ul className="list-inside list-disc text-sm text-gray-600">
          <li><code>ANTHROPIC_API_KEY</code> — génération et classification IA (vide = fallback gabarits)</li>
          <li><code>WHATSAPP_VERIFY_TOKEN</code> / <code>WHATSAPP_APP_SECRET</code> — webhook Meta</li>
          <li><code>DEMO_MODE=true</code> — force le mode démo pour TOUTE l&apos;application</li>
        </ul>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">📱 WhatsApp Cloud API par client (Option B)</h2>
        <p className="text-sm text-gray-600">
          Chaque client a son propre numéro : renseignez <b>Phone Number ID</b>, <b>WABA ID</b> et <b>Access Token </b>
          dans la fiche du client (page Clients), puis décochez son mode démo.
          Guide complet : <code>docs/05-configuration-meta.md</code>.
        </p>
        <p className="text-sm">
          {configured.length
            ? <span className="text-green-700">✓ {configured.length} client(s) connecté(s) en réel : {configured.map((c) => c.name).join(', ')}</span>
            : <span className="text-amber-700">Aucun client connecté en réel — tous les envois sont simulés (mode démo).</span>}
        </p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">🎭 Mode démo / mode réel</h2>
        <p className="text-sm text-gray-600">Un client est en mode démo si :</p>
        <ul className="list-inside list-disc text-sm text-gray-600">
          <li>sa case « Mode démo » est cochée (fiche client) ; ou</li>
          <li>ses identifiants WhatsApp sont absents ; ou</li>
          <li><code>DEMO_MODE=true</code> globalement.</li>
        </ul>
        <p className="text-sm text-gray-600">
          En mode démo : envois enregistrés comme « simulés », aperçu WhatsApp affiché, simulateur de réponses
          disponible sur la page de chaque campagne envoyée. Idéal pour les rendez-vous commerciaux.
        </p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">📄 Templates WhatsApp</h2>
        <p className="text-sm text-gray-600">
          Les templates à faire approuver par Meta (événement, rappel, promotion, rendez-vous, générique) sont dans
          <code className="mx-1 rounded bg-gray-100 px-1">docs/07-templates-whatsapp.md</code>.
          Le template utilisé par défaut à l&apos;envoi est <code>djelis_generique</code>.
        </p>
      </div>
    </div>
  );
}
