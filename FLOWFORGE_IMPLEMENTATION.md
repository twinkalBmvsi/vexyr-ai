# 🔀 FlowForge — Visual Flow Builder
### Implementation Plan (Saved for Future Development)

> **Status:** Planned — To be implemented after core application is stable.  
> **Feature Name:** FlowForge  
> **Module Key (Stripe):** `flowForge`  
> **Planned Price:** +$35/mo

---

## What Is FlowForge?

FlowForge is a **no-code visual conversation flow builder** that lets business owners create
structured, deterministic chatbot journeys — without writing a single line of code and
without consuming LLM tokens.

Instead of relying on an AI to "guess" the right response, FlowForge lets you define
**exactly** what the bot says and when, using a drag-and-drop node canvas.

---

## Current Approach vs FlowForge

| Feature | Current Agent (LLM) | FlowForge |
|---------|-------------------|--------------|
| **Behavior** | AI decides responses | You decide every step |
| **Cost** | Per-message LLM tokens | Zero LLM cost |
| **Predictability** | Can hallucinate | 100% consistent |
| **Setup** | Write a prompt | Drag & drop nodes |
| **Use case** | Open-ended Q&A | Structured journeys |
| **Complexity** | Low setup, high variability | High setup, zero variability |

> **Both are complementary.** A single agent can use FlowForge for structured menus,
> then fall back to the LLM for open-ended questions.

---

## Core Concept: Flow Node Types

```
START → MESSAGE → OPTIONS → INPUT → ACTION → END
```

### Node Types

| Node | Description | Example |
|------|-------------|---------|
| **`message`** | Bot sends a text message | "Hello! How can I help?" |
| **`options`** | Multiple choice quick replies | "Schedule / Cancel / Reschedule" |
| **`input`** | Collect user text/number | "Enter your name:" |
| **`action`** | Perform backend operation | Book appointment, send confirmation |
| **`condition`** | Branch based on collected data | If brand == LG → show LG products |
| **`end`** | Flow completes | "Your booking is confirmed! #12345" |

---

## Flow JSON Data Structure

Flows are stored as JSONB in the `flows` table. Example:

```json
{
  "id": "flow_appointment",
  "name": "Appointment Booking Flow",
  "trigger": "HI",
  "nodes": [
    {
      "id": "n1",
      "type": "message",
      "content": "Hello! Welcome to {{businessName}} 👋",
      "next": "n2"
    },
    {
      "id": "n2",
      "type": "options",
      "content": "Choose an option:",
      "options": [
        { "label": "📅 Schedule", "value": "schedule", "next": "n3" },
        { "label": "❌ Cancel", "value": "cancel", "next": "n6" },
        { "label": "🔄 Reschedule", "value": "reschedule", "next": "n8" }
      ]
    },
    {
      "id": "n3",
      "type": "input",
      "content": "Please enter your full name:",
      "variable": "customer_name",
      "validation": "text",
      "next": "n4"
    },
    {
      "id": "n4",
      "type": "input",
      "content": "Choose your preferred date (DD/MM/YYYY):",
      "variable": "preferred_date",
      "validation": "date",
      "next": "n5"
    },
    {
      "id": "n5",
      "type": "action",
      "action": "book_appointment",
      "params": {
        "name": "{{customer_name}}",
        "date": "{{preferred_date}}"
      },
      "next": "n_end"
    },
    {
      "id": "n_end",
      "type": "message",
      "content": "✅ Your appointment is confirmed! Booking ID: {{appointment_id}}",
      "next": null
    }
  ]
}
```

---

## Real World Use Cases

### 1. Appointment Booking (Example 1)
```
HI → Hello → [Schedule / Cancel / Reschedule]
  → Schedule → Name? → Date? → Time? → CONFIRM → BookingID
  → Cancel   → BookingID? → CANCEL → Confirmed
```

### 2. Service Business — Brand Selection (Example 2)
```
HI → Hello → [Hitachi / Panasonic / LG]
  → LG → [Washing Machine / TV / AC / Fridge]
       → Washing Machine → [Motor issue / Making noise / Water issue]
              → Making noise → [At Home / On Site]
                     → At Home → Book Appointment → Appointment No.
```

### 3. Restaurant Ordering
```
HI → Menu → [Pizza / Burger / Beverages]
  → Pizza → [Size] → [Toppings] → Confirm → Order Number
```

