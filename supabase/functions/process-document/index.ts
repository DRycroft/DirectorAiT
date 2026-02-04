import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum limits for security
const MAX_RAW_TEXT_LENGTH = 100000; // 100KB of text
const MAX_DECISIONS_COUNT = 100;
const MAX_DECISION_TEXT_LENGTH = 2000;
const MAX_MOTION_TEXT_LENGTH = 1000;
const MAX_PROPOSER_LENGTH = 200;

// Schema for validated AI response
const decisionSchema = z.object({
  decision_text: z.string().max(MAX_DECISION_TEXT_LENGTH),
  decision_date: z.string().nullable().optional(),
  motion_text: z.string().max(MAX_MOTION_TEXT_LENGTH).nullable().optional(),
  proposer: z.string().max(MAX_PROPOSER_LENGTH).nullable().optional(),
  outcome: z.enum(['passed', 'rejected', 'unknown']).default('unknown'),
  confidence: z.number().min(0).max(1).default(0.5),
});

const decisionsArraySchema = z.array(decisionSchema).max(MAX_DECISIONS_COUNT);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing document request...`);

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[${requestId}] Missing authorization header`);
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
      console.error(`[${requestId}] Authentication error:`, authError);
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
      console.error(`[${requestId}] Profile lookup error:`, profileError);
      return new Response(
        JSON.stringify({ error: "User not associated with an organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Request validation schema
    const requestSchema = z.object({
      documentId: z.string().uuid("Invalid document ID format")
    });

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error(`[${requestId}] Validation error:`, validationResult.error.errors);
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
      console.log(`[${requestId}] Document not found or access denied for ${documentId}`);
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (docError) {
      console.error(`[${requestId}] Document fetch error:`, docError);
      throw docError;
    }

    console.log(`[${requestId}] Processing document ${documentId} for org ${profile.org_id}`);

    // Update status to processing
    await supabaseClient
      .from("archived_documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    // Extract text (simplified for demo - would use proper PDF parsing in production)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // In production, use proper PDF/OCR libraries
    let rawText = `Sample extracted text from ${document.file_name}`;
    
    // Enforce text length limit
    if (rawText.length > MAX_RAW_TEXT_LENGTH) {
      console.log(`[${requestId}] Truncating raw text from ${rawText.length} to ${MAX_RAW_TEXT_LENGTH}`);
      rawText = rawText.substring(0, MAX_RAW_TEXT_LENGTH);
    }
    
    // Extract decisions using AI with proper prompt limiting
    const truncatedTextForAI = rawText.substring(0, 50000); // Limit input to AI
    const decisionsPrompt = `You are a governance parser. Input: ${truncatedTextForAI}. Output JSON array of decisions found. For each decision include: decision_text, decision_date (if found), motion_text (if found), proposer (if found), outcome (passed/rejected/unknown), confidence (0-1). If no decisions found return empty array. Maximum ${MAX_DECISIONS_COUNT} decisions.`;
    
    const decisionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a governance document analyzer. Return valid JSON only. Limit responses to essential data." },
          { role: "user", content: decisionsPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000, // Limit response size
      }),
    });

    let validatedDecisions: z.infer<typeof decisionsArraySchema> = [];
    
    if (decisionsResponse.ok) {
      const decisionsData = await decisionsResponse.json();
      const content = decisionsData.choices?.[0]?.message?.content;
      
      if (content) {
        try {
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsedDecisions = JSON.parse(jsonMatch[0]);
            
            // Validate and sanitize AI response
            const validationResult = decisionsArraySchema.safeParse(parsedDecisions);
            if (validationResult.success) {
              validatedDecisions = validationResult.data;
              console.log(`[${requestId}] Extracted ${validatedDecisions.length} valid decisions`);
            } else {
              console.error(`[${requestId}] Decision validation failed:`, validationResult.error.errors);
            }
          }
        } catch (e) {
          console.error(`[${requestId}] Failed to parse decisions JSON:`, e);
        }
      }
    } else {
      console.error(`[${requestId}] AI API error: ${decisionsResponse.status}`);
    }

    // Save validated decisions only
    for (const decision of validatedDecisions) {
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
          decisions_count: validatedDecisions.length,
          processed_at: new Date().toISOString(),
          text_length: rawText.length,
        },
      })
      .eq("id", documentId);

    console.log(`[${requestId}] Document processing completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        decisionsExtracted: validatedDecisions.length,
        requestId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Error processing document:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Unable to process document. Please try again later.",
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});