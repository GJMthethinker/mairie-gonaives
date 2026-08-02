"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

const priorityMeta = {
  haute: { label: "Haute", color: "#A8332B" },
  normale: { label: "Normale", color: "#B8862E" },
  basse: { label: "Basse", color: "#8A857A" },
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, tomorrow)) return "Demain";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function AgendaPage() {
  const { profile, isAdmin } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase.from("tasks").select("*").not("due_date", "is", null).neq("status", "done").order("due_date").order("due_time", { nullsFirst: false });
      if (!isAdmin) query = query.eq("service_id", profile.service_id);
      const { data } = await query;
      setTasks(data || []);
      setLoading(false);
    }
    load();
  }, [isAdmin, profile.service_id]);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  const today = todayISO();
  const overdue = tasks.filter((t) => t.due_date < today);
  const upcoming = tasks.filter((t) => t.due_date >= today);

  const grouped = {};
  upcoming.forEach((t) => {
    if (!grouped[t.due_date]) grouped[t.due_date] = [];
    grouped[t.due_date].push(t);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Agenda</h2>
        <a href="/dashboard/taches" className="text-sm border border-[#D8D0BC] px-4 py-2 rounded-sm">
          ← Retour aux tâches
        </a>
      </div>

      {overdue.length > 0 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#A8332B] mb-3">En retard</p>
          <div className="space-y-2">
            {overdue.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 && overdue.length === 0 && (
        <p className="text-sm text-[#8A857A]">Aucune tâche avec une échéance à venir.</p>
      )}

      {Object.entries(grouped).map(([date, list]) => (
        <div key={date} className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#B8862E] mb-3">{dayLabel(date)}</p>
          <div className="space-y-2">
            {list.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskRow({ t }) {
  return (
    <div className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{t.title}</p>
        {t.description && <p className="text-xs text-[#8A857A] mt-0.5">{t.description}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {t.due_time && <span className="text-xs text-[#5B584F]">{t.due_time.slice(0, 5)}</span>}
        <span
          className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
          style={{ color: priorityMeta[t.priority]?.color, border: `1px solid ${priorityMeta[t.priority]?.color}` }}
        >
          {priorityMeta[t.priority]?.label}
        </span>
      </div>
    </div>
  );
}
