"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ResidentsPage() {
  const [personnes, setPersonnes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("personnes").select("*").order("nom_complet");
      setPersonnes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personnes;
    return personnes.filter(
      (p) =>
        p.nom_complet?.toLowerCase().includes(q) ||
        p.code_unique?.includes(q) ||
        p.nif?.includes(q) ||
        p.ninu?.includes(q) ||
        p.adresse?.toLowerCase().includes(q)
    );
  }, [personnes, search]);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-2">Registre des résidents</h2>
      <p className="text-xs text-[#8A857A] mb-6">
        {personnes.length} personne{personnes.length > 1 ? "s" : ""} connue{personnes.length > 1 ? "s" : ""} du système — alimenté automatiquement par la Caisse et les documents générés.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom, code, NIF, NINU ou adresse…"
        className="w-full max-w-md border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm mb-6"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="card-hover text-left bg-white border border-[#E3DCC8] rounded-sm p-4"
          >
            <p className="text-sm font-medium">{p.nom_complet}</p>
            <p className="text-xs text-[#B8862E] mt-0.5">{p.code_unique}</p>
            {p.adresse && <p className="text-xs text-[#8A857A] mt-1">{p.adresse}</p>}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-[#8A857A]">Aucune personne trouvée.</p>}
      </div>

      {selected && <PersonneDetail personne={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PersonneDetail({ personne, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: docs }, { data: mvts }] = await Promise.all([
        supabase
          .from("documents")
          .select("id, template_name, doc_number, code_verification, created_at, updated_at")
          .eq("personne_id", personne.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("caisse_mouvements")
          .select("id, type, montant, raison, created_at")
          .eq("personne_id", personne.id)
          .order("created_at", { ascending: false }),
      ]);
      setDocuments(docs || []);
      setMouvements(mvts || []);
      setLoading(false);
    }
    load();
  }, [personne.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-[#1B2A4A]">{personne.nom_complet}</h3>
            <p className="text-xs text-[#B8862E]">{personne.code_unique}</p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <dl className="space-y-1.5 text-sm mb-6">
          {personne.nif && <Row label="NIF" value={personne.nif} />}
          {personne.ninu && <Row label="NINU" value={personne.ninu} />}
          {personne.adresse && <Row label="Adresse" value={personne.adresse} />}
          {personne.telephone && <Row label="Téléphone" value={personne.telephone} />}
          <Row label="Connu depuis" value={frDate(personne.created_at)} />
        </dl>

        {loading ? (
          <p className="text-sm text-[#8A857A]">Chargement de l'historique…</p>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-2">Documents ({documents.length})</p>
            <div className="space-y-1.5 mb-6">
              {documents.map((d) => (
                <div key={d.id} className="text-xs bg-[#FBFAF6] border border-[#E3DCC8] rounded-sm px-3 py-2">
                  <p className="font-medium">{d.template_name} — {d.doc_number}</p>
                  <p className="text-[#8A857A]">
                    Code {d.code_verification} · {frDate(d.updated_at || d.created_at)}
                    {d.updated_at && d.updated_at !== d.created_at ? " (mis à jour)" : ""}
                  </p>
                </div>
              ))}
              {documents.length === 0 && <p className="text-xs text-[#8A857A]">Aucun document.</p>}
            </div>

            <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-2">Mouvements de caisse ({mouvements.length})</p>
            <div className="space-y-1.5">
              {mouvements.map((m) => (
                <div key={m.id} className="text-xs bg-[#FBFAF6] border border-[#E3DCC8] rounded-sm px-3 py-2 flex items-center justify-between">
                  <span>{m.raison}</span>
                  <span className={m.type === "entree" ? "text-[#5B7553]" : "text-[#A8332B]"}>
                    {m.type === "entree" ? "+" : "-"}{Number(m.montant).toLocaleString("fr-FR")} G
                  </span>
                </div>
              ))}
              {mouvements.length === 0 && <p className="text-xs text-[#8A857A]">Aucun mouvement.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#E3DCC8] pb-1">
      <dt className="text-[#8A857A]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
