/** Constantes partagées front/back (pas de secret ici). */

export const SECTORS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'commerce', label: 'Commerce / Boutique' },
  { value: 'beaute', label: 'Salon de coiffure / beauté' },
  { value: 'evenementiel', label: 'Artiste / Événementiel' },
  { value: 'association', label: 'Association' },
  { value: 'pme', label: 'PME / PMI' },
];

export const TONES = [
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'chaleureux', label: 'Chaleureux' },
  { value: 'jeune', label: 'Jeune' },
  { value: 'premium', label: 'Premium' },
  { value: 'communautaire', label: 'Communautaire' },
];

export const CONTACT_CATEGORIES = [
  { value: 'vip', label: 'VIP' },
  { value: 'clients_habitues', label: 'Clients habitués' },
  { value: 'prospects', label: 'Prospects' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'evenementiel', label: 'Événementiel' },
  { value: 'sport', label: 'Sport / Match' },
  { value: 'beaute', label: 'Beauté' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'association', label: 'Association' },
  { value: 'partenaires', label: 'Partenaires' },
  { value: 'etudiants', label: 'Étudiants' },
  { value: 'famille', label: 'Famille' },
  { value: 'entreprises', label: 'Entreprises' },
];

export const CONTACT_STATUSES = [
  { value: 'actif', label: 'Actif' },
  { value: 'stop', label: 'STOP' },
  { value: 'erreur', label: 'Erreur' },
  { value: 'bloque', label: 'Bloqué' },
  { value: 'vip', label: 'VIP' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'fidele', label: 'Client fidèle' },
];

export const CAMPAIGN_TYPES = [
  { value: 'evenement', label: 'Événement' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'rappel_rdv', label: 'Rappel rendez-vous' },
  { value: 'menu', label: 'Menu / Plat du jour' },
  { value: 'lancement_produit', label: 'Lancement produit' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'information', label: 'Information client' },
];

export const CAMPAIGN_STATUSES = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  programme: { label: 'Programmée', color: 'bg-blue-100 text-blue-700' },
  envoye: { label: 'Envoyée', color: 'bg-green-100 text-green-700' },
  termine: { label: 'Terminée', color: 'bg-gray-200 text-gray-600' },
  annule: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

export const INTENT_LABELS = {
  INTERESSE: { label: 'Intéressé', color: 'bg-green-100 text-green-700' },
  RESERVATION: { label: 'Réservation', color: 'bg-emerald-100 text-emerald-800' },
  QUESTION_PRIX: { label: 'Question prix', color: 'bg-amber-100 text-amber-700' },
  QUESTION_LIEU: { label: 'Question lieu', color: 'bg-amber-100 text-amber-700' },
  QUESTION_HEURE: { label: 'Question heure', color: 'bg-amber-100 text-amber-700' },
  STOP: { label: 'STOP', color: 'bg-red-100 text-red-700' },
  REFUS: { label: 'Refus', color: 'bg-gray-100 text-gray-600' },
  AUTRE: { label: 'À traiter', color: 'bg-purple-100 text-purple-700' },
};

export const REMINDER_OPTIONS = [
  { value: '', label: 'Pas de rappel' },
  { value: '12', label: '12h avant' },
  { value: '24', label: '24h avant' },
  { value: '48', label: '48h avant' },
];
