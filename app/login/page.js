"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/dashboard/documents");
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
        <p className="text-sm text-[#5B584F] mt-2 mb-6">Connexion au système municipal</p>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p className="text-sm text-center text-[#8A857A] mt-6">
          Pas encore de compte ?{" "}
          <a href="/inscription" className="text-[#1B2A4A] font-medium underline">
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  );
}
