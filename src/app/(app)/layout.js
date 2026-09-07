import Sidebar from '@/components/Sidebar';

/** Layout des pages protégées : navigation + contenu. Auth assurée par src/proxy.js. */
export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
