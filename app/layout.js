import "./globals.css";

export const metadata = {
  title: "Mairie des Gonaïves — Système municipal",
  description: "Système numérique de la Mairie des Gonaïves",
  manifest: "/manifest.json",
  themeColor: "#034E28",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mairie Gonaïves",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Public+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
