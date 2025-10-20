import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberId } = await req.json();

    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "memberId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching member data for PDF export:", memberId);

    // Fetch member details
    const { data: member, error } = await supabase
      .from("board_members")
      .select("*")
      .eq("id", memberId)
      .single();

    if (error) {
      console.error("Error fetching member:", error);
      throw error;
    }

    const publishPrefs = member.publish_preferences || {};

    // Generate HTML for PDF (simplified version)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
            }
            .header .title {
              color: #666;
              font-size: 18px;
              margin-top: 10px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h2 {
              font-size: 20px;
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .section p {
              margin: 5px 0;
            }
            .label {
              font-weight: bold;
              display: inline-block;
              min-width: 150px;
            }
            footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${publishPrefs.full_name && member.full_name ? member.full_name : "[Name]"}</h1>
            ${publishPrefs.public_job_title && member.public_job_title ? 
              `<div class="title">${member.public_job_title}</div>` : ""}
          </div>

          ${publishPrefs.short_bio && member.short_bio ? `
            <div class="section">
              <h2>Biography</h2>
              <p>${member.short_bio}</p>
            </div>
          ` : ""}

          ${publishPrefs.professional_qualifications && member.professional_qualifications ? `
            <div class="section">
              <h2>Qualifications</h2>
              <p>${member.professional_qualifications}</p>
            </div>
          ` : ""}

          ${publishPrefs.public_company_affiliations && member.public_company_affiliations ? `
            <div class="section">
              <h2>Company Affiliations</h2>
              <p>${member.public_company_affiliations}</p>
            </div>
          ` : ""}

          ${publishPrefs.public_contact_email && member.personal_email ? `
            <div class="section">
              <h2>Contact</h2>
              <p><span class="label">Email:</span> ${member.personal_email}</p>
            </div>
          ` : ""}

          ${member.appointment_date ? `
            <div class="section">
              <h2>Board Service</h2>
              <p><span class="label">Appointed:</span> ${new Date(member.appointment_date).toLocaleDateString()}</p>
              ${member.term_expiry ? 
                `<p><span class="label">Term Expires:</span> ${new Date(member.term_expiry).toLocaleDateString()}</p>` 
                : ""}
            </div>
          ` : ""}

          <footer>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>This profile contains only information approved for public viewing</p>
          </footer>
        </body>
      </html>
    `;

    // Return HTML (in production, you'd convert this to PDF using a service like Puppeteer)
    // For now, return the HTML and let client handle PDF generation or use print-to-PDF
    return new Response(
      JSON.stringify({
        success: true,
        html: html,
        member: {
          id: member.id,
          name: member.full_name,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in export-member-pdf:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
