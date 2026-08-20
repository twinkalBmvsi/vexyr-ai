import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import {
  executeAppointmentBooking,
  executeAppointmentReschedule,
  executeAppointmentCancel,
  getBusinessHoursAdmin,
} from "@/utils/booking";

// Initialize Supabase admin client to bypass RLS for unauthenticated webhooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Vexyr AI",
  },
});

// Tools when customer has NO active appointment → only book
const bookingOnlyTools = [
  {
    type: "function" as const,
    function: {
      name: "book_appointment",
      description:
        "Book a new appointment when customer provides name, phone, email, service, date and time.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer full name" },
          customer_phone: {
            type: "string",
            description: "Customer phone number",
          },
          customer_email: {
            type: "string",
            description: "Customer email address",
          },
          appointment_title: {
            type: "string",
            description: "Service requested (e.g. Massage Therapy, Haircut)",
          },
          preferred_datetime: {
            type: "string",
            description: 'Requested date and time (e.g. "tomorrow at 4 PM")',
          },
          notes: { type: "string", description: "Additional notes" },
        },
        required: ["customer_name", "preferred_datetime"],
      },
    },
  },
];

// Tools when customer HAS an active appointment → only manage (cancel/reschedule)
const managementOnlyTools = [
  {
    type: "function" as const,
    function: {
      name: "cancel_appointment",
      description: "Cancel the existing appointment after customer confirms.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer full name" },
          reason: {
            type: "string",
            description: "Reason for cancellation if provided",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reschedule_appointment",
      description:
        "Reschedule the existing appointment to a new date and time after customer provides the new slot.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer full name" },
          new_datetime: {
            type: "string",
            description: 'New date and time (e.g. "tomorrow at 5 PM")',
          },
        },
        required: ["new_datetime"],
      },
    },
  },
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const resolvedParams = await params;
  const { tenantSlug } = resolvedParams;

  let chatId: any = null;
  let telegramToken: string | null = null;

  try {
    const body = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { status: "ignored", reason: "No message object" },
        { status: 200 },
      );
    }

    const { message } = body;
    chatId = message.chat.id;
    const text = message.text;

    if (!text) {
      return NextResponse.json(
        { status: "ignored", reason: "No text content" },
        { status: 200 },
      );
    }

    // 1. Find tenant bypassing RLS
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json(
        { status: "ignored", reason: `Tenant '${tenantSlug}' not found` },
        { status: 200 },
      );
    }

    // Log the incoming webhook
    await supabaseAdmin.from("webhook_logs").insert({
      tenant_id: tenant.id,
      event_type: "telegram_message",
      payload: body,
      status: "received",
    });

    // 2. Find Telegram channel config
    const { data: channel } = await supabaseAdmin
      .from("channels")
      .select("id, provider_config, agent_id, is_active")
      .eq("tenant_id", tenant.id)
      .eq("provider", "telegram")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!channel || !channel.provider_config?.token) {
      return NextResponse.json(
        { status: "ignored", reason: "Telegram channel not configured" },
        { status: 200 },
      );
    }

    telegramToken = channel.provider_config.token.trim();

    if (channel.is_active === false) {
      return NextResponse.json(
        { status: "ignored", reason: "Telegram channel deactivated" },
        { status: 200 },
      );
    }

    // 3. Find Agent
    let agent: any = null;
    if (channel.agent_id) {
      const { data } = await supabaseAdmin
        .from("agents")
        .select("*")
        .eq("id", channel.agent_id)
        .maybeSingle();
      agent = data;
    }
    if (!agent) {
      const { data: agents } = await supabaseAdmin
        .from("agents")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true })
        .limit(1);
      if (agents && agents.length > 0) agent = agents[0];
    }

    if (!agent) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Sorry, this bot has no AI agent configured yet.",
        }),
      });
      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    if (agent.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules);
        if (
          Array.isArray(rules.active_channels) &&
          !rules.active_channels.includes("telegram")
        ) {
          return NextResponse.json(
            {
              status: "ignored",
              reason: "Telegram is deactivated for this agent",
            },
            { status: 200 },
          );
        }
      } catch (e) {
        /* Ignore */
      }
    }

    // 4. Find or Create Customer (matched by Telegram chat ID stored as phone)
    const telegramSender = message.from;
    const senderName =
      [telegramSender?.first_name, telegramSender?.last_name]
        .filter(Boolean)
        .join(" ") ||
      telegramSender?.username ||
      `Telegram User (${chatId})`;

    let customer: any = null;
    // Try to match by chatId stored as phone or in metadata
    const { data: matches } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("channel", "telegram")
      .or(
        `phone.eq.${chatId.toString()},metadata->>telegram_chat_id.eq.${chatId.toString()}`,
      )
      .order("created_at", { ascending: false })
      .limit(1);

    const exactMatch = matches && matches.length > 0 ? matches[0] : null;

    if (exactMatch) {
      customer = exactMatch;
    } else {
      // Create new customer record for this Telegram chat ID
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("customers")
        .insert({
          tenant_id: tenant.id,
          name: senderName,
          phone: chatId.toString(),
          channel: "telegram",
          metadata: { telegram_chat_id: chatId.toString() },
        })
        .select("*")
        .single();

      if (custErr) {
        console.error("Error creating customer:", custErr);
        // Fallback: find any existing customer for this tenant
        const { data: fallback } = await supabaseAdmin
          .from("customers")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("channel", "telegram")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        customer = fallback;
      } else {
        customer = newCustomer;
      }
    }

    // 5. Look up active appointment specifically for this customer
    let activeAppointment: any = null;
    if (customer) {
      const { data: apts } = await supabaseAdmin
        .from("appointments")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("customer_id", customer.id)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true })
        .limit(1);

      if (apts && apts.length > 0) {
        activeAppointment = apts[0];
      }
    }

    const hasActiveAppointment = !!activeAppointment;
    let formattedActiveDate = "";
    let formattedActiveTime = "";
    if (activeAppointment) {
      const start = new Date(activeAppointment.start_time);
      formattedActiveDate = start.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      formattedActiveTime = start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const isNamedCustomer =
      customer?.name &&
      !customer.name.startsWith("Telegram User") &&
      !customer.name.startsWith("WhatsApp User");
    const customerDisplayName = isNamedCustomer ? customer.name : null;

    const cleanText = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z]/g, "");
    const isGreeting = ["hello", "hi", "hey"].includes(cleanText);

    // 6. Find or Create Active Conversation
    let conversation: any = null;
    if (customer) {
      const { data: existingConvs } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("customer_id", customer.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingConvs && existingConvs.length > 0) {
        if (isGreeting) {
          // Close the existing conversation to start fresh
          await supabaseAdmin
            .from("conversations")
            .update({ status: "closed" })
            .eq("id", existingConvs[0].id);
        } else {
          conversation = existingConvs[0];
        }
      }

      if (!conversation) {
        const { data: newConv, error: convErr } = await supabaseAdmin
          .from("conversations")
          .insert({
            tenant_id: tenant.id,
            customer_id: customer.id,
            agent_id: agent.id,
            channel_id: channel?.id || null,
            status: "active",
          })
          .select("*")
          .single();

        if (convErr) {
          console.error("Error creating conversation:", convErr);
        } else {
          conversation = newConv;
        }
      }
    }

    // 7. Save incoming User message
    if (conversation) {
      await supabaseAdmin.from("messages").insert({
        tenant_id: tenant.id,
        conversation_id: conversation.id,
        sender_type: "user",
        content: text,
        metadata: {
          telegram_chat_id: chatId,
          telegram_message_id: message.message_id,
        },
      });
    }

    // 8. Load full conversation history (20 messages so booking context is never lost)
    const conversationHistory: any[] = [];
    if (conversation) {
      const { data: pastMsgs } = await supabaseAdmin
        .from("messages")
        .select("sender_type, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (pastMsgs) {
        // Reverse to get chronological order
        const reversed = [...pastMsgs].reverse();
        reversed.forEach((m: any) => {
          if (m.sender_type === "user" || m.sender_type === "assistant") {
            conversationHistory.push({
              role: m.sender_type === "user" ? "user" : "assistant",
              content: m.content,
            });
          }
        });
      }
    }

    const currentDateFormatted = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Fetch business hours using admin client (works without auth session)
    const businessHours = await getBusinessHoursAdmin(tenant.id);
    const DAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const offDayNames = businessHours.offDays.map((d: number) => DAY_NAMES[d]);
    const formatHour = (h: number) =>
      h < 12 ? `${h === 0 ? 12 : h}:00 AM` : `${h === 12 ? 12 : h - 12}:00 PM`;
    const businessHoursText =
      offDayNames.length > 0
        ? `Studio Hours: ${businessHours.startHour}:00 to ${businessHours.endHour}:00 (24h format) [${formatHour(businessHours.startHour)} – ${formatHour(businessHours.endHour)}]. Weekly off days: ${offDayNames.join(", ")}.`
        : `Studio Hours: ${businessHours.startHour}:00 to ${businessHours.endHour}:00 (24h format) [${formatHour(businessHours.startHour)} – ${formatHour(businessHours.endHour)}]. Open all days.`;

    // Build system prompt based on whether customer has active appointment
    let systemInstruction: string;
    let selectedTools: any[];

    let businessName = "Business";
    let description = "Organization";
    let services = "Services";
    if (agent?.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules);
        businessName = rules.business_name || businessName;
        description = rules.description || description;
        services = rules.services || services;
      } catch (e) {}
    }

    if (hasActiveAppointment) {
      // Customer has active appointment — only allow cancel/reschedule
      selectedTools = managementOnlyTools;
      systemInstruction = `TODAY'S DATE IS: ${currentDateFormatted} (Year ${new Date().getFullYear()}).

      You are **${agent?.name || "Agent"}**, the friendly scheduling assistant for **${businessName}**.
      Business Description: ${description}
      Services Provided: ${services}
      Answer questions politely and assist customers.

      ### STUDIO BUSINESS HOURS
      ${businessHoursText}
      IMPORTANT: When customer wants to reschedule, ALWAYS verify the requested day is NOT a weekly off day and the time is within studio hours. If they pick an off day, tell them politely and suggest another day.

      ### CUSTOMER CONTEXT
      - Customer Name: ${customerDisplayName ? `"${customerDisplayName}"` : "Customer"}
      - ACTIVE APPOINTMENT: "${activeAppointment.title}" on ${formattedActiveDate} at ${formattedActiveTime}

      ### STRICT RULES
      - You CANNOT book a new appointment. The customer already has one.
      - You can ONLY help with: cancellation or rescheduling.

      ### GREETING
      - If customer says "hello", "hi", "hey": Reply "Hi${customerDisplayName ? ` ${customerDisplayName}` : ""}! How can I help you? I can help you reschedule or cancel your existing appointment for ${activeAppointment.title} on ${formattedActiveDate} at ${formattedActiveTime}."

      ### CANCELLATION FLOW
      1. When customer asks to cancel: Reply "I can see your appointment for **${activeAppointment.title}** is scheduled on **${formattedActiveDate} at ${formattedActiveTime}**. Are you sure you want to cancel it?"
      2. When customer says "yes" / "confirm" / "cancel it": Reply "Noted. Let me cancel your appointment." and call the 'cancel_appointment' tool.
      3. After tool succeeds: Confirm "Your appointment has been successfully cancelled. You'll receive a confirmation email shortly."

      ### RESCHEDULING FLOW
      1. When customer asks to reschedule: Reply "I can see your appointment for **${activeAppointment.title}** is scheduled on **${formattedActiveDate} at ${formattedActiveTime}**. What new date and time would you prefer?"
      2. When the customer provides a new day and time, IMMEDIATELY call 'reschedule_appointment'. Do NOT validate the business hours yourself.
      3. If the tool returns an error about business hours, relay it to the user and ask for another time.
      4. After tool succeeds: Confirm the new date and time to the customer.`;
    } else {
      // Customer has NO active appointment — only allow booking
      selectedTools = bookingOnlyTools;

      systemInstruction = `TODAY'S DATE IS: ${currentDateFormatted} (Year ${new Date().getFullYear()}).

        You are **${agent?.name || "Agent"}**, the friendly scheduling assistant for **${businessName}**.
        Business Description: ${description}
        Services Provided: ${services}
        Answer questions politely and assist customers.

        ### STUDIO BUSINESS HOURS
        ${businessHoursText}
        (Do NOT validate the hours yourself. Just call the tool. The tool will return an error if the time is invalid, which you can relay to the user.)

        ### CUSTOMER CONTEXT
        - Customer Name: ${customerDisplayName ? `"${customerDisplayName}"` : "New Customer"}
        - ACTIVE APPOINTMENT: None

        ### GREETING
        - If customer says "hello", "hi", "hey": Reply "Greetings! How can I help you? I can help you book an appointment."

        ### BOOKING FLOW
        1. You need 5 details to book: Name, Phone, Email, Service, Date & Time.
        2. Read the conversation history to see what the customer has already provided. DO NOT ask for any detail the customer has already given you.
        3. If any detail is missing, politely ask for it ONE at a time.
        4. When you have all 5 details AND a valid date/time — immediately call 'book_appointment'. Do NOT ask "shall I confirm?" or "shall I go ahead?" — just call the tool.
        5. After tool succeeds: Tell the customer their appointment is confirmed with the details.`;
    }

    const aiMessages = [
      { role: "system", content: systemInstruction },
      ...conversationHistory,
    ];

    // 9. Call AI model via OpenRouter
    let replyText = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: aiMessages as any,
        tools: selectedTools,
        tool_choice: "auto",
        temperature: 0.5,
      });

      const responseMessage = completion.choices[0]?.message;

      if (
        responseMessage?.tool_calls &&
        responseMessage.tool_calls.length > 0
      ) {
        aiMessages.push(responseMessage as any);

        for (const toolCall of responseMessage.tool_calls) {
          const fnName = (toolCall as any).function?.name;
          const fnArgs = JSON.parse(
            (toolCall as any).function?.arguments || "{}",
          );
          let toolOutput: any = {};

          if (fnName === "book_appointment") {
            toolOutput = await executeAppointmentBooking({
              tenantId: tenant.id,
              agentId: agent.id,
              customerId: customer.id,
              channelId: channel?.id,
              params: fnArgs,
            });
          } else if (fnName === "reschedule_appointment") {
            toolOutput = await executeAppointmentReschedule({
              tenantId: tenant.id,
              customerId: customer.id,
              newDateTime: fnArgs.new_datetime,
              customerName: fnArgs.customer_name || customer.name,
              customerEmail: customer.email,
            });
          } else if (fnName === "cancel_appointment") {
            toolOutput = await executeAppointmentCancel({
              tenantId: tenant.id,
              customerId: customer.id,
              reason: fnArgs.reason,
              customerName: fnArgs.customer_name || customer.name,
              customerEmail: customer.email,
            });
          }

          // If the tool executed successfully (no 'error' key in output), close the conversation
          // so the next interaction starts with a clean context window.
          if (!toolOutput.error && conversation) {
            await supabaseAdmin
              .from("conversations")
              .update({ status: "closed" })
              .eq("id", conversation.id);
          }

          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolOutput),
          } as any);
        }

        const secondCompletion = await openai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: aiMessages as any,
          temperature: 0.5,
        });

        replyText =
          secondCompletion.choices[0]?.message?.content ||
          "Your request has been processed.";
      } else {
        replyText =
          responseMessage?.content || "Greetings! How can I help you?";
      }
    } catch (aiErr: any) {
      console.error("OpenRouter AI call failed:", aiErr);
      replyText = `Greetings! How can I help you today at Glamour Studio?`;
    }

    // 10. Save outgoing AI Assistant message
    if (conversation) {
      await supabaseAdmin.from("messages").insert({
        tenant_id: tenant.id,
        conversation_id: conversation.id,
        sender_type: "assistant",
        content: replyText,
        metadata: { provider: "openrouter", model: "openai/gpt-4o-mini" },
      });
    }

    // 11. Send reply back to Telegram
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: replyText }),
      },
    );

    if (!tgResponse.ok) {
      const errDetail = await tgResponse.text();
      console.error("Failed to send Telegram message:", errDetail);
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("Error handling Telegram webhook:", error);
    if (telegramToken && chatId) {
      try {
        await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "An error occurred while processing your request.",
            }),
          },
        );
      } catch (e) {
        /* Ignore */
      }
    }
    return NextResponse.json({ status: "success" }, { status: 200 });
  }
}
