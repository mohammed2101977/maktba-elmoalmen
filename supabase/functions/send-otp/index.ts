import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone, purpose } = await req.json();
    if (!phone || !purpose) {
      return new Response(JSON.stringify({ error: "الرقم والغرض مطلوبان" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if phone exists for login/reset
    if (purpose === "reset" || purpose === 'login') {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (!existing) {
        return new Response(JSON.stringify({ error: "هذا الرقم غير مسجل" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // For signup, check phone not already registered
    if (purpose === 'signup') {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "هذا الرقم مسجل بالفعل" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate 4-digit OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate old codes for this phone
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("phone", phone)
      .eq("used", false);

    // Insert new code
    const { error } = await supabase.from("otp_codes").insert({
      phone,
      code,
      purpose,
      expires_at: expiresAt,
      used: false,
    });

    if (error) {
      return new Response(JSON.stringify({ error: "فشل إنشاء الكود" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try sending the code over WhatsApp via your self-hosted bridge server
    // (free — see /whatsapp-bridge in the project for the server code + setup guide).
    // Configure WHATSAPP_BRIDGE_URL and WHATSAPP_BRIDGE_SECRET as Supabase project secrets.
    // If they are not configured, or the send fails, we fall back to demo mode below.
    const bridgeUrl = Deno.env.get("WHATSAPP_BRIDGE_URL");
    const bridgeSecret = Deno.env.get("WHATSAPP_BRIDGE_SECRET");
    const waPhone = toEgyptInternational(phone);

    if (bridgeUrl && bridgeSecret && waPhone) {
      try {
        const message = `كود التحقق الخاص بك في مكتبة المعلمين بالمنيا هو: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`;
        const waRes = await fetch(bridgeUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${bridgeSecret}`,
          },
          body: JSON.stringify({ phone: waPhone, message }),
        });
        const waJson = await waRes.json().catch(() => null);
        if (waRes.ok && waJson?.success) {
          return new Response(JSON.stringify({ success: true, channel: "whatsapp" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Bridge send failed (server offline, WhatsApp not linked, etc.) — fall back to demo mode below.
      } catch {
        // Network/bridge error — fall back to demo mode below.
      }
    }

    // Demo mode: WhatsApp isn't configured yet or the send failed. Return the code so it
    // can be shown on screen (development / fallback only — configure UltraMsg for production).
    return new Response(JSON.stringify({ success: true, code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Converts a local Egyptian number (01xxxxxxxxx) or an already-international number
// into the international format UltraMsg expects (e.g. 201014137629), with no leading "+".
function toEgyptInternational(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return `20${digits}`;
}
