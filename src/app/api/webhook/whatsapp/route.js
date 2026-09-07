import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { api,constantEqual,HttpError,readText,checked } from '@/lib/api';
import { db } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
export const GET=api(async request=>{
  const q=new URL(request.url).searchParams;
  const secret=process.env.WHATSAPP_VERIFY_TOKEN;
  if(!secret||secret.length<16)throw new HttpError(503,'Webhook non configuré.');
  if(q.get('hub.mode')!=='subscribe'||!constantEqual(q.get('hub.verify_token'),secret))throw new HttpError(403,'Vérification refusée.');
  return new NextResponse(q.get('hub.challenge')||'',{headers:{'Content-Type':'text/plain'}});
},{auth:false,origin:false});
export const POST=api(async request=>{
  const secret=process.env.WHATSAPP_APP_SECRET;
  if(!secret||secret.length<32)throw new HttpError(503,'Webhook non configuré.');
  const raw=await readText(request,2*1024*1024);
  const expected='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
  if(!constantEqual(request.headers.get('x-hub-signature-256'),expected))throw new HttpError(403,'Signature invalide.');
  let body;try{body=JSON.parse(raw);}catch{throw new HttpError(400,'JSON invalide.');}
  if(!body||body.object!=='whatsapp_business_account'||!Array.isArray(body.entry)||body.entry.length>100)throw new HttpError(400,'Notification invalide.');
  const records=[];
  for(const entry of body.entry){
    if(!Array.isArray(entry.changes))throw new HttpError(400,'Notification invalide.');
    for(const change of entry.changes){
      const value=change.value;
      if(!value?.metadata?.phone_number_id)continue;
      const client=checked(await db().from('clients').select('id').eq('wa_phone_number_id',String(value.metadata.phone_number_id)).maybeSingle());
      if(!client)continue;
      if(value.messages&&!Array.isArray(value.messages)||value.statuses&&!Array.isArray(value.statuses))throw new HttpError(400,'Notification invalide.');
      for(const m of value.messages||[]){
        const text=m.text?.body||m.button?.text||m.interactive?.button_reply?.title||'';
        const phone=normalizePhone(m.from);
        if(!phone||!text)continue;
        if(typeof text!=='string'||text.length>5000||typeof m.id!=='string'||m.id.length>300)throw new HttpError(400,'Message invalide.');
        records.push({id:`${client.id}:in:${m.id}`,client_id:client.id,payload:{type:'message',phone,text,waMessageId:m.id,name:value.contacts?.find(c=>c.wa_id===m.from)?.profile?.name?.slice(0,200)||null}});
      }
      for(const s of value.statuses||[]){
        if(!['sent','delivered','read','failed'].includes(s.status)||typeof s.id!=='string'||s.id.length>300)continue;
        records.push({id:`${client.id}:status:${s.id}:${s.status}`,client_id:client.id,payload:{type:'status',id:s.id,status:s.status}});
      }
    }
  }
  if(records.length>500)throw new HttpError(413,'Trop de notifications.');
  if(records.length)checked(await db().from('webhook_inbox').upsert(records,{onConflict:'id',ignoreDuplicates:true}));
  return NextResponse.json({ok:true});
},{auth:false,origin:false});
