'use client';
/** Page 1 — Connexion admin agence. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Field from '@/components/Field';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.push('/dashboard');
    else setError('Mot de passe incorrect');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark to-brand p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl text-white">💬</div>
          <h1 className="text-xl font-bold">DJELI&apos;S PROMO AI</h1>
          <p className="mt-1 text-sm text-gray-500">Espace agence</p>
        </div>
        <Field label="Mot de passe administrateur">
          <input
            type="password" className="input" value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
          />
        </Field>
        <p className="mt-2 min-h-[1.25rem] text-sm text-red-600" role="alert" aria-live="polite">{error}</p>
        <button className="btn mt-4 w-full justify-center" disabled={loading || !password}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
