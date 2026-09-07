-- ============================================================
-- DJELI'S PROMO AI — Données de démonstration (5 secteurs)
-- À exécuter APRÈS schema.sql. Tous les clients sont en mode démo
-- et tous les numéros sont fictifs (+3361234xxxx).
-- ============================================================

-- 1. Clients de démonstration
insert into clients (id, name, sector, city, whatsapp_phone, status, tone, demo_mode) values
  ('11111111-1111-1111-1111-111111111111', 'Chez Demba', 'restaurant', 'Angers', '+33612340001', 'actif', 'chaleureux', true),
  ('22222222-2222-2222-2222-222222222222', 'Salon Belle Époque', 'beaute', 'Angers', '+33612340002', 'actif', 'premium', true),
  ('33333333-3333-3333-3333-333333333333', 'Boutique Wax & Style', 'commerce', 'Nantes', '+33612340003', 'actif', 'jeune', true),
  ('44444444-4444-4444-4444-444444444444', 'Association Teranga 49', 'association', 'Angers', '+33612340004', 'actif', 'communautaire', true),
  ('55555555-5555-5555-5555-555555555555', 'Kaay Fecc Events', 'evenementiel', 'Paris', '+33612340005', 'actif', 'jeune', true)
on conflict (id) do nothing;

-- 2. Contacts (consentement = oui, source tracée — démo RGPD propre)
insert into contacts (client_id, first_name, last_name, phone, category, city, consent, consent_source, consent_date, status) values
  -- Chez Demba (restaurant)
  ('11111111-1111-1111-1111-111111111111','Awa','Diallo','+33612345001','vip','Angers',true,'carte fidélité',now(),'actif'),
  ('11111111-1111-1111-1111-111111111111','Moussa','Traoré','+33612345002','sport','Angers',true,'soirée match janvier',now(),'actif'),
  ('11111111-1111-1111-1111-111111111111','Fatou','Ndiaye','+33612345003','clients_habitues','Angers',true,'carte fidélité',now(),'actif'),
  ('11111111-1111-1111-1111-111111111111','Ibrahim','Koné','+33612345004','sport','Angers',true,'inscription WhatsApp comptoir',now(),'actif'),
  ('11111111-1111-1111-1111-111111111111','Aminata','Cissé','+33612345005','vip','Angers',true,'carte fidélité',now(),'actif'),
  ('11111111-1111-1111-1111-111111111111','Jean','Martin','+33612345006','clients_habitues','Angers',true,'carte fidélité',now(),'actif'),
  -- Salon Belle Époque (beauté)
  ('22222222-2222-2222-2222-222222222222','Chloé','Dubois','+33612345011','clients_habitues','Angers',true,'fiche cliente',now(),'actif'),
  ('22222222-2222-2222-2222-222222222222','Mariam','Sow','+33612345012','vip','Angers',true,'fiche cliente',now(),'actif'),
  ('22222222-2222-2222-2222-222222222222','Léa','Bernard','+33612345013','beaute','Angers',true,'prise de RDV en ligne',now(),'actif'),
  ('22222222-2222-2222-2222-222222222222','Sophie','Petit','+33612345014','clients_habitues','Angers',true,'fiche cliente',now(),'actif'),
  -- Boutique Wax & Style (commerce)
  ('33333333-3333-3333-3333-333333333333','Aïcha','Bamba','+33612345021','vip','Nantes',true,'programme fidélité',now(),'actif'),
  ('33333333-3333-3333-3333-333333333333','Nadia','Benali','+33612345022','clients_habitues','Nantes',true,'achat en boutique',now(),'actif'),
  ('33333333-3333-3333-3333-333333333333','Grace','Okafor','+33612345023','vip','Nantes',true,'programme fidélité',now(),'actif'),
  ('33333333-3333-3333-3333-333333333333','Emma','Leroy','+33612345024','prospects','Nantes',true,'jeu concours Instagram',now(),'actif'),
  -- Association Teranga 49
  ('44444444-4444-4444-4444-444444444444','Ousmane','Fall','+33612345031','association','Angers',true,'adhésion 2026',now(),'actif'),
  ('44444444-4444-4444-4444-444444444444','Khady','Sarr','+33612345032','association','Angers',true,'adhésion 2026',now(),'actif'),
  ('44444444-4444-4444-4444-444444444444','Mamadou','Ba','+33612345033','famille','Angers',true,'adhésion 2026',now(),'actif'),
  -- Kaay Fecc Events
  ('55555555-5555-5555-5555-555555555555','Binta','Camara','+33612345041','evenementiel','Paris',true,'billetterie soirée mars',now(),'actif'),
  ('55555555-5555-5555-5555-555555555555','Sékou','Doumbia','+33612345042','etudiants','Paris',true,'billetterie soirée mars',now(),'actif'),
  ('55555555-5555-5555-5555-555555555555','Yasmine','Haddad','+33612345043','vip','Paris',true,'liste VIP promoteur',now(),'actif')
on conflict (client_id, phone) do nothing;

