import { db } from '@/lib/supabase';
import { classifyReply } from '@/lib/ai';
import { checked, HttpError } from '@/lib/api';
export async function processIncomingMessage({client,contact,text,campaignId=null,waMessageId=null,simulated=false,phone=null,name=null}) {
  if(typeof text!=='string'||text.length>5000)throw new HttpError(400,'Message invalide.');
  const id=waMessageId || (simulated && campaignId && contact?.id ? `demo:${campaignId}:${contact.id}` : null);
  if(!id)throw new HttpError(400,'Identifiant de message requis.');
  // Avoid repeated classification charges for acknowledged events.
  const existing=checked(await db().from('messages').select('id,intent').eq('client_id',client.id).eq('wa_message_id',id).maybeSingle());
  if(existing)return {messageId:existing.id,intent:existing.intent,duplicate:true};
  const intent=await classifyReply(text);
  return checked(await db().rpc('record_incoming',{
    p_client:client.id,p_phone:phone||contact.phone,p_name:name||contact?.first_name||null,p_text:text,
    p_wa_id:id,p_intent:intent,p_campaign:campaignId,p_simulated:simulated,
  }));
}
