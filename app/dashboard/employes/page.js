"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { triggerPush } from "@/lib/push";

const statusMeta = {
  en_attente: { label: "En attente", color: "#B8862E" },
  approuve: { label: "Approuvé", color: "#0B6B3A" },
  refuse: { label: "Refusé", color: "#A8332B" },
};

export default function EmployesPage() {
  const [people, setPeople] = useState([]);
  const [services, setServices] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [notifyTarget, setNotifyTarget] = useState(null);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const [savingService, setSavingService] = useState(null);

  async function load() {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, role, status, service_id, phone, services(name)")
      .order("full_name");
    const { data: svcs } = await supabase.from("services").select("*").order("name");
    const { data: g } = await supabase.from("profile_access_grants").select("*");
    setPeople(profs || []);
    setServices(svcs || []);
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

  async function changeService(personId, newServiceId) {
    setSavingService(personId);
    await supabase.from("profiles").update({ service_id: newServiceId }).eq("id", personId);
    await load();
    setSavingService(null);
  }

  async function toggleGrant(targetId, viewerId, currentlyGranted) {
    if (currentlyGranted) {
      await supabase.from("profile_access_grants").delete().eq("target_id", targetId).eq("viewer_id", viewerId);
    } else {
      await supabase.from("profile_access_grants").insert({ target_id: targetId, viewer_id: viewerId });
    }
    load();
  }

  if (loading) return <p className="text-sm text-[var(--ink-muted)]">Chargement…</p>;

  const pending = people.filter((p) => p.status === "en_attente" && p.role !== "superadmin");
  const others = people.filter((p) => p.status !== "en_attente" && p.role !== "superadmin");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-[#034E28]">Employés</h2>
        <button
          onClick={() => { setShowNewEmployee(true); setLastCreated(null); }}
          className="btn-press text-sm bg-[#034E28] text-white px-4 py-2 rounded-sm"
        >
          + Créer un employé
        </button>
      </div>

      {lastCreated && (
        <div className="bg-[#FBF3E4] border border-[#E3C896] rounded-sm p-5 mb-6">
          <p className="text-sm font-medium mb-1">Compte créé pour {lastCreated.full_name}</p>
          <p className="text-xs text-[#8A857A] mb-2">
            Remettez cet identifiant en main propre — il ne sera plus jamais réaffiché ici.
          </p>
          <p className="text-2xl font-serif text-[#1B2A4A] tracking-widest">{lastCreated.code}</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#B8862E] mb-3">Demandes en attente ({pending.length})</p>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="card-hover bg-white border border-[var(--line)] rounded-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{p.full_name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{p.services?.name || "—"}{p.phone ? ` · ${p.phone}` : ""}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setStatus(p.id, "approuve")} className="btn-press text-xs bg-[#034E28] text-white px-3 py-1.5 rounded-sm">
                    Approuver
                  </button>
                  <button onClick={() => setStatus(p.id, "refuse")} className="btn-press text-xs border border-[var(--line)] px-3 py-1.5 rounded-sm">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)] mb-3">Tous les employés</p>
      <div className="space-y-2">
        {others.map((p) => {
          const isExpanded = expanded === p.id;
          const viewers = people.filter((v) => v.id !== p.id);
          return (
            <div key={p.id} className="card-hover bg-white border border-[var(--line)] rounded-sm p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{p.full_name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{p.services?.name || "—"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <span
                    className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
                    style={{ color: statusMeta[p.status]?.color, border: `1px solid ${statusMeta[p.status]?.color}` }}
                  >
                    {statusMeta[p.status]?.label}
                  </span>
                  <select
                    value={p.service_id || ""}
                    disabled={savingService === p.id}
                    onChange={(e) => changeService(p.id, e.target.value)}
                    className="text-xs border border-[var(--line)] rounded-sm px-2 py-1.5 bg-white disabled:opacity-50"
                    title="Changer de direction"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setNotifyTarget(p)} className="btn-press text-xs border border-[var(--line)] px-3 py-1.5 rounded-sm">
                    Notifier
                  </button>
                  <button onClick={() => setExpanded(isExpanded ? null : p.id)} className="btn-press text-xs border border-[var(--line)] px-3 py-1.5 rounded-sm">
                    {isExpanded ? "Fermer" : "Gérer la visibilité"}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[var(--line)]">
                  <p className="text-xs text-[var(--ink-muted)] mb-2">
                    Qui d'autre peut voir la fiche de {p.full_name} dans l'annuaire :
                  </p>
                  <div className="grid sm:grid-cols-2 gap-1">
                    {viewers.map((v) => {
                      const granted = grants.some((g) => g.target_id === p.id && g.viewer_id === v.id);
                      return (
                        <label key={v.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={granted} onChange={() => toggleGrant(p.id, v.id, granted)} />
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

      {notifyTarget && <NotifyModal target={notifyTarget} onClose={() => setNotifyTarget(null)} />}
      {showNewEmployee && (
        <NewEmployeeModal
          services={services}
          onClose={() => setShowNewEmployee(false)}
          onCreated={(created) => {
            setShowNewEmployee(false);
            setLastCreated(created);
            load();
          }}
        />
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
    triggerPush({ userId: target.id, title: title.trim(), body: body.trim(), link: "/dashboard" });
    setSaving(false);
    setSent(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 pop-in">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-[#034E28]">Notifier {target.full_name}</h3>
          <button onClick={onClose} className="btn-press">✕</button>
        </div>
        {sent ? (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--ink-muted)] mb-4">Notification envoyée.</p>
            <button onClick={onClose} className="btn-press text-sm border border-[var(--line)] rounded-sm px-4 py-2">
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
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              placeholder="Message (optionnel)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-press w-full bg-[#034E28] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function NewEmployeeModal({ services, onClose, onCreated }) {
  const [fullName, setFullName] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!fullName.trim() || !serviceId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/create-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), service_id: serviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      onCreated({ full_name: fullName.trim(), code: data.code });
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-[#034E28]">Créer un employé</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nom complet"
            className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
          />
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {error && <p className="text-xs text-[#A8332B]">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="btn-press w-full bg-[#034E28] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer le compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
