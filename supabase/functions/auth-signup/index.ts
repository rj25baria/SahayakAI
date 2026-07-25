import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SignUpBody {
  email: string;
  password: string;
  full_name: string;
  role: "patient" | "guardian" | "doctor" | "admin";
  language: "en" | "hi";
  phone: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SignUpBody;
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceRoleKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user via the admin API with autoconfirmed email so they can
    // sign in immediately without email confirmation.
    const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name,
          role: body.role,
          language: body.language,
          phone: body.phone,
        },
      }),
    });

    if (!adminRes.ok) {
      const errText = await adminRes.text();
      return new Response(
        JSON.stringify({ error: errText }),
        { status: adminRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const created = await adminRes.json();
    const uid = created.id as string;

    // Create the profile row with the service role (bypasses RLS).
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: uid,
        full_name: body.full_name,
        role: body.role,
        language: body.language,
        phone: body.phone,
        theme: "light",
      }),
    });

    if (!profileRes.ok) {
      // The user was created but profile failed — log but still succeed,
      // the client will create the profile on first load as a fallback.
      const errText = await profileRes.text();
      console.error("profile creation failed", errText);
    }

    return new Response(
      JSON.stringify({ ok: true, user: { id: uid, email: body.email } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
