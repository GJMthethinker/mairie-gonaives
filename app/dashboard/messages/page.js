"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "../layout";

function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const typeLabel = { doleance: "Doléance", suggestion: "Suggestion", engagement: "Engagement / aide" };
const statusLabel = { pending: "En attente", confirmed: "Confirmé", declined: "Refusé" };

export default function MessagesPage() {
  const { isAdmin } = useApp();
  const [tab, setTab] = useState("rdv");
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: a } = await supabase.from("appointment_requests").select("*, services(name)").order("created_at", { ascending: false });
    const { data: m } = await supabase.from("feedback_messages").select("*").order("created_at", { ascending: false });
    setAppointments(a || []);
    setMessages(m || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status) {
    await supabase.from("appointment_requests").update({ status }).eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-[#8A857A]">Chargement…</p>;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-6">Messages des visiteurs</h2>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("rdv")} className={`text-sm px-4 py-2 rounded-sm border ${tab === "rdv" ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#D8D0BC]"}`}>
          Rendez-vous ({appointments.length})
        </button>
        <button onClick={() => setTab("messages")} className={`text-sm px-4 py-2 rounded-sm border ${tab === "messages" ? "bg-[#1B2A4A] text-white border-[#1B2A4A]" : "border-[#D8D0BC]"}`}>
          Doléances & suggestions ({messages.length})
        </button>
      </div>

      {tab === "rdv" && (
        <div className="space-y-3">
          {appointments.length === 0 && <p className="text-sm text-[#8A857A]">Aucune demande de rendez-vous.</p>}
          {appointments.map((a) => (
            <div key={a.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{a.full_name}</p>
                <span className="text-[11px] uppercase tracking-wide text-[#B8862E]">{statusLabel[a.status]}</span>
              </div>
              <p className="text-xs text-[#8A857A] mb-2">
                {a.phone && `${a.phone} · `}{a.email && `${a.email} · `}
                {a.services?.name && `${a.services.name} · `}
                {a.preferred_date && `Souhaité le ${frDate(a.preferred_date)} · `}
                Reçu le {frDate(a.created_at)}
              </p>
              <p className="text-sm mb-3">{a.reason}</p>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(a.id, "confirmed")} className="text-xs bg-[#5B7553] text-white px-3 py-1.5 rounded-sm">Confirmer</button>
                  <button onClick={() => updateStatus(a.id, "declined")} className="text-xs bg-[#A8332B] text-white px-3 py-1.5 rounded-sm">Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "messages" && (
        <div className="space-y-3">
          {messages.length === 0 && <p className="text-sm text-[#8A857A]">Aucun message.</p>}
          {messages.map((m) => (
            <div key={m.id} className="card-hover bg-white border border-[#E3DCC8] rounded-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{m.full_name || "Anonyme"}</p>
                <span className="text-[11px] uppercase tracking-wide text-[#B8862E]">{typeLabel[m.type]}</span>
              </div>
              <p className="text-xs text-[#8A857A] mb-2">
                {m.contact && `${m.contact} · `}Reçu le {frDate(m.created_at)}
              </p>
              <p className="text-sm">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
