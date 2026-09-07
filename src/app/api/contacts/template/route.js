import { api } from '@/lib/api';
/** GET /api/contacts/template — télécharge le modèle CSV d'import. */
import { NextResponse } from 'next/server';

const MODEL = `prenom,nom,telephone,email,categorie,ville,consentement,source_consentement
Awa,Diallo,+33612345678,awa@example.com,vip,Angers,oui,formulaire boutique
Moussa,Traoré,0698765432,,clients_habitues,Angers,oui,inscription soirée
`;

export const GET = api(async () => {
  return new NextResponse(MODEL, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modele-contacts.csv"',
    },
  });
});
