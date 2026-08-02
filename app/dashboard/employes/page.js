"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusMeta = {
  en_attente: { label: "En attente", color: "#B8862E" },
  approuve: { label: "Approuvé", color: "#5B7553" },
  refuse: { label: "Refusé", color: "#A8332B" },
};

export default function EmployesPage() {
  const [people, setPeople] = useState([]);
  const [grants, setGrants] = useState([]); // {viewer_id, target_id}
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [notifyTarget, setNotifyTarget] = useState(null);

  async function load() {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, role, status, service_id, phone, services(name)")
      .order("full_name");
    const { data: g } = await supabase.from("profile_access_grants").select("*");
    setPeople(profs || []);
    setGrants(g || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id, status) {
    await supabase.from("profiles").update({ status }).eq("id", id);
    load();
  }

  async function toggleGrant(targetId, viewerId, currentlyGranted) {
    if (currentlyGranted) {
      await supabase.from("profile_access_grants").delete().eq("target_id", targetId).eq("viewer_id", viewerId);
    } else {
      await supabase.from("profile_access_grants").insert({ target_id: targetId, viewer_id: viewerId });
    }
    load();
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  const pending = people.filter((p) => p.status === "en_attente" && p.role !== "superadmin");
  const others = people.filter((p) => p.status !== "en_attente" && p.role !== "superadmin");

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-6">Employés</h2>

      {pending.length > 0 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#B8862E] mb-3">Demandes en attente ({pending.length})</p>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{p.full_name}</p>
                  <p className="text-xs text-[#8A857A]">{p.services?.name || "—"}{p.phone ? ` · ${p.phone}` : ""}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setStatus(p.id, "approuve")} className="text-xs bg-[#1B2A4A] text-white px-3 py-1.5 rounded-sm">
                    Approuver
                  </button>
                  <button onClick={() => setStatus(p.id, "refuse")} className="text-xs border border-[#D8D0BC] px-3 py-1.5 rounded-sm">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-3">Tous les employés</p>
      <div className="space-y-2">
        {others.map((p) => {
          const isExpanded = expanded === p.id;
          const viewers = people.filter((v) => v.id !== p.id);
          return (
            <div key={p.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{p.full_name}</p>
                  <p className="text-xs text-[#8A857A]">{p.services?.name || "—"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
                    style={{ color: statusMeta[p.status]?.color, border: `1px solid ${statusMeta[p.status]?.color}` }}
                  >
                    {statusMeta[p.status]?.label}
                  </span>
                  <button
                    onClick={() => setNotifyTarget(p)}
                    className="text-xs border border-[#D8D0BC] px-3 py-1.5 rounded-sm"
                  >
                    Notifier
                  </button>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                    className="text-xs border border-[#D8D0BC] px-3 py-1.5 rounded-sm"
                  >
                    {isExpanded ? "Fermer" : "Gérer la visibilité"}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#E3DCC8]">
                  <p className="text-xs text-[#8A857A] mb-2">
                    Qui d'autre peut voir la fiche de {p.full_name} dans l'annuaire :
                  </p>
                  <div className="grid sm:grid-cols-2 gap-1">
                    {viewers.map((v) => {
                      const granted = grants.some((g) => g.target_id === p.id && g.viewer_id === v.id);
                      return (
                        <label key={v.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={granted}
                            onChange={() => toggleGrant(p.id, v.id, granted)}
                          />
                          {v.full_name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notifyTarget && (
        <NotifyModal target={notifyTarget} onClose={() => setNotifyTarget(null)} />
      )}
    </div>
  );
}

function NotifyModal({ target, onClose }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await supabase.from("notifications").insert({
      user_id: target.id,
      title: title.trim(),
      body: body.trim() || null,
      created_by: session.user.id,
    });
    setSaving(false);
    setSent(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Notifier {target.full_name}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        {sent ? (
          <div className="text-center py-4">
            <p className="text-sm text-[#5B584F] mb-4">Notification envoyée.</p>
            <button onClick={onClose} className="text-sm border border-[#D8D0BC] rounded-sm px-4 py-2">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              required
              placeholder="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              placeholder="Message (optionnel)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
