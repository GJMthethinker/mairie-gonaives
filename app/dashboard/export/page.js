"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

const JEUX_DE_DONNEES = [
  { table: "personnes", label: "Registre des personnes", desc: "Toutes les fiches, code unique, NIF/NINU, adresse, téléphone" },
  { table: "documents", label: "Documents générés", desc: "Tous les documents, référence, code de vérification" },
  { table: "documents_versions", label: "Historique des documents", desc: "Chaque modification d'un document existant" },
  { table: "caisse_mouvements", label: "Mouvements de caisse", desc: "Toutes les entrées et sorties" },
  { table: "visiteurs", label: "Registre des visiteurs", desc: "Toutes les visites enregistrées à l'accueil" },
  { table: "tasks", label: "Tâches", desc: "Toutes les tâches, tous services" },
  { table: "archives", label: "Archives", desc: "Toutes les archives (automatiques et manuelles)" },
  { table: "residents", label: "Résidents (ancien registre)", desc: "Certificats de résidence antérieurs" },
  { table: "news", label: "Actualités publiées", desc: "Toutes les actualités du site public" },
  { table: "gallery_photos", label: "Galerie", desc: "Toutes les photos publiées" },
  { table: "profiles", label: "Employés", desc: "Tous les comptes employés" },
  { table: "services", label: "Directions", desc: "La liste des 20 directions" },
  { table: "templates", label: "Modèles de documents", desc: "Tous les modèles créés" },
  { table: "appointment_requests", label: "Demandes de rendez-vous", desc: "Reçues depuis le site public" },
  { table: "feedback_messages", label: "Doléances et suggestions", desc: "Reçues depuis le site public" },
];

function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    let s = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(",")));
  return lines.join("\n");
}

function download(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const { isAdmin } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [busyAll, setBusyAll] = useState(false);

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard/documents");
  }, [isAdmin, router]);

  async function exportTable(table) {
    setError("");
    setBusy(table);
    const { data, error } = await supabase.from(table).select("*");
    setBusy(null);
    if (error) {
      setError(`Erreur sur "${table}" : ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setError(`"${table}" est vide, rien à exporter.`);
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    download(`mairie-gonaives-${table}-${date}.csv`, toCSV(data));
  }

  async function exportTout() {
    setBusyAll(true);
    for (const j of JEUX_DE_DONNEES) {
      await exportTable(j.table);
      await new Promise((r) => setTimeout(r, 400));
    }
    setBusyAll(false);
  }

  if (!isAdmin) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Export des données</h2>
        <button
          onClick={exportTout}
          disabled={busyAll || !!busy}
          className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm disabled:opacity-50"
        >
          {busyAll ? "Export en cours..." : "Tout exporter"}
        </button>
      </div>
      <p className="text-xs text-[#8A857A] mb-6">
        Chaque export télécharge un fichier CSV (lisible avec Excel) sur cet appareil, à tout moment. Vous pouvez ensuite le copier sur un disque dur ou une clé USB.
      </p>

      {error && <p className="text-sm text-[#A8332B] mb-4">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {JEUX_DE_DONNEES.map((j) => (
          <div key={j.table} className="bg-white border border-[#E3DCC8] rounded-sm p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{j.label}</p>
              <p className="text-xs text-[#8A857A] mt-0.5">{j.desc}</p>
            </div>
            <button
              onClick={() => exportTable(j.table)}
              disabled={busy === j.table || busyAll}
              className="text-xs shrink-0 border border-[#D8D0BC] rounded-sm px-3 py-2 disabled:opacity-50"
            >
              {busy === j.table ? "..." : "Exporter"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
