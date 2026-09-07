import { NextResponse } from 'next/server';
import { api, jsonBody, rateLimit } from '@/lib/api';
import { sendSchema } from '@/lib/contracts';
import { validId } from '@/lib/resources';
import { sendCampaign } from '@/lib/campaigns';
export const maxDuration=60;
export const POST=api(async(request,{params})=>{
  const {kind}=await jsonBody(request,sendSchema);
  await rateLimit('campaign-dispatch',30,60);
  return NextResponse.json(await sendCampaign(validId(params.id),kind));
});
