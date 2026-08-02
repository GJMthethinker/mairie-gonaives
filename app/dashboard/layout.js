"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const AppContext = createContext(null);
export function useApp() {
  return useContext(AppContext);
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      let { data: prof } = await supabase
        .from("profiles")
        .select("*, services(name, code)")
        .eq("id", session.user.id)
        .maybeSingle();

      // Si l'inscription n'a pas pu créer la fiche tout de suite (confirmation email requise), on la crée ici.
      if (!prof) {
        const meta = session.user.user_metadata || {};
        if (meta.full_name) {
          await supabase.from("profiles").insert({
            id: session.user.id,
            full_name: meta.full_name,
            role: "agent",
            service_id: meta.service_id || null,
            phone: meta.phone || null,
            status: "en_attente",
          });
          const retry = await supabase
            .from("profiles")
            .select("*, services(name, code)")
            .eq("id", session.user.id)
            .maybeSingle();
          prof = retry.data;
        }
      }

      const { data: svcs } = await supabase.from("services").select("*").order("name");
      if (!mounted) return;
      setProfile(prof);
      setServices(svcs || []);
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EC]">
        <p className="text-[#8A857A] text-sm">Chargement…</p>
      </div>
    );
  }

  const isAdmin = profile.role === "superadmin";

  if (!isAdmin && profile.status !== "approuve") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EC] p-6">
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-8 max-w-md text-center">
          <h1 className="font-serif text-xl text-[#1B2A4A] mb-3">
            {profile.status === "refuse" ? "Compte non autorisé" : "Compte en attente d'approbation"}
          </h1>
          <p className="text-sm text-[#5B584F] mb-6">
            {profile.status === "refuse"
              ? "Votre demande d'accès a été refusée. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
              : "Un administrateur doit valider votre compte avant que vous puissiez accéder au système. Revenez un peu plus tard."}
          </p>
          <button onClick={handleLogout} className="text-sm border border-[#D8D0BC] rounded-sm px-4 py-2">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const nav = [
    ...(isAdmin ? [{ href: "/dashboard", label: "Tableau de bord" }] : []),
    { href: "/dashboard/documents", label: "Documents" },
    { href: "/dashboard/registre", label: "Registre" },
    { href: "/dashboard/taches", label: "Tâches" },
    { href: "/dashboard/agenda", label: "Agenda" },
    { href: "/dashboard/messages", label: "Messages" },
    { href: "/dashboard/actualites", label: "Actualités" },
    { href: "/dashboard/annonces", label: "Annonces" },
    { href: "/dashboard/annuaire", label: "Annuaire" },
    ...(isAdmin ? [{ href: "/dashboard/employes", label: "Employés" }] : []),
  ];

  return (
    <AppContext.Provider value={{ profile, services, isAdmin }}>
      <div className="min-h-screen bg-[#F7F4EC] text-[#242220] flex">
        {/* Barre mobile avec bouton menu */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1B2A4A] text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#B8862E] text-[#B8862E] flex items-center justify-center font-serif text-xs shrink-0">
              MG
            </div>
            <p className="font-serif text-sm">Mairie des Gonaïves</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="p-2 -mr-2"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {/* Fond assombri quand le menu mobile est ouvert */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-[#1B2A4A] text-[#E9E4D6] flex flex-col transform transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="p-5 flex items-center justify-between gap-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-[#B8862E] text-[#B8862E] flex items-center justify-center font-serif text-xs shrink-0">
                MG
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#B8862E]">Gonaïves</p>
                <p className="font-serif text-sm leading-tight">Mairie</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 text-[#B9B4A3]" aria-label="Fermer le menu">
              ✕
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {nav.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className={`relative block px-3 py-2.5 rounded-sm text-sm transition-all duration-200 ${
                  pathname === it.href ? "bg-white/10 text-white" : "text-[#B9B4A3] hover:bg-white/5 hover:text-white hover:pl-4"
                }`}
              >
                {pathname === it.href && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-[#B8862E] rounded-full" />
                )}
                {it.label}
              </a>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <a href="/" className="block px-3 py-2.5 text-sm text-[#B9B4A3] hover:bg-white/5 hover:text-white rounded-sm transition-colors duration-200">
              ← Site public
            </a>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 text-sm text-[#B9B4A3] hover:bg-white/5 hover:text-white rounded-sm transition-colors duration-200"
            >
              Se déconnecter
            </button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 pt-14 md:pt-0">
          <div className="border-b border-[#E3DCC8] bg-[#FBF9F2] px-6 md:px-10 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8A857A]">Bonjour,</p>
              <p className="font-medium">{profile.full_name}</p>
            </div>
            <p className="text-xs uppercase tracking-wide text-[#B8862E]">
              {isAdmin ? "Super administrateur" : profile.services?.name}
            </p>
          </div>
          <div key={pathname} className="dash-in p-6 md:p-10 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
