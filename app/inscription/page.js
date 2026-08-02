"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InscriptionPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("services").select("*").order("name").then(({ data }) => {
      setServices(data || []);
      if (data?.length) setServiceId(data[0].id);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, service_id: serviceId } },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message.includes("already registered") ? "Cet email est déjà utilisé." : "Erreur : " + signUpError.message);
      return;
    }

    // Si une session est immédiatement disponible (confirmation email désactivée), on crée la fiche tout de suite.
    if (data.session && data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        role: "agent",
        service_id: serviceId,
        status: "en_attente",
      });
    }

    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#1B2A4A] flex items-center justify-center p-6">
        <div className="bg-[#F7F4EC] rounded-sm shadow-2xl w-full max-w-md p-8 text-center">
          <h1 className="font-serif text-xl text-[#1B2A4A] mb-3">Compte créé</h1>
          <p className="text-sm text-[#5B584F] mb-6">
            Votre demande a été enregistrée. Si une confirmation par email vous a été envoyée, vérifiez votre boîte
            mail. Un administrateur doit approuver votre compte avant que vous puissiez accéder au système.
          </p>
          <a href="/login" className="text-sm text-[#1B2A4A] font-medium underline">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B2A4A] flex items-center justify-center p-6">
      <div className="bg-[#F7F4EC] rounded-sm shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-full border-2 border-[#B8862E] text-[#B8862E] flex items-center justify-center font-serif text-sm shrink-0">
            MG
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-[#8A6A2F]">République d'Haïti</p>
            <h1 className="font-serif text-xl text-[#1B2A4A] leading-tight">Mairie des Gonaïves</h1>
          </div>
        </div>
        <p className="text-sm text-[#5B584F] mt-2 mb-6">Créer votre compte employé</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Nom complet</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-[#D8D0BC] bg-white rounded-sm px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Direction</label>
            <select
              required
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full border border-[#D8D0BC] bg-white rounded-sm px-3 py-2"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#D8D0BC] bg-white rounded-sm px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#D8D0BC] bg-white rounded-sm px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-[#A8332B]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <p className="text-sm text-center text-[#8A857A] mt-6">
          Déjà un compte ?{" "}
          <a href="/login" className="text-[#1B2A4A] font-medium underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
