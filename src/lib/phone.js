/**
 * Normalisation des numéros de téléphone au format E.164.
 * Par défaut, les numéros nationaux français (06/07…) sont convertis en +33.
 */

/**
 * @param {string} raw - numéro saisi ("06 12 34 56 78", "+225 07...", etc.)
 * @param {string} defaultCountryCode - indicatif par défaut sans le + (ex : "33")
 * @returns {string|null} numéro E.164 (+33612345678) ou null si invalide
 */
export function normalizePhone(raw, defaultCountryCode = '33') {
  if (!raw) return null;
  let p = String(raw).replace(/[\s.\-()]/g, ''); // retire espaces, points, tirets, parenthèses
  if (p.startsWith('00')) p = '+' + p.slice(2);  // 0033... → +33...
  if (!p.startsWith('+')) {
    if (p.startsWith('0')) p = '+' + defaultCountryCode + p.slice(1); // 06... → +336...
    else p = '+' + p;                                                  // 336... → +336...
  }
  // E.164 : + suivi de 8 à 15 chiffres
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}
