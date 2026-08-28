"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function GaleriePage() {
  const { profile, isAdmin } = useApp();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("gallery_photos").select("*").order("published_at", { ascending: false });
    setPhotos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (!confirm("Supprimer cette photo de la galerie ?")) return;
    await supabase.from("gallery_photos").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Galerie</h2>
        {isAdmin && (
          <button onClick={() => setShowNew(true)} className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm">
            + Ajouter une photo
          </button>
        )}
      </div>
      <p className="text-xs text-[#8A857A] mb-6">
        {isAdmin
          ? "Ces photos apparaissent sur la page d'accueil et sur la galerie complète du site public."
          : "Seul le super administrateur peut ajouter une photo à la galerie publique."}
      </p>

      <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.length === 0 && <p className="text-sm text-[#8A857A]">Aucune photo pour le moment.</p>}
        {photos.map((p) => (
          <div key={p.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm overflow-hidden">
            <img src={p.image_url} alt={p.caption || ""} className="w-full aspect-[4/5] object-cover" />
            <div className="p-3">
              <p className="text-xs font-medium truncate">{p.caption || "—"}</p>
              <p className="text-[10px] text-[#8A857A] mb-2">{frDate(p.published_at)}</p>
              {isAdmin && (
                <button onClick={() => remove(p.id)} className="text-[11px] text-[#A8332B]">
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewPhotoModal
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

function NewPhotoModal({ profile, onClose, onSaved }) {
  const [caption, setCaption] = useState("");
  const [publishedAt, setPublishedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      alert("Choisissez une photo.");
      return;
    }
    setSaving(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const { error: uploadError } = await supabase.storage.from("news-images").upload(path, file);
    if (uploadError) {
      setSaving(false);
      alert("Erreur photo : " + uploadError.message);
      return;
    }
    const { data: pub } = supabase.storage.from("news-images").getPublicUrl(path);
    const { error } = await supabase.from("gallery_photos").insert({
      image_url: pub?.publicUrl || null,
      caption: caption.trim() || null,
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
          <h3 className="font-serif text-lg text-[#1B2A4A]">Ajouter une photo</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Photo</label>
            <input required type="file" accept="image/*" onChange={handleFile} className="w-full text-sm" />
            {preview && <img src={preview} alt="Aperçu" className="mt-2 h-40 w-full object-cover rounded-sm border border-[#D8D0BC]" />}
          </div>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Légende (optionnelle)"
            className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Date</label>
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
            {saving ? "Envoi..." : "Ajouter à la galerie"}
          </button>
        </form>
      </div>
    </div>
  );
}
