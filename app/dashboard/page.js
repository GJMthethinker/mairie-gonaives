"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "./layout";

export default function DashboardPage() {
  const { isAdmin, services } = useApp();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard/documents");
      return;
    }
    async function load() {
      const { data: docs } = await supabase.from("documents").select("*");
      const { data: tks } = await supabase.from("tasks").select("*");
      setDocuments(docs || []);
      setTasks(tks || []);
      setLoading(false);
    }
    load();
  }, [isAdmin, router]);

  if (!isAdmin || loading) return null;

  const todayISO = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const todayCount = documents.filter((d) => d.created_at?.slice(0, 10) === todayISO).length;
  const monthCount = documents.filter((d) => d.created_at?.slice(0, 7) === thisMonth).length;
  const byService = services.map((s) => ({
    ...s,
    docCount: documents.filter((d) => d.service_id === s.id).length,
    todo: tasks.filter((t) => t.service_id === s.id && t.status === "todo").length,
    doing: tasks.filter((t) => t.service_id === s.id && t.status === "doing").length,
    done: tasks.filter((t) => t.service_id === s.id && t.status === "done").length,
  }));
  const maxDoc = Math.max(1, ...byService.map((s) => s.docCount));

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1B2A4A] mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{todayCount}</p>
          <p className="text-xs text-[#8A857A] mt-1">Documents aujourd'hui</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{monthCount}</p>
          <p className="text-xs text-[#8A857A] mt-1">Documents ce mois-ci</p>
        </div>
        <div className="bg-white border border-[#E3DCC8] rounded-sm p-5">
          <p className="text-3xl font-serif text-[#1B2A4A]">{documents.length}</p>
          <p className="text-xs text-[#8A857A] mt-1">Documents au total</p>
        </div>
      </div>
      <h3 className="font-serif text-lg text-[#1B2A4A] mb-3">Par service</h3>
      <div className="bg-white border border-[#E3DCC8] rounded-sm divide-y divide-[#E3DCC8]">
        {byService.map((s) => (
          <div key={s.id} className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{s.name}</span>
              <span className="text-xs text-[#8A857A]">{s.docCount} document(s)</span>
            </div>
            <div className="h-1.5 bg-[#EFEADA] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-[#B8862E]" style={{ width: `${(s.docCount / maxDoc) * 100}%` }} />
            </div>
            <div className="flex gap-4 text-[11px] text-[#8A857A]">
              <span>À faire : {s.todo}</span>
              <span>En cours : {s.doing}</span>
              <span>Terminées : {s.done}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
