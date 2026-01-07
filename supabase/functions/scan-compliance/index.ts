import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
  sector: string;
  is_mandatory: boolean;
  reference_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestSchema = z.object({
      org_id: z.string().uuid("Invalid organization ID format")
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
    
    const { org_id } = validationResult.data;

    // Verify user belongs to the organization
    if (org_id !== profile.org_id) {
      return new Response(
        JSON.stringify({ error: "Access denied: You can only scan compliance for your own organization" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    // Process each industry sector separately for better organization
    const allRequirements: ComplianceRequirement[] = [];
    
    for (const sector of org.industry_sector) {
      const relevantCategories = org.business_category.filter((cat: string) => 
        cat.toLowerCase().includes(sector.toLowerCase().split(' ')[0]) || 
        sector.toLowerCase().includes(cat.toLowerCase().split(' ')[0])
      );

      const aiPrompt = `You are an expert compliance consultant specializing in New Zealand regulations.

SECTOR ANALYSIS: ${sector}
BUSINESS ACTIVITIES: ${relevantCategories.length > 0 ? relevantCategories.join(', ') : org.business_category.join(', ')}

Conduct a COMPREHENSIVE deep-dive analysis of ALL compliance and regulatory requirements for this specific sector in New Zealand. Consider:

MANDATORY REQUIREMENTS (Government/Legal):
1. Inland Revenue Department (IRD): GST, PAYE, provisional tax, FBT, resident withholding tax
2. Companies Office: Annual returns, director duties, shareholder registers
3. WorkSafe NZ: Health & safety plans, hazard management, accident reporting
4. Ministry of Business Innovation & Employment (MBIE): Industry-specific licenses and permits
5. Local Council: Building consents, resource consents, zoning compliance, inspections
6. Environmental Protection Authority: Waste management, emissions, environmental standards
7. Privacy Commissioner: Privacy Act compliance, data handling, breach reporting
8. Employment NZ: Employment agreements, minimum wage, holiday pay, leave entitlements
9. ACC: Levy payments, injury reporting and management
10. Industry-specific regulators (e.g., Food Safety, Building Consent Authority, etc.)

OPTIONAL/RECOMMENDED BEST PRACTICES:
- Industry certifications and quality standards
- Insurance coverage beyond minimums
- Enhanced reporting or auditing
- Voluntary environmental initiatives
- Advanced health & safety measures

For EACH requirement, provide:
- Title: Clear, specific (e.g., "GST Return Filing - Monthly")
- Description: Detailed explanation of what must be done and why
- Authority: Exact NZ government agency or body
- Frequency: MUST be ONE of: "daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "biennial", "as_required"
- Category: ONE of: "Tax & Financial", "Health & Safety", "Environmental", "Employment", "Data & Privacy", "Industry Specific", "Corporate Governance", "Insurance"
- Sector: "${sector}"
- Is_mandatory: true for legal requirements, false for recommended practices
- Reference_url: Official NZ government website link

Return ONLY valid JSON array:
[
  {
    "title": "string",
    "description": "string", 
    "authority": "string",
    "frequency": "monthly",
    "category": "Tax & Financial",
    "sector": "${sector}",
    "is_mandatory": true,
    "reference_url": "string"
  }
]

Provide 15-25 requirements for this sector. Be thorough and specific to NZ regulations.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a compliance expert. Always return valid JSON arrays with properly formatted compliance requirements.'
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          max_completion_tokens: 6000
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI API Error for ${sector}:`, aiResponse.status);
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (content) {
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          const sectorRequirements: ComplianceRequirement[] = JSON.parse(jsonStr);
          allRequirements.push(...sectorRequirements);
          console.log(`Found ${sectorRequirements.length} requirements for ${sector}`);
        } catch (parseError) {
          console.error(`Failed to parse AI response for ${sector}:`, parseError);
        }
      }
    }

    const requirements = allRequirements;

    if (requirements.length === 0) {
      console.error('No compliance requirements generated');
      return new Response(JSON.stringify({ error: 'No compliance data generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Total compliance requirements found: ${requirements.length}`);

    // Get category IDs
    const { data: categories } = await supabase
      .from('compliance_categories')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

    // Insert compliance items organized by sector
    // Mandatory items are set as active, optional items are inactive by default
    const complianceItems = requirements.map(req => ({
      org_id: org_id,
      title: req.title,
      description: req.description,
      authority: req.authority,
      frequency: req.frequency,
      category_id: categoryMap.get(req.category) || null,
      status: 'in_progress' as const,
      industry_sector: req.sector, // Store individual sector for grouping
      notes: req.is_mandatory ? 'Mandatory government requirement' : 'Optional/Recommended best practice',
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
    console.error('[INTERNAL] Error in scan-compliance function:', error);
    return new Response(JSON.stringify({ 
      error: 'Unable to scan compliance requirements. Please try again later.',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
