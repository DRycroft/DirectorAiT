# Magic-Link / QR Action System - Design Document

## Overview

This system provides a foundation for secure, token-based actions accessible via magic links or QR codes. It enables external parties to complete specific actions without requiring full authentication or dashboard access.

## Data Flow

### 1. Invite Creation Flow

```
User initiates action → createDocumentInvite() → Generate secure token
  → Insert document_invites row → Return inviteId + URL
```

**Key Components:**
- `createDocumentInvite()` utility function
- `document_invites` table stores metadata
- Secure token generation using crypto.getRandomValues()
- URL format: `{APP_BASE_URL}/action/{token}`

### 2. Action Completion Flow

```
Recipient opens link → /action/:token route → Lookup invite by token
  → Validate status/expiry → Display action form → Submit response
  → Insert into response table → Mark invite as completed
```

**Key Components:**
- Public route `/action/:token` (no auth required)
- Status checks: pending, completed, expired, cancelled
- Response storage in `signon_responses` or `document_acknowledgements`
- Invite status update on completion

## Use Cases

### A. Board/Staff Sign-On Forms

**Purpose:** Collect detailed member information during onboarding

**Flow:**
1. Admin creates a sign-on invite for new board member
2. Invite type: `"SIGNON"`
3. Target type: `"BOARD_MEMBER"` or `"STAFF_MEMBER"`
4. Target ID: board member profile ID
5. Recipient receives email with magic link
6. Opens link → completes comprehensive form
7. Response stored in `signon_responses` with full payload
8. Admin reviews and approves in dashboard

**Fields Collected:**
- Personal details (name, contact, address)
- Professional qualifications
- Conflicts of interest
- Emergency contacts
- Compliance declarations

### B. CEO/CFO/Ops Monthly Sub-Reports

**Purpose:** Department heads submit monthly reports that feed into board packs

**Flow:**
1. System creates pack sections for upcoming board meeting
2. For each required sub-report, system creates invite
3. Invite type: `"SUBREPORT"`
4. Target type: `"PACK_SECTION"`
5. Target ID: specific pack_section.id
6. CFO/CEO receives email/SMS with magic link
7. Opens on mobile → fills concise form (KPIs, status, risks)
8. Response stored in `signon_responses` or linked to `section_documents`
9. Content flows into board pack automatically

**Integration Points:**
- Links to `pack_sections` table
- May generate or update `section_documents`
- Tracks version history
- Shows status in pack management UI

### C. Board Member "Received/Read" Acknowledgements

**Purpose:** Track which board members have received and read board packs

**Flow:**
1. Board pack finalized and ready for distribution
2. System creates invite per board member
3. Invite type: `"PACK_ACK"`
4. Target type: `"BOARD_PACK"`
5. Target ID: board pack ID
6. Board member receives notification with magic link
7. Opens link → simple "I acknowledge receipt" button
8. Insert into `document_acknowledgements`
9. Dashboard shows which members have acknowledged

**Tracking:**
- `ack_type`: "RECEIVED", "READ", "DOWNLOADED"
- `pack_id`: Links to specific board pack
- `user_id`: Board member profile
- Timestamp automatically recorded

## Schema Design

### document_invites

Central table for all magic-link actions.

**Key Fields:**
- `invite_type`: Categorizes the action ("SIGNON", "SUBREPORT", "PACK_ACK")
- `target_type`: What entity the action relates to
- `target_id`: Specific entity UUID
- `token`: Unguessable random string for URL
- `status`: Workflow state (pending → completed/expired/cancelled)
- `expires_at`: Optional expiration for time-sensitive actions

**Security:**
- RLS policies restrict viewing to org members
- Token lookup is public (required for magic-link access)
- Creation requires authentication

### signon_responses

Stores form responses from sign-on and sub-report submissions.

**Key Fields:**
- `invite_id`: Links back to the originating invite
- `payload`: JSONB for flexible form data
- `respondent_name/email`: Captures submitter identity

**Flexibility:**
- Schema-less payload accommodates different form types
- Can store structured data for processing
- Supports complex validation rules in application layer

### document_acknowledgements

Records simple acknowledgement actions.

