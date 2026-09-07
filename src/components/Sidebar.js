'use client';
/** Navigation latérale : fixe sur desktop, tiroir superposé sur mobile. */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/clients', label: 'Clients', icon: '🏪' },
  { href: '/contacts', label: 'Contacts', icon: '👥' },
  { href: '/campagnes', label: 'Campagnes', icon: '📣' },
  { href: '/parametres', label: 'Paramètres', icon: '⚙️' },
];

function NavContent({ pathname, onNavigate, onLogout }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg text-white" aria-hidden="true">💬</span>
        <div>
          <p className="text-sm font-bold leading-tight">DJELI&apos;S PROMO AI</p>
          <p className="text-xs text-gray-500">Espace agence</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {LINKS.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-brand/10 text-brand-dark' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <span aria-hidden="true">{l.icon}</span>{l.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={onLogout} className="m-3 rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50">
        ← Déconnexion
      </button>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      {/* Barre supérieure mobile */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-lg leading-none">☰</button>
        <p className="text-sm font-bold">DJELI&apos;S PROMO AI</p>
      </div>

      {/* Tiroir mobile */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Fermer le menu" onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40" tabIndex={-1} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <NavContent pathname={pathname} onNavigate={() => setOpen(false)} onLogout={logout} />
          </aside>
        </div>
      )}

      {/* Barre latérale desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <NavContent pathname={pathname} onNavigate={undefined} onLogout={logout} />
      </aside>
    </>
  );
}
