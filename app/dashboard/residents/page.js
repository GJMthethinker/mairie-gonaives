"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("residents").select("*, services(name)").order("created_at", { ascending: false });
      setResidents(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? residents.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
      )
    : residents;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-2">Registre des résidents</h2>
      <p className="text-xs text-[#8A857A] mb-6">
        Constitué automatiquement à chaque certificat de résidence généré. Recherchez par nom, adresse ou téléphone.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un nom, une adresse, un numéro..."
        className="w-full max-w-md border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm mb-6"
      />

      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-sm">{r.full_name}</p>
                <p className="text-xs text-[#5B584F] mt-1">{r.address || "Adresse non renseignée"}</p>
                <p className="text-xs text-[#5B584F]">{r.phone || "Téléphone non renseigné"}</p>
                {(r.birth_date || r.birth_place) && (
                  <p className="text-[11px] text-[#8A857A] mt-1">
                    Né(e) {r.birth_date ? `le ${r.birth_date}` : ""} {r.birth_place ? `à ${r.birth_place}` : ""}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-[#B8862E] uppercase tracking-wide shrink-0">{frDate(r.created_at)}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[#8A857A]">
            {q ? "Aucun résultat pour cette recherche." : "Aucun résident enregistré pour le moment."}
          </p>
        )}
      </div>
    </div>
  );
}
