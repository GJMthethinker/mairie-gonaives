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

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("*, services(name, code)")
        .eq("id", session.user.id)
        .single();
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
  const nav = [
    ...(isAdmin ? [{ href: "/dashboard", label: "Tableau de bord" }] : []),
    { href: "/dashboard/documents", label: "Documents" },
    { href: "/dashboard/registre", label: "Registre" },
    { href: "/dashboard/taches", label: "Tâches" },
    { href: "/dashboard/agenda", label: "Agenda" },
    { href: "/dashboard/messages", label: "Messages" },
    { href: "/dashboard/annonces", label: "Annonces" },
    { href: "/dashboard/annonces", label: "Annonces" },
  ];

  return (
    <AppContext.Provider value={{ profile, services, isAdmin }}>
      <div className="min-h-screen bg-[#F7F4EC] text-[#242220] flex">
        <aside className="w-60 shrink-0 bg-[#1B2A4A] text-[#E9E4D6] hidden md:flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-full border-2 border-[#B8862E] text-[#B8862E] flex items-center justify-center font-serif text-xs shrink-0">
              MG
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#B8862E]">Gonaïves</p>
              <p className="font-serif text-sm leading-tight">Mairie</p>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {nav.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className={`block px-3 py-2.5 rounded-sm text-sm ${
                  pathname === it.href ? "bg-white/10 text-white" : "text-[#B9B4A3] hover:bg-white/5"
                }`}
              >
                {it.label}
              </a>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <a href="/" className="block px-3 py-2.5 text-sm text-[#B9B4A3] hover:bg-white/5 rounded-sm">
              ← Site public
            </a>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 text-sm text-[#B9B4A3] hover:bg-white/5 rounded-sm"
            >
              Se déconnecter
            </button>
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          <div className="border-b border-[#E3DCC8] bg-[#FBF9F2] px-6 md:px-10 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8A857A]">Bonjour,</p>
              <p className="font-medium">{profile.full_name}</p>
            </div>
            <p className="text-xs uppercase tracking-wide text-[#B8862E]">
              {isAdmin ? "Super administrateur" : profile.services?.name}
            </p>
          </div>
          <div className="p-6 md:p-10 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
