"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import QRCode from "qrcode";

const fieldTypeLabel = { text: "Texte", textarea: "Texte long", date: "Date", number: "Nombre" };

function frDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3 && parts[2].length === 2) {
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function findValueByLabel(fields, values, patterns) {
  const field = fields.find((f) => patterns.some((p) => f.label.toLowerCase().includes(p)));
  return field ? values[field.key] : null;
}

export default function DocumentsPage() {
  const { profile, services, isAdmin } = useApp();
  const [templates, setTemplates] = useState([]);
  const [allowedIds, setAllowedIds] = useState(new Set());
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [generated, setGenerated] = useState(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [manageAccessTemplate, setManageAccessTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingArchived, setOpeningArchived] = useState(false);
  const [fillError, setFillError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [nif, setNif] = useState("");
  const [ninu, setNinu] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [genBusy, setGenBusy] = useState(false);

  async function loadTemplates() {
    const { data } = await supabase.from("templates").select("*, services(name, code)").order("name");
    setTemplates(data || []);
    if (!isAdmin) {
      const { data: perms } = await supabase.from("template_permissions").select("template_id").eq("user_id", profile.id);
      setAllowedIds(new Set((perms || []).map((p) => p.template_id)));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewId = new URLSearchParams(window.location.search).get("view");
    if (!viewId) return;
    setOpeningArchived(true);
    async function openArchivedDocument() {
      const { data: doc } = await supabase.from("documents").select("*").eq("id", viewId).maybeSingle();
      if (!doc) {
        setOpeningArchived(false);
        return;
      }
      const { data: tmpl } = await supabase.from("templates").select("*, services(name, code)").eq("id", doc.template_id).maybeSingle();
      if (tmpl) {
        setActiveTemplate(tmpl);
        setGenerated(doc);
        if (doc.code_verification) {
          await buildAndShowQr(doc.code_verification);
        }
      }
      setOpeningArchived(false);
    }
    openArchivedDocument();
  }, []);

  function openTemplate(t) {
    setActiveTemplate(t);
    setValues({});
    setGenerated(null);
    setFillError("");
    setNif("");
    setNinu("");
    setQrDataUrl(null);
  }

  // Le document concerne-t-il une personne identifiable (champ "nom" présent) ?
  function templateHasPersonField(t) {
    return !!(t.fields || []).find((f) => ["nom complet", "nom"].some((p) => f.label.toLowerCase().includes(p)));
  }

  async function recordDocument(activeTemplateRef, docNumber, inserted) {
    await supabase.from("archives").insert({
      service_id: activeTemplateRef.service_id,
      title: `${activeTemplateRef.name} — ${docNumber}`,
      description: `Document généré automatiquement`,
      source: "document",
      document_id: inserted.id,
      created_by: profile.id,
    });

    if (activeTemplateRef.name.toLowerCase().includes("résidence")) {
      const fullName = findValueByLabel(activeTemplateRef.fields, values, ["nom complet", "nom"]);
      const address = findValueByLabel(activeTemplateRef.fields, values, ["adresse"]);
      const phone = findValueByLabel(activeTemplateRef.fields, values, ["téléphone", "telephone"]);
      const birthDate = findValueByLabel(activeTemplateRef.fields, values, ["date de naissance"]);
      const birthPlace = findValueByLabel(activeTemplateRef.fields, values, ["lieu de naissance"]);
      if (fullName) {
        await supabase.from("residents").insert({
          full_name: fullName,
          address,
          phone,
          birth_date: birthDate,
          birth_place: birthPlace,
          document_id: inserted.id,
          service_id: activeTemplateRef.service_id,
        });
      }
    }
  }

  async function buildAndShowQr(code) {
    const url = `${window.location.origin}/verifier?code=${encodeURIComponent(code)}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
    setQrDataUrl(dataUrl);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setFillError("");
    setGenBusy(true);

    const fullName = findValueByLabel(activeTemplate.fields, values, ["nom complet", "nom"]);
    const needsPersonne = templateHasPersonField(activeTemplate);

    if (needsPersonne && !nif.trim() && !ninu.trim()) {
      setGenBusy(false);
      setFillError("Indiquez le NIF ou le NINU de la personne concernée, pour le code de vérification.");
      return;
    }

    // 1. Trouver ou créer la personne, si le document la concerne
    let personne = null;
    if (needsPersonne) {
      const { data: p, error: perr } = await supabase.rpc("find_or_create_personne", {
        p_nom_complet: fullName || "—",
        p_nif: nif.trim(),
        p_ninu: ninu.trim(),
        p_telephone: findValueByLabel(activeTemplate.fields, values, ["téléphone", "telephone"]) || "",
        p_adresse: findValueByLabel(activeTemplate.fields, values, ["adresse"]) || "",
      });
      if (perr) {
        setGenBusy(false);
        setFillError("Erreur identité : " + perr.message);
        return;
      }
      personne = p;
    }

    // 2. Un document existe-t-il déjà pour cette personne + ce modèle ? -> mise à jour versionnée
    let existing = null;
    if (personne) {
      const { data: exList } = await supabase
        .from("documents")
        .select("*")
        .eq("template_id", activeTemplate.id)
        .eq("personne_id", personne.id)
        .order("created_at", { ascending: false })
        .limit(1);
      existing = exList && exList.length > 0 ? exList[0] : null;
    }

    let inserted;
    let docNumber;
    const suffixe = activeTemplate.code_suffixe || activeTemplate.name.slice(0, 2).toUpperCase();

    if (existing) {
      // Mise à jour : on garde le même numéro et le même code, on archive l'ancien état
      docNumber = existing.doc_number;
      await supabase.from("documents_versions").insert({
        document_id: existing.id,
        valeurs_avant: existing.values,
        valeurs_apres: values,
        modifie_par: profile.id,
      });
      const { data: upd, error } = await supabase
        .from("documents")
        .update({ values, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        setGenBusy(false);
        setFillError("Erreur : " + error.message);
        return;
      }
      inserted = upd;
    } else {
      const { data: num, error: numError } = await supabase.rpc("next_doc_number", {
        p_service_code: activeTemplate.services.code,
      });
      if (numError) {
        setGenBusy(false);
        setFillError("Erreur lors de la génération du numéro : " + numError.message);
        return;
      }
      docNumber = num;
      const codeVerification = personne ? `${personne.code_unique}-${suffixe}` : docNumber;
      const { data: ins, error } = await supabase
        .from("documents")
        .insert({
          template_id: activeTemplate.id,
          template_name: activeTemplate.name,
          service_id: activeTemplate.service_id,
          doc_number: docNumber,
          values,
          created_by: profile.id,
          personne_id: personne?.id || null,
          code_verification: codeVerification,
        })
        .select()
        .single();
      if (error) {
        setGenBusy(false);
        setFillError("Erreur : " + error.message);
        return;
      }
      inserted = ins;
      await recordDocument(activeTemplate, docNumber, inserted);
    }

    setGenerated(inserted);
    if (inserted.code_verification) {
      await buildAndShowQr(inserted.code_verification);
    }
    setGenBusy(false);
  }

  async function downloadFilledDocx() {
    setDownloading(true);
    setFillError("");
    try {
      const res = await fetch(activeTemplate.source_file_url);
      if (!res.ok) throw new Error("Impossible de récupérer l'exemplaire du document.");
      const buf = await res.arrayBuffer();
      const zip = new PizZip(buf);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      const data = {};
      (activeTemplate.fields || []).forEach((f) => {
        const raw = values[f.key];
        data[f.key] = f.type === "date" ? frDate(raw) : raw ?? "";
      });
      data["reference"] = generated.doc_number;
      doc.render(data);
      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTemplate.name.replace(/\s+/g, "_")}_${generated.doc_number}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFillError("Erreur lors du remplissage du document : " + err.message);
    }
    setDownloading(false);
  }

  async function handleDeleteTemplate(id) {
    if (!confirm("Supprimer ce modèle ?")) return;
    await supabase.from("templates").delete().eq("id", id);
    loadTemplates();
  }

  const visible = isAdmin ? templates : templates.filter((t) => allowedIds.has(t.id));

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
            <div key={t.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-5">
              <button onClick={() => openTemplate(t)} className="text-left w-full">
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-[#8A857A] mt-1">{t.services?.name}</p>
                {t.source_file_url && (
                  <p className="text-[10px] text-[#B8862E] mt-1 uppercase tracking-wide">Modèle Word</p>
                )}
              </button>
              {isAdmin && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setManageAccessTemplate(t)}
                    className="text-[11px] text-[#1B2A4A] hover:underline"
                  >
                    Gérer les accès
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-[11px] text-[#A8332B] hover:underline"
                  >
                    Supprimer le modèle
                  </button>
                </div>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-[#8A857A]">
              {isAdmin ? "Aucun modèle créé pour le moment." : "Aucun document ne vous a été autorisé pour le moment. Contactez le super administrateur."}
            </p>
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
              {templateHasPersonField(activeTemplate) && (
                <div className="border-t border-[#E3DCC8] pt-4">
                  <p className="text-xs uppercase tracking-wide text-[#8A857A] mb-2">
                    Identité — pour le code de vérification (QR code)
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={nif}
                      onChange={(e) => setNif(e.target.value)}
                      placeholder="NIF"
                      className="flex-1 border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
                    />
                    <input
                      value={ninu}
                      onChange={(e) => setNinu(e.target.value)}
                      placeholder="NINU"
                      className="flex-1 border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-[#8A857A] mt-1">
                    Un seul des deux suffit. Retrouve automatiquement la personne si elle est déjà connue.
                  </p>
                </div>
              )}
              {fillError && <p className="text-xs text-[#A8332B]">{fillError}</p>}
              <button
                type="submit"
                disabled={genBusy}
                className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {genBusy ? "Génération..." : "Générer le document"}
              </button>
            </form>
          </div>
        </div>
      )}

      {generated && activeTemplate.source_file_url && (
        <div className="max-w-xl">
          <button
            onClick={() => {
              setActiveTemplate(null);
              setGenerated(null);
            }}
            className="text-sm text-[#5B584F] mb-4"
          >
            ← Nouveau document
          </button>
          <div className="bg-white border border-[#E3DCC8] rounded-sm p-6 text-center">
            <p className="font-serif text-lg text-[#1B2A4A] mb-2">Document créé</p>
            <p className="text-sm text-[#5B584F] mb-1">Référence : <strong>{generated.doc_number}</strong></p>
            {qrDataUrl && (
              <div className="my-4">
                <img src={qrDataUrl} alt="QR code de vérification" className="mx-auto w-32 h-32" />
                <p className="text-[11px] text-[#8A857A] mt-1">Code : {generated.code_verification}</p>
                <p className="text-[10px] text-[#A8332B] mt-1">
                  Ce modèle Word ne peut pas encore intégrer le QR code automatiquement — imprimez-le à part et joignez-le au document.
                </p>
              </div>
            )}
            <p className="text-xs text-[#8A857A] mb-5">
              Ce modèle utilise un exemplaire Word. Téléchargez le document rempli, prêt à imprimer.
            </p>
            <button
              onClick={downloadFilledDocx}
              disabled={downloading}
              className="bg-[#B8862E] text-white px-5 py-2.5 rounded-sm text-sm font-medium disabled:opacity-50"
            >
              {downloading ? "Préparation..." : "Télécharger le document (.docx)"}
            </button>
            {fillError && <p className="text-xs text-[#A8332B] mt-3">{fillError}</p>}
          </div>
        </div>
      )}

      {generated && !activeTemplate.source_file_url && (
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
            <DocumentPreview template={activeTemplate} doc={generated} qrDataUrl={qrDataUrl} />
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

      {manageAccessTemplate && (
        <ManageAccessModal
          template={manageAccessTemplate}
          onClose={() => setManageAccessTemplate(null)}
        />
      )}
    </div>
  );
}

function DocumentPreview({ template, doc, qrDataUrl }) {
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
      className="bg-white text-black mx-auto shadow-sm flex flex-col"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        width: "8.5in",
        height: "11in",
        padding: "0.75in 1in",
        boxSizing: "border-box",
      }}
    >
      <div className="flex items-start justify-between shrink-0">
        <img src="/logo-mairie.jpg" alt="Logo Mairie des Gonaïves" style={{ height: "1.1in", width: "auto" }} />
        <div className="text-center flex-1 px-2">
          <img src="/palmiste.jpg" alt="Armoiries d'Haïti" style={{ height: "0.9in", width: "auto", margin: "0 auto" }} />
          <p className="italic text-sm mt-1">Liberté • Égalité • Fraternité</p>
          <p className="font-bold text-lg mt-1">RÉPUBLIQUE D'HAÏTI</p>
          <p className="text-sm">DÉPARTEMENT DE L'ARTIBONITE</p>
          <p className="font-bold text-lg mt-1">MAIRIE DES GONAÏVES</p>
        </div>
        <img src="/logo-mairie.jpg" alt="Logo Mairie des Gonaïves" style={{ height: "1.1in", width: "auto" }} />
      </div>

      <p className="text-right italic text-sm mt-6 shrink-0">Réf : {doc.doc_number}</p>

      <h3 className="text-center font-bold underline text-base mt-4 mb-8 shrink-0">{template.name.toUpperCase()}</h3>

      <div className="flex-1">
        <p className="whitespace-pre-line leading-relaxed text-[15px] text-justify">{body}</p>
      </div>

      <div className="shrink-0">
        <p className="text-[15px]">
          Gonaïves, le {frDate(doc.created_at)}, An {independenceYear}ème de l'Indépendance.
        </p>

        <div className="mt-8 text-right text-[15px]">
          <p>Pour la Commission Municipale,</p>
          <p className="mt-12">_____________________________</p>
          <p>{template.signatory || "Signature autorisée"}</p>
        </div>

        <div className="mt-10 pt-3 border-t border-black flex items-center gap-3">
          {qrDataUrl && (
            <div className="shrink-0 text-center">
              <img src={qrDataUrl} alt="QR de vérification" style={{ width: "0.75in", height: "0.75in" }} />
              <p style={{ fontSize: "7px" }}>{doc.code_verification}</p>
            </div>
          )}
          <div className="flex-1 text-center text-xs">
            <p>Mairie des Gonaïves, Artibonite, Haïti (W.I)</p>
            <p>Adresse : #117, Angles rues Fabre Geffrard et Clerveau, Gonaïves, Haïti (W.I)</p>
            {qrDataUrl && <p className="text-[10px] mt-0.5">Vérifiez ce document sur mairie-gonaives-m7ya.vercel.app/verifier</p>}
          </div>
        </div>
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
  const [codeSuffixe, setCodeSuffixe] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  function updateField(i, updates) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...updates } : f)));
  }
  function removeField(i) {
    setFields(fields.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!file && !body.trim()) {
      alert("Joignez un exemplaire Word, ou décrivez le corps du document.");
      return;
    }
    setSaving(true);

    let source_file_url = null;
    let source_file_name = null;
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
      const { error: upErr } = await supabase.storage.from("document-templates").upload(path, file);
      if (upErr) {
        setSaving(false);
        alert("Erreur fichier : " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("document-templates").getPublicUrl(path);
      source_file_url = pub?.publicUrl || null;
      source_file_name = file.name;
    }

    const { error } = await supabase.from("templates").insert({
      name: name.trim(),
      service_id: serviceId,
      fields: fields.filter((f) => f.key.trim() && f.label.trim()),
      body: body.trim() || null,
      signatory: signatory.trim() || null,
      code_suffixe: codeSuffixe.trim().toUpperCase() || name.trim().slice(0, 2).toUpperCase(),
      source_file_url,
      source_file_name,
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
            {fields.length > 0 && (
              <p className="text-[11px] text-[#8A857A] mt-2">
                Clés disponibles pour l'exemplaire Word : {fields.filter(f=>f.key).map(f => `{{${f.key}}}`).join(" ")}
              </p>
            )}
          </div>

          <div className="border-t border-[#E3DCC8] pt-4">
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">
              Exemplaire Word du document (.docx) — recommandé
            </label>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            <p className="text-[11px] text-[#8A857A] mt-2">
              Dans le fichier Word, écrivez <code>{"{{cle}}"}</code> à l'endroit exact où chaque information doit
              apparaître (la clé doit correspondre à celle affichée au-dessus). Ex : <code>{"{{nom_complet}}"}</code>.
              La référence du document est disponible via <code>{"{{reference}}"}</code>.
            </p>
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
              Suffixe du code de vérification (optionnel — ex : "CR" pour Certificat de résidence)
            </label>
            <input
              value={codeSuffixe}
              onChange={(e) => setCodeSuffixe(e.target.value)}
              maxLength={4}
              placeholder="Déduit du nom si laissé vide"
              className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm uppercase"
            />
          </div>

          {!file && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">
                Ou décrivez le corps du document ici — utilisez {"{{libellé}}"} pour un champ
              </label>
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm font-mono"
              />
            </div>
          )}

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

function ManageAccessModal({ template, onClose }) {
  const [people, setPeople] = useState([]);
  const [granted, setGranted] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, role, status, services(name)")
        .eq("status", "approuve")
        .neq("role", "superadmin")
        .order("full_name");
      const { data: perms } = await supabase
        .from("template_permissions")
        .select("user_id")
        .eq("template_id", template.id);
      setPeople(profs || []);
      setGranted(new Set((perms || []).map((p) => p.user_id)));
      setLoading(false);
    }
    load();
  }, [template.id]);

  async function toggle(userId) {
    setBusyId(userId);
    const isGranted = granted.has(userId);
    if (isGranted) {
      await supabase.from("template_permissions").delete().eq("template_id", template.id).eq("user_id", userId);
    } else {
      await supabase.from("template_permissions").insert({ template_id: template.id, user_id: userId });
    }
    setGranted((prev) => {
      const next = new Set(prev);
      if (isGranted) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setBusyId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Accès — {template.name}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="text-xs text-[#8A857A] mb-4">
          Cochez les employés autorisés à générer ce document. Ce modèle apparaîtra sur leur tableau de bord.
        </p>
        {loading ? (
          <p className="text-sm text-[#8A857A]">Chargement…</p>
        ) : people.length === 0 ? (
          <p className="text-sm text-[#8A857A]">Aucun employé approuvé pour le moment.</p>
        ) : (
          <div className="space-y-1">
            {people.map((p) => (
              <label
                key={p.id}
                className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-sm hover:bg-[#FBFAF6] text-sm"
              >
                <span>
                  {p.full_name}
                  <span className="text-xs text-[#8A857A]"> — {p.services?.name || "—"}</span>
                </span>
                <input
                  type="checkbox"
                  checked={granted.has(p.id)}
                  disabled={busyId === p.id}
                  onChange={() => toggle(p.id)}
                />
              </label>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-5 border border-[#D8D0BC] rounded-sm px-4 py-2 text-sm">
          Fermer
        </button>
      </div>
    </div>
  );
}
