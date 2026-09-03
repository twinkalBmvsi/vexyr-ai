import { createClient } from '@supabase/supabase-js'
import {
  executeAppointmentBooking,
  executeAppointmentReschedule,
  executeAppointmentCancel
} from '@/utils/booking'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlowNodeType = 'message' | 'options' | 'input' | 'action' | 'condition' | 'end'

export interface FlowOption {
  label: string
  value: string
  next: string
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  content?: string          // Text to send to user
  next?: string | null      // Next node ID (for message/input/action)
  options?: FlowOption[]    // For 'options' nodes
  variable?: string         // For 'input' nodes — variable name to store
  validation?: 'text' | 'number' | 'date' | 'email' | 'phone' | 'any'
  action?: string           // For 'action' nodes — e.g. 'book_appointment'
  params?: Record<string, string>  // For 'action' nodes — variable interpolation
  position?: { x: number; y: number }  // For canvas view — node position
}

export interface Flow {
  id: string
  tenant_id: string
  agent_id?: string | null
  name: string
  description?: string | null
  trigger_keyword?: string | null
  nodes: FlowNode[]
  is_active: boolean
  active_channels?: string[]
  created_at: string
  updated_at: string
}

export interface FlowSession {
  id: string
  tenant_id: string
  conversation_id: string
  flow_id: string
  current_node_id: string
  collected_data: Record<string, string>
  status: 'active' | 'completed' | 'abandoned'
  created_at: string
  updated_at: string
}

export interface FlowResponse {
  handled: boolean          // true = flow handled message, skip LLM
  reply: string             // text to send back to user
  quickReplies?: string[]   // option labels for quick reply buttons
}

// ─── Supabase Admin Client ─────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ─── Variable Interpolation ────────────────────────────────────────────────────

/**
 * Replace {{variable_name}} placeholders in a template string with collected data.
 * e.g. "Hello {{customer_name}}!" → "Hello Twinkal!"
 */
