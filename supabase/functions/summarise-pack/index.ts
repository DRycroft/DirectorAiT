/**
 * Summarise Pack — V1
 *
 * - Role-gated (super_admin / org_admin / chair on the pack's org)
 * - Caps assembled input size
 * - Caches summary by source_hash in pack_summaries
 * - Blocks regeneration on finalised packs (allows first-time generate if none exists)
 * - Audit row: pack.summarised
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";
const PROMPT_VERSION = "v1";
const MAX_TOTAL_CHARS = 30000;
const MAX_PER_SECTION_CHARS = 4000;

const SYSTEM_PROMPT = `You are a senior board secretary writing a concise summary of a board pack.
Focus on: key decisions, material risks, asks of the board, and outstanding actions.
Use short headed sections in this exact order:
1. Key Decisions
2. Material Risks
3. Asks of the Board
4. Outstanding Actions
Be neutral, factual, and brief. Do not invent content. If a section has no material entries, write "None noted." Output plain text only.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function flattenContent(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, any>;

  if (typeof c.text === "string" && c.text.trim()) {
    return c.text.trim();
  }

  const kind = c.kind as string | undefined;
  if (!kind) return "";

  const rows: any[] = Array.isArray(c.rows) ? c.rows : [];
  switch (kind) {
    case "attendance":
      if (!rows.length) return "(no attendance recorded)";
      return rows
        .map(
          (r) =>
            `- ${r.name}${r.position ? ` (${r.position})` : ""}: ${
              r.attended ? "Present" : r.apologies || "Absent"
            }`
        )
        .join("\n");
    case "prior_minutes": {
      const pm = c.prior_minutes;
      if (!pm) return "(no prior minutes)";
      return `${pm.title || "Previous minutes"} (${pm.meeting_date || ""})\n${
        pm.content || "(no content)"
      }`;
    }
    case "coi_register":
      if (!rows.length) return "(no active declarations of interest)";
      return rows
        .map(
          (r) =>
            `- ${r.member_name} [${r.type || "interest"}]: ${r.interest || ""}`
        )
        .join("\n");
    case "actions_log":
      if (!rows.length) return "(no open actions)";
      return rows
        .map(
          (r) =>
            `- ${r.title} — owner: ${r.owner || "—"}, due: ${
              r.due_date || "—"
            }, status: ${r.status || "pending"}`
        )
        .join("\n");
    case "decisions_log":
      if (!rows.length) return "(no decisions recorded)";
      return rows
        .map(
          (r) =>
            `- ${r.title} — outcome: ${r.outcome || "noted"}${
              r.proposer ? `, proposer: ${r.proposer}` : ""
            }`
        )
        .join("\n");
    case "members_directory":
      if (!rows.length) return "(no active board members)";
      return rows
        .map(
          (r) =>
            `- ${r.name}${r.position ? ` — ${r.position}` : ""}${
              r.member_type ? ` (${r.member_type})` : ""
            }`
        )
        .join("\n");
    default:
      return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "AI gateway not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // User-scoped client (RLS-enforced reads)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service client (writes summary + audit)
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const packId: string | undefined = body?.pack_id;
    const force = body?.force === true;
    if (!packId || typeof packId !== "string") {
      return jsonResponse({ error: "pack_id is required" }, 400);
    }

    // Load pack via user JWT (RLS gates access)
    const { data: pack, error: packErr } = await userClient
      .from("board_packs")
      .select("id, title, meeting_date, status, board_id")
      .eq("id", packId)
      .single();
    if (packErr || !pack) {
      return jsonResponse({ error: "Pack not found or not accessible" }, 404);
    }

    // Resolve org for role check
    const { data: board } = await userClient
      .from("boards")
      .select("org_id")
      .eq("id", pack.board_id)
      .single();
    if (!board?.org_id) {
      return jsonResponse({ error: "Board org not found" }, 404);
    }
    const orgId: string = board.org_id;

    // Role gate: super_admin OR (org_admin|chair on this org)
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role, org_id")
      .eq("user_id", userId);
    const elevated = (roles || []).some(
      (r: any) =>
        r.role === "super_admin" ||
        ((r.role === "org_admin" || r.role === "chair") && r.org_id === orgId)
    );
    if (!elevated) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Load existing summary (if any)
    const { data: existing } = await adminClient
      .from("pack_summaries")
      .select("pack_id, summary_text, model, source_hash, generated_at")
      .eq("pack_id", packId)
      .maybeSingle();

    // Finalised: allow first generate, block regenerate
    const isFinalised = pack.status === "finalised";
    if (isFinalised && existing && force) {
      return jsonResponse(
        { error: "Pack is finalised. Regeneration is disabled." },
        409
      );
    }

    // Load sections + latest doc per section
    const { data: sections, error: secErr } = await userClient
      .from("pack_sections")
      .select(
        `id, title, order_index, document:section_documents(content, version_number, created_at)`
      )
      .eq("pack_id", packId)
      .order("order_index");
    if (secErr) {
      return jsonResponse({ error: "Failed to load sections" }, 500);
    }

    // Assemble input
    const parts: string[] = [];
    let total = 0;
    let hasAnyContent = false;
    for (const s of (sections as any[]) || []) {
      const docs = Array.isArray(s.document) ? s.document : [];
      if (!docs.length) continue;
      const latest = docs.reduce((a: any, b: any) =>
        (a.version_number || 0) >= (b.version_number || 0) ? a : b
      );
      let text = flattenContent(latest?.content);
      if (!text) continue;
      hasAnyContent = true;
      if (text.length > MAX_PER_SECTION_CHARS) {
        text = text.slice(0, MAX_PER_SECTION_CHARS) + "\n…[truncated]";
      }
      const block = `## ${s.title}\n${text}`;
      if (total + block.length > MAX_TOTAL_CHARS) {
        const remaining = MAX_TOTAL_CHARS - total;
        if (remaining > 200) {
          parts.push(block.slice(0, remaining) + "\n…[truncated]");
        }
        break;
      }
      parts.push(block);
      total += block.length;
    }

    if (!hasAnyContent) {
      return jsonResponse(
        { error: "Not enough content to summarise" },
        422
      );
    }

    const assembled = `Pack: ${pack.title}\nMeeting date: ${pack.meeting_date}\n\n${parts.join(
      "\n\n"
    )}`;
    const sourceHash = await sha256(`${PROMPT_VERSION}|${assembled}`);

    // Cache hit
    if (existing && existing.source_hash === sourceHash && !force) {
      return jsonResponse({
        summary: existing.summary_text,
        cached: true,
        generated_at: existing.generated_at,
        model: existing.model,
        source_hash: existing.source_hash,
      });
    }

    // Call AI gateway
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: assembled },
          ],
        }),
      }
    );

    if (aiResp.status === 429) {
      return jsonResponse(
        { error: "Rate limits exceeded, please try again later." },
        429
      );
    }
    if (aiResp.status === 402) {
      return jsonResponse(
        {
          error:
            "Payment required, please add funds to your Lovable AI workspace.",
        },
        402
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return jsonResponse({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiResp.json();
    const summary: string =
      aiJson?.choices?.[0]?.message?.content?.trim() || "";
    if (!summary) {
      return jsonResponse({ error: "Empty AI response" }, 500);
    }

    const generatedAt = new Date().toISOString();

    // Upsert summary (service role)
    const { error: upsertErr } = await adminClient
      .from("pack_summaries")
      .upsert({
        pack_id: packId,
        summary_text: summary,
        model: MODEL,
        source_hash: sourceHash,
        prompt_version: PROMPT_VERSION,
        generated_at: generatedAt,
        generated_by: userId,
      });
    if (upsertErr) {
      console.error("upsert error:", upsertErr);
      return jsonResponse({ error: "Failed to store summary" }, 500);
    }

    // Audit
    await adminClient.from("audit_log").insert({
      entity_type: "pack",
      entity_id: packId,
      actor_id: userId,
      action: "pack.summarised",
      detail_json: {
        model: MODEL,
        source_hash: sourceHash,
        prompt_version: PROMPT_VERSION,
        char_count: assembled.length,
        cached: false,
        regenerated: !!existing,
      },
    });

    return jsonResponse({
      summary,
      cached: false,
      generated_at: generatedAt,
      model: MODEL,
      source_hash: sourceHash,
    });
  } catch (e) {
    console.error("summarise-pack error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
