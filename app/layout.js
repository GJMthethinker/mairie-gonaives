import "./globals.css";

export const metadata = {
  title: "Mairie des Gonaïves — Système municipal",
  description: "Système numérique de la Mairie des Gonaïves",
  manifest: "/manifest.json",
  themeColor: "#1B2A4A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mairie Gonaïves",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
