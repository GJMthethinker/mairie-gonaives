import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { full_name, service_id } = await req.json();
    if (!full_name || !service_id) {
      return Response.json({ error: "Nom et direction requis." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I/L)
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const email = `emp-${code.toLowerCase()}@mairie-gonaives.internal`;

    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: code,
      email_confirm: true,
    });
    if (userErr) {
      return Response.json({ error: userErr.message }, { status: 400 });
    }

    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      id: userData.user.id,
      full_name,
      role: "agent",
      service_id,
      status: "approuve",
      login_code: code,
    });
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return Response.json({ error: profErr.message }, { status: 400 });
    }

    return Response.json({ code, full_name });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
