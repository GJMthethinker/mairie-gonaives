"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AnnoncesPage() {
  const { services } = useApp();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  }

  function serviceNames(ids) {
    return services.filter((s) => ids?.includes(s.id)).map((s) => s.name).join(", ");
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Annonces</h2>
        <button onClick={() => setShowNew(true)} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
          + Nouvelle annonce
        </button>
      </div>

      <div className="space-y-3">
        {announcements.length === 0 && <p className="text-sm text-[#8A857A]">Aucune annonce pour le moment.</p>}
        {announcements.map((a) => (
          <div key={a.id} className="bg-white border border-[#E3DCC8] rounded-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-medium">{a.title}</p>
              <button onClick={() => remove(a.id)} className="text-[11px] text-[#A8332B] shrink-0">Supprimer</button>
            </div>
            <p className="text-sm text-[#242220] whitespace-pre-line mb-3">{a.content}</p>
            <p className="text-[11px] text-[#8A857A]">
              {frDateTime(a.created_at)} · {a.visibility === "all" ? "Diffusée à tout le monde" : `Visible par : ${serviceNames(a.service_ids) || "—"}`}
            </p>
          </div>
        ))}
      </div>

      {showNew && (
        <NewAnnouncementModal
          services={services}
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

function NewAnnouncementModal({ services, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [selectedServices, setSelectedServices] = useState([]);
  const [saving, setSaving] = useState(false);

  function toggleService(id) {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      content: content.trim(),
      visibility,
      service_ids: visibility === "services" ? selectedServices : [],
      created_by: session.user.id,
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
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Nouvelle annonce</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
          <textarea required rows={4} placeholder="Message" value={content} onChange={(e) => setContent(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />

          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-2">Qui peut voir cette annonce ?</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setVisibility("all")} className={`flex-1 text-xs py-2 rounded-sm border ${visibility === "all" ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#D8D0BC]"}`}>
                Tout le monde
              </button>
              <button type="button" onClick={() => setVisibility("services")} className={`flex-1 text-xs py-2 rounded-sm border ${visibility === "services" ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#D8D0BC]"}`}>
                Services précis
              </button>
            </div>
            {visibility === "services" && (
              <div className="border border-[#D8D0BC] rounded-sm p-2 max-h-40 overflow-y-auto space-y-1">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={saving} className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? "Publication..." : "Publier"}
          </button>
        </form>
      </div>
    </div>
  );
}
