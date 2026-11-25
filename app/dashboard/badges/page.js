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

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
/*  Une face du badge — conception validée ORAKEY (v3), CR80 vertical  */
/*  Dessinée à 324 × 514 px puis mise à l'échelle exacte en mm.        */
/* ------------------------------------------------------------------ */
const DW = 324;
const DH = 514;
const MM = 96 / 25.4; // pixels CSS par mm
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const fmtLong = (d) => {
  if (!d) return "";
  const [y, m, j] = d.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${y}`;
};

const BADGE_CSS = `
.bdg{font-family:Montserrat,Arial,sans-serif;color:#1A1A1A;width:324px;height:514px;position:relative;display:flex;flex-direction:column;background:#fff;overflow:hidden;box-sizing:border-box;line-height:normal;text-align:left}
.bdg *{box-sizing:border-box}
.bdg .head{height:122px;display:flex;align-items:center;gap:12px;padding:0 18px}
.bdg .head img{height:88px;width:auto;max-width:none;display:block}
.bdg .htxt{line-height:1.2}
.bdg .htxt .rep{font-size:8px;letter-spacing:.18em;color:#5C5F5C;font-weight:600}
.bdg .htxt .name{font-size:15px;font-weight:800;color:#024F2B;margin-top:3px;letter-spacing:.01em}
.bdg .htxt .bar{width:30px;height:3px;background:#F2D200;margin:6px 0 5px}
.bdg .htxt .doc{font-size:8.5px;letter-spacing:.16em;color:#0B6A0B;font-weight:700}
.bdg .panel{position:relative;height:186px;background:#024F2B;flex:none}
.bdg .panel::before{content:"";position:absolute;top:-2px;left:0;right:0;height:3px;background:#fff;z-index:0}
.bdg .panel svg.wave{z-index:1;position:absolute;top:-1px;left:0;width:324px;height:46px;display:block}
.bdg .photo{position:absolute;left:50%;top:30px;transform:translateX(-50%);width:118px;height:154px;background:#F4F6F4;border:4px solid #fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#8A938C;font-size:9.5px;z-index:2;overflow:hidden}
.bdg .photo img{width:100%;height:100%;object-fit:cover;display:block;max-width:none}
.bdg .info{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;padding:30px 14px 0;text-align:center;min-height:0}
.bdg .wm{position:absolute;left:50%;top:6px;transform:translateX(-50%);height:150px;width:auto;max-width:none;opacity:.07;filter:grayscale(1);pointer-events:none}
.bdg .last{position:relative;font-size:20px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.bdg .first{position:relative;font-size:14.5px;font-weight:500;margin-top:2px}
.bdg .role{position:relative;font-size:12px;font-weight:700;color:#0B6A0B;margin-top:9px;text-transform:uppercase;letter-spacing:.06em}
.bdg .dept{position:relative;font-size:10.5px;color:#5C5F5C;margin-top:3px}
.bdg .mat{position:relative;margin-top:10px;font-size:10px;font-weight:700;letter-spacing:.1em;color:#024F2B;background:#EEF4F0;border-radius:4px;padding:4px 10px}
.bdg .foot{flex:none;height:33px;border-top:3px solid #F2D200;background:#024F2B;color:#fff;font-size:9.5px;letter-spacing:.18em;text-align:center;line-height:27px;font-weight:600}
.bdg .vhead{display:flex;flex-direction:column;align-items:center;padding-top:24px}
.bdg .vhead img{height:72px;width:auto;max-width:none;display:block}
.bdg .vhead .t{margin-top:8px;font-size:12px;font-weight:800;color:#024F2B;letter-spacing:.06em}
.bdg .vhead .bar{width:30px;height:3px;background:#F2D200;margin-top:7px}
.bdg .vbody{flex:1;display:flex;flex-direction:column;align-items:center;padding:14px 22px 0;min-height:0}
.bdg .qr{width:128px;height:128px;border:1.5px solid #DCE3DE;border-radius:8px;padding:6px;background:#fff}
.bdg .qr img{width:100%;height:100%;display:block;max-width:none}
.bdg .rules{margin:18px 0 0;font-size:9.5px;line-height:1.5;color:#333;text-align:center}
.bdg .valid{margin-top:14px;font-size:11px;font-weight:700;color:#024F2B}
.bdg .addr{margin-top:26px;font-size:8px;line-height:1.45;color:#5C5F5C;text-align:center}
.bdg .credit{flex:none;display:flex;align-items:center;justify-content:center;gap:5px;font-size:6.5px;color:#8A8A8A;letter-spacing:.1em;padding:7px 0 8px}
.bdg .vfoot{flex:none;border-top:3px solid #F2D200;background:#024F2B;height:16px}
`;

function Face({ b, side, qr, bleed = 0, rounded = false }) {
  const k = (CR80_W * MM) / DW; // échelle conception → écran/impression
  const Wmm = CR80_W + 2 * bleed;
  const Hmm = CR80_H + 2 * bleed;
  const bpx = bleed * MM;
  const z = (y) => `${(bpx + y * k).toFixed(2)}px`;
  // Couleurs de fond qui prolongent la carte dans la zone de fond perdu
  const fond =
    side === "recto"
      ? `linear-gradient(to bottom, #fff 0 ${z(135)}, #024F2B ${z(135)} ${z(308)}, #fff ${z(308)} ${z(481)}, #F2D200 ${z(481)} ${z(484)}, #024F2B ${z(484)} 100%)`
      : `linear-gradient(to bottom, #fff 0 ${z(498)}, #F2D200 ${z(498)} ${z(501)}, #024F2B ${z(501)} 100%)`;
  const photo = photoUrlOf(b);

  return (
    <div
      className="badge-face"
      style={{
        position: "relative",
        width: `${Wmm}mm`,
        height: `${Hmm}mm`,
        background: fond,
        overflow: "hidden",
        borderRadius: rounded ? "2.5mm" : 0,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div style={{ position: "absolute", left: bpx, top: bpx }}>
       <div style={{ zoom: k, width: DW, height: DH }}>
        <div className="bdg">
          {side === "recto" ? (
            <>
              <div className="head">
                <img src="/blason-badge.png" alt="" />
                <div className="htxt">
                  <div className="rep">RÉPUBLIQUE D'HAÏTI</div>
                  <div className="name">
                    MAIRIE DES
                    <br />
                    GONAÏVES
                  </div>
                  <div className="bar" />
                  <div className="doc">BADGE PROFESSIONNEL</div>
                </div>
              </div>
              <div className="panel">
                <svg className="wave" viewBox="0 0 324 46" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0,0H324V10C228,40 112,44 0,16Z" fill="#fff" />
                  <path d="M0,22C112,50 228,46 324,16" fill="none" stroke="#F2D200" strokeWidth="2.5" />
                </svg>
                <div className="photo">
                  {photo ? (
                    <img src={photo} alt="" />
                  ) : (
                    <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#9AA59D" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="info">
                <img className="wm" src="/blason-badge.png" alt="" />
                <div className="last">{b.nom}</div>
                <div className="first">{b.prenom}</div>
                <div className="role">{b.fonction}</div>
                <div className="dept">{b.services?.name}</div>
                <div className="mat">MATRICULE · {b.matricule}</div>
              </div>
              <div className="foot">LIBERTÉ • ÉGALITÉ • FRATERNITÉ</div>
            </>
          ) : (
            <>
              <div className="vhead">
                <img src="/blason-badge.png" alt="" />
                <div className="t">MAIRIE DES GONAÏVES</div>
                <div className="bar" />
              </div>
              <div className="vbody">
                <div className="qr">{qr && <img src={qr} alt="" />}</div>
                <p className="rules">
                  Ce badge est personnel et doit être porté de façon visible. Il reste la propriété de la Mairie des Gonaïves. En cas de perte, le signaler sans délai à
                  l'administration.
                </p>
                <div className="valid">Valide jusqu'au {fmtLong(b.valid_until)}</div>
                <div className="addr">
                  117, Angles rues Fabre N. Geffrard et Clerveau,
                  <br />
                  Gonaïves, Artibonite, Haïti (W.I)
                </div>
              </div>
              <div className="credit">
                CONCEPTION
                <svg role="img" aria-label="ORAKEY" viewBox="-1 -6 584 108" style={{ width: 42, height: 8, display: "block" }}>
                  <g fill="#8A8A8A">
                    <path d="M101,50A51,51 0 1 1 -1,50A51,51 0 1 1 101,50ZM86.5,50A36.5,36.5 0 1 0 13.5,50A36.5,36.5 0 1 0 86.5,50Z" />
                    <path d="M122,0H136V100H122Z" />
                    <path d="M130,0H167A29,29 0 0 1 167,58H130V44H167A15,15 0 0 0 167,14H130Z" />
                    <path d="M153,50H169L200,100H184Z" />
                    <path d="M214,100L262,-5L310,100H294.61L262,28.7L229.39,100Z" />
                    <path d="M326,0H340V100H326Z" />
                    <path d="M382.5,0H402L333,71.2V51.1Z" />
                    <path d="M386.4,100H404L356.97,38L346.95,48Z" />
                    <path d="M424,0H488V14H438V43H482V57H438V86H488V100H424Z" />
                    <path d="M502,0H519.7L542,29L564.3,0H582L549,42.9V100H535V42.9Z" />
                    <path d="M244.78,100L262,62.3L279.22,100Z" />
                  </g>
                </svg>
              </div>
              <div className="vfoot" />
            </>
          )}
        </div>
       </div>
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
      try {
        await Promise.race([
          Promise.all(["500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 16px Montserrat`))),
          new Promise((r) => setTimeout(r, 4000)),
        ]);
      } catch (e) {}
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
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" />
      <style>{BADGE_CSS}</style>
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
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportFile} />
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
            <div className="flex gap-4 justify-center" style={{ zoom: 1.7 }}>
              <div style={{ boxShadow: "0 1px 6px rgba(0,0,0,.3)" }}>
                <Face b={preview.b} side="recto" qr={preview.qr} bleed={0} rounded />
              </div>
              <div style={{ boxShadow: "0 1px 6px rgba(0,0,0,.3)" }}>
                <Face b={preview.b} side="verso" qr={preview.qr} bleed={0} rounded />
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
