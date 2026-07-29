import "./globals.css";

export const metadata = {
  title: "Mairie des Gonaïves — Système municipal",
  description: "Système numérique de la Mairie des Gonaïves",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
