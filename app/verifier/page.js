"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function frDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VerifierPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null); // null = pas encore cherché
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) {
      setCode(c);
      verify(c);
    }
  }, []);

  async function verify(c) {
    if (!c || !c.trim()) return;
    setLoading(true);
    setChecked(false);
    const { data, error } = await supabase.rpc("verifier_document", { p_code: c.trim() });
    setLoading(false);
    setChecked(true);
    if (error) {
      setResult({ trouve: false });
      return;
    }
    setResult(data);
  }

  function submit(e) {
    e.preventDefault();
    verify(code);
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)] flex flex-col">
      <header className="bg-[#034E28] text-white border-b-4 border-[#F5E600]">
        <div className="max-w-lg mx-auto px-6 py-5 flex items-center gap-3">
          <img src="/logo-mairie.jpg" alt="Mairie des Gonaïves" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#F5E600]" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#F5E600]">République d'Haïti</p>
            <p className="font-display text-lg leading-tight">Vérification de document</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-12">
        <p className="text-sm text-[var(--ink-muted)] mb-6">
          Vérifiez l'authenticité d'un document émis par la Mairie des Gonaïves à partir du code inscrit dessus,
          ou en scannant son QR code.
        </p>

        <form onSubmit={submit} className="flex gap-2 mb-8">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code du document (ex. 000042-CR)"
            className="flex-1 border border-[var(--line)] rounded-sm px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-press bg-[#034E28] text-white rounded-sm px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "..." : "Vérifier"}
          </button>
        </form>

        {checked && result?.trouve && (
          <div className="bg-[#E8F5EC] border border-[#B7E0C6] rounded-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✅</span>
              <p className="font-display text-lg text-[#034E28]">Document authentique</p>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Type de document" value={result.type_document} />
              <Row label="Concerne" value={result.personne} />
              <Row label="Référence" value={result.reference} />
              <Row label="Direction émettrice" value={result.direction} />
              <Row label="Émis le" value={frDateTime(result.date_emission)} />
              {result.date_mise_a_jour && result.date_mise_a_jour !== result.date_emission && (
                <Row label="Mis à jour le" value={frDateTime(result.date_mise_a_jour)} />
              )}
              <Row label="Code" value={result.code} />
            </dl>
          </div>
        )}

        {checked && !result?.trouve && (
          <div className="bg-[#FCE9E7] border border-[#EAB4AC] rounded-sm p-6 text-center">
            <p className="text-3xl mb-2">✕</p>
            <p className="font-display text-lg text-[#A8332B] mb-2">Document non reconnu</p>
            <p className="text-sm text-[var(--ink-muted)]">
              Ce code n'est reconnu par aucun document émis par la Mairie des Gonaïves.
              Ce document n'a pas été produit par nos services.
            </p>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-[var(--ink-muted)] py-8 border-t border-[var(--line)]">
        Mairie des Gonaïves, Artibonite, Haïti (W.I)
      </footer>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-[#B7E0C6] pb-1.5">
      <dt className="text-[var(--ink-muted)]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
