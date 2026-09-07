import { deleteResource } from '@/lib/resources';
export { campaignGet as GET, campaignsPut as PUT } from '@/lib/resources';
export const DELETE=deleteResource('campaigns');
