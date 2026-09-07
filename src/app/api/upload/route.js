/**
 * POST /api/upload — visuel de campagne vers Supabase Storage.
 * FormData { file } → { url }.
 *
 * Le contenu est réellement décodé puis ré-encodé par sharp : l'extension et
 * le type MIME fournis par le client ne sont jamais pris pour argent comptant
 * (audit R20). Seuls de vrais bitmaps ressortent, toujours en WebP.
 */
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { api, HttpError, rateLimit } from '@/lib/api';
import { db } from '@/lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIM = 4096;

export const POST = api(async request => {
  await rateLimit('upload', 60, 3600); // plafond anti-abus : 60 visuels / heure

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'Fichier manquant.');
  if (file.size === 0) throw new HttpError(400, 'Fichier vide.');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'Fichier trop lourd (5 Mo maximum).');

  const input = Buffer.from(await file.arrayBuffer());
  let output, meta;
  try {
    const image = sharp(input, { failOn: 'error' });
    meta = await image.metadata();
    if (!meta.width || !meta.height) throw new Error('no dimensions');
    if (meta.width > MAX_DIM || meta.height > MAX_DIM) throw new HttpError(400, `Image trop grande (${MAX_DIM}px maximum par côté).`);
    output = await image.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(415, 'Fichier image invalide ou corrompu.');
  }

  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
  const { error } = await db().storage.from('visuels').upload(path, output, {
    contentType: 'image/webp', cacheControl: '31536000', upsert: false,
  });
  if (error) throw new HttpError(502, 'Le stockage du visuel a échoué. Réessayez.');

  const { data } = db().storage.from('visuels').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
});
