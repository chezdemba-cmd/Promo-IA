import './globals.css';

export const metadata = {
  title: "DJELI'S PROMO AI",
  description: "L'agent IA qui transforme vos contacts en clients présents, réservations et ventes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
