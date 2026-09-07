# Plan de test

## 1. Authentification
- [ ] Accès à /dashboard sans login → redirection /login.
- [ ] Appel API sans cookie → 401 JSON.
- [ ] Mauvais mot de passe → erreur ; bon mot de passe → dashboard.

## 2. Clients
- [ ] Création client minimal (nom seul) → OK, mode démo par défaut.
- [ ] Le token WhatsApp saisi n'est jamais renvoyé en clair par l'API (masque ••••••).
- [ ] Suppression client → contacts et campagnes supprimés (cascade).

## 3. Contacts / Import CSV
- [ ] Ajout manuel sans consentement coché → refusé.
- [ ] `0612345678` normalisé en `+33612345678`.
- [ ] Import du modèle CSV → 2 insérés.
- [ ] Import avec numéro invalide, doublon, consentement vide → 3 rejets motivés ligne par ligne.
- [ ] Même numéro deux fois pour un client → refusé ; autorisé pour un autre client.

## 4. Campagnes
- [ ] Génération IA avec clé Claude → 2 messages, mention STOP présente.
- [ ] Sans clé API → fallback gabarit fonctionnel.
- [ ] event_at samedi 22h + rappel 12h → reminder_at = samedi 10h.
- [ ] Upload visuel > 5 Mo ou .gif → refusé ; jpg → URL publique retournée.

## 5. Mode démo
- [ ] Client démo → « Simuler l'envoi » → messages statut `simulated`, aucun appel Meta (vérifier logs).
- [ ] Contact STOP + contact sans consentement exclus de l'envoi (programmed < total contacts).
- [ ] « Simuler des réponses » → réponses classées, réservation créée pour « on sera 4 », contact STOP bloqué.
- [ ] Simulation refusée pour un client non-démo.

## 6. Envoi réel (numéro de test Meta)
- [ ] Template `djelis_generique` approuvé → message reçu sur téléphone de test.
- [ ] Statuts sent → delivered → read visibles dans le détail campagne.
- [ ] Numéro invalide → statut failed + contact passé en `erreur`.

## 7. Webhook
- [ ] GET avec bon verify_token → renvoie le challenge ; mauvais token → 403.
- [ ] POST sans signature valide (avec WHATSAPP_APP_SECRET défini) → 403.
- [ ] Réponse « OUI » → intent INTERESSE ; « réserve pour 2 » → réservation ; « STOP » → contact stop + optout tracé.
- [ ] Message d'un numéro inconnu → contact prospect créé sans consentement.

## 8. Cron
- [ ] GET /api/cron/scheduler sans Bearer → 401.
- [ ] Campagne programmée send_at passé → envoyée au tick suivant, pas ré-envoyée au tick d'après (main_sent_at).
- [ ] Rappel non envoyé si event_at déjà passé.
- [ ] Campagne annulée → jamais envoyée.

## 9. Statistiques
- [ ] Vue campaign_stats cohérente avec le journal des messages.
- [ ] Taux de réponse/réservation corrects sur la page détail.

## 10. RGPD
- [ ] Contact STOP ne reçoit plus rien (créer une 2e campagne pour vérifier).
- [ ] Suppression contact → OK, ses messages restent anonymisés (contact_id null).
- [ ] optouts contient date + message original + campagne + client.
