import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET /api/flows?tenantId=xxx  — list all flows for a tenant
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('flows')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[flows GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ flows: data })
  } catch (err) {
    console.error('[flows GET] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/flows  — create a new flow
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { tenant_id, agent_id, name, description, trigger_keyword, nodes, is_active } = body

    if (!tenant_id || !name) {
      return NextResponse.json({ error: 'tenant_id and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('flows')
      .insert({
        tenant_id,
        agent_id: agent_id || null,
        name,
        description: description || null,
        trigger_keyword: trigger_keyword || null,
        nodes: nodes || [],
        is_active: is_active ?? false
      })
      .select('*')
      .single()

    if (error) {
      console.error('[flows POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ flow: data }, { status: 201 })
  } catch (err) {
    console.error('[flows POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/flows  — update an existing flow
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, tenant_id, name, description, trigger_keyword, nodes, is_active, agent_id } = body

    if (!id || !tenant_id) {
      return NextResponse.json({ error: 'id and tenant_id are required' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (name !== undefined) updatePayload.name = name
    if (description !== undefined) updatePayload.description = description
    if (trigger_keyword !== undefined) updatePayload.trigger_keyword = trigger_keyword
    if (nodes !== undefined) updatePayload.nodes = nodes
    if (is_active !== undefined) updatePayload.is_active = is_active
    if (agent_id !== undefined) updatePayload.agent_id = agent_id

    const { data, error } = await supabase
      .from('flows')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select('*')
      .single()

    if (error) {
      console.error('[flows PUT]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ flow: data })
  } catch (err) {
    console.error('[flows PUT] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/flows?id=xxx&tenantId=xxx  — delete a flow
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const tenantId = searchParams.get('tenantId')

    if (!id || !tenantId) {
      return NextResponse.json({ error: 'id and tenantId are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('flows')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[flows DELETE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[flows DELETE] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
