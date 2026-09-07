/**
 * Couche IA — génération de messages et classification des réponses.
 *
 * Fournisseur par défaut : Claude API (Anthropic).
 * Pour changer de fournisseur (OpenAI, Gemini…), seule la fonction
 * callProvider() est à adapter — le reste de l'application ne change pas.
 *
 * Sans clé API : fallback déterministe (gabarits sectoriels + mots-clés),
 * l'application reste 100 % fonctionnelle (utile en mode démo).
 */

// ------------------------------------------------------------
// Appel du fournisseur IA (adaptateur)
// ------------------------------------------------------------
async function callProvider(system, user, maxTokens = 600) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null; // → fallback

  try {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    signal: AbortSignal.timeout(6000),
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    console.error(JSON.stringify({ event: 'ai_unavailable', status: res.status }));
    return null; // → fallback plutôt que de bloquer l'utilisateur
  }
  const data = await res.json();
  return data.content?.[0]?.text || null;
  } catch {
    console.error(JSON.stringify({ event: 'ai_network_failure' }));
    return null;
  }
}

// ------------------------------------------------------------
// 1. GÉNÉRATION DES MESSAGES DE CAMPAGNE
// ------------------------------------------------------------

const TONE_LABELS = {
  professionnel: 'professionnel et courtois',
  chaleureux: 'chaleureux et convivial',
  jeune: 'jeune et dynamique',
  premium: 'élégant et haut de gamme',
  communautaire: 'communautaire et fraternel',
};

const SECTOR_GUIDES = {
  restaurant: 'message chaleureux, court, orienté réservation de table',
  bar: "message dynamique orienté ambiance et événement — ne JAMAIS promouvoir l'alcool, parler uniquement de l'événement",
  commerce: 'message promotionnel clair, orienté visite en boutique ou achat',
  beaute: 'message élégant, orienté prise de rendez-vous',
  evenementiel: 'message dynamique, orienté présence et réservation de places',
  association: 'message communautaire et informatif, orienté participation',
  pme: 'message professionnel, clair et informatif',
};

const RULES = `Règles impératives :
- Message court (3 à 5 lignes max), en français, prêt à envoyer sur WhatsApp.
- Commencer par "Bonjour {{prenom}} 👋" (la variable {{prenom}} sera remplacée).
- Un appel à l'action clair (répondre OUI, RÉSERVE, INFO...).
- Terminer par : "Répondez STOP pour ne plus recevoir nos messages."
- Pas de promesse mensongère, pas de pression, pas de spam.
- Ne jamais cibler ni mentionner les mineurs.
- Ne jamais promouvoir directement l'alcool.
- 1 ou 2 emojis maximum, adaptés au secteur.`;

/**
 * Génère le message principal ET le message de rappel d'une campagne.
 * @param {object} p - { clientName, sector, tone, campaignName, type, eventAt, offer, location, reminderHours }
 * @returns {Promise<{main: string, reminder: string, source: 'ia'|'gabarit'}>}
 */
export async function generateCampaignMessages(p) {
  const system = `Tu rédiges des messages WhatsApp promotionnels pour des petites entreprises françaises. ${RULES}`;
  const user = `Entreprise : ${p.clientName} (secteur : ${p.sector}, ton : ${TONE_LABELS[p.tone] || p.tone}).
Consigne secteur : ${SECTOR_GUIDES[p.sector] || SECTOR_GUIDES.pme}.
Campagne : ${p.campaignName} (type : ${p.type}).
${p.eventAt ? `Date/heure : ${formatFr(p.eventAt)}.` : ''}
${p.offer ? `Offre/info : ${p.offer}.` : ''}
${p.location ? `Lieu : ${p.location}.` : ''}

Rédige exactement 2 messages séparés par la ligne "---" :
1. Le message principal d'invitation/annonce.
2. Le message de rappel (à envoyer ${p.reminderHours || 24}h avant), plus court, qui rappelle l'échéance imminente.`;

  const text = await callProvider(system, user, 800);
  if (text && text.includes('---')) {
    const [main, reminder] = text.split('---').map((s) => s.trim());
    if (main && reminder && main.length <= 1500 && reminder.length <= 1500) {
      const stop = 'R?pondez STOP pour ne plus recevoir nos messages.';
      return { main: /\bstop\b/i.test(main) ? main : main + '\n' + stop, reminder: /\bstop\b/i.test(reminder) ? reminder : reminder + '\n' + stop, source: 'ia' };
    }
  }

  // ---- Fallback gabarits (pas de clé API ou erreur) ----
  const date = p.eventAt ? formatFr(p.eventAt) : 'bientôt';
  const main = `Bonjour {{prenom}} 👋
${p.clientName} vous invite : ${p.campaignName}${p.eventAt ? ` — ${date}` : ''}.
${p.offer ? `✨ ${p.offer}\n` : ''}${p.location ? `📍 ${p.location}\n` : ''}Répondez OUI pour plus d'informations.
Répondez STOP pour ne plus recevoir nos messages.`;
  const reminder = `Bonjour {{prenom}} 👋
Petit rappel : ${p.campaignName} commence dans ${p.reminderHours || 24}h !
${p.location ? `📍 ${p.location}\n` : ''}Répondez RÉSERVE si vous êtes intéressé(e).
Répondez STOP pour ne plus recevoir nos messages.`;
  return { main, reminder, source: 'gabarit' };
}

