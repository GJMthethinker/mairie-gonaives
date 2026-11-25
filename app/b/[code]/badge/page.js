import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vérification de badge — Mairie des Gonaïves",
  robots: { index: false, follow: false },
};

async function chargerBadge(code) {
  if (!/^[a-f0-9]{32}$/i.test(code || "")) return { trouve: false };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc("verifier_badge", { p_code: code.toLowerCase() });
  if (error || !data) return { erreur: true };
  return data;
}

export default async function BadgePublicPage({ params }) {
  const { code } = await params;
  const b = await chargerBadge(code);

  const photoUrl =
    b.photo_path && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/badge-photos/${b.photo_path}`
      : null;

  let etat = "inconnu";
  if (b.erreur) etat = "erreur";
  else if (b.trouve) etat = b.valide ? "valide" : "invalide";

  const theme = {
    valide: { bg: "#0B6B3A", titre: "Badge valide", icone: "✓" },
    invalide: { bg: "#A8332B", titre: "Badge expiré ou révoqué", icone: "✕" },
    inconnu: { bg: "#6B6B5E", titre: "Badge non reconnu", icone: "?" },
    erreur: { bg: "#6B6B5E", titre: "Vérification indisponible", icone: "!" },
  }[etat];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--cream)] text-[var(--ink)]">
      <header className="bg-[#034E28] text-white border-b-2 border-[#F5E600]">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <img src="/logo-mairie.jpg" alt="Mairie des Gonaïves" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#F5E600]" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#F5E600]">République d'Haïti</p>
            <p className="font-display text-base leading-tight">Mairie des Gonaïves</p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-5 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-[var(--line)] overflow-hidden">
          <div className="px-6 py-5 text-white text-center" style={{ background: theme.bg }}>
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {theme.icone}
            </div>
            <h1 className="font-display text-2xl">{theme.titre}</h1>
          </div>

          {b.trouve ? (
            <div className="px-6 py-8 text-center">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`${b.prenom} ${b.nom}`}
                  className="mx-auto w-40 h-52 object-cover rounded-2xl border border-[var(--line)]"
                  style={etat === "invalide" ? { filter: "grayscale(1)", opacity: 0.7 } : undefined}
                />
              ) : (
                <div className="mx-auto w-40 h-52 rounded-2xl bg-[#F1EEDF] flex items-center justify-center text-4xl text-[var(--ink-muted)] font-display">
                  {(b.prenom || "?").charAt(0)}
                  {(b.nom || "").charAt(0)}
                </div>
              )}
              <p className="mt-5 font-display text-2xl leading-tight">
                {b.prenom} <span className="uppercase">{b.nom}</span>
              </p>
              <p className="mt-2 text-base">{b.fonction}</p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{b.direction}</p>
              {etat === "invalide" && (
                <p className="mt-6 text-sm text-[#A8332B]">
                  Ce badge n'est plus valable. Ne lui accordez aucun accès et signalez-le à la Mairie.
                </p>
              )}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-[var(--ink-muted)]">
              {etat === "erreur"
                ? "Le service de vérification ne répond pas pour le moment. Veuillez réessayer dans quelques instants."
                : "Ce code ne correspond à aucun badge émis par la Mairie des Gonaïves."}
            </div>
          )}
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-[var(--ink-muted)]">
        Système de vérification conçu par <span className="font-semibold">ORAKEY</span>
      </footer>
    </div>
  );
}
