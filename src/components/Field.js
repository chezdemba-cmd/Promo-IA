'use client';
/**
 * Champ de formulaire dont le libellé est réellement associé au contrôle.
 * Le <label> enveloppe le texte ET le contrôle (association implicite),
 * ce qui satisfait les lecteurs d'écran sans dépendre d'un id unique.
 */
export default function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
