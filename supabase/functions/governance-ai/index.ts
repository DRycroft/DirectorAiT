import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_INPUT_LENGTH = 80000;

const requestSchema = z.object({
  action: z.enum([
    "summarise-pack",
    "transcript-to-minutes",
    "transcript-to-actions",
    "highlight-risks",
    "director-briefing",
    "ask-history",
  ]),
  boardId: z.string().uuid().optional(),
  packId: z.string().uuid().optional(),
  agendaId: z.string().uuid().optional(),
  transcript: z.string().max(MAX_INPUT_LENGTH).optional(),
  question: z.string().max(2000).optional(),
});

function truncate(text: string, max: number): string {
  return text.length > max ? text.substring(0, max) + "\n[…truncated]" : text;
}

async function callAI(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: truncate(prompt, 50000) },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("AI rate limit exceeded. Please try again shortly.");
    if (status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
    throw new Error(`AI service error (${status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from("profiles").select("org_id").eq("id", user.id).single();
    if (!profile?.org_id) {
      return new Response(JSON.stringify({ error: "No organisation found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orgId = profile.org_id;

    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.errors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, boardId, packId, agendaId, transcript, question } = parsed.data;
    console.log(`[${requestId}] Action: ${action}, user: ${user.id}`);

    const SYSTEM_BASE = "You are a governance AI assistant for a board management platform. Be precise, factual, and professional. Always note when information may be incomplete. Format output in clear markdown.";

    let result = "";

    // ── SUMMARISE PACK ──
    if (action === "summarise-pack" && packId) {
      const { data: pack } = await supabase.from("board_packs")
        .select("title, meeting_date, board_id, status")
        .eq("id", packId).single();
      if (!pack) throw new Error("Pack not found");

      // Verify org ownership
      const { data: board } = await supabase.from("boards")
        .select("org_id, title").eq("id", pack.board_id).single();
      if (board?.org_id !== orgId) throw new Error("Access denied");

      const { data: sections } = await supabase.from("pack_sections")
        .select("title, status, order_index").eq("pack_id", packId).order("order_index");

      const { data: docs } = await supabase.from("pack_sections")
        .select("title, document:section_documents(content, version_number)")
        .eq("pack_id", packId).order("order_index");

      const sectionTexts = (docs || []).map((s: any) => {
        const latest = s.document?.sort((a: any, b: any) => b.version_number - a.version_number)?.[0];
        const content = latest?.content ? (typeof latest.content === "string" ? latest.content : JSON.stringify(latest.content)) : "(no content submitted)";
        return `## ${s.title}\n${content}`;
      }).join("\n\n");

      const prompt = `Summarise this board pack for "${board?.title}" meeting on ${pack.meeting_date}.\n\nPack title: ${pack.title}\nStatus: ${pack.status}\nSections (${sections?.length || 0}):\n\n${sectionTexts}\n\nProvide:\n1. Executive summary (2-3 sentences)\n2. Key items requiring board attention\n3. Decisions needed\n4. Any gaps or missing information`;

      result = await callAI(prompt, SYSTEM_BASE, LOVABLE_API_KEY);
    }

    // ── TRANSCRIPT TO MINUTES ──
    else if (action === "transcript-to-minutes" && transcript) {
      let contextInfo = "";
      if (agendaId) {
        const { data: agenda } = await supabase.from("agendas")
          .select("title, meeting_date, board_id").eq("id", agendaId).single();
        if (agenda) {
          const { data: board } = await supabase.from("boards")
            .select("org_id, title").eq("id", agenda.board_id).single();
          if (board?.org_id !== orgId) throw new Error("Access denied");
          contextInfo = `Meeting: ${agenda.title}\nDate: ${agenda.meeting_date}\nBoard: ${board?.title}\n\n`;
        }
      }

      const prompt = `${contextInfo}Convert this meeting transcript into formal board meeting minutes:\n\n${transcript}\n\nFormat as proper governance minutes with:\n1. Meeting details header\n2. Attendance (if mentioned)\n3. Items discussed with key points\n4. Decisions made (with movers/seconders if mentioned)\n5. Action items with owners and due dates\n6. Meeting close`;

      result = await callAI(prompt, SYSTEM_BASE + " You are drafting formal board meeting minutes. Use professional governance language.", LOVABLE_API_KEY);
    }

    // ── TRANSCRIPT TO ACTIONS ──
    else if (action === "transcript-to-actions" && transcript) {
      const prompt = `Extract all action items and decisions from this meeting transcript:\n\n${transcript}\n\nFor each action item provide:\n- Description\n- Owner/responsible person (if mentioned)\n- Due date (if mentioned)\n- Priority (high/medium/low based on context)\n\nFor each decision provide:\n- Decision text\n- Outcome (passed/rejected/noted)\n- Proposer (if mentioned)\n- Seconder (if mentioned)\n\nReturn as two clear sections: "## Action Items" and "## Decisions"`;

      result = await callAI(prompt, SYSTEM_BASE + " Extract structured governance data from meeting content.", LOVABLE_API_KEY);
    }

    // ── HIGHLIGHT RISKS ──
    else if (action === "highlight-risks" && boardId) {
      const { data: board } = await supabase.from("boards")
        .select("org_id, title").eq("id", boardId).single();
      if (board?.org_id !== orgId) throw new Error("Access denied");

      // Fetch overdue actions, recent decisions, compliance items
      const [actionsRes, decisionsRes, complianceRes] = await Promise.all([
        supabase.from("action_items").select("title, due_date, status, owner_id")
          .in("status", ["pending", "in_progress"]).order("due_date").limit(50),
        supabase.from("meeting_decisions").select("title, outcome, decision_date")
          .order("decision_date", { ascending: false }).limit(30),
        supabase.from("compliance_items").select("title, status, next_due_date, frequency")
          .eq("org_id", orgId).eq("is_active", true).order("next_due_date").limit(30),
      ]);

      const overdue = (actionsRes.data || []).filter(a => a.due_date && new Date(a.due_date) < new Date());
      const pendingCompliance = (complianceRes.data || []).filter(c =>
        c.next_due_date && new Date(c.next_due_date) <= new Date(Date.now() + 30 * 86400000)
      );

      const prompt = `Analyse these governance signals for "${board.title}" and highlight risks:\n\n## Overdue Actions (${overdue.length})\n${overdue.map(a => `- ${a.title} (due: ${a.due_date}, status: ${a.status})`).join("\n") || "None"}\n\n## All Open Actions (${actionsRes.data?.length || 0})\n${(actionsRes.data || []).map(a => `- ${a.title} (due: ${a.due_date || "no date"}, status: ${a.status})`).join("\n") || "None"}\n\n## Recent Decisions (${decisionsRes.data?.length || 0})\n${(decisionsRes.data || []).map(d => `- ${d.title} (${d.outcome || "unknown"}, ${d.decision_date})`).join("\n") || "None"}\n\n## Compliance Items Due Soon (${pendingCompliance.length})\n${pendingCompliance.map(c => `- ${c.title} (due: ${c.next_due_date}, frequency: ${c.frequency})`).join("\n") || "None"}\n\nProvide:\n1. Top 3-5 governance risks ranked by severity\n2. Unresolved items needing escalation\n3. Patterns of concern (e.g. repeated delays)\n4. Recommended immediate actions`;

      result = await callAI(prompt, SYSTEM_BASE + " You are a governance risk analyst. Be direct about risks.", LOVABLE_API_KEY);
    }

    // ── DIRECTOR BRIEFING ──
    else if (action === "director-briefing" && boardId) {
      const { data: board } = await supabase.from("boards")
        .select("org_id, title, description, board_type, created_at").eq("id", boardId).single();
      if (board?.org_id !== orgId) throw new Error("Access denied");

      const [membersRes, decisionsRes, actionsRes, agendasRes] = await Promise.all([
        supabase.from("board_members").select("full_name, position, status, appointment_date")
          .eq("board_id", boardId).in("status", ["active", "pending"]),
        supabase.from("meeting_decisions").select("title, outcome, decision_date")
          .order("decision_date", { ascending: false }).limit(20),
        supabase.from("action_items").select("title, status, due_date")
          .in("status", ["pending", "in_progress"]).limit(20),
        supabase.from("agendas").select("title, meeting_date, status")
          .eq("board_id", boardId).order("meeting_date", { ascending: false }).limit(10),
      ]);

      const prompt = `Create a new director briefing for someone joining "${board.title}".\n\nBoard: ${board.title}\nType: ${board.board_type || "Board"}\nDescription: ${board.description || "Not specified"}\nCreated: ${board.created_at}\n\n## Current Members (${membersRes.data?.length || 0})\n${(membersRes.data || []).map(m => `- ${m.full_name} (${m.position || "Member"}, ${m.status}, appointed: ${m.appointment_date || "unknown"})`).join("\n") || "None"}\n\n## Recent Meetings (${agendasRes.data?.length || 0})\n${(agendasRes.data || []).map(a => `- ${a.title} (${a.meeting_date}, ${a.status})`).join("\n") || "None"}\n\n## Recent Decisions (${decisionsRes.data?.length || 0})\n${(decisionsRes.data || []).map(d => `- ${d.title} (${d.outcome || "unknown"}, ${d.decision_date})`).join("\n") || "None"}\n\n## Open Actions (${actionsRes.data?.length || 0})\n${(actionsRes.data || []).map(a => `- ${a.title} (${a.status}, due: ${a.due_date || "no date"})`).join("\n") || "None"}\n\nProvide:\n1. Board overview and purpose\n2. Current composition and key roles\n3. Recent activity summary\n4. Key decisions made\n5. Outstanding matters to be aware of\n6. Suggested reading/preparation`;

      result = await callAI(prompt, SYSTEM_BASE + " You are creating an onboarding briefing for a new board director. Be welcoming but thorough.", LOVABLE_API_KEY);
    }

    // ── ASK HISTORY ──
    else if (action === "ask-history" && question && boardId) {
      const { data: board } = await supabase.from("boards")
        .select("org_id, title").eq("id", boardId).single();
      if (board?.org_id !== orgId) throw new Error("Access denied");

      // Gather broad context
      const [decisionsRes, actionsRes, agendasRes] = await Promise.all([
        supabase.from("meeting_decisions").select("title, outcome, decision_date, proposer")
          .order("decision_date", { ascending: false }).limit(50),
        supabase.from("action_items").select("title, status, due_date, description")
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("agendas").select("title, meeting_date, minutes_content")
          .eq("board_id", boardId).order("meeting_date", { ascending: false }).limit(20),
      ]);

      const minutesContext = (agendasRes.data || [])
        .filter(a => a.minutes_content)
        .map(a => `### ${a.title} (${a.meeting_date})\n${truncate(a.minutes_content!, 3000)}`)
        .join("\n\n");

      const prompt = `A board member asks: "${question}"\n\nAnswer using ONLY the governance data below. If the answer isn't in the data, say so clearly.\n\n## Decisions (${decisionsRes.data?.length || 0} most recent)\n${(decisionsRes.data || []).map(d => `- ${d.title} (${d.outcome || "unknown"}, ${d.decision_date}, proposer: ${d.proposer || "unknown"})`).join("\n") || "None"}\n\n## Actions (${actionsRes.data?.length || 0} most recent)\n${(actionsRes.data || []).map(a => `- ${a.title} (${a.status}, due: ${a.due_date || "no date"})`).join("\n") || "None"}\n\n## Meeting Minutes\n${minutesContext || "No minutes available"}\n\nProvide a clear, referenced answer. Cite specific meetings or decisions where possible.`;

      result = await callAI(prompt, SYSTEM_BASE + " Answer governance questions using only the provided data. Always cite your sources.", LOVABLE_API_KEY);
    }

    else {
      return new Response(JSON.stringify({ error: "Invalid action or missing required parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Completed: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      result,
      generated_at: new Date().toISOString(),
      disclaimer: "This content was generated by AI and should be reviewed for accuracy before use in formal governance processes.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : message.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: message, requestId }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
