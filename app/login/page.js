"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("employe"); // "employe" | "admin"

  // ----- Employé (identifiant unique) -----
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setCodeError("");
    setCodeLoading(true);
    const email = `emp-${code.trim().toLowerCase()}@mairie-gonaives.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: code.trim() });
    setCodeLoading(false);
    if (error) {
      setCodeError("Identifiant non reconnu.");
      return;
    }
    router.push("/dashboard/documents");
  }

  // ----- Administrateur (email + mot de passe) -----
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

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("employe")}
            className="flex-1 text-sm py-2 rounded-sm border"
            style={mode === "employe" ? { background: "#1B2A4A", color: "white", borderColor: "#1B2A4A" } : { borderColor: "#D8D0BC" }}
          >
            Employé
          </button>
          <button
            type="button"
            onClick={() => setMode("admin")}
            className="flex-1 text-sm py-2 rounded-sm border"
            style={mode === "admin" ? { background: "#1B2A4A", color: "white", borderColor: "#1B2A4A" } : { borderColor: "#D8D0BC" }}
          >
            Administrateur
          </button>
        </div>

        {mode === "employe" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-[#8A857A] mb-1">
                Identifiant unique
              </label>
              <input
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. K9F6MBJU"
                className="w-full border border-[#D8D0BC] bg-white rounded-sm px-3 py-2 text-center tracking-widest font-medium"
              />
              <p className="text-[11px] text-[#8A857A] mt-1.5">
                Fourni par l'administration. Gardez-le confidentiel : toute action sur votre compte lui est liée.
              </p>
            </div>
            {codeError && <p className="text-sm text-[#A8332B]">{codeError}</p>}
            <button
              type="submit"
              disabled={codeLoading}
              className="w-full bg-[#1B2A4A] text-white rounded-sm px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {codeLoading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        )}

        {mode === "admin" && (
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
        )}

        <p className="text-xs text-center text-[#8A857A] mt-6">
          Aucun compte employé ne s'auto-crée : votre identifiant vous est remis directement par la mairie.
        </p>
      </div>
    </div>
  );
}
