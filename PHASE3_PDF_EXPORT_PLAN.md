# Phase 3: PDF Export Implementation Plan

## Overview
This document outlines the proposed approach for implementing PDF export functionality for board packs, including design considerations, technical architecture, and implementation strategy.

---

## 1. PDF Assembly Architecture

### Recommended Approach: HTML → PDF
**Rationale:**
- Leverages existing React components and styling
- Easier to maintain consistency between preview and export
- Better handling of dynamic content and complex layouts
- Rich ecosystem of libraries (react-pdf, jsPDF, html2pdf)

### Alternative: Direct Template → PDF
- Would require duplicate layout logic
- More control over PDF structure but higher maintenance cost
- Consider only if specific PDF features are required that HTML rendering can't provide

### Proposed Implementation:
```typescript
// Use react-pdf/renderer for declarative PDF generation
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// Or use html2pdf.js for HTML-to-PDF conversion
import html2pdf from 'html2pdf.js';
```

---

## 2. Code Organization

### Recommended Structure:
```
src/
├── components/
│   └── pdf/
│       ├── PDFDocument.tsx          // Main PDF wrapper component
│       ├── PDFCoverPage.tsx         // Cover page with branding
│       ├── PDFTableOfContents.tsx   // Auto-generated TOC
│       ├── PDFSection.tsx           // Individual section renderer
│       └── PDFFooter.tsx            // Page footer with branding
├── lib/
│   └── pdf/
│       ├── pdfGenerator.ts          // Core PDF generation logic
│       ├── pdfStyles.ts             // PDF-specific styles
│       └── pdfUtils.ts              // Helper functions (pagination, etc.)
└── pages/
    └── PackExport.tsx               // Export interface/preview page
```

### Key Components:

1. **PDFDocument.tsx**: Main orchestrator
   - Fetches pack data and all section documents
   - Assembles sections in correct order
   - Handles pagination and page breaks
   - Applies branding (logo, company name)

2. **pdfGenerator.ts**: Core generation service
   ```typescript
   export async function generatePackPDF(packId: string): Promise<Blob> {
     // 1. Fetch pack details
     // 2. Fetch all sections with documents
     // 3. Fetch template for branding
     // 4. Render to PDF
     // 5. Return Blob for download
   }
   ```

---

## 3. Branding Implementation

### Data Sources:
- `board_templates.company_name` - Company name for cover
- `board_templates.logo_url` - Company logo
- `board_packs.title` - Pack title
- `board_packs.meeting_date` - Meeting date

### Branding Locations:
1. **Cover Page:**
   - Logo (centered, large)
   - Company name (prominent)
   - Pack title
   - Meeting date
   - "Confidential - Board Use Only" disclaimer

2. **Headers:**
   - Small logo (top-left)
   - Company name (top-center)
   - Page numbers (top-right)

3. **Footers:**
   - Copyright notice
   - "Confidential" watermark
   - Date generated

### Example Cover Layout:
```
┌────────────────────────────────┐
│                                │
│         [COMPANY LOGO]         │
│                                │
│       COMPANY NAME LTD         │
│                                │
│      Board Meeting Pack        │
│     January 2024 Meeting       │
│                                │
│      Meeting Date: 15/01/24    │
│                                │
│   Confidential - Board Only    │
│                                │
└────────────────────────────────┘
```

---

## 4. Section Ordering Strategy

### Approach 1: Template Order (Recommended)
- Use `template_sections.order_index` as defined in template
- Ensures consistency across all packs from same template
- Respects user's intended structure

### Approach 2: Pack-Specific Order
- Allow reordering within individual packs
- More flexible but adds complexity
- Would require `pack_sections.custom_order_index` field

### Implementation:
```typescript
// Fetch sections in order
const sections = await supabase
  .from('pack_sections')
  .select(`
    *,
    document:section_documents(*)
  `)
  .eq('pack_id', packId)
  .order('order_index', { ascending: true });

// Render in order
sections.forEach((section, index) => {
  renderSection(section, index + 1);
});
```

### Mandatory Sections:
Always include in this order:
1. Cover Page
2. Table of Contents
3. Declaration/Attestation
4. [Content Sections]
5. Appendices (if any)

---

## 5. Content Handling

### Section Document Rendering:
```typescript
interface SectionContent {
  title: string;
  content: {
    text: string;
    submittedAt: string;
  };
  status: 'pending' | 'submitted';
  versionNumber: number;
}

function renderSection(section: SectionContent, sectionNumber: number) {
  if (section.status === 'pending') {
    return `${sectionNumber}. ${section.title}\n[Pending Submission]`;
  }
  
  return `
    ${sectionNumber}. ${section.title}
    ${section.content.text}
    
    (Version ${section.versionNumber}, submitted ${formatDate(section.content.submittedAt)})
  `;
}
```

