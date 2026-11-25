"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

// Adresse publique utilisée dans le QR code (variable d'environnement Vercel).
const BASE_ENV = (process.env.NEXT_PUBLIC_BADGE_BASE_URL || "").replace(/\/$/, "");
const CR80_W = 53.98;
const CR80_H = 85.6;
const GREEN = "#024F2B";
const YELLOW = "#F5E600";
const ADRESSE = "117, Angles rues Fabre N. Geffrard et Clerveau, Gonaïves, Artibonite, Haïti (W.I)";

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const fmtDate = (d) => (d ? d.split("-").reverse().join("/") : "");

function baseUrl() {
  return BASE_ENV || (typeof window !== "undefined" ? window.location.origin : "");
}
function badgeUrl(b) {
  return `${baseUrl()}/b/${b.code}`;
}
function photoUrlOf(b) {
  if (!b.photo_path) return null;
  return supabase.storage.from("badge-photos").getPublicUrl(b.photo_path).data.publicUrl;
}
function etatOf(b) {
  if (b.status === "revoque") return { label: "Révoqué", color: "#A8332B" };
  if (b.valid_until < new Date().toISOString().slice(0, 10)) return { label: "Expiré", color: "#B8862E" };
  return { label: "Actif", color: "#0B6B3A" };
}

// Recadre la photo en 3:4 et la réduit (léger, rapide à charger).
async function resizePhoto(file) {
  const bmp = await createImageBitmap(file);
  const ratio = 3 / 4;
  let sw = bmp.width,
    sh = bmp.height,
    sx = 0,
    sy = 0;
  if (sw / sh > ratio) {
    const nw = sh * ratio;
    sx = (sw - nw) / 2;
    sw = nw;
  } else {
    const nh = sw / ratio;
    sy = (sh - nh) * 0.2; // privilégie le haut (visage)
    sh = nh;
  }
  const c = document.createElement("canvas");
  c.width = 450;
  c.height = 600;
  c.getContext("2d").drawImage(bmp, sx, sy, sw, sh, 0, 0, 450, 600);
  return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.88));
}

