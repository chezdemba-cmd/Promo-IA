import { NextResponse } from 'next/server';
import { api,jsonBody,rateLimit } from '@/lib/api';
import { generateSchema } from '@/lib/contracts';
import { row } from '@/lib/resources';
import { generateCampaignMessages } from '@/lib/ai';
export const POST=api(async request=>{
  const b=await jsonBody(request,generateSchema);
  await rateLimit('ai-generate',20,3600);
  const client=await row('clients',b.client_id);
  return NextResponse.json(await generateCampaignMessages({clientName:client.name,sector:client.sector,tone:client.tone,campaignName:b.campaignName,type:b.type,eventAt:b.event_at,offer:b.offer,location:b.location,reminderHours:b.reminder_hours}));
});
