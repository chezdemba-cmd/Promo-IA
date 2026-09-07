import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database-helper.mjs';

async function seed(pg) {
  await pg.exec("set role service_role");
  const client = (await pg.query("insert into public.clients(name) values('Chez Demba') returning id")).rows[0].id;
  const other = (await pg.query("insert into public.clients(name) values('Autre') returning id")).rows[0].id;
  const contact = (await pg.query(
    `insert into public.contacts(client_id, phone, consent, status, category)
     values ($1, '+33612345678', true, 'actif', 'clients_habitues') returning id`, [client])).rows[0].id;
  const campaign = (await pg.query(
    `insert into public.campaigns(client_id, name, status, send_at, message_main, message_reminder)
     values ($1, 'Ouverture', 'programme', now(), 'Bonjour {{prenom}} STOP', 'Rappel STOP') returning id`, [client])).rows[0].id;
  return { client, other, contact, campaign };
}

test('R06: a campaign cannot enqueue the same contact twice for one kind', async () => {
  const pg = await database({ migrations: true });
  try {
    const { client, contact, campaign } = await seed(pg);
    const insert = () => pg.query(
      `insert into public.messages(client_id, campaign_id, contact_id, direction, kind, body, status)
       values ($1, $2, $3, 'out', 'main', 'x STOP', 'queued')`, [client, campaign, contact]);
    await insert();
    await assert.rejects(insert(), /unique|duplicate/i);
  } finally { await pg.close(); }
});

test('R10: a message cannot mix one client with another client\'s contact', async () => {
  const pg = await database({ migrations: true });
  try {
    const { other, contact, campaign } = await seed(pg);
    await assert.rejects(pg.query(
      `insert into public.messages(client_id, campaign_id, contact_id, direction, kind, body, status)
       values ($1, $2, $3, 'out', 'main', 'x STOP', 'queued')`, [other, campaign, contact]),
      /violates foreign key|messages_contact_tenant/i);
  } finally { await pg.close(); }
});

test('R09: record_incoming is idempotent on the Meta message id', async () => {
  const pg = await database({ migrations: true });
  try {
    const { client, campaign } = await seed(pg);
    const call = () => pg.query(
      `select public.record_incoming($1,'+33612345678','Awa','Bonjour','wamid.ABC','INTERESSE',$2,false) as r`,
      [client, campaign]);
    const first = (await call()).rows[0].r;
    const second = (await call()).rows[0].r;
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    const n = (await pg.query("select count(*)::int c from public.messages where wa_message_id = 'wamid.ABC'")).rows[0].c;
    assert.equal(n, 1);
  } finally { await pg.close(); }
});

test('R12: deleting a contact scrubs its free text from history', async () => {
  const pg = await database({ migrations: true });
  try {
    const { client, contact, campaign } = await seed(pg);
    await pg.query(
      `insert into public.messages(client_id, campaign_id, contact_id, direction, kind, body, status)
       values ($1, $2, $3, 'in', 'reply', 'Awa Diallo, 06 12 34 56 78', 'received')`, [client, campaign, contact]);
    await pg.query(
      `insert into public.reservations(client_id, contact_id, campaign_id, details) values ($1, $2, $3, 'On sera 4 - Awa')`,
      [client, contact, campaign]);
    await pg.query(
      `insert into public.optouts(client_id, contact_id, campaign_id, original_message) values ($1, $2, $3, 'STOP - Awa Diallo')`,
      [client, contact, campaign]);

    await pg.query('delete from public.contacts where id = $1', [contact]);

    const m = (await pg.query("select body, handled from public.messages where client_id = $1 and direction = 'in'", [client])).rows[0];
    assert.equal(m.body, null);
    assert.equal(m.handled, true);
    assert.equal((await pg.query('select details from public.reservations')).rows[0].details, null);
    assert.equal((await pg.query('select original_message from public.optouts')).rows[0].original_message, null);
  } finally { await pg.close(); }
});

test('R18-adjacent: a late status notification never regresses read → sent', async () => {
  const pg = await database({ migrations: true });
  try {
    const { client, contact, campaign } = await seed(pg);
    await pg.query(
      `insert into public.messages(client_id, campaign_id, contact_id, direction, kind, body, wa_message_id, status)
       values ($1, $2, $3, 'out', 'manual', 'x STOP', 'wamid.S', 'sent')`, [client, campaign, contact]);
    await pg.query("select public.record_delivery_status($1, 'wamid.S', 'read')", [client]);
    await pg.query("select public.record_delivery_status($1, 'wamid.S', 'sent')", [client]);
    const s = (await pg.query("select status from public.messages where wa_message_id = 'wamid.S'")).rows[0].status;
    assert.equal(s, 'read');
  } finally { await pg.close(); }
});

test('R08b: prepare_campaign refuses a body without a STOP mention', async () => {
  const pg = await database({ migrations: true });
  try {
    await pg.exec('set role service_role');
    const client = (await pg.query("insert into public.clients(name) values('Chez Demba') returning id")).rows[0].id;
    const campaign = (await pg.query(
      `insert into public.campaigns(client_id, name, status, send_at, message_main)
       values ($1, 'Sans stop', 'programme', now(), 'Venez nombreux ce soir') returning id`, [client])).rows[0].id;
    await assert.rejects(
      pg.query('select public.prepare_campaign($1, $2, $3)', [campaign, 'main', true]),
      /STOP required/);
  } finally { await pg.close(); }
});

test('R08: a STOP reply revokes consent and skips queued messages', async () => {
  const pg = await database({ migrations: true });
  try {
    const { client, contact, campaign } = await seed(pg);
    await pg.query(
      `insert into public.messages(client_id, campaign_id, contact_id, direction, kind, body, status)
       values ($1, $2, $3, 'out', 'reminder', 'x STOP', 'queued')`, [client, campaign, contact]);
    await pg.query(
      `select public.record_incoming($1,'+33612345678','Awa','STOP','wamid.STOP','STOP',$2,false)`,
      [client, campaign]);
    const c = (await pg.query('select consent, status from public.contacts where id = $1', [contact])).rows[0];
    assert.equal(c.consent, false);
    assert.equal(c.status, 'stop');
    const queued = (await pg.query(
      "select count(*)::int c from public.messages where contact_id = $1 and status = 'queued'", [contact])).rows[0].c;
    assert.equal(queued, 0);
    const opt = (await pg.query('select count(*)::int c from public.optouts where contact_id = $1', [contact])).rows[0].c;
    assert.equal(opt, 1);
  } finally { await pg.close(); }
});
