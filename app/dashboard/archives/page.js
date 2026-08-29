"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function frDateLong(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Le "type" du dossier vient du nom du modèle pour les archives automatiques
// (ex. "Certificat de résidence — MG-DG-2026-0018" -> "Certificat de résidence"),
// et d'une catégorie générique pour les ajouts manuels.
function typeOf(archive) {
  if (archive.source === "document" && archive.title.includes(" — ")) {
    return archive.title.split(" — ")[0].trim();
  }
  return "Documents ajoutés manuellement";
}

export default function ArchivesPage() {
  const { profile, services, isAdmin } = useApp();
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState(isAdmin ? "all" : profile.service_id);
  const [showNew, setShowNew] = useState(false);
  const [type, setType] = useState(null);
  const [date, setDate] = useState(null);

  async function load() {
    const { data } = await supabase.from("archives").select("*, services(name)").order("created_at", { ascending: false });
    setArchives(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const scoped = isAdmin
    ? filterService === "all"
      ? archives
      : archives.filter((a) => a.service_id === filterService)
    : archives.filter((a) => a.service_id === profile.service_id);

  const parType = useMemo(() => {
    if (!type) return scoped;
    return scoped.filter((a) => typeOf(a) === type);
  }, [scoped, type]);

  const parDate = useMemo(() => {
    if (!date) return parType;
    return parType.filter((a) => dayKey(a.created_at) === date);
  }, [parType, date]);

  const dossiersType = useMemo(() => {
    const map = new Map();
    scoped.forEach((a) => {
      const t = typeOf(a);
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(a);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [scoped]);

  const dossiersDate = useMemo(() => {
    const map = new Map();
    parType.forEach((a) => {
      const k = dayKey(a.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [parType]);

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
            <select
              value={filterService}
              onChange={(e) => {
                setFilterService(e.target.value);
                setType(null);
                setDate(null);
              }}
              className="border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm bg-white"
            >
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
      <p className="text-xs text-[#8A857A] mb-4">
        Les documents générés s'archivent automatiquement ici, classés par type puis par date. Vous pouvez aussi ajouter vos propres fichiers.
      </p>

      <div className="flex items-center gap-2 text-sm mb-6 text-[#5B584F]">
        <button onClick={() => { setType(null); setDate(null); }} className={!type ? "font-medium text-[#1B2A4A]" : "hover:underline"}>
          Tous les dossiers
        </button>
        {type && (
          <>
            <span>›</span>
            <button onClick={() => setDate(null)} className={!date ? "font-medium text-[#1B2A4A]" : "hover:underline"}>
              {type}
            </button>
          </>
        )}
        {date && (
          <>
            <span>›</span>
            <span className="font-medium text-[#1B2A4A]">{frDateLong(parDate[0]?.created_at)}</span>
          </>
        )}
      </div>

      {/* ===== Niveau 1 : dossiers par type ===== */}
      {!type && (
        <div className="grid sm:grid-cols-2 gap-3">
          {dossiersType.map(([t, list]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="card-hover text-left bg-white border border-[#E3DCC8] rounded-sm p-4 flex items-center justify-between"
            >
              <span className="text-sm font-medium">📁 {t}</span>
              <span className="text-xs text-[#8A857A]">{list.length} document{list.length > 1 ? "s" : ""}</span>
            </button>
          ))}
          {dossiersType.length === 0 && <p className="text-sm text-[#8A857A]">Aucune archive pour le moment.</p>}
        </div>
      )}

      {/* ===== Niveau 2 : dossiers par date, à l'intérieur d'un type ===== */}
      {type && !date && (
        <div className="grid sm:grid-cols-2 gap-3">
          {dossiersDate.map(([d, list]) => (
            <button
              key={d}
              onClick={() => setDate(d)}
              className="card-hover text-left bg-white border border-[#E3DCC8] rounded-sm p-4 flex items-center justify-between"
            >
              <span className="text-sm font-medium">📁 {frDateLong(list[0].created_at)}</span>
              <span className="text-xs text-[#8A857A]">{list.length} document{list.length > 1 ? "s" : ""}</span>
            </button>
          ))}
          {dossiersDate.length === 0 && <p className="text-sm text-[#8A857A]">Aucune archive de ce type.</p>}
        </div>
      )}

      {/* ===== Niveau 3 : documents du jour choisi ===== */}
      {date && (
        <div className="grid sm:grid-cols-2 gap-4">
          {parDate.map((a) => (
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
        </div>
      )}

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
