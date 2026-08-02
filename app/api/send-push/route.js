import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:contact@mairie-gonaives.ht",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { userId, title, body, link } = await request.json();
    if (!userId || !title) {
      return Response.json({ error: "userId et title requis" }, { status: 400 });
    }

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, body: body || "", link: link || "/dashboard" });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err) {
        // Abonnement expiré ou invalide : on le supprime
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return Response.json({ sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
