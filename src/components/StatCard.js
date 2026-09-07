/** Carte de statistique simple pour les dashboards. */
export default function StatCard({ label, value, icon, accent = false }) {
  return (
    <div className={`card flex items-center gap-4 ${accent ? 'border-brand/30 bg-brand/5' : ''}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold leading-tight">{value ?? '—'}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
