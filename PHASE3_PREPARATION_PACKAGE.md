# Phase 3 Preparation Package

**Purpose:** Validate current implementation and plan Phase 3 PDF export  
**Status:** Review and approval required before implementation  
**Date:** 2025-01-24

---

## Task A: Current Workflow Validation

### End-to-End Workflow (As Implemented)

#### Step 1: Create Template
**Location:** `/pack-management` → PackTemplateBuilder component

**Actions:**
1. User selects a board
2. Clicks "Create Template"
3. Enters template metadata:
   - Template name (required)
   - Description (optional)
   - Company name (optional)
   - Logo URL (optional)
4. Configures sections:
   - Enable/disable sections
   - Drag-and-drop to reorder
   - Cannot disable required sections (Cover, Declaration, TOC)
5. Saves template

**Expected Behavior:**
- Template saved to `board_templates`
- Section configuration saved to `template_sections` with `order_index`
- Toast notification confirms success
- Template appears in templates list

**Edge Cases:**
- ⚠️ No validation on logo URL format
- ⚠️ Can create duplicate template names
- ⚠️ No template preview before saving
- ✓ Required sections cannot be disabled or removed

**Current Limitations:**
- No bulk import of templates
- No template versioning
- No template sharing between boards
- Company name/logo stored per template (not per organization)

---

#### Step 2: Save Sections
**Location:** PackTemplateBuilder component (during Step 1)

**Actions:**
1. System automatically creates `template_sections` rows
2. Each section includes:
   - `template_id` (foreign key)
   - `title` (section name)
   - `order_index` (position in template)
   - `is_required` (boolean)
   - `is_enabled` (boolean)

**Expected Behavior:**
- Sections saved in bulk transaction
- Order preserved via `order_index`
- Required sections always enabled
- Transactional integrity maintained

**Edge Cases:**
- ✓ All sections saved or none (transaction rollback)
- ⚠️ No validation on minimum sections
- ⚠️ No duplicate title checking

**Current Limitations:**
- Cannot add custom sections (only default list)
- No rich text descriptions per section
- No section-specific permissions

---

#### Step 3: Create Pack
**Location:** `/pack-management` → "Create Pack" dialog

**Actions:**
1. User clicks "Create Pack"
2. Fills in pack details:
   - Pack title (required)
   - Meeting date (required)
   - Template selection (required)
3. Clicks "Create Pack"

**Expected Behavior:**
- Pack saved to `board_packs` with status = 'draft'
- `template_id` foreign key set
- `created_by` set to current user
- Toast notification confirms success
- Pack appears in packs list

**Edge Cases:**
- ⚠️ Can create multiple packs with same name/date
- ⚠️ No validation on meeting date (can be in past)
- ✓ Requires template selection (cannot be null)

**Current Limitations:**
- Cannot create pack without template
- No pack templates (must pick board template)
- No bulk pack creation
- Meeting date is single date (no multi-day meetings)

---

#### Step 4: Clone Pack Sections
**Location:** Automatic (triggered by Step 3)

**Actions:**
1. System fetches all enabled sections from selected template
2. For each enabled section:
   - Creates new `pack_sections` row
   - Sets `pack_id` to new pack
   - Copies `title` from template
   - Copies `order_index` from template
   - Sets `status` = 'pending'
   - Sets `document_id` = null

**Expected Behavior:**
- Sections cloned in correct order
- Only enabled template sections included
- All sections start as 'pending'
- Transactional integrity maintained

**Edge Cases:**
- ✓ If template has no enabled sections, pack created but empty
- ✓ Disabled sections excluded from pack
- ⚠️ No audit trail of which template version was used

**Current Limitations:**
- Cannot modify section list after pack creation
- Cannot add sections to existing pack
- Cannot reorder sections within pack (uses template order)
- Section customization requires template modification

---

#### Step 5: Submit Report Content
**Location:** `/report-submission/:sectionId`

**Actions:**
1. User navigates to pack sections page
2. Clicks on a section to edit
3. Enters content in textarea
4. Clicks "Submit Report"

**Expected Behavior:**
- Check for existing documents on this section
- If exists: increment version_number
- If new: set version_number = 1
- Save to `section_documents`:
  - `section_id` (foreign key to pack_sections)
  - `content` (JSON: {text, submittedAt})
  - `version_number`
  - `created_by` (current user)
- Update `pack_sections`:
  - Set `document_id` to new document
  - Set `status` = 'submitted'
  - Update `updated_at` timestamp
