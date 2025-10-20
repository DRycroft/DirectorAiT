import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const industryCategories = {
  "Food & Beverage": [
    "Restaurant", "Cafe", "Bar/Pub", "Fast Food", "Catering Service", "Food Truck",
    "Bakery", "Food Manufacturing", "Brewery/Winery", "Food Retail"
  ],
  "Retail": [
    "General Retail", "Supermarket/Grocery", "Specialty Store", "Online Retail",
    "Wholesale", "Fashion Retail", "Electronics Retail", "Furniture Retail"
  ],
  "Healthcare": [
    "Medical Practice", "Dental Practice", "Pharmacy", "Hospital/Clinic",
    "Aged Care Facility", "Medical Laboratory", "Allied Health Services", "Mental Health Services"
  ],
  "Technology": [
    "Software Development", "IT Services", "Telecommunications", "Data Services",
    "Cybersecurity", "Cloud Services", "Hardware/Electronics", "Tech Consulting"
  ],
  "Professional Services": [
    "Accounting/Bookkeeping", "Legal Services", "Consulting", "Marketing/Advertising",
    "Architecture", "Engineering", "Real Estate", "Financial Services"
  ],
  "Construction & Trades": [
    "Building Construction", "Civil Construction", "Electrical Services", "Plumbing",
    "Carpentry", "Painting", "Landscaping", "Renovation/Maintenance"
  ],
  "Manufacturing": [
    "Light Manufacturing", "Heavy Manufacturing", "Food Processing", "Textiles/Clothing",
    "Metal Fabrication", "Chemical Manufacturing", "Pharmaceutical Manufacturing"
  ],
  "Education & Training": [
    "Primary/Secondary School", "Tertiary Education", "Early Childhood Education",
    "Training Provider", "Private Tutoring", "Online Education"
  ],
  "Transportation & Logistics": [
    "Freight/Courier", "Passenger Transport", "Warehousing", "Logistics Services",
    "Moving Services", "Vehicle Rental"
  ],
  "Hospitality & Tourism": [
    "Hotel/Motel", "Holiday Park", "Tourist Attraction", "Travel Agency",
    "Event Management", "Tour Operator"
  ],
  "Agriculture & Primary Industries": [
    "Dairy Farming", "Sheep/Beef Farming", "Horticulture", "Viticulture",
    "Forestry", "Fishing/Aquaculture", "Agricultural Services"
  ],
  "Personal Services": [
    "Hair/Beauty Salon", "Fitness/Gym", "Spa/Wellness", "Cleaning Services",
    "Childcare", "Pet Services", "Funeral Services"
  ],
  "Creative & Media": [
    "Graphic Design", "Photography", "Video Production", "Printing",
    "Publishing", "Advertising Agency", "Arts & Entertainment"
  ],
  "Other": [
    "Charitable Organization", "Community Services", "Religious Organization",
    "Sports Club", "Other Services", "Other Manufacturing", "Other Retail"
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description || description.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Please provide a description of your business' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const industryList = Object.keys(industryCategories).join(", ");
    
    const aiPrompt = `You are a business classification expert for New Zealand businesses.

A business owner describes their business as: "${description}"

Available industry sectors: ${industryList}

Analyze this description and:
1. Identify the 3 most relevant industry sectors from the list above
2. Recommend THE BEST match as the primary industry
3. For the recommended industry, suggest the most appropriate business categories

Return ONLY valid JSON in this exact format:
{
  "recommended_industry": "exact industry name from list",
  "recommended_categories": ["category1", "category2", "category3"],
  "alternative_industries": ["industry2", "industry3"],
  "reasoning": "brief explanation of why this industry was chosen"
}

Be precise - only use industry names exactly as provided in the list.`;

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
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to analyze business description' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(JSON.stringify({ error: 'No analysis data generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('AI Response content:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse analysis data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and enrich the response with actual categories
    const recommendedIndustry = analysis.recommended_industry;
    const availableCategories = industryCategories[recommendedIndustry as keyof typeof industryCategories] || [];
    
    return new Response(JSON.stringify({
      success: true,
      recommended_industry: recommendedIndustry,
      recommended_categories: analysis.recommended_categories.filter((cat: string) => 
        availableCategories.includes(cat)
      ),
      all_categories: availableCategories,
      alternative_industries: analysis.alternative_industries || [],
      reasoning: analysis.reasoning
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-business function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
