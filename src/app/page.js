import { redirect } from 'next/navigation';
/** La racine renvoie vers le dashboard (le middleware redirige vers /login si besoin). */
export default function Home() {
  redirect('/dashboard');
}
