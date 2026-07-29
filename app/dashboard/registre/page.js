"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function RegistrePage() {
  const { isAdmin, services } = useApp();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("documents")
        .select("*, services(name)")
        .order("created_at", { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = documents.filter((d) => {
    if (isAdmin && filterService !== "all" && d.service_id !== filterService) return false;
    if (search) {
      const text = `${d.template_name} ${d.doc_number} ${Object.values(d.values || {}).join(" ")}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayCount = documents.filter((d) => d.created_at?.slice(0, 10) === todayISO).length;

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-2">Registre des documents</h2>
      <p className="text-sm text-[#8A857A] mb-6">
        {documents.length} document(s) au total · {todayCount} aujourd'hui
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="flex-1 border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm bg-white"
        />
        {isAdmin && (
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm bg-white"
          >
            <option value="all">Tous les services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="bg-white border border-[#E3DCC8] rounded-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F1ECDD] text-[#5B584F] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">N°</th>
              <th className="text-left px-4 py-2.5">Type</th>
              {isAdmin && <th className="text-left px-4 py-2.5">Service</th>}
              <th className="text-left px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEADA]">
            {filtered.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2.5 font-mono text-xs">{d.doc_number}</td>
                <td className="px-4 py-2.5">{d.template_name}</td>
                {isAdmin && <td className="px-4 py-2.5">{d.services?.name}</td>}
                <td className="px-4 py-2.5 text-[#8A857A]">{frDate(d.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#8A857A]">Aucun document trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
