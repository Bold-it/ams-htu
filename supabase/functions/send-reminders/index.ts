import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getEmailContent(programmeName: string, expiryDate: string, daysUntilExpiry: number) {
  const formattedDate = new Date(expiryDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  if (daysUntilExpiry <= 0) {
    return {
      subject: `URGENT: ${programmeName} – Accreditation Has Expired`,
      html: `<h2 style="color:#c0392b;">⚠️ Accreditation Expired</h2>
<p>The accreditation for <strong>${programmeName}</strong> expired on <strong>${formattedDate}</strong>.</p>
<p>Immediate action is required:</p>
<ol><li>Contact the accrediting body for reinstatement</li><li>Assess impact on current students</li><li>Implement emergency remediation plan</li></ol>
<p>— Quality Assurance Unit, Ho Technical University</p>`,
    };
  }

  if (daysUntilExpiry <= 180) {
    return {
      subject: `CRITICAL: ${programmeName} – Accreditation Expires in ${daysUntilExpiry} Days`,
      html: `<h2 style="color:#e67e22;">🔴 Critical Accreditation Alert</h2>
<p>The accreditation for <strong>${programmeName}</strong> expires on <strong>${formattedDate}</strong> (${daysUntilExpiry} days remaining).</p>
<p>Urgent actions required:</p>
<ol><li>Escalate to department leadership</li><li>Submit renewal application immediately</li><li>Prepare contingency plans</li></ol>
<p>— Quality Assurance Unit, Ho Technical University</p>`,
    };
  }

  return {
    subject: `Reminder: ${programmeName} – Accreditation Renewal Due`,
    html: `<h2 style="color:#2980b9;">📋 Accreditation Renewal Reminder</h2>
<p>The accreditation for <strong>${programmeName}</strong> expires on <strong>${formattedDate}</strong> (${daysUntilExpiry} days remaining).</p>
<p>Recommended actions:</p>
<ol><li>Initiate renewal application</li><li>Gather required documentation</li><li>Contact accrediting body for requirements</li></ol>
<p>— Quality Assurance Unit, Ho Technical University</p>`,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { id, status: filterStatus } = body;

    // If a specific ID is provided, send to that one
    if (id) {
      const { data: acc, error } = await supabase
        .from("accreditations")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !acc) {
        return new Response(JSON.stringify({ error: "Accreditation not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!acc.email) {
        return new Response(JSON.stringify({ error: "No email address" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const daysUntilExpiry = Math.floor((new Date(acc.expiry_date).getTime() - Date.now()) / 86400000);
      const { subject, html } = getEmailContent(acc.programme_name, acc.expiry_date, daysUntilExpiry);

      const emailResult = await resend.emails.send({
        from: "HTU QA Unit <onboarding@resend.dev>",
        to: [acc.email],
        subject,
        html,
      });

      console.log(`Email sent for ${acc.programme_name}:`, emailResult);
      return new Response(JSON.stringify({ success: true, result: emailResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk send: get all accreditations needing reminders
    const { data: accreditations, error } = await supabase
      .from("accreditations")
      .select("*")
      .not("email", "is", null);

    if (error) throw error;

    const now = Date.now();
    const results: Array<{ programme: string; success: boolean; error?: string }> = [];

    for (const acc of accreditations || []) {
      const daysUntilExpiry = Math.floor((new Date(acc.expiry_date).getTime() - now) / 86400000);

      // Determine if this accreditation needs a reminder
      let shouldSend = false;
      if (filterStatus === "warning" && daysUntilExpiry > 180 && daysUntilExpiry <= 365) shouldSend = true;
      else if (filterStatus === "critical" && daysUntilExpiry <= 180) shouldSend = true;
      else if (filterStatus === "all" && daysUntilExpiry <= 365) shouldSend = true;
      // Auto mode: send at specific thresholds (365, 180, 90, 1 day)
      else if (!filterStatus) {
        if (daysUntilExpiry <= 0 || daysUntilExpiry === 1 || daysUntilExpiry <= 90 || daysUntilExpiry <= 180 || daysUntilExpiry <= 365) {
          shouldSend = daysUntilExpiry <= 365;
        }
      }

      if (!shouldSend || !acc.email) continue;

      try {
        const { subject, html } = getEmailContent(acc.programme_name, acc.expiry_date, daysUntilExpiry);
        await resend.emails.send({
          from: "HTU QA Unit <onboarding@resend.dev>",
          to: [acc.email],
          subject,
          html,
        });
        results.push({ programme: acc.programme_name, success: true });
        console.log(`✓ Sent reminder for ${acc.programme_name}`);
      } catch (err) {
        results.push({ programme: acc.programme_name, success: false, error: err.message });
        console.error(`✗ Failed for ${acc.programme_name}:`, err.message);
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.success).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
