import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertPayload {
  to_phone?: string;
  patient_name: string;
  patient_phone?: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  explanation?: string;
  address?: string;
  maps_url?: string;
  simulate?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as AlertPayload;

    // Twilio credentials are optional — when absent we run in simulation mode
    // and log the message that WOULD be sent. This keeps the platform demoable
    // without live SMS/WhatsApp costs, while remaining production-ready.
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM"); // e.g. whatsapp:+1415...
    const hasTwilio = Boolean(accountSid && authToken && fromNumber);

    const messageBody = buildWhatsAppMessage(payload);
    const deliveredVia = hasTwilio && !payload.simulate ? "twilio" : "simulation";

    if (deliveredVia === "twilio") {
      const to = payload.to_phone?.startsWith("whatsapp:")
        ? payload.to_phone
        : `whatsapp:${payload.to_phone}`;
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: fromNumber!,
            To: to,
            Body: messageBody,
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ ok: false, error: errText, delivered_via: "twilio_error" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await res.json();
      return new Response(
        JSON.stringify({ ok: true, sid: data.sid, delivered_via: "twilio" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulation mode — return what would have been sent
    return new Response(
      JSON.stringify({
        ok: true,
        delivered_via: "simulation",
        to: payload.to_phone ?? "guardian-phone",
        body: messageBody,
        note: "TWILIO_* env vars not set — message simulated. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM to send real WhatsApp messages.",
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

function buildWhatsAppMessage(p: AlertPayload): string {
  const emoji = p.severity === "critical" ? "🚨" : p.severity === "warning" ? "⚠️" : "ℹ️";
  const lines = [
    `${emoji} SAHAYAK Alert — ${p.severity.toUpperCase()}`,
    "",
    `Patient: ${p.patient_name}`,
    `Alert: ${p.title}`,
    p.message,
  ];
  if (p.explanation) lines.push("", `Why: ${p.explanation}`);
  if (p.address) lines.push("", `Location: ${p.address}`);
  if (p.maps_url) lines.push(`Map: ${p.maps_url}`);
  if (p.patient_phone) lines.push(`Call patient: ${p.patient_phone}`);
  lines.push("", "— SAHAYAK Guardian Network");
  return lines.join("\n");
}
