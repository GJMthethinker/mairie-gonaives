"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ActualitesPubliquePage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("news").select("*").order("published_at", { ascending: false });
      setNews(data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e) {
      if (e.key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <header className="bg-[#034E28] text-white relative z-10 border-b-4 border-[#F5E600]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-mairie.jpg" alt="Mairie des Gonaïves" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#F5E600]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#F5E600]">République d'Haïti</p>
              <p className="font-display text-lg leading-tight">Mairie des Gonaïves</p>
            </div>
          </a>
          <a href="/" className="btn-press text-sm border border-[#F5E600]/60 text-[#F5E600] rounded-sm px-4 py-2 hover:bg-[#F5E600] hover:text-[#034E28] transition-colors">
            ← Accueil
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14">
        <h1 className="font-display text-3xl text-[#034E28] mb-2">Actualités</h1>
        <p className="text-sm text-[var(--ink-muted)] mb-8">Toutes les publications de la mairie.</p>

        {loading ? (
          <p className="text-sm text-[var(--ink-muted)]">Chargement…</p>
        ) : news.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">Aucune actualité publiée pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {news.map((n) => (
              <button
                key={n.id}
                onClick={() => n.image_url && setLightbox({ src: n.image_url, alt: n.title })}
                className="card-hover text-left rounded-sm overflow-hidden p-4"
                style={{ background: "#034E28" }}
              >
                {n.image_url && (
                  <div className="img-zoom overflow-hidden rounded-sm mb-4">
                    <img src={n.image_url} alt={n.title} className="w-full h-48 object-cover" />
                  </div>
                )}
                <p className="text-[11px] text-[#F5E600] uppercase tracking-[0.15em] font-bold mb-2">{frDate(n.published_at)}</p>
                <p
                  className="text-white uppercase leading-[1.15] mb-3"
                  style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: 800, fontSize: "1.3rem" }}
                >
                  {n.title}
                </p>
                <p className="text-sm text-[#D9E3D9] whitespace-pre-line leading-relaxed">{n.content}</p>
              </button>
            ))}
          </div>
        )}
      </main>

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} />
            <p className="text-center text-[#F5E600] text-sm mt-3">{lightbox.alt}</p>
          </div>
          <button onClick={() => setLightbox(null)} className="absolute top-5 right-6 text-white text-3xl leading-none btn-press" aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      <footer className="bg-[#034E28] border-t-4 border-[#F5E600] text-center py-12 mt-8">
        <img src="/logo-mairie.jpg" alt="Mairie des Gonaïves" className="w-14 h-14 rounded-full object-cover ring-2 ring-[#F5E600] mx-auto mb-4" />
        <p className="font-display text-lg text-white mb-1">Mairie des Gonaïves</p>
        <p className="text-sm text-[#DCE6DD]">Artibonite, Haïti (W.I)</p>
      </footer>
    </div>
  );
}
