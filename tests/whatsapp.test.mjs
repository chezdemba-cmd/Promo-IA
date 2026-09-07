import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// whatsapp.js n'a aucun import : chargeable tel quel via data URL.
const source = readFileSync(new URL('../src/lib/whatsapp.js', import.meta.url), 'utf8');
const wa = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const REAL = {
  demo_mode: false, wa_phone_number_id: '123456789012345',
  wa_access_token: 'tok', wa_template_name: 'djelis_generique', wa_image_template_name: 'djelis_image',
};

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) { saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  });
}

test('sendText: mode démo ne joint jamais Meta', () => withEnv({ DEMO_MODE: 'true' }, async () => {
  assert.deepEqual(await wa.sendText(REAL, '+33612345678', 'Bonjour'), { ok: true, simulated: true });
}));

test('sendText: identifiants absents => échec explicite, hors démo', () => withEnv({ DEMO_MODE: 'false' }, async () => {
  const r = await wa.sendText({ demo_mode: false }, '+33612345678', 'Bonjour');
  assert.equal(r.ok, false);
  assert.match(r.error, /identifiants/i);
}));

test('sendText: message vide ou trop long rejeté avant appel réseau', () => withEnv({ DEMO_MODE: 'false' }, async () => {
  assert.equal((await wa.sendText(REAL, '+33612345678', '   ')).ok, false);
  assert.equal((await wa.sendText(REAL, '+33612345678', 'x'.repeat(4097))).ok, false);
}));

test('sendCampaignMessage: refuse un corps sans mention STOP, hors démo', () => withEnv({ DEMO_MODE: 'false' }, async () => {
  const r = await wa.sendCampaignMessage(REAL, '+33612345678', 'Venez nombreux', null, 'Awa');
  assert.equal(r.ok, false);
  assert.match(r.error, /STOP/i);
}));

test('isDemo: DEMO_MODE global l\'emporte sur le client', () => withEnv({ DEMO_MODE: 'true' }, () => {
  assert.equal(wa.isDemo({ demo_mode: false }), true);
}));
