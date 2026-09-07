/** Ne jamais renvoyer le token WhatsApp d'un client au navigateur. */
export function maskClient(c) {
  return { ...c, wa_access_token: c.wa_access_token ? '••••••' : null };
}
