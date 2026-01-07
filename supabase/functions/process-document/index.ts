import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Create client with user's auth context for user lookup
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user and get their org_id
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's organization
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.org_id) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "User not associated with an organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestSchema = z.object({
      documentId: z.string().uuid("Invalid document ID format")
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid request", 
          details: validationResult.error.errors 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { documentId } = validationResult.data;

    // Get document - CRITICAL: verify it belongs to user's organization
    const { data: document, error: docError } = await supabaseClient
      .from("archived_documents")
      .select("*, document_snapshots(*)")
      .eq("id", documentId)
      .eq("org_id", profile.org_id)
      .single();
    
    if (!document) {
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (docError) throw docError;

    // Update status to processing
    await supabaseClient
      .from("archived_documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    // Extract text using AI (simplified for demo - would use proper PDF parsing in production)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Simulate text extraction (in production, use proper PDF/OCR libraries)
    const rawText = `Sample extracted text from ${document.file_name}`;
    
    // Extract decisions using AI
    const decisionsPrompt = `You are a governance parser. Input: ${rawText}. Output JSON array of decisions found. For each decision include: decision_text, decision_date (if found), motion_text (if found), proposer (if found), outcome (passed/rejected/unknown), confidence (0-1). If no decisions found return empty array.`;
    
    const decisionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a governance document analyzer. Return valid JSON only." },
          { role: "user", content: decisionsPrompt }
        ],
        temperature: 0.3,
      }),
    });

    let decisions = [];
    if (decisionsResponse.ok) {
      const decisionsData = await decisionsResponse.json();
      const content = decisionsData.choices[0].message.content;
      
      // Try to parse JSON from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          decisions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse decisions JSON:", e);
      }
    }

    // Save extracted decisions
    for (const decision of decisions) {
      await supabaseClient
        .from("extracted_decisions")
        .insert({
          document_id: documentId,
          decision_text: decision.decision_text,
          decision_date: decision.decision_date || null,
          motion_text: decision.motion_text || null,
          proposer: decision.proposer || null,
          outcome: decision.outcome || "unknown",
          confidence_score: decision.confidence || 0.5,
        });
    }

    // Update document with extracted text and status
    await supabaseClient
      .from("archived_documents")
      .update({
        raw_text: rawText,
        processing_status: "completed",
        parsed_metadata: {
          decisions_count: decisions.length,
          processed_at: new Date().toISOString(),
        },
      })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({
        success: true,
        decisionsExtracted: decisions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[INTERNAL] Error processing document:", error);
    return new Response(
      JSON.stringify({ 
        error: "Unable to process document. Please try again later."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});