### Pending Sections:
- Include placeholder text: "[Awaiting submission from {role}]"
- Mark clearly with visual indicator
- Include in TOC with "Pending" status

---

## 6. Table of Contents Generation

### Auto-Generation Strategy:
```typescript
function generateTOC(sections: PackSection[]) {
  return sections.map((section, index) => ({
    number: index + 1,
    title: section.title,
    pageNumber: calculatePageNumber(section),
    status: section.status
  }));
}
```

### TOC Format:
```
Table of Contents
─────────────────────────────────
1. Chair's Report .................... 5 ✓
2. CEO Executive Summary ............. 8 ✓
3. Financial Report ................. 12 ⏳
4. Operations Update ................ 16 ✓
```

---

## 7. Export Workflow

### User Journey:
1. Navigate to Pack Sections page
2. Click "Export to PDF" button
3. Preview generated PDF (optional)
4. Download or email PDF
5. Track export in audit log

### UI Components:
```tsx
// In PackSections.tsx
<Button onClick={handleExportPDF}>
  <Download className="mr-2" />
  Export to PDF
</Button>

// Export dialog with options
<Dialog>
  <DialogContent>
    <h2>Export Board Pack</h2>
    <Checkbox label="Include pending sections" />
    <Checkbox label="Include appendices" />
    <Button onClick={generatePDF}>Generate PDF</Button>
  </DialogContent>
</Dialog>
```

---

## 8. Technical Considerations

### Library Choice:
**Option A: @react-pdf/renderer**
- Pros: React-based, declarative, good documentation
- Cons: Learning curve, limited CSS support
- Best for: Structured, template-based documents

**Option B: html2pdf.js**
- Pros: Converts existing HTML/CSS, easier migration
- Cons: Less control, potential rendering inconsistencies
- Best for: Quick implementation, existing HTML layouts

**Recommendation:** Start with `@react-pdf/renderer` for better long-term maintainability

### Performance:
- Generate PDF client-side for small packs (<50 pages)
- Consider server-side generation (edge function) for large packs
- Implement caching for repeated exports
- Show progress indicator during generation

### Storage:
- Don't persist generated PDFs by default (generate on-demand)
- Optional: Cache in `board_pack_exports` table with TTL
- Track generation in audit log

---

## 9. Implementation Phases

### Phase 3A: Basic Export
- [ ] Set up PDF generation library
- [ ] Create basic cover page with branding
- [ ] Render sections in order with content
- [ ] Generate simple TOC
- [ ] Download functionality

### Phase 3B: Enhanced Features
- [ ] Rich formatting (tables, lists, bold/italic)
- [ ] Headers and footers on all pages
- [ ] Page numbers and section breaks
- [ ] Handle pending sections gracefully
- [ ] Preview before download

### Phase 3C: Advanced Features
- [ ] Custom styling per organization
- [ ] Email PDF directly to board members
- [ ] Password protection for PDFs
- [ ] Version watermarks
- [ ] Audit trail for exports

---

## 10. Database Changes Required

### Optional: Export Tracking
```sql
CREATE TABLE board_pack_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES board_packs(id),
  exported_by UUID REFERENCES auth.users(id),
  exported_at TIMESTAMP DEFAULT NOW(),
  file_size INTEGER,
  included_sections JSONB,
  version_snapshot JSONB
);
```

---

## 11. Questions for User

Before implementation:

1. **PDF Library Preference:**
   - Use react-pdf/renderer (more control, React-based)?
   - Use html2pdf.js (faster setup, HTML conversion)?

2. **Export Location:**
   - Direct download only?
   - Store in Supabase storage?
   - Both options?

3. **Pending Sections:**
   - Include with placeholder text?
   - Exclude entirely?
   - User choice?

4. **Styling:**
   - Match BoardPaperDocument preview exactly?
   - Custom PDF styling?
   - Organization-specific templates?

5. **Access Control:**
   - Password-protect PDFs?
   - Watermark with user details?
   - Track who downloads?

---

## Success Criteria

✓ User can export complete board pack to PDF
✓ PDF includes company branding (logo, name)
✓ Sections appear in correct order from template
✓ Submitted content renders properly
✓ Pending sections handled appropriately
✓ TOC auto-generates with page numbers
✓ Cover page includes all required information
✓ Headers/footers appear on all pages
✓ PDF downloads successfully
✓ Export is tracked in audit log

---

## Next Steps

1. Review and approve this plan
2. Complete Phase 2 testing and verification
3. Select PDF library and approach
4. Begin Phase 3A implementation
5. Test with real board pack data
6. Iterate based on user feedback
