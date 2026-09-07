/** Meta calls are never automatically retried: a timeout may hide an accepted send. */
const GRAPH_VERSION=process.env.WHATSAPP_GRAPH_VERSION||'v21.0';
export function isDemo(client) { return process.env.DEMO_MODE !== 'false' || client?.demo_mode === true; }
function configured(client) {
  return client && /^\d{5,30}$/.test(client.wa_phone_number_id||'') && client.wa_access_token && /^v\d+\.\d+$/.test(GRAPH_VERSION);
}
export async function sendCampaignMessage(client,toPhone,body,imageUrl=null,firstName='') {
  if(isDemo(client))return {ok:true,simulated:true};
  if(!configured(client))return {ok:false,error:'Identifiants WhatsApp manquants ou invalides.'};
  const name=imageUrl?client.wa_image_template_name:client.wa_template_name;
  if(!name)return {ok:false,error:'Template approuvé manquant pour ce format de message.'};
  if(!/\bstop\b/i.test(body||''))return {ok:false,error:'Mention STOP obligatoire.'};
  const text=(body||'').replace(/[\r\n\t]+/g,' ').replace(/ {2,}/g,' ').trim();
  if(text.length>1024)return {ok:false,error:'Message trop long pour le template (1024 caractères maximum).'};
  const components=[];
  if(imageUrl)components.push({type:'header',parameters:[{type:'image',image:{link:imageUrl}}]});
  components.push({type:'body',parameters:[{type:'text',text:(firstName||'client').replace(/\s+/g,' ').trim()},{type:'text',text}]});
  return callGraph(client,{messaging_product:'whatsapp',to:toPhone.replace('+',''),type:'template',template:{name,language:{code:'fr'},components}});
}
/**
 * Réponse manuelle de l'opérateur : message texte de session (hors template),
 * autorisé par Meta dans la fenêtre de 24 h suivant le dernier message du contact.
 */
export async function sendText(client,toPhone,body) {
  if(isDemo(client))return {ok:true,simulated:true};
  if(!configured(client))return {ok:false,error:'Identifiants WhatsApp manquants ou invalides.'};
  const text=(body||'').trim();
  if(!text)return {ok:false,error:'Message vide.'};
  if(text.length>4096)return {ok:false,error:'Message trop long (4096 caractères maximum).'};
  return callGraph(client,{messaging_product:'whatsapp',to:toPhone.replace('+',''),type:'text',text:{body:text,preview_url:false}});
}
async function callGraph(client,payload) {
  try {
    const res=await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${client.wa_phone_number_id}/messages`,{
      method:'POST',headers:{Authorization:`Bearer ${client.wa_access_token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000),
    });
    const data=await res.json();
    if(!res.ok)return {ok:false,uncertain:res.status>=500,error:`Meta a refusé l’envoi (HTTP ${res.status}, code ${Number(data?.error?.code)||0}).`};
    if(!data.messages?.[0]?.id)return {ok:false,uncertain:true,error:'Réponse Meta sans identifiant : vérifier la livraison.'};
    return {ok:true,waMessageId:data.messages[0].id};
  } catch { return {ok:false,uncertain:true,error:'Résultat Meta incertain après interruption réseau. Ne pas renvoyer sans vérification.'}; }
}
export function personalize(body,contact) {return (body||'').replaceAll('{{prenom}}',contact.first_name||'cher client').replaceAll('{{nom}}',contact.last_name||'');}
