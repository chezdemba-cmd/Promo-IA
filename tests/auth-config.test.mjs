import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes, createHmac } from 'node:crypto';

const source = readFileSync(new URL('../src/lib/auth.js', import.meta.url), 'utf8');
const auth = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('P0: missing, weak and example session secrets fail closed', async () => {
  const previous = process.env.SESSION_SECRET;
  try {
    for (const secret of ['', 'dev-secret', 'a'.repeat(64), 'chaine-aleatoire-longue-pour-signer-les-cookies']) {
      process.env.SESSION_SECRET = secret;
      assert.throws(() => auth.sessionSecret());
      const forged = createHmac('sha256', 'dev-secret').update('admin-session').digest('hex');
      assert.equal(await auth.isAuthenticated(new Request('http://localhost', {
        headers: { cookie: 'djelis_session=' + forged },
      })), false);
    }
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
    assert.equal(auth.sessionSecret(), process.env.SESSION_SECRET);
    assert.equal(await auth.isAuthenticated(new Request('http://localhost', {
      headers: { cookie: 'djelis_session=%invalid' },
    })), false);
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  }
});
