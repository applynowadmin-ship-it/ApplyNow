import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const RATE_LIMIT_PER_HOUR = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isAdmin, error: adminError } = await asCaller.rpc("is_applynow_admin");
  if (adminError || !isAdmin) return json({ error: "Admin access required" }, 403);

  const { requestId } = await req.json().catch(() => ({}));
  if (!requestId) return json({ error: "requestId is required" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("application_requests")
    .select("id", { count: "exact", head: true })
    .gte("guide_emailed_at", since);
  if (countError) return json({ error: countError.message }, 500);
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json({ error: `Email rate limit reached (${RATE_LIMIT_PER_HOUR} per hour). Try again later.` }, 429);
  }

  const { data: request, error } = await admin
    .from("application_requests")
    .select("id,status,is_paid,learner_full_name,learner_email,package_type,aps,course_requested,selected_universities,results_snapshot")
    .eq("id", requestId)
    .single();
  if (error || !request) return json({ error: "Request not found" }, 404);
  if (request.status !== "approved" || !request.is_paid) return json({ error: "Request is not approved and paid" }, 409);

  const results = Array.isArray(request.results_snapshot) ? request.results_snapshot : [];
  const rows = results
    .map((r: { course: string; institution: string; eligibility: string }) =>
      `<li>${escapeHtml(r.course)} — ${escapeHtml(r.institution)}: ${escapeHtml(r.eligibility)}</li>`)
    .join("");
  const html = `
    <p>Hi ${escapeHtml(request.learner_full_name)},</p>
    <p>Your ${escapeHtml(request.package_type)} payment was verified. Here is your preliminary course guide (estimated APS ${escapeHtml(request.aps)}).</p>
    ${request.course_requested ? `<p>Course requested: ${escapeHtml(request.course_requested)}</p>` : ""}
    ${rows ? `<ul>${rows}</ul>` : "<p>Sign in at ApplyNow with this email to view your results.</p>"}
    <p>This guide is indicative only. Verify every programme and requirement on the institution's official website.</p>`;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("GUIDE_FROM_EMAIL");
  if (!resendKey || !from) return json({ error: "Email provider is not configured (RESEND_API_KEY, GUIDE_FROM_EMAIL)" }, 500);

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: request.learner_email, subject: "Your ApplyNow course guide", html }),
  });
  if (!send.ok) return json({ error: `Email provider rejected the message (${send.status})` }, 502);

  await admin.from("application_requests").update({ guide_emailed_at: new Date().toISOString() }).eq("id", request.id);
  return json({ ok: true });
});