/* ------------------------------------------------------------------ */
/*  Une face du badge (recto ou verso), format CR80 vertical           */
/* ------------------------------------------------------------------ */
function Face({ b, side, qr, bleed = 0 }) {
  const W = CR80_W + 2 * bleed;
  const H = CR80_H + 2 * bleed;
  const frame = bleed + 1.7;
  const photo = photoUrlOf(b);
  const host = baseUrl().replace(/^https?:\/\//, "");

  return (
    <div
      className="badge-face"
      style={{
        position: "relative",
        width: `${W}mm`,
        height: `${H}mm`,
        background: GREEN,
        color: "#fff",
        overflow: "hidden",
        boxSizing: "border-box",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div style={{ position: "absolute", inset: `${frame}mm`, border: `0.35mm solid ${YELLOW}` }} />
      <div
        style={{
          position: "absolute",
          inset: `${frame + 1.2}mm`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
        }}
      >
        {side === "recto" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <div style={{ width: "11mm", height: "11mm", borderRadius: "50%", background: "#fff", padding: "0.5mm" }}>
                <img src="/logo-mairie.jpg" alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: "3.6pt", letterSpacing: "0.25mm", marginTop: "1.2mm", opacity: 0.85 }}>
                RÉPUBLIQUE D'HAÏTI
              </div>
              <div className="font-display" style={{ fontSize: "6.6pt", fontWeight: 700, marginTop: "0.4mm", letterSpacing: "0.1mm" }}>
                MAIRIE DES GONAÏVES
              </div>
            </div>

            <div
              style={{
                width: "23mm",
                height: "29mm",
                border: "0.5mm solid #fff",
                borderRadius: "1mm",
                overflow: "hidden",
                background: "#E8E8E0",
              }}
            >
              {photo && <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>

            <div style={{ width: "100%" }}>
              <div style={{ fontSize: "6.2pt", lineHeight: 1.15 }}>{b.prenom}</div>
              <div className="font-display" style={{ fontSize: "8.4pt", fontWeight: 800, lineHeight: 1.1, textTransform: "uppercase" }}>
                {b.nom}
              </div>
              <div style={{ fontSize: "5.6pt", marginTop: "1.2mm", lineHeight: 1.2 }}>{b.fonction}</div>
              <div style={{ fontSize: "4.8pt", marginTop: "0.5mm", opacity: 0.85, lineHeight: 1.2 }}>{b.services?.name || b.direction}</div>
            </div>

            <div style={{ width: "100%", borderTop: "0.15mm solid rgba(255,255,255,0.35)", paddingTop: "1mm" }}>
              <div style={{ fontSize: "4.8pt", fontWeight: 700 }}>N° {b.matricule}</div>
              <div style={{ fontSize: "4.2pt", opacity: 0.85 }}>Valide jusqu'au {fmtDate(b.valid_until)}</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <div style={{ width: "8mm", height: "8mm", borderRadius: "50%", background: "#fff", padding: "0.4mm" }}>
                <img src="/logo-mairie.jpg" alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              </div>
              <div className="font-display" style={{ fontSize: "5.6pt", fontWeight: 700, marginTop: "1mm" }}>
                MAIRIE DES GONAÏVES
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "31mm", height: "31mm", background: "#fff", borderRadius: "1.5mm", padding: "2mm", boxSizing: "border-box" }}>
                {qr && <img src={qr} alt="" style={{ width: "100%", height: "100%", display: "block" }} />}
              </div>
              <div style={{ fontSize: "4.8pt", marginTop: "2mm", lineHeight: 1.25 }}>
                Scannez ce code pour vérifier
                <br />
                l'authenticité du badge
              </div>
              <div style={{ fontSize: "4pt", marginTop: "0.8mm", opacity: 0.8 }}>{host}</div>
            </div>

            <div style={{ width: "100%", fontSize: "3.9pt", lineHeight: 1.3, opacity: 0.92 }}>
              Ce badge est strictement personnel et demeure la propriété de la Mairie des Gonaïves. En cas de perte ou de
              découverte, merci de le rapporter à :
              <br />
              {ADRESSE}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function BadgesPage() {
  const { isAdmin, services } = useApp();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null); // { type: "ok" | "err", text }
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(new Set());
  const [bleed, setBleed] = useState(0);
  const [preview, setPreview] = useState(null); // { b, qr }
  const [printList, setPrintList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", fonction: "", service_id: "", photo: null, withAccount: false });
  const [importRows, setImportRows] = useState(null);
  const [importResult, setImportResult] = useState(null);

  async function load() {
    const { data, error } = await supabase.from("badges").select("*, services(name)").order("matricule");
    if (error) setMsg({ type: "err", text: error.message });
    setBadges(data || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return badges;
    return badges.filter((b) => norm(`${b.prenom} ${b.nom} ${b.matricule} ${b.fonction} ${b.services?.name}`).includes(q));
  }, [badges, search]);

  /* ---------- photo ---------- */
  async function uploadPhoto(b, file) {
    const blob = await resizePhoto(file);
    const path = `${b.code}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("badge-photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) throw new Error("Photo : " + error.message);
    const { error: e2 } = await supabase.from("badges").update({ photo_path: path }).eq("id", b.id);
    if (e2) throw new Error(e2.message);
    if (b.photo_path) await supabase.storage.from("badge-photos").remove([b.photo_path]);
  }
  async function onPhotoChange(b, e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy("Envoi de la photo…");
    try {
      await uploadPhoto(b, f);
      setMsg({ type: "ok", text: `Photo enregistrée pour ${b.prenom} ${b.nom}.` });
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
    setBusy("");
  }

  /* ---------- création de compte (réutilise la route existante) ---------- */
  async function createAccount(fullName, serviceId) {
    const res = await fetch("/api/create-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, service_id: serviceId }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Création du compte impossible");
    return j; // { code, full_name, id }
  }

  /* ---------- ajout manuel ---------- */
  async function addBadge(e) {
    e.preventDefault();
    setMsg(null);
    setBusy("Création du badge…");
    try {
      let acc = null;
      if (form.withAccount) acc = await createAccount(`${form.prenom} ${form.nom}`.trim(), form.service_id);
      const { data, error } = await supabase
        .from("badges")
        .insert({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          fonction: form.fonction.trim(),
          service_id: form.service_id,
          profile_id: acc?.id || null,
        })
        .select("*, services(name)")
        .single();
      if (error) throw new Error(error.message);
      if (form.photo) await uploadPhoto(data, form.photo);
      setMsg({
        type: "ok",
        text: `Badge ${data.matricule} créé pour ${data.prenom} ${data.nom}.` + (acc ? ` Identifiant de connexion : ${acc.code}` : ""),
      });
      setForm({ nom: "", prenom: "", fonction: "", service_id: "", photo: null, withAccount: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
    setBusy("");
  }

  /* ---------- révocation en un clic ---------- */
  async function toggleRevoke(b) {
    const revoque = b.status === "revoque";
    const { error } = await supabase
      .from("badges")
      .update({ status: revoque ? "actif" : "revoque", revoked_at: revoque ? null : new Date().toISOString() })
      .eq("id", b.id);
    if (error) setMsg({ type: "err", text: error.message });
    else setMsg({ type: "ok", text: revoque ? `Badge de ${b.prenom} ${b.nom} réactivé.` : `Badge de ${b.prenom} ${b.nom} révoqué.` });
    load();
  }

  /* ---------- import Excel ---------- */
  function findService(v) {
    const n = norm(v);
    if (!n) return null;
    return (
      services.find((s) => norm(s.name) === n) ||
      services.find((s) => norm(s.code) === n) ||
      (n.length >= 4 ? services.find((s) => norm(s.name).includes(n) || n.includes(norm(s.name))) : null) ||
      null
    );
  }
  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nom", "Prénom", "Fonction", "Direction"],
      ["EXEMPLE", "Marie", "Secrétaire", services[0]?.name || "Direction Générale"],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 28 }, { wch: 36 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employés");
    XLSX.writeFile(wb, "modele-import-badges.xlsx");
  }
  async function onImportFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg(null);
    setImportResult(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const existing = new Set(badges.map((b) => norm(`${b.prenom} ${b.nom}`)));
      const seen = new Set();
      const rows = raw
        .map((r, i) => {
          const o = {};
          Object.keys(r).forEach((k) => (o[norm(k)] = String(r[k]).trim()));
          const nom = o["nom"] || "";
          const prenom = o["prenom"] || "";
          const fonction = o["fonction"] || "";
          const direction = o["direction"] || o["service"] || "";
          const svc = findService(direction);
          let erreur = null;
          if (!nom || !prenom || !fonction || !direction) erreur = "Champ manquant";
          else if (!svc) erreur = "Direction introuvable";
          else {
            const k = norm(`${prenom} ${nom}`);
            if (existing.has(k) || seen.has(k)) erreur = "Déjà existant";
            seen.add(k);
          }
          return { ligne: i + 2, nom, prenom, fonction, direction, service_id: svc?.id, direction_nom: svc?.name, erreur };
        })
        .filter((r) => r.nom || r.prenom || r.fonction || r.direction);
      if (rows.length === 0) throw new Error("Le fichier ne contient aucune ligne exploitable. Utilisez le modèle Excel.");
      setImportRows(rows);
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  }
  async function runImport() {
    const todo = importRows.filter((r) => !r.erreur);
    const out = [];
    const fails = [];
    for (let i = 0; i < todo.length; i++) {
      const r = todo[i];
      setBusy(`Création ${i + 1} / ${todo.length}…`);
      try {
        const acc = await createAccount(`${r.prenom} ${r.nom}`, r.service_id);
        const { data, error } = await supabase
          .from("badges")
          .insert({ nom: r.nom, prenom: r.prenom, fonction: r.fonction, service_id: r.service_id, profile_id: acc.id || null })
          .select("matricule")
          .single();
        if (error) throw new Error("badge non créé (" + error.message + "), mais le compte existe : " + acc.code);
        out.push({
          Nom: r.nom,
          "Prénom": r.prenom,
          Fonction: r.fonction,
          Direction: r.direction_nom,
          Matricule: data.matricule,
          "Code de connexion": acc.code,
        });
      } catch (err) {
        fails.push(`${r.prenom} ${r.nom} : ${err.message}`);
      }
    }
    setImportResult({ out, fails });
    setImportRows(null);
    setBusy("");
    await load();
  }
  async function downloadResult() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(importResult.out);
    ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 28 }, { wch: 36 }, { wch: 12 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Identifiants");
    XLSX.writeFile(wb, "identifiants-employes-CONFIDENTIEL.xlsx");
  }

  /* ---------- aperçu et impression ---------- */
  async function qrOf(b) {
    return QRCode.toDataURL(badgeUrl(b), { errorCorrectionLevel: "M", margin: 0, width: 600 });
  }
  async function openPreview(b) {
    setPreview({ b, qr: await qrOf(b) });
  }
  async function imprimer(list) {
    if (!list.length) return;
    setBusy("Préparation du fichier d'impression…");
    const items = await Promise.all(list.map(async (b) => ({ b, qr: await qrOf(b) })));
    setPrintList(items);
  }
  useEffect(() => {
    if (!printList.length) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 80));
      const imgs = [...document.querySelectorAll("#badge-print-root img")];
      await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      if (cancelled) return;
      window.print();
      setPrintList([]);
      setBusy("");
    })();
    return () => {
      cancelled = true;
    };
  }, [printList]);

  const W = CR80_W + 2 * bleed;
  const H = CR80_H + 2 * bleed;
  const allSelected = filtered.length > 0 && filtered.every((b) => sel.has(b.id));
  const toggleSel = (id) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };

  if (!isAdmin) {
    return <p className="text-sm text-[var(--ink-muted)]">Cette page est réservée au super administrateur.</p>;
  }

  const inputCls = "w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm bg-white";
  const btn = "btn-press text-sm rounded-sm px-4 py-2 border border-[var(--line)] bg-white";
  const btnMain = "btn-press text-sm rounded-sm px-4 py-2 bg-[#034E28] text-white disabled:opacity-50";

  return (
    <div>
      {/* Règles d'impression : format carte CR80, un recto puis un verso par badge */}
      <style>{`
        #badge-print-root{display:none}
        @page{size:${W}mm ${H}mm;margin:0}
        @media print{
          html,body{margin:0!important;padding:0!important;background:#fff!important}
          body>*:not(#badge-print-root){display:none!important}
          #badge-print-root{display:block!important}
          #badge-print-root,#badge-print-root *{visibility:visible!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .badge-face{break-after:page;page-break-after:always}
          .badge-face:last-child{break-after:auto;page-break-after:auto}
        }
      `}</style>
      {printList.length > 0 &&
        createPortal(
          <div id="badge-print-root">
            {printList.flatMap(({ b, qr }) => [
              <Face key={b.id + "r"} b={b} side="recto" qr={qr} bleed={bleed} />,
              <Face key={b.id + "v"} b={b} side="verso" qr={qr} bleed={bleed} />,
            ])}
          </div>,
          document.body
        )}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl text-[#034E28]">Badges</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {badges.length} badge{badges.length > 1 ? "s" : ""} · validité jusqu'au 30/09/2027
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnMain} onClick={() => setShowForm((v) => !v)}>
            + Ajouter un badge
          </button>
          <label className={btn + " cursor-pointer"}>
            Importer un fichier Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImportFile} />
          </label>
          <button className={btn} onClick={downloadTemplate}>
            Modèle Excel
          </button>
        </div>
      </div>

      {busy && <div className="mb-4 text-sm bg-[#FFF9C4] border border-[#E9E2C8] rounded-sm px-4 py-2">{busy}</div>}
      {msg && (
        <div
          className={`mb-4 text-sm rounded-sm px-4 py-2 border ${
            msg.type === "ok" ? "bg-[#E8F3EC] border-[#0B6B3A] text-[#0B6B3A]" : "bg-[#FBEAE8] border-[#A8332B] text-[#A8332B]"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <form onSubmit={addBadge} className="bg-white border border-[var(--line)] rounded-sm p-5 mb-6 grid md:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Nom" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <input className={inputCls} placeholder="Prénom" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <input className={inputCls} placeholder="Fonction" required value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} />
          <select className={inputCls} required value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
            <option value="">— Direction —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div>
            <label className="text-xs text-[var(--ink-muted)]">Photo (facultative, vous pouvez l'ajouter plus tard)</label>
            <input type="file" accept="image/*" className="block text-sm mt-1" onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] || null })} />
          </div>
          <label className="flex items-center gap-2 text-sm self-end">
            <input type="checkbox" checked={form.withAccount} onChange={(e) => setForm({ ...form, withAccount: e.target.checked })} />
            Créer aussi le compte de connexion de l'employé
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button className={btnMain} disabled={!!busy}>
              Créer le badge
            </button>
            <button type="button" className={btn} onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Aperçu de l'import */}
      {importRows && (
        <div className="bg-white border border-[var(--line)] rounded-sm p-5 mb-6">
          <p className="font-medium mb-1">Aperçu de l'import</p>
          <p className="text-sm text-[var(--ink-muted)] mb-3">
            {importRows.filter((r) => !r.erreur).length} ligne(s) prête(s) · {importRows.filter((r) => r.erreur).length} à corriger (ignorées)
          </p>
          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-[var(--line)] rounded-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#F6F3E6] text-left sticky top-0">
                <tr>
                  <th className="px-3 py-2">Ligne</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Prénom</th>
                  <th className="px-3 py-2">Fonction</th>
                  <th className="px-3 py-2">Direction</th>
                  <th className="px-3 py-2">Contrôle</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r) => (
                  <tr key={r.ligne} className="border-t border-[var(--line)]">
                    <td className="px-3 py-1.5">{r.ligne}</td>
                    <td className="px-3 py-1.5">{r.nom}</td>
                    <td className="px-3 py-1.5">{r.prenom}</td>
                    <td className="px-3 py-1.5">{r.fonction}</td>
                    <td className="px-3 py-1.5">{r.direction_nom || r.direction}</td>
                    <td className="px-3 py-1.5" style={{ color: r.erreur ? "#A8332B" : "#0B6B3A" }}>
                      {r.erreur || "OK"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4">
            <button className={btnMain} disabled={!!busy || importRows.every((r) => r.erreur)} onClick={runImport}>
              Créer {importRows.filter((r) => !r.erreur).length} compte(s) et badge(s)
            </button>
            <button className={btn} onClick={() => setImportRows(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Résultat de l'import */}
      {importResult && (
        <div className="bg-white border border-[#0B6B3A] rounded-sm p-5 mb-6">
          <p className="font-medium text-[#0B6B3A]">{importResult.out.length} compte(s) et badge(s) créés.</p>
          {importResult.fails.length > 0 && (
            <ul className="text-sm text-[#A8332B] mt-2 list-disc pl-5">
              {importResult.fails.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          {importResult.out.length > 0 && (
            <>
              <p className="text-sm text-[var(--ink-muted)] mt-2">
                Téléchargez la liste des identifiants maintenant et remettez à chaque employé le sien. Ce fichier est confidentiel.
              </p>
              <button className={btnMain + " mt-3"} onClick={downloadResult}>
                Télécharger les identifiants (Excel)
              </button>
            </>
          )}
        </div>
      )}

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input className={inputCls + " max-w-xs"} placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="text-sm flex items-center gap-2">
          Fond perdu
          <select className="border border-[var(--line)] rounded-sm px-2 py-1.5 text-sm bg-white" value={bleed} onChange={(e) => setBleed(Number(e.target.value))}>
            <option value={0}>0 mm</option>
            <option value={1.5}>1,5 mm</option>
            <option value={3}>3 mm</option>
          </select>
        </label>
        <button className={btnMain} disabled={!sel.size || !!busy} onClick={() => imprimer(badges.filter((b) => sel.has(b.id)))}>
          Fichier d'impression ({sel.size})
        </button>
      </div>
      <p className="text-xs text-[var(--ink-muted)] mb-3">
        « Fichier d'impression » ouvre la fenêtre d'impression : choisissez <b>Enregistrer au format PDF</b>, marges <b>Aucune</b>, échelle <b>100 %</b>. Le PDF contient un
        recto puis un verso par badge, au format CR80 vertical.
      </p>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-[var(--ink-muted)]">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Aucun badge pour le moment.</p>
      ) : (
        <div className="bg-white border border-[var(--line)] rounded-sm divide-y divide-[var(--line)]">
          <label className="flex items-center gap-3 px-4 py-2 text-xs text-[var(--ink-muted)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSel(allSelected ? new Set() : new Set(filtered.map((b) => b.id)))}
            />
            Tout sélectionner
          </label>
          {filtered.map((b) => {
            const et = etatOf(b);
            const ph = photoUrlOf(b);
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <input type="checkbox" checked={sel.has(b.id)} onChange={() => toggleSel(b.id)} />
                <div className="w-10 h-12 rounded-sm overflow-hidden bg-[#F1EEDF] shrink-0">
                  {ph && <img src={ph} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-sm">
                    {b.prenom} {b.nom} <span className="text-xs text-[var(--ink-muted)] font-normal">· {b.matricule}</span>
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {b.fonction} · {b.services?.name}
                  </p>
                  {!b.photo_path && <p className="text-xs text-[#B8862E]">Sans photo</p>}
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: et.color, background: et.color + "1A" }}>
                  {et.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  <label className={btn + " cursor-pointer !py-1.5 !px-3"}>
                    {b.photo_path ? "Changer la photo" : "Ajouter la photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoChange(b, e)} />
                  </label>
                  <button className={btn + " !py-1.5 !px-3"} onClick={() => openPreview(b)}>
                    Aperçu
                  </button>
                  <a className={btn + " !py-1.5 !px-3"} href={`/b/${b.code}`} target="_blank" rel="noreferrer">
                    Page publique
                  </a>
                  <button
                    className="btn-press text-sm rounded-sm !py-1.5 !px-3 border"
                    style={
                      b.status === "revoque"
                        ? { borderColor: "#0B6B3A", color: "#0B6B3A" }
                        : { borderColor: "#A8332B", color: "#A8332B" }
                    }
                    onClick={() => toggleRevoke(b)}
                  >
                    {b.status === "revoque" ? "Réactiver" : "Révoquer"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aperçu recto / verso */}
      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl p-5 max-h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-4 justify-center" style={{ zoom: 2.2 }}>
              <div style={{ boxShadow: "0 1px 6px rgba(0,0,0,.3)" }}>
                <Face b={preview.b} side="recto" qr={preview.qr} bleed={0} />
              </div>
              <div style={{ boxShadow: "0 1px 6px rgba(0,0,0,.3)" }}>
                <Face b={preview.b} side="verso" qr={preview.qr} bleed={0} />
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-5">
              <button
                className={btnMain}
                onClick={() => {
                  const b = preview.b;
                  setPreview(null);
                  imprimer([b]);
                }}
              >
                Fichier d'impression
              </button>
              <button className={btn} onClick={() => setPreview(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
