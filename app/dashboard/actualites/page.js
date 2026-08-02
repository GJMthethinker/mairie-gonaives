"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ActualitesPage() {
  const { profile, isAdmin } = useApp();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("news").select("*").order("published_at", { ascending: false });
    setNews(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (!confirm("Supprimer cette actualité ?")) return;
    await supabase.from("news").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Actualités</h2>
        <button onClick={() => setShowNew(true)} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
          + Nouvelle actualité
        </button>
      </div>
      <p className="text-xs text-[#8A857A] mb-6">Publiées ici, elles apparaissent automatiquement sur le site public.</p>

      <div className="space-y-3">
        {news.length === 0 && <p className="text-sm text-[#8A857A]">Aucune actualité publiée pour le moment.</p>}
        {news.map((n) => (
          <div key={n.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-medium">{n.title}</p>
              {(isAdmin || n.created_by === profile.id) && (
                <button onClick={() => remove(n.id)} className="text-[11px] text-[#A8332B] shrink-0">Supprimer</button>
              )}
            </div>
            <p className="text-[11px] text-[#B8862E] uppercase tracking-wide mb-3">{frDate(n.published_at)}</p>
            <p className="text-sm whitespace-pre-line text-[#5B584F]">{n.content}</p>
          </div>
        ))}
      </div>

      {showNew && (
        <NewNewsModal
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

function NewNewsModal({ profile, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishedAt, setPublishedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("news").insert({
      title: title.trim(),
      content: content.trim(),
      published_at: publishedAt,
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
          <h3 className="font-serif text-lg text-[#1B2A4A]">Nouvelle actualité</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenu"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Date de publication</label>
            <input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Publication..." : "Publier"}
          </button>
        </form>
      </div>
    </div>
  );
}
