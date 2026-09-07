import { db } from '@/lib/supabase';
import { sendCampaignMessage, isDemo } from '@/lib/whatsapp';
import { checked, HttpError } from '@/lib/api';
export function computeReminderAt(eventAt, reminderHours) {
  if (!eventAt || reminderHours == null) return null;
  if (!Number.isInteger(reminderHours) || reminderHours < 1 || reminderHours > 720 || !Number.isFinite(Date.parse(eventAt))) throw new HttpError(400, 'Date ou délai de rappel invalide.');
  return new Date(Date.parse(eventAt) - reminderHours * 3600000).toISOString();
}
export async function sendCampaign(campaignId, kind = 'main') {
  if (!['main','reminder'].includes(kind)) throw new HttpError(400,'Type d’envoi invalide.');
  const supa = db();
  const campaign = checked(await supa.from('campaigns').select('*').eq('id',campaignId).maybeSingle());
  if (!campaign) throw new HttpError(404,'Campagne introuvable.');
  const client = checked(await supa.from('clients').select('*').eq('id',campaign.client_id).single());
  const demo = isDemo(client);
  checked(await supa.rpc('prepare_campaign',{p_campaign:campaignId,p_kind:kind,p_demo:demo}));
  const deadline = Date.now()+20000;
  for(let i=0; i<5 && Date.now()<deadline; i++) {
    const job = checked(await supa.rpc('claim_campaign_message',{p_campaign:campaignId,p_kind:kind}));
    if (!job) break;
    const { message, contact, client: currentClient, campaign: currentCampaign } = job;
    // Persisted mode cannot silently switch between demonstration and real delivery.
    let result;
    if (Boolean(message.simulated) !== Boolean(isDemo(currentClient))) result={ok:false,error:'Le mode de livraison a changé. Vérification manuelle requise.'};
    else {
      // Final read narrows the STOP race. An already-dispatched Meta request cannot be recalled.
      const current = checked(await supa.from('contacts').select('consent,status').eq('id',contact.id).maybeSingle());
      if (!current || !current.consent || ['stop','bloque','erreur'].includes(current.status)) {
        checked(await supa.rpc('finish_campaign_message',{p_message:message.id,p_token:message.dispatch_token,p_status:'skipped',p_wa_id:null,p_error:null})); continue;
      }
      result=await sendCampaignMessage(currentClient,contact.phone,message.body,kind==='main'?currentCampaign.image_url:null,contact.first_name);
    }
    checked(await supa.rpc('finish_campaign_message',{
      p_message:message.id,p_token:message.dispatch_token,
      p_status:result.simulated?'simulated':result.ok?'sent':result.uncertain?'unknown':'failed',
      p_wa_id:result.waMessageId||null,p_error:result.error||null,
    }));
  }
  const report=checked(await supa.rpc('complete_campaign_batch',{p_campaign:campaignId,p_kind:kind}));
  console.info(JSON.stringify({event:'campaign_batch',campaignId,kind,...report}));
  return {...report,simulated:demo};
}