export function interpolateVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateInput(value: string, validation?: string): boolean {
  if (!validation || validation === 'any' || validation === 'text') return true
  if (validation === 'number') return /^\d+(\.\d+)?$/.test(value.trim())
  if (validation === 'date') {
    // Accept DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, or natural language
    return value.trim().length >= 3
  }
  if (validation === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  if (validation === 'phone') return /^[\d\s\+\-\(\)]{7,15}$/.test(value.trim())
  return true
}

// ─── Node Execution ────────────────────────────────────────────────────────────

/**
 * Execute a single flow node given the current user input and collected data.
 * Returns the text reply, optional quick replies, and the next node ID.
 */
async function executeNode(
  node: FlowNode,
  userInput: string,
  session: FlowSession,
  tenantId: string,
  customerId: string,
  agentId?: string,
  channelId?: string
): Promise<{ reply: string; quickReplies?: string[]; nextNodeId: string | null }> {
  const data = session.collected_data

  switch (node.type) {
    case 'message': {
      const reply = interpolateVariables(node.content || '', data)
      return { reply, nextNodeId: node.next ?? null }
    }

    case 'options': {
      const prompt = interpolateVariables(node.content || 'Please choose an option:', data)
      const quickReplies = (node.options || []).map(o => o.label)
      return { reply: prompt, quickReplies, nextNodeId: '__waiting_options__' }
    }

    case 'input': {
      // If we're arriving here for the first time (userInput is blank), prompt
      // If userInput has content, save it and move to next node
      if (userInput.trim()) {
        const isValid = validateInput(userInput, node.validation)
        if (!isValid) {
          return {
            reply: `That doesn't look right. ${node.content || 'Please try again:'}`,
            nextNodeId: node.id  // Stay on same node
          }
        }
        // Valid — store and advance
        return {
          reply: '__collected__',  // Sentinel: no reply, proceed to next node immediately
          nextNodeId: node.next ?? null
        }
      }
      // No input yet — prompt the user
      const prompt = interpolateVariables(node.content || 'Please provide your answer:', data)
      return { reply: prompt, nextNodeId: '__waiting_input__' }
    }

    case 'action': {
      const interpolatedParams: Record<string, string> = {}
      if (node.params) {
        for (const [key, val] of Object.entries(node.params)) {
          interpolatedParams[key] = interpolateVariables(val, data)
        }
      }

      let actionResult: any = {}

      if (node.action === 'book_appointment') {
        actionResult = await executeAppointmentBooking({
          tenantId,
          agentId: agentId || '',
          customerId,
          channelId,
          params: {
            customer_name: interpolatedParams.name || data.customer_name || '',
            preferred_datetime: interpolatedParams.date || data.preferred_date || '',
            appointment_title: interpolatedParams.service || data.service || 'Appointment',
            customer_phone: data.customer_phone || '',
            customer_email: data.customer_email || '',
            notes: data.notes || ''
          }
        })
        if (actionResult.appointment_id) {
          data.appointment_id = actionResult.appointment_id
        }
      } else if (node.action === 'cancel_appointment') {
        actionResult = await executeAppointmentCancel({
          tenantId,
          customerId,
          reason: interpolatedParams.reason || data.cancel_reason || '',
          customerName: data.customer_name || '',
          customerEmail: data.customer_email || ''
        })
      } else if (node.action === 'reschedule_appointment') {
        actionResult = await executeAppointmentReschedule({
          tenantId,
          customerId,
          newDateTime: interpolatedParams.new_datetime || data.preferred_date || '',
          customerName: data.customer_name || '',
          customerEmail: data.customer_email || ''
        })
        if (actionResult.appointment_id) {
          data.appointment_id = actionResult.appointment_id
        }
      }

      // Store any returned data into session
      if (actionResult) {
        Object.assign(data, actionResult)
      }

      return { reply: '__action_done__', nextNodeId: node.next ?? null }
    }

    case 'end': {
      const reply = interpolateVariables(node.content || 'Thank you! Have a great day.', data)
      return { reply, nextNodeId: null }
    }

    default:
      return { reply: 'Flow step error.', nextNodeId: null }
  }
}

// ─── Main Flow Processor ────────────────────────────────────────────────────────

/**
 * Main entry point: checks for active flow session or trigger keyword,
 * executes the appropriate flow node, and returns a FlowResponse.
 *
 * Returns `handled: false` if no flow is active and no trigger matched,
 * meaning the caller should fall through to LLM processing.
 */
export async function processFlowMessage(params: {
  tenantId: string
  conversationId: string
  agentId: string
  customerId: string
  channelId?: string
  sourcePlatform?: 'whatsapp' | 'telegram' | string
  userMessage: string
}): Promise<FlowResponse> {
  const { tenantId, conversationId, agentId, customerId, channelId, sourcePlatform, userMessage } = params

  // 1. Check for active flow session on this conversation
  const { data: existingSession } = await supabase
    .from('flow_sessions')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('status', 'active')
    .maybeSingle()

  let session: FlowSession | null = existingSession

  // 2. If no active session, check trigger keywords
  if (!session) {
    const { data: flows } = await supabase
      .from('flows')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (!flows || flows.length === 0) {
      return { handled: false, reply: '' }
    }

    const normalizedInput = userMessage.trim().toUpperCase()
    let matchedFlow: Flow | null = null

    for (const flow of flows as Flow[]) {
      // Check channel active status
      if (sourcePlatform) {
        const activeChannels = flow.active_channels || ['whatsapp', 'telegram']
        if (!activeChannels.includes(sourcePlatform)) continue
      }
      
      if (forceAnyMatch) {
        matchedFlow = flow
        break
      }

      if (!flow.trigger_keyword) continue
      const keyword = flow.trigger_keyword.trim().toUpperCase()
      if (normalizedInput === keyword || normalizedInput.includes(keyword)) {
        matchedFlow = flow
        break
      }
    }

    if (!matchedFlow) {
      return { handled: false, reply: '' }
    }

    // Found a matching flow — find the first node
    const firstNode = matchedFlow.nodes[0]
    if (!firstNode) {
      return { handled: false, reply: '' }
    }

    // Create a new flow session
    const { data: newSession, error: sessionErr } = await supabase
      .from('flow_sessions')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        flow_id: matchedFlow.id,
        current_node_id: firstNode.id,
        collected_data: {},
        status: 'active'
      })
      .select('*')
      .single()

    if (sessionErr || !newSession) {
      console.error('[FlowEngine] Failed to create session:', sessionErr)
      return { handled: false, reply: '' }
    }

    session = newSession

    // Execute the first node (no user input for trigger node)
    return await executeSessionNode(session, matchedFlow as Flow, '', tenantId, customerId, agentId, channelId)
  }

  // 3. We have an active session — load the flow
  const { data: flow } = await supabase
    .from('flows')
    .select('*')
    .eq('id', session.flow_id)
    .maybeSingle()

  if (!flow) {
    // Flow was deleted — abandon session
    await supabase.from('flow_sessions').update({ status: 'abandoned' }).eq('id', session.id)
    return { handled: false, reply: '' }
  }

  return await executeSessionNode(session, flow as Flow, userMessage, tenantId, customerId, agentId, channelId)
}

