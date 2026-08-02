"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days} j`;
}

export default function NotificationBell({ userId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data || []);
  }

  useEffect(() => {
    if (!userId) return;
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(n) {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) window.location.href = n.link;
  }

  async function markAllRead() {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative p-2 rounded-sm hover:bg-black/5 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" strokeLinejoin="round" />
          <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#A8332B] text-white text-[10px] leading-4 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-[#E3DCC8] rounded-sm shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E3DCC8]">
            <p className="text-sm font-medium text-[#1B2A4A]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-[#B8862E]">
                Tout marquer lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-[#8A857A] p-4">Aucune notification.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={`block w-full text-left px-4 py-3 border-b border-[#F0EBDD] last:border-0 hover:bg-[#F7F4EC] ${
                  n.read ? "" : "bg-[#FBF3E4]"
                }`}
              >
                <p className="text-sm font-medium text-[#1B2A4A]">{n.title}</p>
                {n.body && <p className="text-xs text-[#5B584F] mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-[#8A857A] mt-1">{timeAgo(n.created_at)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
