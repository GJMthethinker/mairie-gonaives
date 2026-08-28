"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      children.forEach((c) => c.classList.add("revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    children.forEach((child, i) => {
      child.style.transitionDelay = `${Math.min(i, 6) * 80}ms`;
      observer.observe(child);
    });
    const fallback = setTimeout(() => {
      children.forEach((c) => c.classList.add("revealed"));
    }, 1200);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  return ref;
}

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#034E28" strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="16" rx="1.5" />
    <path d="M3 9.5h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);
const MessageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#034E28" strokeWidth="1.6">
    <path d="M4 5.5h16v10.5H9l-4 3.5V16H4z" strokeLinejoin="round" />
  </svg>
);
const HeartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#034E28" strokeWidth="1.6">
    <path d="M12 20s-7.5-4.6-9.8-9.1C.6 7.5 2.4 4.2 5.8 4c2 -0.1 3.5 1 6.2 3.6C14.7 5 16.2 3.9 18.2 4c3.4 0.2 5.2 3.5 3.6 6.9C19.5 15.4 12 20 12 20z" />
  </svg>
);

export default function HomePage() {
  const [news, setNews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [mounted, setMounted] = useState(false);
  const galleryRef = useReveal();
  const newsRef = useReveal();
  const actionsRef = useReveal();

  useEffect(() => {
    setMounted(true);
    async function load() {
      const { data: n } = await supabase.from("news").select("*").order("published_at", { ascending: false }).limit(4);
      const { data: g } = await supabase.from("gallery_photos").select("*").order("published_at", { ascending: false }).limit(4);
      const { data: s } = await supabase.from("services").select("*").order("name");
      setNews(n || []);
      setGallery(g || []);
      setServices(s || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e) {
      if (e.key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const independenceYear = new Date().getFullYear() - 1803;

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <header className="bg-[#034E28] text-white relative z-10 border-b-4 border-[#F5E600]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-mairie.jpg" alt="Mairie des Gonaïves" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#F5E600]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#F5E600]">République d'Haïti</p>
              <p className="font-display text-lg leading-tight">Mairie des Gonaïves</p>
            </div>
          </div>
          <a
            href="/login"
            className="btn-press text-sm border border-[#F5E600]/60 text-[#F5E600] rounded-sm px-4 py-2 hover:bg-[#F5E600] hover:text-[#034E28] transition-colors"
          >
            Espace employé
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden text-[#F7F4E6] py-24 px-6 text-center">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-[center_12%]"
          style={{ backgroundImage: "url('/mairie-facade.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#022E17]/92 via-[#034E28]/85 to-[#034E28]/95" />
        <img
          src="/palmiste.jpg"
          alt=""
          aria-hidden="true"
          className="float-slow pointer-events-none select-none absolute -right-14 -top-8 w-[300px] opacity-[0.16] md:w-[380px]"
        />
        <div className="relative">
          {mounted && (
            <p className="hero-in text-[11px] uppercase tracking-[0.22em] text-[#F5E600] mb-4">
              An {independenceYear}ème de l'Indépendance · Gonaïves, Artibonite
            </p>
          )}
          {mounted && (
            <h1 className="hero-in font-display text-3xl md:text-5xl mb-4" style={{ animationDelay: "80ms" }}>
              Bienvenue à la Mairie des Gonaïves
            </h1>
          )}
          {mounted && (
            <p className="hero-in text-[#DCE6DD] max-w-xl mx-auto" style={{ animationDelay: "160ms" }}>
              Suivez nos actualités, prenez rendez-vous avec un responsable, ou faites-nous part de vos doléances et suggestions.
            </p>
          )}
          {mounted && (
            <div
              className="hero-in mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-[#F5E600] to-transparent"
              style={{ animationDelay: "240ms" }}
            />
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        <section ref={galleryRef}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="reveal font-display text-2xl text-[#034E28]">La Mairie en action</h2>
            <a href="/galerie" className="reveal link-underline text-sm text-[#034E28] font-medium">Voir la galerie →</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.map((img, i) => (
              <button
                key={img.id || i}
                onClick={() => setLightbox({ src: img.image_url, alt: img.caption || "" })}
                className="reveal img-zoom overflow-hidden rounded-sm border border-[var(--line)] aspect-[4/5] card-hover text-left"
              >
                <img src={img.image_url} alt={img.caption || ""} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        <section ref={newsRef}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="reveal font-display text-2xl text-[#034E28]">Actualités</h2>
            <a href="/actualites" className="reveal link-underline text-sm text-[#034E28] font-medium">Voir toutes les actualités →</a>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--ink-muted)]">Chargement…</p>
          ) : news.length === 0 ? (
            <p className="reveal text-sm text-[var(--ink-muted)]">Aucune actualité publiée pour le moment.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {news.map((n) => (
                <div key={n.id} className="reveal card-hover bg-white border border-[var(--line)] rounded-sm overflow-hidden">
                  {n.image_url && (
                    <button onClick={() => setLightbox({ src: n.image_url, alt: n.title })} className="img-zoom block w-full h-44 overflow-hidden">
                      <img src={n.image_url} alt={n.title} className="w-full h-full object-cover" />
                    </button>
                  )}
                  <div className="p-5">
                    <p className="text-[11px] text-[#8A7F00] uppercase tracking-wide mb-2">{frDate(n.published_at)}</p>
                    <p className="font-medium mb-2">{n.title}</p>
                    <p className="text-sm text-[var(--ink-muted)] whitespace-pre-line">{n.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section ref={actionsRef}>
          <h2 className="reveal font-display text-2xl text-[#034E28] mb-6">Nous contacter</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveForm("rdv")}
              className="reveal card-hover btn-press text-left bg-white border border-[var(--line)] rounded-sm p-5"
            >
              <CalendarIcon />
              <p className="font-medium text-sm mt-3">Prendre rendez-vous</p>
              <p className="text-xs text-[var(--ink-muted)] mt-1">Avec un responsable d'une direction</p>
            </button>
            <button
              onClick={() => setActiveForm("doleance")}
              className="reveal card-hover btn-press text-left bg-white border border-[var(--line)] rounded-sm p-5"
            >
              <MessageIcon />
              <p className="font-medium text-sm mt-3">Laisser un message</p>
              <p className="text-xs text-[var(--ink-muted)] mt-1">Doléance ou suggestion</p>
            </button>
            <button
              onClick={() => setActiveForm("engagement")}
              className="reveal card-hover btn-press text-left bg-white border border-[var(--line)] rounded-sm p-5"
            >
              <HeartIcon />
              <p className="font-medium text-sm mt-3">Proposer mon aide</p>
              <p className="text-xs text-[var(--ink-muted)] mt-1">Prendre un engagement envers la mairie</p>
            </button>
          </div>
        </section>
      </main>

      {activeForm === "rdv" && <AppointmentModal services={services} onClose={() => setActiveForm(null)} />}
      {(activeForm === "doleance" || activeForm === "suggestion") && (
        <FeedbackModal defaultType={activeForm} onClose={() => setActiveForm(null)} />
      )}
      {activeForm === "engagement" && <FeedbackModal defaultType="engagement" onClose={() => setActiveForm(null)} />}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} />
            <p className="text-center text-[#F5E600] text-sm mt-3">{lightbox.alt}</p>
          </div>
          <button onClick={() => setLightbox(null)} className="absolute top-5 right-6 text-white text-3xl leading-none btn-press" aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      <footer className="text-center text-xs text-[var(--ink-muted)] py-10 border-t border-[var(--line)] mt-8">
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
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("appointment_requests").insert({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      service_id: serviceId || null,
      preferred_date: date || null,
      reason: reason.trim(),
      status: "pending",
    });
    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 bg-[#1A1A14]/60 flex items-center justify-center p-4 z-50 pop-in">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-[#034E28]">Prendre rendez-vous</h3>
          <button onClick={onClose} className="btn-press">✕</button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--ink-muted)] mb-4">
              Votre demande a été envoyée. La mairie vous contactera pour la confirmer.
            </p>
            <button onClick={onClose} className="btn-press text-sm border border-[var(--line)] rounded-sm px-4 py-2">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              required
              placeholder="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email (optionnel)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            >
              <option value="">Direction concernée (optionnel)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              placeholder="Motif du rendez-vous"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-press w-full bg-[#034E28] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Envoi..." : "Envoyer la demande"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FeedbackModal({ defaultType, onClose }) {
  const [type, setType] = useState(defaultType === "engagement" ? "engagement" : "doleance");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!message.trim()) return;
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

  const title = defaultType === "engagement" ? "Proposer mon aide" : "Laisser une doléance";

  return (
    <div className="fixed inset-0 bg-[#1A1A14]/60 flex items-center justify-center p-4 z-50 pop-in">
      <div className="bg-white rounded-sm w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-[#034E28]">{title}</h3>
          <button onClick={onClose} className="btn-press">✕</button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--ink-muted)] mb-4">Votre message a bien été envoyé à la mairie.</p>
            <button onClick={onClose} className="btn-press text-sm border border-[var(--line)] rounded-sm px-4 py-2">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {defaultType !== "engagement" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("doleance")}
                  className={`btn-press flex-1 text-sm py-2 rounded-sm border ${type === "doleance" ? "bg-[#034E28] text-white border-[#034E28]" : "border-[var(--line)]"}`}
                >
                  Doléance
                </button>
                <button
                  type="button"
                  onClick={() => setType("suggestion")}
                  className={`btn-press flex-1 text-sm py-2 rounded-sm border ${type === "suggestion" ? "bg-[#034E28] text-white border-[#034E28]" : "border-[var(--line)]"}`}
                >
                  Suggestion
                </button>
              </div>
            )}
            <input
              placeholder="Nom complet (optionnel)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <input
              placeholder="Téléphone ou email (optionnel)"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <textarea
              required
              rows={4}
              placeholder={defaultType === "engagement" ? "Décrivez votre engagement" : "Décrivez votre doléance"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-[var(--line)] rounded-sm px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-press w-full bg-[#034E28] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