### 4. Hotel Services
```
HI → [Check-in / Check-out / Room Service]
  → Check-in → Name → Booking ID → Room Number → Welcome!
```

---

## Database Schema (New Tables Required)

```sql
-- Flow definitions (the builder output)
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_keyword text,           -- "HI", "START", or null for always-on
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.flows
  FOR ALL USING (tenant_id IN (SELECT public.get_auth_tenant_ids()));
CREATE INDEX idx_flows_tenant ON public.flows(tenant_id);

-- Active flow sessions per user conversation
CREATE TABLE public.flow_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  current_node_id text NOT NULL,
  collected_data jsonb DEFAULT '{}'::jsonb,  -- { customer_name: "Twinkal", brand: "LG" }
  status text DEFAULT 'active',              -- active | completed | abandoned
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.flow_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.flow_sessions
  FOR ALL USING (tenant_id IN (SELECT public.get_auth_tenant_ids()));
CREATE INDEX idx_flow_sessions_conversation ON public.flow_sessions(conversation_id);
```

---

## Architecture: 3 Main Parts

### 1. 🎨 FlowForge Builder UI (Frontend)
**Path:** `app/[tenantSlug]/flows/` — New dashboard section

**Two Views:**
- **Canvas View** — Drag & drop nodes (like n8n/Typeform)
- **List View** — Linear step editor (simpler, build this first)

**Components:**
- `FlowList` — Shows all saved flows with active/inactive toggle
- `FlowEditor` — Main canvas/list editor
- `NodeConfigPanel` — Sidebar to edit selected node properties
- `FlowPreview` — Right-side live chat simulation

### 2. ⚙️ Flow Runtime Engine (Backend)
**Path:** `app/api/flows/`

**Execution Logic:**
```
Incoming message (WhatsApp/Telegram/Web)
        ↓
Check: Does conversation have an active flow_session?
   YES → executeNode(currentNode, userInput) → nextNode
   NO  → checkTriggerKeyword(userMessage, tenantFlows)
           MATCH → createFlowSession() → executeFirstNode()
           NO MATCH → fallback to LLM Agent
```

**Key Functions:**
```typescript
// Main entry: process message through active flow
processFlowMessage(conversationId: string, userMessage: string): Promise<BotResponse>

// Execute a node, return response + next node ID
executeNode(node: FlowNode, session: FlowSession, userInput: string): Promise<NodeResult>

// Handle action nodes (appointments, etc.)
executeAction(action: string, params: Record<string, string>, data: CollectedData): Promise<ActionResult>

// Interpolate variables in message templates
interpolateVariables(template: string, data: CollectedData): string
// "Hello {{customer_name}}!" → "Hello Twinkal!"
```

### 3. 🔌 Webhook Integration
- Hook into existing `/api/whatsapp/webhook` handler
- Hook into existing `/api/telegram/webhook` handler
- **Before** calling OpenAI: check if active flow session exists
- If flow handles message → skip LLM entirely (saves cost)
- Action nodes reuse existing appointment booking logic

---

## UI Wireframe: FlowForge Builder