function formatFr(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
  } catch { return iso; }
}

// ------------------------------------------------------------
// 2. CLASSIFICATION DES RÉPONSES
// ------------------------------------------------------------

export const INTENTS = [
  'INTERESSE', 'RESERVATION', 'QUESTION_PRIX', 'QUESTION_LIEU',
  'QUESTION_HEURE', 'STOP', 'REFUS', 'AUTRE',
];

/**
 * Classe une réponse client dans l'une des catégories INTENTS.
 * Le STOP est TOUJOURS vérifié d'abord par mots-clés (règle absolue,
 * on ne laisse pas une IA rater une désinscription).
 * @param {string} text - message reçu du contact
 * @returns {Promise<string>} l'une des valeurs de INTENTS
 */
export async function classifyReply(text) {
  const t = (text || '').toLowerCase().trim();

  // 1. STOP prioritaire, détection déterministe
  if (/\bstop\b|d[ée]sabonn|ne m'?[ée]cri|plus de message|me retirer/.test(t)) return 'STOP';

  // 2. Tentative IA
  const system = `Tu classes des réponses de clients à des messages WhatsApp promotionnels.
Réponds UNIQUEMENT par un de ces mots : ${INTENTS.join(', ')}.
INTERESSE = oui, je viens, d'accord, intéressé. RESERVATION = réserve, garde-moi une place, on sera N.
QUESTION_PRIX = combien, tarif. QUESTION_LIEU = adresse, c'est où. QUESTION_HEURE = quelle heure, quand.
STOP = désinscription. REFUS = non merci, pas intéressé. AUTRE = tout le reste.`;
  const out = await callProvider(system, `Réponse du client : "${text}"`, 10);
  if (out) {
    const intent = out.trim().toUpperCase().replace(/[^A-Z_]/g, '');
    if (INTENTS.includes(intent)) return intent;
  }

  // 3. Fallback mots-clés
  if (/r[ée]serv|garde[- ]moi|une place|on sera \d|table pour/.test(t)) return 'RESERVATION';
  if (/combien|prix|tarif|co[ûu]te/.test(t)) return 'QUESTION_PRIX';
  if (/adresse|c'?est o[ùu]|localisation|o[ùu] [çc]a/.test(t)) return 'QUESTION_LIEU';
  if (/quelle heure|[çc]a commence|quand/.test(t)) return 'QUESTION_HEURE';
  if (/non merci|pas int[ée]ress|pas dispo|peux pas|pourrai pas/.test(t)) return 'REFUS';
  if (/^(oui|ok|yes|d'accord|carr[ée]ment|grave|je viens|pr[ée]sent|int[ée]ress)/.test(t)) return 'INTERESSE';
  return 'AUTRE';
}

/** Suggestion de réponse rapide selon l'intention (affichée à l'admin). */
export function suggestedReply(intent, client, campaign) {
  switch (intent) {
    case 'QUESTION_PRIX':
      return campaign?.offer
        ? `Bonjour ! ${campaign.offer}. Au plaisir de vous voir ! — ${client?.name}`
        : `Bonjour ! Contactez-nous pour connaître nos tarifs. — ${client?.name}`;
    case 'QUESTION_LIEU':
      return `Bonjour ! Nous sommes situés : ${campaign?.location || client?.city || 'adresse à compléter'}. À bientôt ! — ${client?.name}`;
    case 'QUESTION_HEURE':
      return campaign?.event_at
        ? `Bonjour ! Cela commence le ${formatFr(campaign.event_at)}. À bientôt ! — ${client?.name}`
        : `Bonjour ! Nous revenons vers vous avec l'horaire exact. — ${client?.name}`;
    case 'RESERVATION':
      return `C'est noté, votre réservation est bien prise en compte ! À très vite. — ${client?.name}`;
    case 'INTERESSE':
      return `Super ! On vous attend. N'hésitez pas si vous avez une question. — ${client?.name}`;
    default:
      return null;
  }
}
