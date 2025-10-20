import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceRequirement {
  title: string;
  description: string;
  authority: string;
  frequency: string;
  category: string;
  is_mandatory: boolean;
  reference_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { org_id } = await req.json();

    if (!org_id) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      console.error('Error fetching organization:', orgError);
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!org.industry_sector || !org.business_category || 
        org.industry_sector.length === 0 || org.business_category.length === 0) {
      return new Response(JSON.stringify({ error: 'Industry sectors and business categories must be set' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Scanning compliance for: ${org.industry_sector.join(', ')} - ${org.business_category.join(', ')}`);

    // Use Lovable AI to scan for compliance requirements
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiPrompt = `You are a compliance expert for New Zealand businesses. 

Analyze the compliance and regulatory requirements for a business with the following characteristics:
- Industry Sectors: ${org.industry_sector.join(', ')}
- Business Categories: ${org.business_category.join(', ')}
- Country: New Zealand

This business operates across MULTIPLE sectors. Provide compliance requirements for ALL of these sectors and categories combined.

Provide a comprehensive list of all regulatory compliance requirements this business must meet, including:
1. Tax obligations (IRD requirements: GST, PAYE, Provisional Tax, etc.)
2. Industry-specific regulations and licensing
3. Health & Safety requirements (WorkSafe NZ)
4. Employment law compliance
5. Environmental regulations
6. Data privacy requirements (Privacy Act)
7. Local council requirements (building consents, permits, inspections)
8. Insurance requirements
9. Food safety (if applicable)
10. Any other relevant compliance requirements

For EACH requirement, provide:
- Title (concise)
- Description (detailed explanation)
- Authority (which government agency/body)
- Frequency: MUST be exactly one of these values: "daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "biennial", or "as_required"
- Category (one of: Tax & Financial, Health & Safety, Environmental, Employment, Data & Privacy, Industry Specific, Corporate Governance, Insurance)
- Is it mandatory? (true/false)
- Reference URL (if available, prefer official NZ government sites)

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "title": "string",
    "description": "string",
    "authority": "string",
    "frequency": "quarterly",
    "category": "string",
    "is_mandatory": true,
    "reference_url": "string"
  }
]

CRITICAL: The "frequency" field must be EXACTLY one of these strings: "daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "biennial", or "as_required". Do NOT use any other values or combine multiple values.

Be thorough and specific to New Zealand regulations. Include at least 10-15 relevant requirements.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to scan compliance requirements' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(JSON.stringify({ error: 'No compliance data generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JSON from the response (handle markdown code blocks)
    let requirements: ComplianceRequirement[];
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      requirements = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('AI Response content:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse compliance data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${requirements.length} compliance requirements`);

    // Get category IDs
    const { data: categories } = await supabase
      .from('compliance_categories')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

    // Insert compliance items
    // Mandatory items are set as active, optional items are inactive by default
    const complianceItems = requirements.map(req => ({
      org_id: org_id,
      title: req.title,
      description: req.description,
      authority: req.authority,
      frequency: req.frequency,
      category_id: categoryMap.get(req.category) || null,
      status: 'in_progress' as const,
      industry_sector: org.industry_sector.join(', '), // Store all sectors
      notes: req.is_mandatory ? 'Mandatory government requirement' : 'Optional/Recommended - Nice to have',
      reference_url: req.reference_url || null,
      is_active: req.is_mandatory // Mandatory items active by default, optional items inactive
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from('compliance_items')
      .insert(complianceItems)
      .select();

    if (insertError) {
      console.error('Error inserting compliance items:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save compliance requirements' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update organization scan status
    await supabase
      .from('organizations')
      .update({
        compliance_scan_completed: true,
        compliance_scan_date: new Date().toISOString()
      })
      .eq('id', org_id);

    const mandatoryCount = insertedItems?.filter(item => item.notes?.includes('Mandatory')) || [];
    const optionalCount = (insertedItems?.length || 0) - mandatoryCount.length;
    
    console.log(`Successfully created ${insertedItems?.length} compliance items (${mandatoryCount.length} mandatory, ${optionalCount} optional)`);

    return new Response(JSON.stringify({
      success: true,
      count: insertedItems?.length || 0,
      mandatory_count: mandatoryCount.length,
      optional_count: optionalCount,
      items: insertedItems
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-compliance function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
