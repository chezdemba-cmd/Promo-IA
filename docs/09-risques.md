# Risques techniques et juridiques

## Risques techniques

| Risque | Impact | Mitigation |
|---|---|---|
| Bannissement/restriction d'un numéro WhatsApp (spam signalé) | Client privé d'envois | Option B isole chaque client ; consentement strict ; STOP immédiat ; surveiller le « quality rating » dans WhatsApp Manager |
| Rejet de templates par Meta | Campagnes bloquées | Templates génériques pré-approuvés (djelis_generique) ; formulations neutres ; prévoir 48h de délai |
| Timeout des fonctions Vercel sur grosses listes (>500 contacts) | Envoi partiel | MVP limité aux petites listes ; garde-fou main_sent_at évite les doublons ; migrer vers file BullMQ (Railway) au-delà |
| Webhook manqué (down au moment du POST) | Réponse perdue | Meta réessaie automatiquement ; répondre 200 vite ; logs Vercel |
| Token WhatsApp expiré | Envois en échec | Utiliser des tokens permanents de system user (docs/05) ; les échecs apparaissent dans le détail campagne |
| Fuite de la clé service_role ou d'un token client | Accès total base / WABA | Variables d'environnement uniquement ; tokens masqués dans l'API ; rotation en cas de doute |
| Coûts IA/Meta non maîtrisés | Marge réduite | Claude Haiku (centimes/campagne) ; coût Meta estimé affiché par campagne ; plafonner le nombre de contacts par campagne |

## Risques juridiques

| Risque | Impact | Mitigation |
|---|---|---|
| Envoi sans consentement (CNIL : prospection directe = opt-in) | Sanction CNIL, amende | Consentement obligatoire à la création/import, source + date tracées, blocage technique à l'envoi |
| STOP non respecté | Sanction + bannissement Meta | Blocage absolu en base + détection STOP déterministe prioritaire sur l'IA + table optouts |
| Client final qui importe des listes achetées/scrapées | Responsabilité agence engagée | Charte d'usage signée (docs/11), champ « source du consentement » obligatoire, clause contractuelle de responsabilité |
| Publicité alcool (loi Évin) via messages bar/restaurant | Amende | Prompt IA l'interdit ; relecture humaine avant programmation ; les messages parlent de l'événement, pas d'alcool |
| Ciblage de mineurs | Interdit RGPD/politiques Meta | Aucune collecte d'âge ; consigne IA ; clause dans la charte client |
| Données personnelles hors UE | Non-conformité | Supabase région EU ; Anthropic : conclure le DPA ; mentionner les sous-traitants dans le registre de traitement |
| Droit d'accès/effacement non honoré | Plainte CNIL | Suppression contact en 1 clic ; messages anonymisés ; export possible via Supabase |

Le détail des mesures RGPD intégrées au produit : docs/10-rgpd.md.
