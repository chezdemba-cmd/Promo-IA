import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { api,jsonBody,checked,HttpError,rateLimit } from '@/lib/api';
import { importSchema } from '@/lib/contracts';
import { db } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
import { allRows,row } from '@/lib/resources';
export const POST=api(async request=>{
 const {client_id,csv}=await jsonBody(request,importSchema,1100000);
 await rateLimit('contact-import',10,3600);await row('clients',client_id);
 let records;try{records=parse(csv,{columns:true,bom:true,skip_empty_lines:true,trim:true,delimiter:csv.split(/\r?\n/)[0].includes(';')?';':',',max_record_size:10000});}
 catch{throw new HttpError(400,'CSV invalide. Vérifiez les colonnes et les guillemets.');}
 if(!records.length||records.length>5000)throw new HttpError(400,'Le fichier doit contenir de 1 à 5000 contacts.');
 if(!Object.hasOwn(records[0],'telephone'))throw new HttpError(400,'Colonne telephone obligatoire.');
 const known=new Set((await allRows('contacts','id,phone',q=>q.eq('client_id',client_id))).map(c=>c.phone));
 const rows=[],rejected=[];
 for(const [i,r]of records.entries()){
   const phone=normalizePhone(r.telephone),consent=['oui','yes','true','1'].includes((r.consentement||'').toLowerCase());
   let reason=!phone?'Téléphone invalide':!consent?'Consentement manquant':!r.source_consentement?.trim()?'Source du consentement obligatoire':known.has(phone)?'Doublon':null;
   if(Object.values(r).some(v=>v.length>300))reason='Champ trop long';
   if(reason){rejected.push({ligne:i+2,raison:reason});continue;}
   known.add(phone);rows.push({client_id,phone,first_name:r.prenom||null,last_name:r.nom||null,email:r.email||null,category:r.categorie||'clients_habitues',city:r.ville||null,consent:true,consent_source:r.source_consentement,consent_date:new Date().toISOString(),status:'actif'});
 }
 // One SQL insert: no partial import if the operation fails.
 if(rows.length)checked(await db().from('contacts').insert(rows));
 return NextResponse.json({inserted:rows.length,rejected,total:records.length});
});
