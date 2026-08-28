"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const PIECE_TYPES = ["CIN", "Passeport", "NIF", "Permis de conduire", "Autre"];

function partsFromISO(iso) {
  const d = new Date(iso);
  return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
}
function frTime(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function AccueilPage() {
  const { profile, services, isAdmin } = useApp();
  const [visiteurs, setVisiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());

  async function load() {
    const { data } = await supabase
      .from("visiteurs")
      .select("*, services(name)")
      .order("created_at", { ascending: false })
      .limit(5000);
    setVisiteurs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
    setDay(t.getDate());
  }

  const parYear = useMemo(() => visiteurs.filter((v) => partsFromISO(v.created_at).y === year), [visiteurs, year]);
  const parMonth = useMemo(() => parYear.filter((v) => partsFromISO(v.created_at).m === month), [parYear, month]);
  const parDay = useMemo(() => parMonth.filter((v) => partsFromISO(v.created_at).day === day), [parMonth, day]);

  const anneesDisponibles = useMemo(() => {
    const set = new Set(visiteurs.map((v) => partsFromISO(v.created_at).y));
    set.add(today.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [visiteurs]);

  const moisDuYear = useMemo(() => {
    const map = new Map();
    parYear.forEach((v) => {
      const mm = partsFromISO(v.created_at).m;
      if (!map.has(mm)) map.set(mm, []);
      map.get(mm).push(v);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [parYear]);

  const joursDuMois = useMemo(() => {
    const map = new Map();
    parMonth.forEach((v) => {
      const dd = partsFromISO(v.created_at).day;
      if (!map.has(dd)) map.set(dd, []);
      map.get(dd).push(v);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [parMonth]);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Accueil — Registre des visiteurs</h2>
        <div className="flex gap-2">
          {!isToday && (
            <button onClick={goToday} className="text-sm border border-[#D8D0BC] px-3 py-2 rounded-sm">
              Aujourd'hui
            </button>
          )}
          <button onClick={() => setShowNew(true)} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
            + Enregistrer un visiteur
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm mb-6 text-[#5B584F]">
        <button onClick={() => { setMonth(null); setDay(null); }} className={month === null ? "font-medium text-[#1B2A4A]" : "hover:underline"}>
          {year}
        </button>
        {month !== null && (
          <>
            <span>›</span>
            <button onClick={() => setDay(null)} className={day === null ? "font-medium text-[#1B2A4A]" : "hover:underline"}>
              {MOIS_FR[month - 1]}
            </button>
          </>
        )}
        {day !== null && (
          <>
            <span>›</span>
            <span className="font-medium text-[#1B2A4A]">{day}</span>
          </>
        )}
      </div>

      {month === null && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {anneesDisponibles.map((a) => (
              <button
                key={a}
                onClick={() => setYear(a)}
                className="text-sm px-3 py-1.5 rounded-sm border"
                style={a === year ? { background: "#1B2A4A", color: "white", borderColor: "#1B2A4A" } : { borderColor: "#D8D0BC" }}
              >
                {a}
              </button>
            ))}
          </div>
          <CountCard label={`Visiteurs en ${year}`} n={parYear.length} />
          <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-3 mt-8">Détail par mois</p>
          <div className="space-y-2">
            {moisDuYear.map(([mm, list]) => (
              <button
                key={mm}
                onClick={() => setMonth(mm)}
                className="card-hover w-full text-left bg-white border border-[#E3DCC8] rounded-sm p-4 flex items-center justify-between"
              >
                <span className="text-sm font-medium">{MOIS_FR[mm - 1]}</span>
                <span className="text-xs text-[#5B584F]">{list.length} visiteur{list.length > 1 ? "s" : ""}</span>
              </button>
            ))}
            {moisDuYear.length === 0 && <p className="text-sm text-[#8A857A]">Aucun visiteur en {year}.</p>}
          </div>
        </>
      )}

      {month !== null && day === null && (
        <>
          <CountCard label={`Visiteurs — ${MOIS_FR[month - 1]} ${year}`} n={parMonth.length} />
          <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-3 mt-8">Détail par jour</p>
          <div className="space-y-2">
            {joursDuMois.map(([dd, list]) => (
              <button
                key={dd}
                onClick={() => setDay(dd)}
                className="card-hover w-full text-left bg-white border border-[#E3DCC8] rounded-sm p-4 flex items-center justify-between"
              >
                <span className="text-sm font-medium">{String(dd).padStart(2, "0")} {MOIS_FR[month - 1]}</span>
                <span className="text-xs text-[#5B584F]">{list.length} visiteur{list.length > 1 ? "s" : ""}</span>
              </button>
            ))}
            {joursDuMois.length === 0 && <p className="text-sm text-[#8A857A]">Aucun visiteur ce mois-ci.</p>}
          </div>
        </>
      )}

      {day !== null && (
        <>
          <CountCard label={`Registre du ${String(day).padStart(2, "0")} ${MOIS_FR[month - 1]} ${year}`} n={parDay.length} />
          <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-3 mt-8">Visiteurs du jour</p>
          <div className="space-y-2">
            {parDay
              .slice()
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((v) => (
                <div key={v.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{v.nom_complet}</p>
                    <p className="text-xs text-[#8A857A]">
                      {v.piece_type} {v.piece_numero} {v.motif ? `· ${v.motif}` : ""} {v.services?.name ? `· ${v.services.name}` : ""}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#8A857A] shrink-0">{frTime(v.created_at)}</p>
                </div>
              ))}
            {parDay.length === 0 && <p className="text-sm text-[#8A857A]">Aucun visiteur ce jour-là.</p>}
          </div>
        </>
      )}

      {showNew && (
        <NewVisiteurModal
          services={services}
          profile={profile}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            goToday();
            load();
          }}
        />
      )}
    </div>
  );
}

function CountCard({ label, n }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-3">{label}</p>
      <div className="bg-white border border-[#E3DCC8] rounded-sm p-5 max-w-xs">
        <p className="text-xs uppercase tracking-wide text-[#5B7553] mb-1">Total visiteurs</p>
        <p className="text-2xl font-serif text-[#1B2A4A]">{n}</p>
      </div>
    </div>
  );
}

function NewVisiteurModal({ services, profile, onClose, onSaved }) {
  const [nomComplet, setNomComplet] = useState("");
  const [pieceType, setPieceType] = useState(PIECE_TYPES[0]);
  const [pieceNumero, setPieceNumero] = useState("");
  const [motif, setMotif] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!nomComplet.trim() || !pieceNumero.trim()) {
      setError("Le nom et le numéro de la pièce d'identité sont obligatoires.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("visiteurs").insert({
      nom_complet: nomComplet.trim(),
      piece_type: pieceType,
      piece_numero: pieceNumero.trim(),
      motif: motif.trim() || null,
      service_id: serviceId || null,
      created_by: profile.id,
    });
    setSaving(false);
    if (err) {
      setError("Erreur : " + err.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Enregistrer un visiteur</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            placeholder="Nom complet"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={pieceType}
              onChange={(e) => setPieceType(e.target.value)}
              className="border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            >
              {PIECE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              required
              value={pieceNumero}
              onChange={(e) => setPieceNumero(e.target.value)}
              placeholder="Numéro de la pièce"
              className="flex-1 border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif de la visite (optionnel)"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          >
            <option value="">Direction visée (optionnel)</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

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
