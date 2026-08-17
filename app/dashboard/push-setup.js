"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PushSetup({ userId }) {
  // checking | unsupported | ios-need-install | can-enable | enabled | denied
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    evaluate();
  }, [userId]);

  async function evaluate() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (isIos() && !isStandalone()) {
      setStatus("ios-need-install");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      setStatus("can-enable");
      return;
    }
    // Permission accordée au niveau du navigateur : on vérifie que l'abonnement
    // actuel de cet appareil appartient bien à CE compte précis (et pas à un
    // autre utilisateur qui se serait connecté avant sur le même appareil).
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setStatus("can-enable");
        return;
      }
      const { data } = await supabase
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", userId)
        .eq("endpoint", sub.endpoint)
        .maybeSingle();
      setStatus(data ? "enabled" : "can-enable");
    } catch {
      setStatus("can-enable");
    }
  }

  async function enable() {
    setError("");
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "can-enable");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "endpoint" }
      );
      if (dbError) throw dbError;
      setStatus("enabled");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function disable() {
    setError("");
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("can-enable");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "enabled") {
    return (
      <div className="bg-[#EEF3EA] border border-[#B9CDAE] rounded-sm px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#3F5A3A]">🔔 Notifications activées sur cet appareil.</p>
        <button
          onClick={disable}
          disabled={busy}
          className="text-xs border border-[#B9CDAE] text-[#3F5A3A] px-3 py-1.5 rounded-sm shrink-0 disabled:opacity-50"
        >
          {busy ? "..." : "Désactiver"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF3E4] border border-[#E3C896] rounded-sm px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap">
      {status === "ios-need-install" && (
        <p className="text-xs text-[#5B584F]">
          Pour recevoir les notifications sur iPhone : appuyez sur <strong>Partager</strong> puis{" "}
          <strong>Sur l'écran d'accueil</strong>, ouvrez ensuite l'app depuis l'écran d'accueil.
        </p>
      )}
      {status === "can-enable" && (
        <>
          <p className="text-xs text-[#5B584F]">Activez les notifications pour ne rien manquer, sur cet appareil.</p>
          <button
            onClick={enable}
            disabled={busy}
            className="text-xs bg-[#1B2A4A] text-white px-3 py-1.5 rounded-sm shrink-0 disabled:opacity-50"
          >
            {busy ? "..." : "Activer les notifications"}
          </button>
        </>
      )}
      {status === "denied" && (
        <p className="text-xs text-[#5B584F]">
          Les notifications sont bloquées dans les réglages de votre navigateur pour ce site.
        </p>
      )}
      {error && <p className="text-xs text-[#A8332B] w-full">{error}</p>}
    </div>
  );
}
