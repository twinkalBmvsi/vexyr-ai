-- ==========================================
-- AI APPOINTMENT BOOKING SAAS SCHEMA
-- ==========================================

-- Enable pgvector extension for RAG / Knowledge Base
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- CLEANUP EXISTING TABLES & TYPES
-- ==========================================
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.usage_metrics CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.webhook_logs CASCADE;
DROP TABLE IF EXISTS public.workflow_runs CASCADE;
DROP TABLE IF EXISTS public.workflows CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.document_chunks CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.knowledge CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.calendars CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.features CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS conversation_status CASCADE;
DROP TYPE IF EXISTS message_sender CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS conversation_role CASCADE;

-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'receptionist', 'staff');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled');
CREATE TYPE conversation_status AS ENUM ('active', 'resolved', 'archived');
CREATE TYPE message_sender AS ENUM ('user', 'assistant', 'system');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- ==========================================
-- GLOBAL TABLES (No RLS / Read-Only for Tenants)
-- ==========================================

CREATE TABLE public.plans (
  id text PRIMARY KEY, -- e.g., 'starter', 'pro', 'enterprise'
  name text NOT NULL,
  price numeric NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.features (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- CORE TENANT & AUTH TABLES
-- ==========================================

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name text NOT NULL,
  email text,
  plan_id text REFERENCES public.plans(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'staff' NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id text REFERENCES public.plans(id) NOT NULL,
  status subscription_status NOT NULL,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- AI AGENTS & MESSAGING
-- ==========================================

CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  prompt text,
  model text DEFAULT 'gpt-4o-mini',
  temperature numeric DEFAULT 0.7,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  personality text,
  business_rules text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL, -- e.g., 'whatsapp', 'telegram', 'web'
  provider_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  channel text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  status conversation_status DEFAULT 'active' NOT NULL,
  summary text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type message_sender NOT NULL,
  content text NOT NULL,
  tokens integer DEFAULT 0,
  cost numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- SCHEDULING & CALENDARS
-- ==========================================

CREATE TABLE public.calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  provider text DEFAULT 'internal', -- 'google', 'outlook', 'internal'
  provider_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status appointment_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  provider_event_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- KNOWLEDGE BASE (RAG)
-- ==========================================

CREATE TABLE public.knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  knowledge_id uuid REFERENCES public.knowledge(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- 'pdf', 'txt', 'faq', 'website'
  storage_path text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  embedding vector(1536), -- Assuming OpenAI text-embedding-ada-002 or v3-small
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for vector similarity search
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

-- ==========================================
-- INTEGRATIONS, WORKFLOWS, & LOGS
-- ==========================================

CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  logs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  status text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- BILLING, METRICS, & SECURITY
-- ==========================================

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL, -- 'messages', 'tokens', 'appointments'
  value numeric DEFAULT 0 NOT NULL,
  recorded_at date DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  pdf_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Function to securely get the tenant_id of the authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on all tenant tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tenants Policy (Users can only view/update their own tenant)
CREATE POLICY "Tenant isolation" ON public.tenants
  FOR ALL USING (id = public.get_auth_tenant_id());

-- Generic Policy Template for all tables with `tenant_id`
-- Since all the below tables have a `tenant_id` column, the policy is uniform.
CREATE POLICY "Tenant isolation" ON public.users FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.subscriptions FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.agents FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.channels FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.customers FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.conversations FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.messages FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.calendars FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.appointments FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.calendar_events FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.knowledge FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.documents FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.document_chunks FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.integrations FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.workflows FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.workflow_runs FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.webhook_logs FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.api_keys FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.usage_metrics FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.audit_logs FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.notifications FOR ALL USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant isolation" ON public.invoices FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
-- Critical indexes to prevent N+1 and slow lookups
CREATE INDEX idx_users_tenant ON public.users(tenant_id);
CREATE INDEX idx_agents_tenant ON public.agents(tenant_id);
CREATE INDEX idx_conversations_tenant_customer ON public.conversations(tenant_id, customer_id);
CREATE INDEX idx_messages_tenant_conversation ON public.messages(tenant_id, conversation_id);
CREATE INDEX idx_appointments_tenant_calendar ON public.appointments(tenant_id, calendar_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX idx_audit_logs_tenant_entity ON public.audit_logs(tenant_id, entity_type, entity_id);
