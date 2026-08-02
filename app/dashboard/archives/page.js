"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ArchivesPage() {
  const { profile, services, isAdmin } = useApp();
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState(isAdmin ? "all" : profile.service_id);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("archives").select("*, services(name)").order("created_at", { ascending: false });
    setArchives(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = isAdmin
    ? filterService === "all"
      ? archives
      : archives.filter((a) => a.service_id === filterService)
    : archives.filter((a) => a.service_id === profile.service_id);

  async function remove(id) {
    if (!confirm("Supprimer cette archive ?")) return;
    await supabase.from("archives").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Archives</h2>
        <div className="flex gap-3 items-center">
          {isAdmin && (
            <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm bg-white">
              <option value="all">Toutes les directions</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => setShowNew(true)} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
            + Ajouter une archive
          </button>
        </div>
      </div>
      <p className="text-xs text-[#8A857A] mb-6">
        Les documents générés s'archivent automatiquement ici. Vous pouvez aussi ajouter vos propres fichiers.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {visible.map((a) => (
          <div key={a.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-medium text-sm">{a.title}</p>
              <button onClick={() => remove(a.id)} className="text-[11px] text-[#A8332B] shrink-0">Supprimer</button>
            </div>
            <p className="text-[11px] text-[#B8862E] uppercase tracking-wide mb-2">
              {frDateTime(a.created_at)} · {a.services?.name} · {a.source === "document" ? "Automatique" : "Ajout manuel"}
            </p>
            {a.description && <p className="text-sm text-[#5B584F] mb-2">{a.description}</p>}
            {a.file_url && (
              <a href={a.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#1B2A4A] underline">
                Ouvrir le fichier
              </a>
            )}
            {a.source === "document" && a.document_id && (
              <a href={`/dashboard/documents?view=${a.document_id}`} className="text-xs text-[#1B2A4A] underline">
                Ouvrir le document
              </a>
            )}
          </div>
        ))}
        {visible.length === 0 && <p className="text-sm text-[#8A857A]">Aucune archive pour le moment.</p>}
      </div>

      {showNew && (
        <NewArchiveModal
          services={services}
          isAdmin={isAdmin}
          defaultService={profile.service_id}
          profile={profile}
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

function NewArchiveModal({ services, isAdmin, defaultService, profile, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [serviceId, setServiceId] = useState(defaultService || services[0]?.id);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    let file_url = null;
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
      const { error: uploadError } = await supabase.storage.from("archives").upload(path, file);
      if (uploadError) {
        setSaving(false);
        alert("Erreur fichier : " + uploadError.message);
        return;
      }
      const { data: pub } = supabase.storage.from("archives").getPublicUrl(path);
      file_url = pub?.publicUrl || null;
    }

    const { error } = await supabase.from("archives").insert({
      title: title.trim(),
      description: description.trim() || null,
      service_id: serviceId,
      source: "manuel",
      file_url,
      created_by: profile.id,
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
          <h3 className="font-serif text-lg text-[#1B2A4A]">Nouvelle archive</h3>
          <button onClick={onClose}>✕</button>
        </div>
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
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Fichier (optionnel)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          {isAdmin && (
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm">
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
