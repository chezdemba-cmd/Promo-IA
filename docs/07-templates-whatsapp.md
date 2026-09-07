# Templates WhatsApp à faire approuver par Meta

À créer dans **WhatsApp Manager → Message templates** pour chaque WABA client (Option B). Langue : `fr`. Catégorie **Marketing**, sauf le rappel de rendez-vous (**Utility**, moins cher).

## 1. `djelis_generique` — utilisé par défaut par le code ⭐

Le corps du message généré par l'IA est injecté en {{2}} — un seul template couvre tous les types de campagnes du MVP.

- Header : IMAGE (optionnel — permet d'envoyer l'affiche)
- Body :
```
Bonjour {{1}} 👋
{{2}}
```
- Footer : `Répondez STOP pour ne plus recevoir nos messages.`

> Astuce approbation : dans l'exemple de valeurs demandé par Meta, mettez un vrai message complet en {{2}} (ex. l'invitation match ci-dessous).

## 2. `djelis_evenement`

```
Bonjour {{1}} 👋
{{2}} vous invite à {{3}} le {{4}} à {{5}}.
📍 Lieu : {{6}}
✨ Info : {{7}}
Répondez OUI pour plus d'informations ou STOP pour ne plus recevoir nos invitations.
```

## 3. `djelis_rappel`

```
Bonjour {{1}} 👋
Petit rappel : {{2}} commence dans {{3}}.
📍 Lieu : {{4}}
🕒 Heure : {{5}}
Répondez RÉSERVE ou OUI si vous êtes intéressé, ou STOP pour ne plus recevoir nos invitations.
```

## 4. `djelis_promotion`

```
Bonjour {{1}} 👋
{{2}} vous informe d'une offre spéciale : {{3}}.
📍 Disponible à : {{4}}
📅 Jusqu'au : {{5}}
Répondez INFO pour plus de détails ou STOP pour ne plus recevoir nos messages.
```

## 5. `djelis_rendez_vous` — catégorie **Utility**

```
Bonjour {{1}} 👋
Petit rappel de votre rendez-vous avec {{2}} le {{3}} à {{4}}.
Répondez CONFIRMER pour confirmer, MODIFIER pour demander un changement, ou STOP pour ne plus recevoir nos rappels.
```

## Conseils d'approbation

- Pas de mention d'alcool, de tabac, de jeux d'argent dans les exemples.
- Variables toujours entourées de texte fixe (Meta rejette les templates « tout variable » — d'où le "Bonjour {{1}}" fixe dans `djelis_generique`).
- La mention STOP dans le footer améliore le taux d'approbation et la qualité du numéro.
- Comptez 5 min à 48h de délai ; statut visible dans WhatsApp Manager.