```
┌────────────────────────────────────────────────────────────────┐
│  FlowForge                                    [+ New Flow]      │
├───────────────────────────┬────────────────────────────────────┤
│  FLOW NODES               │  LIVE CHAT PREVIEW                 │
│                           │                                    │
│  [🟢 START]              │  🤖 Hello! Welcome to ABC Clinic   │
│    ↓                      │                                    │
│  [💬 MSG] Hello...        │  🤖 Choose an option:             │
│    ↓                      │  ┌────────────┐  ┌──────────────┐ │
│  [🔘 OPTIONS]             │  │ 📅 Schedule│  │ ❌ Cancel    │ │
│    ├─ Schedule →          │  └────────────┘  └──────────────┘ │
│    │   [📝 INPUT] Name?   │                                    │
│    │   [📝 INPUT] Date?   │  > Schedule                        │
│    │   [⚡ ACTION] Book   │                                    │
│    │   [✅ END] Confirmed │  🤖 Please enter your full name:  │
│    └─ Cancel →            │                                    │
│        [📝 INPUT] BookID? │  > Twinkal Raj                    │
│        [⚡ ACTION] Cancel │                                    │
│        [✅ END] Done      │  🤖 Choose your preferred date:   │
│                           │                                    │
│  [+ Add Node]             │                                    │
└───────────────────────────┴────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1 — Foundation (DB + Basic UI)
- [x] Create `flows` and `flow_sessions` tables in Supabase
- [x] Add `FlowForge` page at `/[tenantSlug]/flows`
- [x] Basic list-view flow editor (no drag-drop yet)
- [x] Save/load flow JSON to/from database
- [x] Add "FlowForge" link in Sidebar

### Phase 2 — Runtime Engine
- [x] Flow session management API (`/api/flows/session`)
- [x] Node execution engine: `message`, `options`, `input`, `end`
- [x] Variable collection and interpolation (`{{variable_name}}`)
- [x] Integrate into WhatsApp webhook handler
- [x] Integrate into Telegram webhook handler
- [x] Fallback to LLM when no active flow

### Phase 3 — Action Nodes
- [x] `book_appointment` action node
- [x] `cancel_appointment` action node
- [x] `reschedule_appointment` action node
- [x] Appointment confirmation messages with booking ID
- [x] Send confirmation via WhatsApp/Telegram after action

### Phase 4 — Visual Canvas Builder
- [x] Integrate `reactflow` library for drag-and-drop canvas
- [x] Visual node connection arrows/edges
- [x] Node configuration side panel (click node → edit)
- [x] Live chat preview panel (real-time simulation)
- [x] Flow activation toggle per channel (WhatsApp vs Telegram)
- [x] Flow duplication / templates

### Phase 5 — Advanced Features (Future)
- [ ] `condition` nodes — branch based on collected variable values
- [ ] External API call nodes (webhook integration)
- [ ] File/image collection nodes
- [ ] Flow analytics: completion rate, drop-off per node
- [ ] A/B testing: run two flows for the same trigger, compare results
- [ ] Flow templates library (pre-built industry flows)

---

## WhatsApp/Telegram Constraints to Handle

- **WhatsApp** quick reply buttons: max **3 options** per message
  - If flow has >3 options, fall back to numbered text list (user types "1", "2", etc.)
- **Telegram** supports inline keyboards with many buttons — fewer constraints
- **Web widget** supports rich button layouts

---

## Files to Create/Modify

### New Files
- `app/[tenantSlug]/flows/page.tsx` — FlowForge list page
- `app/[tenantSlug]/flows/[flowId]/page.tsx` — Flow editor page
- `components/dashboard/FlowList.tsx` — Flow list component
- `components/dashboard/FlowEditor.tsx` — Main editor canvas
- `components/dashboard/FlowPreview.tsx` — Live preview panel
- `app/api/flows/route.ts` — CRUD for flows
- `app/api/flows/session/route.ts` — Flow session management
- `utils/flowEngine.ts` — Core node execution engine
- `app/actions/flows.ts` — Server actions for flow operations

### Modified Files
- `schema.sql` — Add `flows` and `flow_sessions` tables
- `app/api/whatsapp/webhook/route.ts` — Add flow check before LLM
- `app/api/telegram/webhook/route.ts` — Add flow check before LLM
- `components/dashboard/Sidebar.tsx` — Add FlowForge nav link
- `components/dashboard/StoreClient.tsx` — Add FlowForge module card
- `components/Pricing.tsx` — Add FlowForge to add-ons section

---

## Dependencies to Install (Phase 4)
```bash
npm install reactflow        # Visual canvas drag-drop builder
npm install @xyflow/react    # Newer name for reactflow
```

---

## Pricing Decision
- **Recommended:** +$35/mo (positions between Broadcast $25 and Unlimited Chats $30)
- **Rationale:** Replaces LLM costs for structured flows, massive value for service businesses
- **Stripe module_key:** `flowForge`

---

> 📝 **Note:** This file was created on 2026-09-02. Implementation to start after core
> application is stable and live. Review open questions below before starting Phase 1.

## Open Questions (Resolve Before Starting)

1. **Phase 1 preference:** Start with simple list editor, or go straight to visual canvas?
2. **Hybrid mode:** Should LLM fallback be automatic within the same agent, or require manual "escape" keyword?
3. **WhatsApp constraints:** Should we auto-split >3 options into numbered text lists?
4. **Module pricing:** Confirm $35/mo pricing before adding to Stripe.
