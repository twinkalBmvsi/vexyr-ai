CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, template_type)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Tenants Policy (Users can only view/update their own tenant's templates)
CREATE POLICY "Tenant isolation" ON public.email_templates
  FOR ALL USING (tenant_id IN (SELECT public.get_auth_tenant_ids()));

-- Add an index for quick lookup by tenant
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON public.email_templates(tenant_id);
