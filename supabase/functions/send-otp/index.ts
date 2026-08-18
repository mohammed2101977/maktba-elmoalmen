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

    // TODO: Send SMS via provider. For now return the code (demo mode).
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
