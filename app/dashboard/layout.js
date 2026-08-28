"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "./notification-bell";
import PushSetup from "./push-setup";

const AppContext = createContext(null);
export function useApp() {
  return useContext(AppContext);
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      let { data: prof } = await supabase
        .from("profiles")
        .select("*, services(name, code)")
        .eq("id", session.user.id)
        .maybeSingle();

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

      if (prof && prof.status === "approuve" && prof.role !== "superadmin" && prof.service_id) {
        generateTaskReminders(prof);
      }
    }

    async function generateTaskReminders(prof) {
      const today = new Date();
      const in2days = new Date();
      in2days.setDate(today.getDate() + 2);
      const todayStr = today.toISOString().slice(0, 10);
      const in2Str = in2days.toISOString().slice(0, 10);

      const { data: dueTasks } = await supabase
        .from("tasks")
        .select("id, title, due_date, status")
        .eq("service_id", prof.service_id)
        .neq("status", "done")
        .not("due_date", "is", null)
        .lte("due_date", in2Str);
      if (!dueTasks || dueTasks.length === 0) return;

      const { data: existing } = await supabase
        .from("notifications")
        .select("task_id")
        .eq("user_id", prof.id)
        .gte("created_at", `${todayStr}T00:00:00`);
      const alreadyNotified = new Set((existing || []).map((n) => n.task_id));

      for (const t of dueTasks) {
        if (alreadyNotified.has(t.id)) continue;
        const overdue = t.due_date < todayStr;
        await supabase.from("notifications").insert({
          user_id: prof.id,
          task_id: t.id,
          title: overdue ? `Tâche en retard : ${t.title}` : `Échéance proche : ${t.title}`,
          body: overdue ? "Cette tâche a dépassé sa date d'échéance." : "Cette tâche arrive à échéance bientôt.",
          link: "/dashboard/agenda",
        });
      }
    }

    load();
    return () => {
      mounted = false;
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--cream)]">
        <p className="text-[var(--ink-muted)] text-sm">Chargement…</p>
      </div>
    );
  }

  const isAdmin = profile.role === "superadmin";

  if (!isAdmin && profile.status !== "approuve") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--cream)] p-6">
        <div className="bg-white border border-[var(--line)] rounded-sm p-8 max-w-md text-center">
          <h1 className="font-display text-xl text-[#034E28] mb-3">
            {profile.status === "refuse" ? "Compte non autorisé" : "Compte en attente d'approbation"}
          </h1>
          <p className="text-sm text-[var(--ink-muted)] mb-6">
            {profile.status === "refuse"
              ? "Votre demande d'accès a été refusée. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
              : "Un administrateur doit valider votre compte avant que vous puissiez accéder au système. Revenez un peu plus tard."}
          </p>
          <button onClick={handleLogout} className="btn-press text-sm border border-[var(--line)] rounded-sm px-4 py-2">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const nav = [
    ...(isAdmin ? [{ href: "/dashboard", label: "Tableau de bord" }] : []),
    { href: "/dashboard/documents", label: "Documents" },
    ...(isAdmin || profile.services?.code === "ACC" ? [{ href: "/dashboard/accueil", label: "Accueil" }] : []),
    ...(isAdmin || profile.services?.code === "CAI" ? [{ href: "/dashboard/caisse", label: "Caisse" }] : []),
    { href: "/dashboard/registre", label: "Registre" },
    { href: "/dashboard/archives", label: "Archives" },
    { href: "/dashboard/residents", label: "Résidents" },
    { href: "/dashboard/taches", label: "Tâches" },
    { href: "/dashboard/agenda", label: "Agenda" },
    { href: "/dashboard/messages", label: "Messages" },
    { href: "/dashboard/actualites", label: "Actualités" },
    { href: "/dashboard/galerie", label: "Galerie" },
    { href: "/dashboard/annonces", label: "Annonces" },
    { href: "/dashboard/annuaire", label: "Annuaire" },
    ...(isAdmin ? [{ href: "/dashboard/employes", label: "Employés" }] : []),
  ];

  return (
    <AppContext.Provider value={{ profile, services, isAdmin }}>
      <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)] flex">
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#034E28] text-white flex items-center justify-between px-4 py-3 border-b-2 border-[#F5E600]">
          <div className="flex items-center gap-2">
            <img src="/logo-mairie.jpg" alt="Mairie" className="w-8 h-8 rounded-full object-cover ring-1 ring-[#F5E600]" />
            <p className="font-display text-sm">Mairie des Gonaïves</p>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} aria-label="Ouvrir le menu" className="p-2 -mr-2 btn-press">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-[#034E28] text-[#E9E4D6] flex flex-col transform transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="p-5 flex items-center justify-between gap-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo-mairie.jpg" alt="Mairie" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#F5E600]" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#F5E600]">Gonaïves</p>
                <p className="font-display text-sm leading-tight">Mairie</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 text-[#B9C9B9] btn-press" aria-label="Fermer le menu">
              ✕
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {nav.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className={`relative block px-3 py-2.5 rounded-sm text-sm transition-all duration-200 ${
                  pathname === it.href ? "bg-white/10 text-white" : "text-[#B9C9B9] hover:bg-white/5 hover:text-white hover:pl-4"
                }`}
              >
                {pathname === it.href && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-[#F5E600] rounded-full" />
                )}
                {it.label}
              </a>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <a href="/" className="block px-3 py-2.5 text-sm text-[#B9C9B9] hover:bg-white/5 hover:text-white rounded-sm transition-colors duration-200">
              ← Site public
            </a>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 text-sm text-[#B9C9B9] hover:bg-white/5 hover:text-white rounded-sm transition-colors duration-200"
            >
              Se déconnecter
            </button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 pt-14 md:pt-0">
          <div className="border-b border-[var(--line)] bg-white px-6 md:px-10 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--ink-muted)]">Bonjour,</p>
              <p className="font-medium">{profile.full_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell userId={profile.id} />
              <p className="text-xs uppercase tracking-wide text-[#8A7F00] hidden sm:block">
                {isAdmin ? "Super administrateur" : profile.services?.name}
              </p>
            </div>
          </div>
          <div key={pathname} className="dash-in p-6 md:p-10 max-w-6xl mx-auto">
            <PushSetup userId={profile.id} />
            {children}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
