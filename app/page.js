"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function HomePage() {
  const [news, setNews] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null); // 'rdv' | 'doleance' | 'suggestion' | 'engagement'

  useEffect(() => {
    async function load() {
      const { data: n } = await supabase.from("news").select("*").order("published_at", { ascending: false }).limit(10);
      const { data: s } = await supabase.from("services").select("*").order("name");
      setNews(n || []);
      setServices(s || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#242220]">
      {/* En-tête */}
      <header className="bg-[#1B2A4A] text-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#B8862E] text-[#B8862E] flex items-center justify-center font-serif text-sm shrink-0">
              MG
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#B8862E]">République d'Haïti</p>
              <p className="font-serif text-lg leading-tight">Mairie des Gonaïves</p>
            </div>
          </div>
          <a href="/login" className="text-sm border border-white/30 rounded-sm px-4 py-2 hover:bg-white/10">
            Espace employé
          </a>
        </div>
      </header>

      {/* Bandeau d'intro */}
      <section className="bg-[#12203a] text-[#E9E4D6] py-14 px-6 text-center">
        <h1 className="font-serif text-3xl md:text-4xl mb-3">Bienvenue à la Mairie des Gonaïves</h1>
        <p className="text-[#B9B4A3] max-w-xl mx-auto">
          Suivez nos actualités, prenez rendez-vous avec un responsable, ou faites-nous part de vos doléances et suggestions.
        </p>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Actualités */}
        <section>
          <h2 className="font-serif text-2xl text-[#1B2A4A] mb-6">Actualités</h2>
          {loading ? (
            <p className="text-sm text-[#8A857A]">Chargement…</p>
          ) : news.length === 0 ? (
            <p className="text-sm text-[#8A857A]">Aucune actualité publiée pour le moment.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {news.map((n) => (
                <div key={n.id} className="bg-white border border-[#E3DCC8] rounded-sm p-5">
                  <p className="text-[11px] text-[#B8862E] uppercase tracking-wide mb-2">{frDate(n.published_at)}</p>
                  <p className="font-medium mb-2">{n.title}</p>
                  <p className="text-sm text-[#5B584F] whitespace-pre-line">{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions visiteurs */}
        <section>
          <h2 className="font-serif text-2xl text-[#1B2A4A] mb-6">Nous contacter</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveForm("rdv")}
              className="text-left bg-white border border-[#E3DCC8] hover:border-[#B8862E] rounded-sm p-5"
            >
              <p className="font-medium text-sm">Prendre rendez-vous</p>
              <p className="text-xs text-[#8A857A] mt-1">Avec un responsable d'une direction</p>
            </button>
            <button
              onClick={() => setActiveForm("doleance")}
              className="text-left bg-white border border-[#E3DCC8] hover:border-[#B8862E] rounded-sm p-5"
            >
              <p className="font-medium text-sm">Laisser un message</p>
              <p className="text-xs text-[#8A857A] mt-1">Doléance ou suggestion</p>
            </button>
            <button
              onClick={() => setActiveForm("engagement")}
              className="text-left bg-white border border-[#E3DCC8] hover:border-[#B8862E] rounded-sm p-5"
            >
              <p className="font-medium text-sm">Proposer mon aide</p>
              <p className="text-xs text-[#8A857A] mt-1">Prendre un engagement envers la mairie</p>
            </button>
          </div>
        </section>
      </main>

      {activeForm === "rdv" && <AppointmentModal services={services} onClose={() => setActiveForm(null)} />}
      {(activeForm === "doleance" || activeForm === "suggestion") && (
        <FeedbackModal defaultType={activeForm} onClose={() => setActiveForm(null)} />
      )}
      {activeForm === "engagement" && <FeedbackModal defaultType="engagement" onClose={() => setActiveForm(null)} />}

      <footer className="text-center text-xs text-[#8A857A] py-8">
        Mairie des Gonaïves, Artibonite, Haïti (W.I)
      </footer>
    </div>
  );
}

function AppointmentModal({ services, onClose }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [reason, setReason] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("appointment_requests").insert({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      service_id: serviceId || null,
      reason: reason.trim(),
      preferred_date: preferredDate || null,
    });
    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">Prendre rendez-vous</h3>
          <button onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div>
            <p className="text-sm text-[#242220]">
              Votre demande a bien été envoyée. La mairie vous contactera pour confirmer le rendez-vous.
            </p>
            <button onClick={onClose} className="w-full mt-4 bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input required placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <input type="email" placeholder="Email (optionnel)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm">
              <option value="">Direction concernée (optionnel)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <textarea required rows={3} placeholder="Motif du rendez-vous" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <button type="submit" disabled={saving} className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50">
              {saving ? "Envoi..." : "Envoyer la demande"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FeedbackModal({ defaultType, onClose }) {
  const [type, setType] = useState(defaultType);
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const titles = {
    doleance: "Laisser une doléance",
    suggestion: "Faire une suggestion",
    engagement: "Proposer mon aide à la mairie",
  };
  const placeholders = {
    doleance: "Décrivez votre doléance",
    suggestion: "Décrivez votre suggestion",
    engagement: "Décrivez comment vous aimeriez aider (domaine, disponibilité...)",
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("feedback_messages").insert({
      type,
      full_name: fullName.trim() || null,
      contact: contact.trim() || null,
      message: message.trim(),
    });
    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#1B2A4A]">{titles[type]}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div>
            <p className="text-sm text-[#242220]">Merci, votre message a bien été transmis à la mairie.</p>
            <button onClick={onClose} className="w-full mt-4 bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {defaultType !== "engagement" && (
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setType("doleance")} className={`flex-1 rounded-sm px-3 py-2 border ${type === "doleance" ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#D8D0BC]"}`}>
                  Doléance
                </button>
                <button type="button" onClick={() => setType("suggestion")} className={`flex-1 rounded-sm px-3 py-2 border ${type === "suggestion" ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#D8D0BC]"}`}>
                  Suggestion
                </button>
              </div>
            )}
            <input placeholder="Nom complet (optionnel)" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <input placeholder="Téléphone ou email (optionnel)" value={contact} onChange={(e) => setContact(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <textarea required rows={4} placeholder={placeholders[type]} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border border-[#D8D0BC] rounded-sm px-3 py-2 text-sm" />
            <button type="submit" disabled={saving} className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50">
              {saving ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
