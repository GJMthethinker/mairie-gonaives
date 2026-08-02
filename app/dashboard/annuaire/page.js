"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

export default function AnnuairePage() {
  const { profile, isAdmin } = useApp();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, status, services(name)")
        .order("full_name");
      setPeople(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-2">Annuaire</h2>
      <p className="text-xs text-[#8A857A] mb-6">
        {isAdmin
          ? "En tant que super administrateur, vous voyez tous les employés."
          : "Vous voyez votre propre fiche, ainsi que celles que le super administrateur vous a autorisé à consulter."}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {people.map((p) => (
          <div key={p.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-5">
            <p className="font-medium">
              {p.full_name} {p.id === profile.id && <span className="text-xs text-[#B8862E]">(vous)</span>}
            </p>
            <p className="text-xs text-[#8A857A] mt-1">
              {p.role === "superadmin" ? "Super administrateur" : p.services?.name || "—"}
            </p>
          </div>
        ))}
        {people.length === 0 && (
          <p className="text-sm text-[#8A857A]">Aucune fiche visible pour le moment.</p>
        )}
      </div>
    </div>
  );
}
