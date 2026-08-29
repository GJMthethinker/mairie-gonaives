"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "./layout";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
function partsFromISO(iso) {
  const d = new Date(iso);
  return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
}

export default function DashboardPage() {
  const { isAdmin, services } = useApp();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [visiteurs, setVisiteurs] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(null);
  const [day, setDay] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard/documents");
      return;
    }
    async function load() {
      const { data: docs } = await supabase.from("documents").select("*");
      const { data: tks } = await supabase.from("tasks").select("*");
      const { data: vis } = await supabase.from("visiteurs").select("*");
      setDocuments(docs || []);
      setTasks(tks || []);
      setVisiteurs(vis || []);
      setLoading(false);
    }
    load();
  }, [isAdmin, router]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const todayCount = documents.filter((d) => d.created_at?.slice(0, 10) === todayISO).length;
  const monthCount = documents.filter((d) => d.created_at?.slice(0, 7) === thisMonth).length;
  const visitTodayCount = visiteurs.filter((v) => v.created_at?.slice(0, 10) === todayISO).length;
  const visitMonthCount = visiteurs.filter((v) => v.created_at?.slice(0, 7) === thisMonth).length;

  const byService = services.map((s) => ({
    ...s,
    docCount: documents.filter((d) => d.service_id === s.id).length,
    visitCount: visiteurs.filter((v) => v.service_id === s.id).length,
    todo: tasks.filter((t) => t.service_id === s.id && t.status === "todo").length,
    doing: tasks.filter((t) => t.service_id === s.id && t.status === "doing").length,
    done: tasks.filter((t) => t.service_id === s.id && t.status === "done").length,
  }));
  const maxDoc = Math.max(1, ...byService.map((s) => s.docCount));

  // ----- Effectif (visiteurs + documents) par année / mois / jour -----
  const anneesDisponibles = useMemo(() => {
    const set = new Set([
      ...documents.map((d) => partsFromISO(d.created_at).y),
      ...visiteurs.map((v) => partsFromISO(v.created_at).y),
    ]);
    set.add(today.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [documents, visiteurs]);

  const docsYear = useMemo(() => documents.filter((d) => partsFromISO(d.created_at).y === year), [documents, year]);
  const visYear = useMemo(() => visiteurs.filter((v) => partsFromISO(v.created_at).y === year), [visiteurs, year]);
  const docsMonth = useMemo(() => (month ? docsYear.filter((d) => partsFromISO(d.created_at).m === month) : []), [docsYear, month]);
  const visMonth = useMemo(() => (month ? visYear.filter((v) => partsFromISO(v.created_at).m === month) : []), [visYear, month]);
  const docsDay = useMemo(() => (day ? docsMonth.filter((d) => partsFromISO(d.created_at).day === day) : []), [docsMonth, day]);
  const visDay = useMemo(() => (day ? visMonth.filter((v) => partsFromISO(v.created_at).day === day) : []), [visMonth, day]);

  const moisDuYear = useMemo(() => {
    const map = new Map();
    docsYear.forEach((d) => {
      const mm = partsFromISO(d.created_at).m;
      if (!map.has(mm)) map.set(mm, { docs: 0, vis: 0 });
      map.get(mm).docs++;
    });
    visYear.forEach((v) => {
      const mm = partsFromISO(v.created_at).m;
      if (!map.has(mm)) map.set(mm, { docs: 0, vis: 0 });
      map.get(mm).vis++;
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [docsYear, visYear]);

  const joursDuMois = useMemo(() => {
    const map = new Map();
    docsMonth.forEach((d) => {
      const dd = partsFromISO(d.created_at).day;
      if (!map.has(dd)) map.set(dd, { docs: 0, vis: 0 });
      map.get(dd).docs++;
    });
    visMonth.forEach((v) => {
      const dd = partsFromISO(v.created_at).day;
      if (!map.has(dd)) map.set(dd, { docs: 0, vis: 0 });
      map.get(dd).vis++;
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [docsMonth, visMonth]);

  if (!isAdmin || loading) return null;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-6">Tableau de bord</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{todayCount}</p>
          <p className="text-xs text-[#8A857A] mt-1">Documents aujourd'hui</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{monthCount}</p>
          <p className="text-xs text-[#8A857A] mt-1">Documents ce mois-ci</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{documents.length}</p>
          <p className="text-xs text-[#8A857A] mt-1">Documents au total</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{visitTodayCount}</p>
          <p className="text-xs text-[#8A857A] mt-1">Visiteurs aujourd'hui</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{visitMonthCount}</p>
          <p className="text-xs text-[#8A857A] mt-1">Visiteurs ce mois-ci</p>
        </div>
      </div>

      <h3 className="font-serif text-lg text-[#1B2A4A] mb-3">Effectif — visiteurs et documents par période</h3>
      <div className="flex items-center gap-2 text-sm mb-4 text-[#5B584F]">
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
          <div className="flex gap-2 mb-4 flex-wrap">
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
          <div className="bg-white border border-[#E3DCC8] rounded-sm divide-y divide-[#E3DCC8] mb-8">
            {moisDuYear.map(([mm, c]) => (
              <button key={mm} onClick={() => setMonth(mm)} className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-[#FBFAF6]">
                <span className="text-sm font-medium">{MOIS_FR[mm - 1]}</span>
                <span className="text-xs text-[#8A857A]">{c.docs} document(s) · {c.vis} visiteur(s)</span>
              </button>
            ))}
            {moisDuYear.length === 0 && <p className="text-sm text-[#8A857A] px-5 py-4">Aucune activité en {year}.</p>}
          </div>
        </>
      )}

      {month !== null && day === null && (
        <div className="bg-white border border-[#E3DCC8] rounded-sm divide-y divide-[#E3DCC8] mb-8">
          {joursDuMois.map(([dd, c]) => (
            <button key={dd} onClick={() => setDay(dd)} className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-[#FBFAF6]">
              <span className="text-sm font-medium">{String(dd).padStart(2, "0")} {MOIS_FR[month - 1]}</span>
              <span className="text-xs text-[#8A857A]">{c.docs} document(s) · {c.vis} visiteur(s)</span>
            </button>
          ))}
          {joursDuMois.length === 0 && <p className="text-sm text-[#8A857A] px-5 py-4">Aucune activité ce mois-ci.</p>}
        </div>
      )}

      {day !== null && (
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5 mb-8">
          <p className="text-sm">
            <strong>{docsDay.length}</strong> document(s) généré(s) et <strong>{visDay.length}</strong> visiteur(s) enregistré(s)
            le {String(day).padStart(2, "0")} {MOIS_FR[month - 1]} {year}.
          </p>
        </div>
      )}

      <h3 className="font-serif text-lg text-[#1B2A4A] mb-3">Par service</h3>
      <div className="bg-white border border-[#E3DCC8] rounded-sm divide-y divide-[#E3DCC8]">
        {byService.map((s) => (
          <div key={s.id} className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{s.name}</span>
              <span className="text-xs text-[#8A857A]">{s.docCount} document(s) · {s.visitCount} visiteur(s)</span>
            </div>
            <div className="h-1.5 bg-[#EFEADA] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-[#B8862E]" style={{ width: `${(s.docCount / maxDoc) * 100}%` }} />
            </div>
            <div className="flex gap-4 text-[11px] text-[#8A857A]">
              <span>À faire : {s.todo}</span>
              <span>En cours : {s.doing}</span>
              <span>Terminées : {s.done}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
