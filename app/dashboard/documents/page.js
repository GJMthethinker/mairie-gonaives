"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

const fieldTypeLabel = { text: "Texte", textarea: "Texte long", date: "Date", number: "Nombre" };

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function DocumentsPage() {
  const { profile, services, isAdmin } = useApp();
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [generated, setGenerated] = useState(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadTemplates() {
    const { data } = await supabase.from("templates").select("*, services(name, code)").order("name");
    setTemplates(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function openTemplate(t) {
    setActiveTemplate(t);
    setValues({});
    setGenerated(null);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    const serviceCode = activeTemplate.services.code;
    const { data: docNumber, error: numError } = await supabase.rpc("next_doc_number", {
      p_service_code: serviceCode,
    });
    if (numError) {
      alert("Erreur lors de la génération du numéro : " + numError.message);
      return;
    }
    const { data: inserted, error } = await supabase
      .from("documents")
      .insert({
        template_id: activeTemplate.id,
        template_name: activeTemplate.name,
        service_id: activeTemplate.service_id,
        doc_number: docNumber,
        values,
        created_by: profile.id,
      })
      .select()
      .single();
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setGenerated(inserted);
  }

  async function handleDeleteTemplate(id) {
    if (!confirm("Supprimer ce modèle ?")) return;
    await supabase.from("templates").delete().eq("id", id);
    loadTemplates();
  }

  const visible = isAdmin ? templates : templates.filter((t) => t.service_id === profile.service_id);

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-[#1B2A4A]">Génération de documents</h2>
        {isAdmin && (
          <button
            onClick={() => setShowNewTemplate(true)}
            className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-sm"
          >
            + Nouveau modèle
          </button>
        )}
      </div>

      {!activeTemplate && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((t) => (
            <div key={t.id} className="bg-white border border-[#E3DCC8] hover:border-[#B8862E] rounded-sm p-5">
              <button onClick={() => openTemplate(t)} className="text-left w-full">
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-[#8A857A] mt-1">{t.services?.name}</p>
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="text-[11px] text-[#A8332B] mt-3 hover:underline"
                >
                  Supprimer le modèle
                </button>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-[#8A857A]">Aucun modèle disponible pour votre service.</p>
          )}
        </div>
      )}

      {activeTemplate && !generated && (
        <div className="max-w-xl">
          <button onClick={() => setActiveTemplate(null)} className="text-sm text-[#5B584F] mb-4">
            ← Retour aux modèles
          </button>
          <div className="bg-white border border-[#E3DCC8] rounded-sm p-6">
            <h3 className="font-serif text-lg text-[#1B2A4A] mb-4">{activeTemplate.name}</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              {activeTemplate.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      required
                      rows={3}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      required
                      type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <button type="submit" className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium">
                Générer le document
              </button>
            </form>
          </div>
        </div>
      )}

      {generated && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                setActiveTemplate(null);
                setGenerated(null);
              }}
              className="text-sm text-[#5B584F]"
            >
              ← Nouveau document
            </button>
            <button onClick={() => window.print()} className="text-sm bg-[#B8862E] text-white px-4 py-2 rounded-sm">
              Imprimer / PDF
            </button>
          </div>
          <div id="print-area">
            <DocumentPreview template={activeTemplate} doc={generated} />
          </div>
        </div>
      )}

      {showNewTemplate && (
        <NewTemplateModal
          services={services}
          onClose={() => setShowNewTemplate(false)}
          onSaved={() => {
            setShowNewTemplate(false);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}

function DocumentPreview({ template, doc }) {
    const formattedValues = {};
    (template.fields || []).forEach((f) => {
          const raw = doc.values[f.key];
          formattedValues[f.key] = f.type === "date" ? frDate(raw) : raw;
    });
    const body = template.body.replace(/{{(.*?)}}/g, (_, key) => formattedValues[key.trim()] ?? doc.values[key.trim()] ?? "");
  const independenceYear = new Date(doc.created_at).getFullYear() - 1803;
  return (
    <div
      id="certificate-paper"
      className="bg-white text-black mx-auto shadow-sm"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        width: "8.5in",
        minHeight: "11in",
        padding: "1in",
        boxSizing: "border-box",
      }}
    >
      <div className="text-center">
        <p className="italic text-sm">Liberté • Égalité • Fraternité</p>
        <p className="font-bold text-lg mt-3">RÉPUBLIQUE D'HAÏTI</p>
        <p className="text-sm">DÉPARTEMENT DE L'ARTIBONITE</p>
        <p className="font-bold text-lg mt-1">MAIRIE DES GONAÏVES</p>
      </div>

      <p className="text-right italic text-sm mt-8">Réf : {doc.doc_number}</p>

      <h3 className="text-center font-bold underline text-base mt-6 mb-10">{template.name.toUpperCase()}</h3>

      <p className="whitespace-pre-line leading-relaxed text-[15px] text-justify">{body}</p>

      <p className="mt-10 text-[15px]">
        Gonaïves, le {frDate(doc.created_at)}, An {independenceYear}ème de l'Indépendance.
      </p>

      <div className="mt-10 text-right text-[15px]">
        <p>Pour la Commission Municipale,</p>
        <p className="mt-12">_____________________________</p>
        <p>{template.signatory || "Signature autorisée"}</p>
      </div>

      <div className="mt-16 pt-3 border-t border-black text-center text-xs">
        <p>Mairie des Gonaïves, Artibonite, Haïti (W.I)</p>
        <p>Adresse : #117, Angles rues Fabre Geffrard et Clerveau, Gonaïves, Haïti (W.I)</p>
      </div>
    </div>
  );
}

function NewTemplateModal({ services, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [fields, setFields] = useState([{ key: "champ1", label: "Champ 1", type: "text" }]);
  const [body, setBody] = useState("");
  const [signatory, setSignatory] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(i, updates) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...updates } : f)));
  }
  function removeField(i) {
    setFields(fields.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("templates").insert({
      name: name.trim(),
      service_id: serviceId,
      fields: fields.filter((f) => f.key.trim() && f.label.trim()),
      body,
      signatory: signatory.trim() || null,
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
      <div className="bg-white rounded-sm w-full max-w-xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Nouveau modèle de document</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Nom du document</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Service concerné</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-2">Champs du formulaire</label>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={f.label}
                    onChange={(e) =>
                      updateField(i, {
                        label: e.target.value,
                        key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                      })
                    }
                    placeholder="Libellé"
                    className="flex-1 border border-[#D8D0BC] rounded-sm px-2 py-1.5 text-sm"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => updateField(i, { type: e.target.value })}
                    className="border border-[#D8D0BC] rounded-sm px-2 py-1.5 text-sm"
                  >
                    {Object.entries(fieldTypeLabel).map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeField(i)} className="text-[#A8332B] text-xs">✕</button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFields([...fields, { key: `champ${fields.length + 1}`, label: "", type: "text" }])}
              className="text-xs text-[#B8862E] mt-2"
            >
              + Ajouter un champ
            </button>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">
              Signataire (optionnel — ex : "Gina JEANTY, Présidente")
            </label>
            <input
              value={signatory}
              onChange={(e) => setSignatory(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">
              Corps du document — utilisez {"{{libellé}}"} pour un champ
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer le modèle"}
          </button>
        </form>
      </div>
    </div>
  );
}