// ─── Session Node Executor ─────────────────────────────────────────────────────

async function executeSessionNode(
  session: FlowSession,
  flow: Flow,
  userInput: string,
  tenantId: string,
  customerId: string,
  agentId: string,
  channelId?: string
): Promise<FlowResponse> {
  const nodeMap = new Map<string, FlowNode>(flow.nodes.map(n => [n.id, n]))
  let currentNodeId = session.current_node_id
  const collectedData = { ...session.collected_data }

  // Special sentinel nodes — we're waiting for user response
  if (currentNodeId === '__waiting_input__' || currentNodeId === '__waiting_options__') {
    // Find the real node (stored in metadata or re-derive from flow)
    // We store the actual node id before transition, so we need to look at last node
    // Actually, the sentinel means: "we asked a question, now handle the answer"
    // We need to find the node that was waiting for input
    const { data: sessionMeta } = await supabase
      .from('flow_sessions')
      .select('collected_data')
      .eq('id', session.id)
      .single()

    const meta = sessionMeta?.collected_data as any
    const waitingNodeId = meta?.__waiting_node_id
    if (!waitingNodeId) {
      await supabase.from('flow_sessions').update({ status: 'abandoned' }).eq('id', session.id)
      return { handled: true, reply: 'Something went wrong with the flow. Please try again.' }
    }
    currentNodeId = waitingNodeId
  }

  let replyParts: string[] = []
  let finalQuickReplies: string[] | undefined
  let continueLoop = true
  let loopCount = 0

  while (continueLoop && loopCount < 20) {
    loopCount++
    const node = nodeMap.get(currentNodeId)

    if (!node) {
      // Node not found — end the flow
      await supabase.from('flow_sessions').update({ status: 'completed', collected_data: collectedData }).eq('id', session.id)
      break
    }

    const result = await executeNode(node, userInput, session, tenantId, customerId, agentId, channelId)

    // Update userInput to blank after first use (so subsequent auto-executions don't re-use it)
    userInput = ''

    if (result.reply === '__collected__') {
      // Input was collected — save variable and advance to next node
      if (node.variable) {
        collectedData[node.variable] = session.collected_data.__last_input || (await getLastUserInput(session, collectedData))
      }
      // Save collected data
      await supabase.from('flow_sessions').update({
        collected_data: collectedData,
        current_node_id: result.nextNodeId || '__done__',
        updated_at: new Date().toISOString()
      }).eq('id', session.id)

      if (result.nextNodeId) {
        currentNodeId = result.nextNodeId
        continue
      } else {
        break
      }
    }

    if (result.reply === '__action_done__') {
      // Save updated collected data from action results
      await supabase.from('flow_sessions').update({
        collected_data: { ...collectedData },
        updated_at: new Date().toISOString()
      }).eq('id', session.id)

      if (result.nextNodeId) {
        currentNodeId = result.nextNodeId
        continue
      } else {
        break
      }
    }

    if (result.nextNodeId === '__waiting_input__' || result.nextNodeId === '__waiting_options__') {
      // Waiting for user response — save state and stop loop
      replyParts.push(result.reply)
      finalQuickReplies = result.quickReplies

      // Store the current node id in collected_data so we can restore it
      await supabase.from('flow_sessions').update({
        current_node_id: result.nextNodeId,
        collected_data: { ...collectedData, __waiting_node_id: node.id },
        updated_at: new Date().toISOString()
      }).eq('id', session.id)

      continueLoop = false
    } else if (result.nextNodeId === null) {
      // Flow is complete
      if (result.reply) replyParts.push(result.reply)

      await supabase.from('flow_sessions').update({
        status: 'completed',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', session.id)

      continueLoop = false
    } else {
      // Auto-advance: no user input needed (message/action done nodes)
      if (result.reply) replyParts.push(result.reply)
      currentNodeId = result.nextNodeId

      // Update current node in DB
      await supabase.from('flow_sessions').update({
        current_node_id: currentNodeId,
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', session.id)
    }
  }

  const combinedReply = replyParts.filter(Boolean).join('\n\n')
  return {
    handled: true,
    reply: combinedReply || "I'll help you with that.",
    quickReplies: finalQuickReplies
  }
}

// ─── Handle Options Response ───────────────────────────────────────────────────

/**
 * When a user responds to an options node, find the matching option and advance.
 * Called internally when session.current_node_id === '__waiting_options__'
 */
async function handleOptionsResponse(
  session: FlowSession,
  flow: Flow,
  userMessage: string,
  tenantId: string,
  customerId: string,
  agentId: string,
  channelId?: string
): Promise<FlowResponse> {
  const collectedData = { ...session.collected_data }
  const waitingNodeId = collectedData.__waiting_node_id
  if (!waitingNodeId) {
    return { handled: true, reply: 'Please select a valid option.' }
  }

  const nodeMap = new Map<string, FlowNode>(flow.nodes.map(n => [n.id, n]))
  const optionsNode = nodeMap.get(waitingNodeId)
  if (!optionsNode || optionsNode.type !== 'options') {
    return { handled: true, reply: 'Please select a valid option.' }
  }

  // Match by label, value, or position (1, 2, 3...)
  const normalizedInput = userMessage.trim().toLowerCase()
  let matched: FlowOption | null = null

  for (const opt of (optionsNode.options || [])) {
    if (
      normalizedInput === opt.label.toLowerCase() ||
      normalizedInput === opt.value.toLowerCase() ||
      opt.label.toLowerCase().includes(normalizedInput)
    ) {
      matched = opt
      break
    }
  }

  // Also try numeric selection
  if (!matched) {
    const num = parseInt(userMessage.trim())
    if (!isNaN(num) && num >= 1 && num <= (optionsNode.options?.length || 0)) {
      matched = optionsNode.options![num - 1]
    }
  }

  if (!matched) {
    const labels = (optionsNode.options || []).map((o, i) => `${i + 1}. ${o.label}`).join('\n')
    return {
      handled: true,
      reply: `I didn't understand that. Please select:\n${labels}`,
      quickReplies: (optionsNode.options || []).map(o => o.label)
    }
  }

  // Save selected option value to collected data
  if (optionsNode.variable) {
    collectedData[optionsNode.variable] = matched.value
  }
  delete collectedData.__waiting_node_id

  // Update session and advance to matched option's next node
  const newSession = {
    ...session,
    current_node_id: matched.next,
    collected_data: collectedData
  }

  await supabase.from('flow_sessions').update({
    current_node_id: matched.next,
    collected_data: collectedData,
    updated_at: new Date().toISOString()
  }).eq('id', session.id)

  return await executeSessionNode(newSession as FlowSession, flow, '', tenantId, customerId, agentId, channelId)
}

// ─── Handle Input Response ─────────────────────────────────────────────────────

async function handleInputResponse(
  session: FlowSession,
  flow: Flow,
  userMessage: string,
  tenantId: string,
  customerId: string,
  agentId: string,
  channelId?: string
): Promise<FlowResponse> {
  const collectedData = { ...session.collected_data }
  const waitingNodeId = collectedData.__waiting_node_id
  if (!waitingNodeId) {
    return { handled: true, reply: 'Something went wrong. Please try again.' }
  }

  const nodeMap = new Map<string, FlowNode>(flow.nodes.map(n => [n.id, n]))
  const inputNode = nodeMap.get(waitingNodeId)
  if (!inputNode || inputNode.type !== 'input') {
    return { handled: true, reply: 'Something went wrong. Please try again.' }
  }

  // Validate
  const isValid = validateInput(userMessage, inputNode.validation)
  if (!isValid) {
    return {
      handled: true,
      reply: `That doesn't seem right. ${inputNode.content || 'Please try again:'}`
    }
  }

  // Store the variable
  if (inputNode.variable) {
    collectedData[inputNode.variable] = userMessage.trim()
  }
  delete collectedData.__waiting_node_id

  const nextNodeId = inputNode.next ?? null
  if (!nextNodeId) {
    await supabase.from('flow_sessions').update({
      status: 'completed',
      collected_data: collectedData,
      updated_at: new Date().toISOString()
    }).eq('id', session.id)
    return { handled: true, reply: 'Thank you! Have a great day.' }
  }

  const newSession = {
    ...session,
    current_node_id: nextNodeId,
    collected_data: collectedData
  }

  await supabase.from('flow_sessions').update({
    current_node_id: nextNodeId,
    collected_data: collectedData,
    updated_at: new Date().toISOString()
  }).eq('id', session.id)

  return await executeSessionNode(newSession as FlowSession, flow, '', tenantId, customerId, agentId, channelId)
}

// ─── Updated Main Processor (with waiting state handling) ──────────────────────

// Override the executeSessionNode call in processFlowMessage to handle waiting states
// by re-exporting a corrected version:

export async function processFlowMessageV2({
  tenantId,
  conversationId,
  agentId,
  customerId,
  channelId,
  sourcePlatform,
  userMessage,
  forceAnyMatch = false
}: {
  tenantId: string
  conversationId: string
  agentId: string
  customerId: string
  channelId?: string
  sourcePlatform?: string
  userMessage: string
  forceAnyMatch?: boolean
}): Promise<FlowResponse> {

  // 1. Check for active flow session
  const { data: existingSession } = await supabase
    .from('flow_sessions')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('status', 'active')
    .maybeSingle()

  let session: FlowSession | null = existingSession

  if (session) {
    // Load the flow
    const { data: flow } = await supabase
      .from('flows')
      .select('*')
      .eq('id', session.flow_id)
      .maybeSingle()

    if (!flow) {
      await supabase.from('flow_sessions').update({ status: 'abandoned' }).eq('id', session.id)
      return { handled: false, reply: '' }
    }

    const currentNodeId = session.current_node_id

    // Dispatch based on waiting state
    if (currentNodeId === '__waiting_options__') {
      return await handleOptionsResponse(session, flow as Flow, userMessage, tenantId, customerId, agentId, channelId)
    }

    if (currentNodeId === '__waiting_input__') {
      return await handleInputResponse(session, flow as Flow, userMessage, tenantId, customerId, agentId, channelId)
    }

    // Normal node execution
    return await executeSessionNode(session, flow as Flow, userMessage, tenantId, customerId, agentId, channelId)
  }

  // 2. No active session — check trigger keywords
  const { data: flows } = await supabase
    .from('flows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!flows || flows.length === 0) {
    return { handled: false, reply: '' }
  }

  const normalizedInput = userMessage.trim().toUpperCase()
  let matchedFlow: Flow | null = null

  for (const flow of flows as Flow[]) {
    if (sourcePlatform) {
      const activeChannels = flow.active_channels || ['whatsapp', 'telegram']
      if (!activeChannels.includes(sourcePlatform)) continue
    }
    
    if (!flow.trigger_keyword) continue
    const keyword = flow.trigger_keyword.trim().toUpperCase()
    if (normalizedInput === keyword || normalizedInput.startsWith(keyword)) {
      matchedFlow = flow
      break
    }
  }

  if (!matchedFlow) {
    return { handled: false, reply: '' }
  }

  const firstNode = matchedFlow.nodes[0]
  if (!firstNode) {
    return { handled: false, reply: '' }
  }

  // Create flow session
  const { data: newSession, error: sessionErr } = await supabase
    .from('flow_sessions')
    .insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      flow_id: matchedFlow.id,
      current_node_id: firstNode.id,
      collected_data: {},
      status: 'active'
    })
    .select('*')
    .single()

  if (sessionErr || !newSession) {
    console.error('[FlowEngine] Failed to create session:', sessionErr)
    return { handled: false, reply: '' }
  }

  return await executeSessionNode(newSession as FlowSession, matchedFlow, '', tenantId, customerId, agentId, channelId)
}

// Helper: get last user input from DB
async function getLastUserInput(session: FlowSession, collectedData: Record<string, string>): Promise<string> {
  const { data } = await supabase
    .from('messages')
    .select('content')
    .eq('conversation_id', session.conversation_id)
    .eq('sender_type', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.content || ''
}
