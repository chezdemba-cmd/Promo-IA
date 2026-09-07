import { NextResponse } from 'next/server';
import { api,checked,constantEqual,HttpError,rateLimit } from '@/lib/api';
import { db } from '@/lib/supabase';
import { processIncomingMessage } from '@/lib/inbound';
import { sendCampaign } from '@/lib/campaigns';
export const maxDuration=60;
export const GET=api(async request=>{
  const secret=process.env.CRON_SECRET;
  if(!secret||secret.length<32)throw new HttpError(503,'Planificateur non configuré.');
  if(!constantEqual(request.headers.get('authorization'),`Bearer ${secret}`))throw new HttpError(401,'Non autorisé.');
  await rateLimit('scheduler',12,60);
  const supa=db();const processed=[];
  for(let i=0;i<3;i++){
    const event=checked(await supa.rpc('claim_webhook_event'));
    if(!event)break;
    const p=event.payload;
    if(p.type==='message')await processIncomingMessage({client:{id:event.client_id},phone:p.phone,name:p.name,text:p.text,waMessageId:p.waMessageId});
    else checked(await supa.rpc('record_delivery_status',{p_client:event.client_id,p_wa_id:p.id,p_status:p.status}));
    checked(await supa.from('webhook_inbox').update({state:'done',payload:{}}).eq('id',event.id));
    processed.push(event.id);
  }
  const work=checked(await supa.rpc('next_campaign_work'));
  const campaign=work?await sendCampaign(work.id,work.kind):null;
  checked(await supa.from('admin_sessions').delete().lt('expires_at',new Date().toISOString()));
  checked(await supa.from('rate_limits').delete().lt('window_at',new Date(Date.now()-86400000).toISOString()));
  checked(await supa.from('webhook_inbox').delete().eq('state','done').lt('created_at',new Date(Date.now()-30*86400000).toISOString()));
  checked(await supa.from('settings').upsert({key:'scheduler_last_success',value:new Date().toISOString(),updated_at:new Date().toISOString()}));
  console.info(JSON.stringify({event:'scheduler_complete',processed:processed.length,campaign}));
  return NextResponse.json({processed:processed.length,campaign});
},{auth:false,origin:false});
