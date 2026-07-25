import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushPayload {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  data?: Record<string, string>;
  simulate?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as PushPayload;

    const serverKey = Deno.env.get("FIREBASE_SERVER_KEY");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const hasFcm = Boolean(serverKey || projectId);

    if (hasFcm && !payload.simulate && (payload.token || payload.topic)) {
      // Use FCM HTTP v1 API. In production you'd mint an OAuth2 access token
      // from a service account; here we use the legacy server key for simplicity.
      const message = {
        notification: { title: payload.title, body: payload.body },
        data: { severity: payload.severity, ...(payload.data ?? {}) },
        ...(payload.token ? { token: payload.token } : { topic: payload.topic }),
      };
      const res = await fetch(
        `https://fcm.googleapis.com/fcm/send`,
        {
          method: "POST",
          headers: {
            Authorization: `key=${serverKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ ok: false, error: errText, delivered_via: "fcm_error" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: true, messageId: data.message_id, delivered_via: "firebase" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulation mode — browser notification + logged payload
    return new Response(
      JSON.stringify({
        ok: true,
        delivered_via: "simulation",
        title: payload.title,
        body: payload.body,
        severity: payload.severity,
        note: "FIREBASE_* env vars not set — push simulated. Set FIREBASE_SERVER_KEY or FIREBASE_PROJECT_ID to send real push notifications.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
