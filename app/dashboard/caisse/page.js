"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CaissePage() {
  const { profile, services, isAdmin } = useApp();
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("caisse_mouvements")
      .select("*, personnes(nom_complet, code_unique), services(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setMouvements(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const totalEntrees = mouvements.filter((m) => m.type === "entree").reduce((s, m) => s + Number(m.montant), 0);
  const totalSorties = mouvements.filter((m) => m.type === "sortie").reduce((s, m) => s + Number(m.montant), 0);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Caisse</h2>
        <button onClick={() => { setShowNew(true); setLastResult(null); }} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
          + Nouveau mouvement
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-xs uppercase tracking-wide text-[#5B7553] mb-1">Total entrées</p>
          <p className="text-2xl font-serif text-[#1B2A4A]">{totalEntrees.toLocaleString("fr-FR")} G</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-xs uppercase tracking-wide text-[#A8332B] mb-1">Total sorties</p>
          <p className="text-2xl font-serif text-[#1B2A4A]">{totalSorties.toLocaleString("fr-FR")} G</p>
        </div>
      </div>

      {lastResult && (
        <div className="bg-[#FBF3E4] border border-[#E3C896] rounded-sm p-5 mb-6 text-center">
          <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-1">Code à remettre sur le reçu</p>
          <p className="text-3xl font-serif text-[#1B2A4A] tracking-wider">{lastResult.code_unique}</p>
          <p className="text-xs text-[#8A857A] mt-1">{lastResult.nom_complet}</p>
        </div>
      )}

      <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-3">Mouvements récents</p>
      <div className="space-y-2">
        {mouvements.map((m) => (
          <div key={m.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium">
                {m.personnes?.nom_complet || "—"}
                {m.personnes?.code_unique && <span className="text-xs text-[#B8862E]"> · {m.personnes.code_unique}</span>}
              </p>
              <p className="text-xs text-[#8A857A]">{m.raison} {m.services?.name ? `· ${m.services.name}` : ""}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-medium ${m.type === "entree" ? "text-[#5B7553]" : "text-[#A8332B]"}`}>
                {m.type === "entree" ? "+" : "-"}{Number(m.montant).toLocaleString("fr-FR")} G
              </p>
              <p className="text-[10px] text-[#8A857A]">{frDateTime(m.created_at)}</p>
            </div>
          </div>
        ))}
        {mouvements.length === 0 && <p className="text-sm text-[#8A857A]">Aucun mouvement enregistré.</p>}
      </div>

      {showNew && (
        <NewMouvementModal
          services={services}
          profile={profile}
          onClose={() => setShowNew(false)}
          onSaved={(result) => {
            setShowNew(false);
            setLastResult(result);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewMouvementModal({ services, profile, onClose, onSaved }) {
  const [type, setType] = useState("entree");
  const [montant, setMontant] = useState("");
  const [raison, setRaison] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [nomComplet, setNomComplet] = useState("");
  const [nif, setNif] = useState("");
  const [ninu, setNinu] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!montant || !raison.trim()) return;
    if (type === "entree" && !nomComplet.trim()) {
      setError("Le nom du contribuable est requis pour une entrée.");
      return;
    }
    if (type === "entree" && !nif.trim() && !ninu.trim()) {
      setError("Indiquez au moins le NIF ou le NINU du contribuable.");
      return;
    }
    setSaving(true);
    setError("");

    let personneId = null;
    let personneResult = null;

    if (type === "entree") {
      const { data: personne, error: perr } = await supabase.rpc("find_or_create_personne", {
        p_nom_complet: nomComplet.trim(),
        p_nif: nif.trim(),
        p_ninu: ninu.trim(),
        p_telephone: telephone.trim(),
        p_adresse: adresse.trim(),
      });
      if (perr) {
        setSaving(false);
        setError("Erreur identité : " + perr.message);
        return;
      }
      personneId = personne.id;
      personneResult = personne;
    }

    const { error: merr } = await supabase.from("caisse_mouvements").insert({
      type,
      montant: Number(montant),
      raison: raison.trim(),
      personne_id: personneId,
      service_id: serviceId || null,
      created_by: profile.id,
    });
    setSaving(false);
    if (merr) {
      setError("Erreur : " + merr.message);
      return;
    }
    onSaved(personneResult);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Nouveau mouvement</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("entree")}
              className="flex-1 text-sm py-2 rounded-sm border"
              style={type === "entree" ? { background: "#5B7553", color: "white", borderColor: "#5B7553" } : { borderColor: "#D8D0BC" }}
            >
              Entrée (encaissement)
            </button>
            <button
              type="button"
              onClick={() => setType("sortie")}
              className="flex-1 text-sm py-2 rounded-sm border"
              style={type === "sortie" ? { background: "#A8332B", color: "white", borderColor: "#A8332B" } : { borderColor: "#D8D0BC" }}
            >
              Sortie (décaissement)
            </button>
          </div>

          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Montant (gourdes)"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <input
            required
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            placeholder={type === "entree" ? "Raison (ex : Certificat de résidence)" : "Raison de la sortie"}
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          >
            <option value="">Direction concernée (optionnel)</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {type === "entree" && (
            <div className="border-t border-[#E3DCC8] pt-3 space-y-3">
              <p className="text-xs uppercase tracking-wide text-[#8A857A]">Identité du contribuable</p>
              <input
                required
                value={nomComplet}
                onChange={(e) => setNomComplet(e.target.value)}
                placeholder="Nom complet"
                className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="NIF"
                  className="flex-1 border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
                />
                <input
                  value={ninu}
                  onChange={(e) => setNinu(e.target.value)}
                  placeholder="NINU"
                  className="flex-1 border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
                />
              </div>
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Téléphone (optionnel)"
                className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
              />
              <input
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Adresse (optionnel)"
                className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <p className="text-xs text-[#A8332B]">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
