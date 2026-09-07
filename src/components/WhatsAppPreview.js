/**
 * Aperçu d'un message tel qu'il apparaîtra sur WhatsApp
 * (bulle verte, fond conversation, heure). Central pour le mode démo.
 */
export default function WhatsAppPreview({ message, imageUrl, senderName = 'Votre entreprise' }) {
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
      {/* Barre de titre WhatsApp */}
      <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">🏪</div>
        <div>
          <p className="text-sm font-semibold leading-tight">{senderName}</p>
          <p className="text-[11px] text-white/70">Compte professionnel</p>
        </div>
      </div>
      {/* Fond de conversation */}
      <div className="bg-[#ECE5DD] p-4" style={{ minHeight: 120 }}>
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#DCF8C6] p-2 shadow">
          {imageUrl && (
            <img src={imageUrl} alt="Visuel de la campagne" className="mb-2 max-h-44 w-full rounded object-cover" />
          )}
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {message || 'Votre message apparaîtra ici…'}
          </p>
          <p className="mt-1 text-right text-[10px] text-gray-500">{now} ✓✓</p>
        </div>
      </div>
    </div>
  );
}