-- 3. Campagnes d'exemple (brouillons prêts à démontrer)
insert into campaigns (client_id, name, type, event_at, send_at, reminder_hours, reminder_at, offer, location, target_categories, message_main, message_reminder, status) values
  ('11111111-1111-1111-1111-111111111111',
   'Match Côte d''Ivoire vs Sénégal', 'evenement',
   date_trunc('week', now()) + interval '5 days 22 hours',
   date_trunc('week', now()) + interval '3 days 18 hours',
   12,
   date_trunc('week', now()) + interval '5 days 10 hours',
   'Garba Thon 10 €', 'Chez Demba, Angers',
   '{sport,vip,clients_habitues}',
   E'Bonjour {{prenom}} 👋\nChez Demba vous invite : Match Côte d''Ivoire vs Sénégal ce samedi à 22h sur grand écran ! 🍽️\n✨ Garba Thon 10 €\n📍 Chez Demba, Angers\nRépondez OUI pour réserver votre table.\nRépondez STOP pour ne plus recevoir nos messages.',
   E'Bonjour {{prenom}} 👋\nPetit rappel : le match Côte d''Ivoire vs Sénégal commence dans 12h ! ⚽\n📍 Chez Demba, Angers\nRépondez RÉSERVE si vous voulez une table.\nRépondez STOP pour ne plus recevoir nos messages.',
   'brouillon'),
  ('22222222-2222-2222-2222-222222222222',
   'Offre week-end coiffure', 'promotion',
   date_trunc('week', now()) + interval '4 days 10 hours',
   date_trunc('week', now()) + interval '2 days 10 hours',
   24,
   date_trunc('week', now()) + interval '3 days 10 hours',
   '-20 % sur les prestations coiffure', 'Salon Belle Époque, Angers',
   '{clients_habitues,vip,beaute}',
   E'Bonjour {{prenom}} 👋\nLe Salon Belle Époque vous propose une offre exclusive ce week-end : -20 % sur les prestations coiffure. ✨\n📍 Salon Belle Époque, Angers\nRépondez OUI pour prendre rendez-vous.\nRépondez STOP pour ne plus recevoir nos messages.',
   E'Bonjour {{prenom}} 👋\nDernières places pour l''offre -20 % de ce week-end !\nRépondez OUI pour réserver votre créneau.\nRépondez STOP pour ne plus recevoir nos messages.',
   'brouillon'),
  ('33333333-3333-3333-3333-333333333333',
   'Nouvel arrivage collection wax', 'lancement_produit',
   date_trunc('week', now()) + interval '5 days 11 hours',
   date_trunc('week', now()) + interval '4 days 11 hours',
   12,
   date_trunc('week', now()) + interval '4 days 23 hours',
   'Nouvelle collection en avant-première pour nos VIP', 'Wax & Style, Nantes',
   '{vip}',
   E'Bonjour {{prenom}} 👋\nLa nouvelle collection wax arrive samedi chez Wax & Style ! 🛍️\n✨ Avant-première réservée à nos clientes VIP dès 11h.\n📍 Wax & Style, Nantes\nRépondez INFO pour plus de détails.\nRépondez STOP pour ne plus recevoir nos messages.',
   E'Bonjour {{prenom}} 👋\nC''est demain 11h : avant-première de la nouvelle collection ! 🛍️\n📍 Wax & Style, Nantes\nRépondez STOP pour ne plus recevoir nos messages.',
   'brouillon'),
  ('44444444-4444-4444-4444-444444444444',
   'Réunion communautaire + repas partagé', 'invitation',
   date_trunc('week', now()) + interval '6 days 15 hours',
   date_trunc('week', now()) + interval '4 days 12 hours',
   24,
   date_trunc('week', now()) + interval '5 days 15 hours',
   'Réunion suivie d''un repas partagé', 'Salle des fêtes, Angers',
   '{association,famille}',
   E'Bonjour {{prenom}} 👋\nL''Association Teranga 49 vous invite à sa réunion communautaire dimanche à 15h, suivie d''un repas partagé. 🤝\n📍 Salle des fêtes, Angers\nRépondez OUI si vous serez présent(e).\nRépondez STOP pour ne plus recevoir nos messages.',
   E'Bonjour {{prenom}} 👋\nRappel : réunion + repas partagé demain 15h. On compte sur vous ! 🤝\n📍 Salle des fêtes, Angers\nRépondez STOP pour ne plus recevoir nos messages.',
   'brouillon'),
  ('55555555-5555-5555-5555-555555555555',
   'Soirée Afro — entrée sur réservation', 'evenement',
   date_trunc('week', now()) + interval '5 days 23 hours',
   date_trunc('week', now()) + interval '3 days 19 hours',
   12,
   date_trunc('week', now()) + interval '5 days 11 hours',
   'Entrée sur réservation uniquement', 'Le Warehouse, Paris',
   '{evenementiel,vip,etudiants}',
   E'Bonjour {{prenom}} 👋\nKaay Fecc Events présente la Soirée Afro ce samedi à 23h ! 🎶\n✨ Entrée sur réservation uniquement.\n📍 Le Warehouse, Paris\nRépondez RÉSERVE pour garantir votre place.\nRépondez STOP pour ne plus recevoir nos messages.',
   E'Bonjour {{prenom}} 👋\nC''est ce soir ! Soirée Afro à 23h — dernières places. 🎶\n📍 Le Warehouse, Paris\nRépondez RÉSERVE maintenant.\nRépondez STOP pour ne plus recevoir nos messages.',
   'brouillon');

-- Démo suggérée : ouvrir la campagne "Match Côte d'Ivoire vs Sénégal",
-- cliquer "Simuler l'envoi" puis "Simuler des réponses" → statistiques réalistes.
