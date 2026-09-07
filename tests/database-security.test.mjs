import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database-helper.mjs';
test('P0: public roles cannot read or mutate business tables or statistics', async () => {
  const pg = await database({ migrations: true });
  try {
    for (const role of ['anon', 'authenticated']) {
      await pg.exec(`set role ${role}`);
      for (const table of ['clients','contacts','campaigns','messages','reservations','optouts','settings','campaign_stats']) {
        await assert.rejects(pg.query(`select * from public.${table}`), /permission denied/);
      }
      await assert.rejects(pg.query("insert into public.clients(name) values('unauthorized')"), /permission denied/);
      await pg.exec('reset role');
    }
    await pg.exec('set role service_role');
    await pg.exec("insert into public.clients(name) values('agency test')");
    assert.equal((await pg.query('select name from public.clients')).rows[0].name, 'agency test');
    await pg.query('select * from public.campaign_stats');
  } finally { await pg.close(); }
});
