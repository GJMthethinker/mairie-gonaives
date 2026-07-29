"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

const statusMeta = {
  todo: { label: "À faire", color: "#A8332B" },
  doing: { label: "En cours", color: "#B8862E" },
  done: { label: "Terminée", color: "#5B7553" },
};

export default function TachesPage() {
  const { profile, services, isAdmin } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState(isAdmin ? "all" : profile.service_id);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const scoped = isAdmin
    ? filterService === "all"
      ? tasks
      : tasks.filter((t) => t.service_id === filterService)
    : tasks.filter((t) => t.service_id === profile.service_id);

  async function cycle(t, dir) {
    const order = ["todo", "doing", "done"];
    const idx = order.indexOf(t.status);
    const next = order[Math.min(order.length - 1, Math.max(0, idx + dir))];
    await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    load();
  }

  async function remove(id) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Tâches &amp; projets</h2>
        <div className="flex gap-3 items-center">
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
          <button onClick={() => setShowNew(true)} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
            + Nouvelle tâche
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {["todo", "doing", "done"].map((status) => (
          <div key={status}>
            <p
              className="text-xs uppercase tracking-wide mb-3 flex items-center gap-2"
              style={{ color: statusMeta[status].color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: statusMeta[status].color }} />
              {statusMeta[status].label} ({scoped.filter((t) => t.status === status).length})
            </p>
            <div className="space-y-2">
              {scoped
                .filter((t) => t.status === status)
                .map((t) => (
                  <div key={t.id} className="bg-white border border-[#E3DCC8] rounded-sm p-3">
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.description && <p className="text-xs text-[#8A857A] mt-1">{t.description}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-[#8A857A]">{t.assignee || "—"}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <button onClick={() => cycle(t, -1)} disabled={status === "todo"} className="disabled:opacity-20">←</button>
                        <button onClick={() => cycle(t, 1)} disabled={status === "done"} className="disabled:opacity-20">→</button>
                        <button onClick={() => remove(t.id)} className="text-[#A8332B]">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              {scoped.filter((t) => t.status === status).length === 0 && (
                <p className="text-xs text-[#8A857A] italic">Aucune tâche.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewTaskModal
          services={services}
          isAdmin={isAdmin}
          defaultService={profile.service_id}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewTaskModal({ services, isAdmin, defaultService, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [serviceId, setServiceId] = useState(defaultService || services[0]?.id);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      service_id: serviceId,
      status: "todo",
    });
    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Nouvelle tâche</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la tâche"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            rows={3}
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Responsable (optionnel)"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          {isAdmin && (
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "..." : "Ajouter"}
          </button>
        </form>
      </div>
    </div>
  );
}
