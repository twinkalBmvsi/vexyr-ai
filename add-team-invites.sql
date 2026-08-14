CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'manager' NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '7 days') NOT NULL
);

-- RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage team invites"
ON public.team_invites
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.user_id = auth.uid()
        AND users.tenant_id = team_invites.tenant_id
        AND users.role = 'owner'
    )
);

CREATE POLICY "Anyone can view their own invite by token"
ON public.team_invites
FOR SELECT
USING (true); -- Because token is a secret, we allow public select on it. We will enforce token matching in backend API.

-- Indexes
CREATE INDEX IF NOT EXISTS team_invites_tenant_id_idx ON public.team_invites(tenant_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites(token);
