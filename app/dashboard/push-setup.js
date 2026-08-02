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
  const [status, setStatus] = useState("checking"); // checking | unsupported | ios-need-install | can-enable | enabled | denied
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (isIos() && !isStandalone()) {
      setStatus("ios-need-install");
      return;
    }
    if (Notification.permission === "granted") {
      checkExistingSubscription();
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    } else {
      setStatus("can-enable");
    }
  }, []);

  async function checkExistingSubscription() {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? "enabled" : "can-enable");
  }

  async function enable() {
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "can-enable");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "endpoint" }
      );
      setStatus("enabled");
    } catch (e) {
      setError(e.message);
    }
  }

  if (status === "checking" || status === "unsupported" || status === "enabled") return null;

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
          <p className="text-xs text-[#5B584F]">Activez les notifications pour ne rien manquer.</p>
          <button onClick={enable} className="text-xs bg-[#1B2A4A] text-white px-3 py-1.5 rounded-sm shrink-0">
            Activer les notifications
          </button>
        </>
      )}
      {status === "denied" && (
        <p className="text-xs text-[#5B584F]">
          Les notifications sont bloquées dans les réglages de votre navigateur pour ce site.
        </p>
      )}
      {error && <p className="text-xs text-[#A8332B]">{error}</p>}
    </div>
  );
}