- Show success toast
- Navigate back to pack sections

**Edge Cases:**
- ✓ Resubmission creates new version (doesn't overwrite)
- ⚠️ No draft saving (must submit to persist)
- ⚠️ No validation on content length/format
- ⚠️ Concurrent edits not handled (last write wins)

**Current Limitations:**
- Plain text only (no rich formatting)
- No attachment support
- No inline images or tables
- No collaborative editing
- No comments or review workflow
- No automatic save

---

#### Step 6: Versioning
**Location:** Automatic (during Step 5)

**Actions:**
1. Query existing documents for section
2. Find highest version_number
3. Increment by 1
4. Save new version

**Expected Behavior:**
- Version numbers sequential (1, 2, 3...)
- Old versions preserved
- Latest version linked via `pack_sections.document_id`
- All versions queryable via `section_documents.section_id`

**Edge Cases:**
- ✓ Version 1 if no previous documents
- ⚠️ No version comparison UI
- ⚠️ No rollback to previous version
- ⚠️ No version deletion

**Current Limitations:**
- Cannot view version history in UI
- Cannot compare versions
- Cannot restore previous version
- No version labels or notes
- No version approval workflow

---

#### Step 7: Pack Preview
**Location:** `/pack/:packId/sections`

**Actions:**
1. User navigates to pack sections page
2. Views list of all sections in pack
3. Sees status badges (Pending/Submitted)
4. Sees version numbers when available
5. Sees last updated timestamps
6. Can click sections to edit

**Expected Behavior:**
- Sections displayed in `order_index` order
- Real-time updates via Supabase channels
- Status badges color-coded:
  - Pending = warning (yellow)
  - Submitted = success (green)
- Version numbers displayed as "v1", "v2", etc.
- Timestamps formatted as locale date

**Edge Cases:**
- ✓ Empty packs show "No sections" message
- ✓ Realtime updates refresh automatically
- ⚠️ No overall pack completion percentage
- ⚠️ No export/download option yet (Phase 3)

**Current Limitations:**
- Cannot view actual content from this page
- Cannot bulk update sections
- No section filtering or search
- No section completion checklist
- No reminders or notifications

---

### Known Issues Requiring Attention

**High Priority:**
1. ❗ No draft autosave in report submission
2. ❗ Logo URL not validated (could break PDF export)
3. ❗ Concurrent edits can cause data loss
4. ❗ No pack completion status tracking

**Medium Priority:**
5. ⚠️ Cannot customize sections after pack creation
6. ⚠️ No version comparison or rollback
7. ⚠️ Template changes don't affect existing packs
8. ⚠️ No audit trail of who viewed/edited what

**Low Priority:**
9. ℹ️ No rich text editing
10. ℹ️ No template sharing mechanism
11. ℹ️ No bulk operations

---

## Task B: Schema-Level Trace

### Primary Data Chain

```
┌─────────────────────┐
│   board_templates   │
│  ┌──────────────┐   │
│  │ id (PK)      │───┐
│  │ board_id     │   │
│  │ name         │   │
│  │ description  │   │
│  │ company_name │   │  Referenced by template_sections
│  │ logo_url     │   │  and board_packs
│  │ created_by   │   │
│  └──────────────┘   │
└─────────────────────┘
           │
           ├──────────────────────┐
           │                      │
           ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐
│ template_sections   │  │   board_packs       │
│  ┌──────────────┐   │  │  ┌──────────────┐   │
│  │ id (PK)      │   │  │  │ id (PK)      │───┐
│  │ template_id  │◄──┘  │  │ board_id     │   │
│  │ title        │      │  │ template_id  │◄──┘
│  │ order_index  │      │  │ meeting_date │
│  │ is_required  │      │  │ title        │
│  │ is_enabled   │      │  │ status       │
│  └──────────────┘      │  │ created_by   │
└─────────────────────┘  │  └──────────────┘
                         └─────────────────────┘
                                    │
                                    │ Clones enabled sections
                                    ▼
                         ┌─────────────────────┐
                         │   pack_sections     │
                         │  ┌──────────────┐   │
                         │  │ id (PK)      │───┐
                         │  │ pack_id      │◄──┘
                         │  │ title        │
                         │  │ order_index  │
                         │  │ status       │   References latest document
                         │  │ document_id  │───┐
                         │  └──────────────┘   │
                         └─────────────────────┘
                                    │            │
                                    │ Has many  │
                                    ▼            │
                         ┌─────────────────────┐ │
                         │ section_documents   │ │
                         │  ┌──────────────┐   │ │
                         │  │ id (PK)      │◄──┘
                         │  │ section_id   │◄────┘
                         │  │ content      │
                         │  │ version_num  │
                         │  │ created_by   │
                         │  └──────────────┘
                         └─────────────────────┘
```

### Foreign Key Relationships

#### 1. template_sections → board_templates
```sql
template_sections.template_id → board_templates.id
```
**Purpose:** Links section definitions to their parent template  
**Cascade:** If template deleted, sections should be deleted (needs verification)  
**Integrity:** ✓ Enforced at database level

---

#### 2. board_packs → board_templates
```sql
board_packs.template_id → board_templates.id (nullable)
```
**Purpose:** Records which template was used to create pack  
**Cascade:** If template deleted, pack.template_id should become null (archive)  
**Integrity:** ✓ Enforced at database level  
**Note:** Nullable allows packs without templates (future use)

---

#### 3. board_packs → boards
```sql
board_packs.board_id → boards.id
```
**Purpose:** Associates pack with a board  
**Cascade:** If board deleted, should cascade delete packs  
**Integrity:** ✓ Enforced at database level

---

#### 4. pack_sections → board_packs
```sql
pack_sections.pack_id → board_packs.id
```
**Purpose:** Links sections to their parent pack  
**Cascade:** If pack deleted, should cascade delete sections  
**Integrity:** ✓ Enforced at database level

---

#### 5. section_documents → pack_sections
```sql
section_documents.section_id → pack_sections.id
```
**Purpose:** Links document versions to a section  
**Cascade:** If section deleted, should cascade delete documents  
**Integrity:** ✓ Enforced at database level  
**Note:** One section can have many documents (versions)

---

#### 6. pack_sections → section_documents (reverse reference)
```sql
pack_sections.document_id → section_documents.id (nullable)
```
**Purpose:** Points to the "current" or "latest" document version  
**Cascade:** If document deleted, should set to null  
**Integrity:** ✓ Enforced at database level  
**Note:** Nullable when section has no submissions yet

---

### Data Integrity Verification

**✅ No Orphaned Records:**
- All `template_sections` have valid `template_id`
- All `board_packs` have valid `board_id`
- All `pack_sections` have valid `pack_id`
- All `section_documents` have valid `section_id`

**✅ No Circular Dependencies:**
- Template → Sections (one-way)
- Template → Packs (one-way)
- Pack → Sections (one-way)
- Section → Documents (one-way with back-reference)

**✅ No Missing Links:**
- Pack creation clones template sections
- Report submission creates documents and links back to sections
- Version numbering sequential and complete

**⚠️ Potential Issues:**
1. **Dangling document_id:** If a document is deleted but `pack_sections.document_id` not updated
2. **Template deletion:** No clear cascade policy defined
3. **Version gaps:** If document deleted, version numbers may skip

**Recommended Actions:**
1. Add `ON DELETE CASCADE` for template → sections
2. Add `ON DELETE SET NULL` for template → packs
3. Add `ON DELETE CASCADE` for pack → sections
4. Add `ON DELETE CASCADE` for section → documents
5. Add `ON DELETE SET NULL` for section.document_id → document

---

## Task C: Phase 3 Questions from PDF Export Plan

### All 11 Questions (Extracted from PHASE3_PDF_EXPORT_PLAN.md)

#### 🔴 Blocking Questions (Must Answer Before Implementation)

**Q1: PDF Library Preference**
- Option A: Use `@react-pdf/renderer` (more control, React-based)?
- Option B: Use `html2pdf.js` (faster setup, HTML conversion)?
- **Impact:** Determines entire code architecture
- **Recommendation:** `@react-pdf/renderer` for better maintainability

**Q2: Export Location**
- Option A: Direct download only?
- Option B: Store in Supabase storage?
- Option C: Both options?
- **Impact:** Affects storage costs, audit trail, re-download capability
- **Recommendation:** Direct download with optional storage (user choice)

**Q3: Pending Sections**
- Option A: Include with placeholder text?
- Option B: Exclude entirely?
- Option C: User choice?
- **Impact:** PDF completeness, user expectations, compliance requirements
- **Recommendation:** Include with clear "[PENDING]" placeholder

---

#### 🟡 Important Questions (Should Answer Before Implementation)

**Q4: Styling Approach**
- Option A: Match `BoardPaperDocument` preview exactly?
- Option B: Custom PDF styling?
- Option C: Organization-specific templates?
- **Impact:** Development time, consistency, customization complexity
- **Recommendation:** Match preview for consistency, add custom themes later

**Q5: Access Control**
- Option A: Password-protect PDFs?
- Option B: Watermark with user details?
- Option C: Track who downloads?
- Option D: None (public PDFs)?
- **Impact:** Security, compliance, audit trail
- **Recommendation:** Track downloads + optional watermark (Phase 3B)

**Q6: Section Content Formatting**
- Option A: Plain text only?
- Option B: Support Markdown?
- Option C: Support rich HTML?
- **Impact:** Editor complexity, PDF rendering complexity
- **Recommendation:** Start with plain text, add Markdown in Phase 3B

---

#### 🟢 Enhancement Questions (Can Defer to Phase 3B/3C)

**Q7: Table of Contents**
- Option A: Auto-generate page numbers?
- Option B: Manual page references?
- Option C: Clickable links in PDF?
- **Impact:** User experience, PDF viewer compatibility
- **Recommendation:** Auto-generate with page numbers

**Q8: Header/Footer Content**
- Option A: Logo + company name + page number?
- Option B: Custom per-organization?
- Option C: Minimal (page numbers only)?
- **Impact:** PDF professionalism, branding consistency
- **Recommendation:** Logo + company + page number + "Confidential"

**Q9: Page Orientation**
- Option A: Portrait only?
- Option B: Landscape for wide tables?
- Option C: Mixed (auto-rotate based on content)?
- **Impact:** Content readability, implementation complexity
- **Recommendation:** Portrait only for MVP

**Q10: Export Triggers**
- Option A: Manual button click only?
- Option B: Scheduled exports?
- Option C: Email on pack completion?
- **Impact:** Automation level, notification system
- **Recommendation:** Manual button for MVP, automation Phase 3C

**Q11: Version Control in PDF**
- Option A: Include version history in PDF?
- Option B: Export specific version only?
- Option C: Show "latest as of [date]" only?
- **Impact:** PDF size, audit trail completeness
- **Recommendation:** Latest version only + timestamp

---

### Decision Priority Matrix

```
┌─────────────────────────────────────────────────┐
│ MUST DECIDE NOW (Blocking)                      │
├─────────────────────────────────────────────────┤
│ Q1: PDF Library (affects all code)              │
│ Q2: Export Location (affects infrastructure)    │
│ Q3: Pending Sections (affects user flow)        │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ SHOULD DECIDE SOON (Important)                  │
├─────────────────────────────────────────────────┤
│ Q4: Styling Approach (affects development time) │
│ Q5: Access Control (affects security design)    │
│ Q6: Content Formatting (affects editor)         │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ CAN DEFER (Enhancements)                        │
├─────────────────────────────────────────────────┤
│ Q7: TOC Page Numbers (nice-to-have)             │
│ Q8: Header/Footer Design (can iterate)          │
│ Q9: Page Orientation (MVP uses portrait)        │
│ Q10: Export Triggers (manual first)             │
│ Q11: Version Control (latest only for MVP)      │
└─────────────────────────────────────────────────┘
```

---

## Task D: PDF Output Layout Wireframe

### Cover Page Layout

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║                    [COMPANY LOGO]                         ║
║                    (centered, 80px)                       ║
║                                                           ║
║                                                           ║
║              ACME CORPORATION LIMITED                     ║
║                   (36pt, bold)                            ║
║                                                           ║
║                                                           ║
║                   Board Meeting Pack                      ║
║                   (24pt, regular)                         ║
║                                                           ║
║             January 2024 Board Meeting                    ║
║                   (18pt, regular)                         ║
║                                                           ║
║                                                           ║
║    ┌───────────────────────────────────────────┐        ║
║    │  Meeting Date:    15 January 2024         │        ║
║    │  Pack Version:    v3                      │        ║
║    │  Prepared By:     Jane Smith              │        ║
║    │  Date Generated:  14 January 2024 14:30   │        ║
║    └───────────────────────────────────────────┘        ║
║                                                           ║
║                                                           ║
║                                                           ║
║           ⚠️  CONFIDENTIAL - BOARD USE ONLY ⚠️            ║
║              (14pt, red/warning color)                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

### Declaration/Attestation Page Layout

```
╔═══════════════════════════════════════════════════════════╗
║ [Logo]  ACME CORPORATION                    Page 2 of 47 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  DECLARATION                                              ║
║  ─────────────────────────────────────────────────────── ║
║                                                           ║
║  These Board Papers were prepared by Jane Smith on       ║
║  behalf of Acme Corporation Limited.                     ║
║                                                           ║
║  To the best of our knowledge, the information contained ║
║  herein is true, correct, and complete as of 14 January  ║
║  2024.                                                    ║
║                                                           ║
║  The undersigned have reviewed and approved these Board  ║
║  Papers for presentation to the Board of Directors.      ║
║                                                           ║
║                                                           ║
║  ___________________________                              ║
║  John Doe                                                 ║
║  Chief Executive Officer                                  ║
║  Date: 14 January 2024                                    ║
║                                                           ║
║                                                           ║
║  ___________________________                              ║
║  Mary Johnson                                             ║
║  Board Chair                                              ║
║  Date: 14 January 2024                                    ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║ Confidential | Generated: 14/01/2024 14:30 | Page 2      ║
╚═══════════════════════════════════════════════════════════╝
```

---

### Table of Contents Layout

```
╔═══════════════════════════════════════════════════════════╗
║ [Logo]  ACME CORPORATION                    Page 3 of 47 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  TABLE OF CONTENTS                                        ║
║  ─────────────────────────────────────────────────────── ║
║                                                           ║
║  1. Chair's Report ...................................... 5 ║
║     ✓ Submitted | v2 | Updated: 10/01/2024              ║
║                                                           ║
║  2. CEO Executive Summary ............................... 8 ║
║     ✓ Submitted | v1 | Updated: 12/01/2024              ║
║                                                           ║
║  3. CFO Financial Report ............................... 12 ║
║     ⏳ PENDING                                            ║
║                                                           ║
║  4. Operations Manager Report .......................... 16 ║
║     ✓ Submitted | v3 | Updated: 13/01/2024              ║
║                                                           ║
║  5. Health & Safety Report ............................. 22 ║
║     ✓ Submitted | v1 | Updated: 11/01/2024              ║
║                                                           ║
║  6. Compliance Report .................................. 28 ║
║     ✓ Submitted | v1 | Updated: 09/01/2024              ║
║                                                           ║
║  7. Risk Register Review ............................... 34 ║
║     ⏳ PENDING                                            ║
║                                                           ║
║  8. Board Governance Matters ........................... 38 ║
║     ✓ Submitted | v2 | Updated: 13/01/2024              ║
║                                                           ║
║  Appendices                                               ║
║  ─────────────────────────────────────────────────────── ║
║  A. Financial Statements ................................ 42 ║
║  B. Risk Matrix ......................................... 45 ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║ Confidential | Generated: 14/01/2024 14:30 | Page 3      ║
╚═══════════════════════════════════════════════════════════╝
```

---

### Section Content Layout (Submitted)

```
╔═══════════════════════════════════════════════════════════╗
║ [Logo]  ACME CORPORATION                    Page 5 of 47 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  1. CHAIR'S REPORT                                        ║
║  ═══════════════════════════════════════════════════════ ║
║                                                           ║
║  Dear Board Members,                                      ║
║                                                           ║
║  I am pleased to present the Chair's Report for the      ║
║  January 2024 Board Meeting. This quarter has seen       ║
║  significant progress across all strategic initiatives.  ║
║                                                           ║
║  Key Highlights:                                          ║
║  • Revenue exceeded targets by 12%                       ║
║  • Successfully completed merger integration             ║
║  • Appointed three new senior executives                 ║
║  • Enhanced governance framework implemented             ║
║                                                           ║
║  [... content continues ...]                             ║
║                                                           ║
║  I look forward to discussing these matters in detail    ║
║  at our upcoming meeting.                                 ║
║                                                           ║
║  Sincerely,                                               ║
║  Mary Johnson                                             ║
║  Board Chair                                              ║
║                                                           ║
║  ─────────────────────────────────────────────────────── ║
║  📋 Report Details                                        ║
║  Version: 2                                               ║
║  Submitted by: Mary Johnson                               ║
║  Submitted on: 10 January 2024 16:45                      ║
║  ─────────────────────────────────────────────────────── ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║ Confidential | Generated: 14/01/2024 14:30 | Page 5      ║
╚═══════════════════════════════════════════════════════════╝
```

---

### Section Content Layout (Pending)

```
╔═══════════════════════════════════════════════════════════╗
║ [Logo]  ACME CORPORATION                   Page 12 of 47 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  3. CFO FINANCIAL REPORT                                  ║
║  ═══════════════════════════════════════════════════════ ║
║                                                           ║
║                                                           ║
║         ┌─────────────────────────────────────┐         ║
║         │                                      │         ║
║         │    ⏳  PENDING SUBMISSION            │         ║
║         │                                      │         ║
║         │    This section is awaiting input   │         ║
║         │    from the Chief Financial Officer │         ║
║         │                                      │         ║
║         │    Expected by: 15 January 2024      │         ║
║         │                                      │         ║
║         └─────────────────────────────────────┘         ║
║                                                           ║
║                                                           ║
║  ─────────────────────────────────────────────────────── ║
║  📋 Report Details                                        ║
║  Status: Pending Submission                               ║
║  Assigned to: CFO                                         ║
║  Due date: 15 January 2024                                ║
║  ─────────────────────────────────────────────────────── ║
║                                                           ║
║                                                           ║
║                                                           ║
║                                                           ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║ Confidential | Generated: 14/01/2024 14:30 | Page 12     ║
╚═══════════════════════════════════════════════════════════╝
```

---

### Section Layout Rules

**Page Structure:**
```
┌─────────────────────────────────────┐
│ HEADER (on every page)              │
│ [Logo] Company Name    Page X of Y  │
├─────────────────────────────────────┤
│                                     │
│ CONTENT AREA                        │
│ - Margins: 1.5cm all sides          │
│ - Font: 11pt Helvetica              │
│ - Line spacing: 1.4                 │
│ - Section titles: 18pt bold         │
│ - Subsection titles: 14pt bold      │
│                                     │
├─────────────────────────────────────┤
│ FOOTER (on every page)              │
│ Confidential | Generated: Date | P# │
└─────────────────────────────────────┘
```

**Page Breaks:**
- Insert before each main section (1, 2, 3...)
- Never break within a section title
- Avoid widows/orphans (single lines at page top/bottom)
- Keep metadata block with its section

**Ordering:**
1. Cover page (no header/footer)
2. Declaration page (header/footer start)
3. Table of Contents
4. Sections in `order_index` sequence
5. Appendices (if any)

---

### Footer Layout Detail

```
┌─────────────────────────────────────────────────────────┐
│ Confidential | Generated: 14/01/2024 14:30 | Page 5/47  │
└─────────────────────────────────────────────────────────┘

Elements:
- "Confidential" (left, red text, 9pt)
- "|" (separator)
- "Generated: [timestamp]" (center, gray text, 9pt)
- "|" (separator)
- "Page X of Y" (right, black text, 9pt)
```

---

## Summary & Next Steps

### What's Ready
✅ Complete end-to-end workflow documented  
✅ Schema relationships validated  
✅ All 11 questions extracted and prioritized  
✅ PDF layout wireframes provided  
✅ Edge cases and limitations identified  

### What's Needed
❗ **Blocking Decisions Required:**
1. Choose PDF library (Q1)
2. Decide export location (Q2)
3. Define pending section handling (Q3)

❗ **Important Decisions Recommended:**
4. Confirm styling approach (Q4)
5. Decide access control level (Q5)
6. Choose content formatting (Q6)

### Risks & Mitigations

**Risk:** Logo URL validation missing  
**Mitigation:** Add URL validation before PDF export

**Risk:** Concurrent edits can cause data loss  
**Mitigation:** Add optimistic locking or last-write-wins notification

**Risk:** No autosave in editor  
**Mitigation:** Implement periodic autosave to drafts table

**Risk:** Template changes don't propagate to existing packs  
**Mitigation:** Document as expected behavior, add versioning later

---

## Approval Checklist

Before proceeding to Phase 3 implementation:

- [ ] Review workflow documentation accuracy
- [ ] Confirm schema relationships are correct
- [ ] Answer 3 blocking questions (Q1-Q3)
- [ ] Answer 3 important questions (Q4-Q6) or accept defaults
- [ ] Approve PDF layout wireframes
- [ ] Address any high-priority known issues
- [ ] Confirm no schema changes needed
- [ ] Verify test data exists for all scenarios

---

**Document Status:** Ready for Review  
**Next Action:** User approval + answers to blocking questions  
**Implementation Start:** After approval received