**Key Fields:**
- `ack_type`: Type of acknowledgement
- `pack_id`: Optional link to board pack
- `document_id`: Optional link to specific document

**Use Cases:**
- "I received this pack"
- "I have read this document"
- "I downloaded the materials"

## Security Considerations

### Token Security
- Tokens are 64-character hex strings (256-bit entropy)
- Single-use recommended (status = completed prevents reuse)
- Optional expiration dates for time-sensitive actions
- No guessable patterns (crypto.getRandomValues())

### Access Control
- Magic-link pages are public by design
- RLS prevents viewing invite metadata without org membership
- Response submission validates invite status before accepting
- Completed invites cannot be resubmitted

### Data Protection
- Recipient email/name stored in invite (not exposed in URL)
- Response data isolated by org_id
- Acknowledgements link to authenticated user profiles
- Audit trail: created_by, created_at, completed_at

## Future Enhancements

### Email/SMS Integration
- Send magic links via email (Supabase edge function + Resend/SendGrid)
- SMS delivery for mobile-first workflows (Twilio)
- Reminder emails for pending actions
- Customizable email templates per invite type

### Form Builder
- Visual form designer for sign-on templates
- Conditional logic and validation rules
- File upload support for supporting documents
- Multi-page forms with progress tracking

### Analytics & Reporting
- Completion rates by invite type
- Time-to-completion metrics
- Overdue action alerts
- Bulk invite management

### Workflow Automation
- Auto-create invites when board pack status changes
- Scheduled reminders for pending actions
- Auto-expire old invites
- Approval workflows for sensitive data

## Open Questions

1. **Email Provider:** Which service should we use for sending magic links?
   - Options: Resend, SendGrid, AWS SES
   - Preference for ease of setup and reliability

2. **Mobile Optimization:** Should forms be mobile-first by default?
   - Consider executive sub-reports often submitted on-the-go

3. **File Uploads:** Do sign-on forms need document attachments?
   - E.g., CV, certifications, proof of insurance
   - If yes, integrate with existing Supabase storage buckets

4. **Approval Workflow:** Should responses require review before incorporation?
   - Sign-on forms likely need admin review
   - Sub-reports may auto-populate section content

5. **Notification Preferences:** How should board members opt-in to ack requests?
   - Per-pack, per-meeting, or always-on?

6. **Expiration Policy:** Default expiry times per invite type?
   - Sign-on: 7 days?
   - Sub-reports: Until pack finalized?
   - Acknowledgements: Before meeting date?

7. **Multi-Language Support:** Should forms support i18n?
   - Consider international board members

8. **Rate Limiting:** Prevent abuse of public magic-link endpoints?
   - Implement CAPTCHA or rate limiting for form submission

9. **Audit Requirements:** What level of tracking is needed for compliance?
   - IP addresses, timestamps, device info?

10. **Integration with Existing Flows:** When to trigger invites automatically?
    - Pack finalization → send ack invites
    - New member added → send sign-on invite
    - Monthly schedule → send sub-report invites

## Implementation Phases

### Phase 1: Foundation (Current)
- ✅ Database schema
- ✅ Public route stub
- ✅ Invite creation utility
- ✅ Design documentation

### Phase 2: Forms & Responses
- Build form renderer for sign-on
- Implement response submission logic
- Wire up completion flow
- Basic email delivery (manual for testing)

### Phase 3: Integration
- Connect sign-on forms to board member onboarding
- Link sub-report invites to pack sections
- Implement acknowledgement tracking in pack UI
- Auto-create invites based on workflows

### Phase 4: Enhancement
- Email automation (edge functions)
- SMS delivery option
- Form builder interface
- Analytics dashboard

## Technical Notes

- **Token Generation:** Uses `crypto.getRandomValues()` for cryptographic randomness
- **URL Construction:** `window.location.origin` ensures correct base URL in all environments
- **RLS Consistency:** All tables use same org-based access patterns as existing schema
- **Triggers:** Reuses existing `update_updated_at_column()` for consistency
- **Indexes:** Optimized for common queries (token lookup, org filtering, status checks)

---

**Document Version:** 1.0  
**Created:** 2025-01-25  
**Status:** Foundation Phase Complete
