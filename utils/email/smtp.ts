import net from 'node:net'
import tls from 'node:tls'

type EmailMessage = {
  to: string
  subject: string
  text: string
  html: string
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  startTls: boolean
  user?: string
  pass?: string
  from: string
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM

  if (!host && !from) {
    return null
  }

  if (!host || !from) {
    throw new Error('SMTP_HOST and SMTP_FROM must both be set to send SMTP email.')
  }

  const secure = process.env.SMTP_SECURE === 'true'
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587))

  if (!Number.isFinite(port)) {
    throw new Error('SMTP_PORT must be a valid number.')
  }

  return {
    host,
    port,
    secure,
    startTls: !secure && process.env.SMTP_STARTTLS !== 'false',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from,
  }
}

export function isSmtpConfigured() {
  return Boolean(getSmtpConfig())
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/)
  return (match?.[1] || value).trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function encodeBase64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function buildMessage(config: SmtpConfig, message: EmailMessage) {
  const boundary = `vexyr-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const headers = [
    `From: ${escapeHeader(config.from)}`,
    `To: ${escapeHeader(message.to)}`,
    `Subject: ${escapeHeader(message.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function createSocket(config: SmtpConfig): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    if (config.secure) {
      const socket = tls.connect({ host: config.host, port: config.port, servername: config.host })
      socket.once('secureConnect', () => resolve(socket))
      socket.once('error', reject)
      return
    }

    const socket = net.connect({ host: config.host, port: config.port })
    socket.once('connect', () => resolve(socket))
    socket.once('error', reject)
  })
}

function readResponse(socket: net.Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = ''

    const onData = (chunk: Buffer) => {
      response += chunk.toString('utf8')
      const lines = response.split(/\r?\n/).filter(Boolean)
      const lastLine = lines[lines.length - 1]

      if (lastLine && /^\d{3} /.test(lastLine)) {
        socket.off('data', onData)
        socket.off('error', onError)
        resolve(response)
      }
    }

    const onError = (error: Error) => {
      socket.off('data', onData)
      reject(error)
    }

    socket.on('data', onData)
    socket.once('error', onError)
  })
}

async function sendCommand(socket: net.Socket, command: string, expected: number[]) {
  socket.write(`${command}\r\n`)
  const response = await readResponse(socket)
  const code = Number(response.slice(0, 3))

  if (!expected.includes(code)) {
    throw new Error(`SMTP command failed (${code}): ${response.trim()}`)
  }

  return response
}

async function upgradeToTls(socket: net.Socket, config: SmtpConfig): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      host: config.host,
      servername: config.host,
    })

    secureSocket.once('secureConnect', () => resolve(secureSocket))
    secureSocket.once('error', reject)
  })
}

export async function sendSmtpEmail(message: EmailMessage) {
  const config = getSmtpConfig()

  if (!config) {
    return false
  }

  let socket = await createSocket(config)

  try {
    await readResponse(socket)
    await sendCommand(socket, 'EHLO vexyr.ai', [250])

    if (config.startTls) {
      await sendCommand(socket, 'STARTTLS', [220])
      socket = await upgradeToTls(socket, config)
      await sendCommand(socket, 'EHLO vexyr.ai', [250])
    }

    if (config.user || config.pass) {
      if (!config.user || !config.pass) {
        throw new Error('SMTP_USER and SMTP_PASS must both be set when SMTP authentication is enabled.')
      }

      await sendCommand(socket, 'AUTH LOGIN', [334])
      await sendCommand(socket, encodeBase64(config.user), [334])
      await sendCommand(socket, encodeBase64(config.pass), [235])
    }

    await sendCommand(socket, `MAIL FROM:<${extractAddress(config.from)}>`, [250])
    await sendCommand(socket, `RCPT TO:<${extractAddress(message.to)}>`, [250, 251])
    await sendCommand(socket, 'DATA', [354])

    socket.write(`${buildMessage(config, message).replace(/^\./gm, '..')}\r\n.\r\n`)
    const dataResponse = await readResponse(socket)
    const dataCode = Number(dataResponse.slice(0, 3))

    if (![250].includes(dataCode)) {
      throw new Error(`SMTP message send failed (${dataCode}): ${dataResponse.trim()}`)
    }

    await sendCommand(socket, 'QUIT', [221])
    return true
  } finally {
    socket.destroy()
  }
}

export function buildAuthEmail(options: {
  title: string
  preview: string
  actionText: string
  actionUrl: string
  fallbackText: string
}) {
  const escapedUrl = escapeHtml(options.actionUrl)

  return {
    text: `${options.preview}\n\n${options.fallbackText}\n${options.actionUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5; padding: 24px;">
        <h1 style="font-size: 24px; margin: 0 0 12px;">${escapeHtml(options.title)}</h1>
        <p style="margin: 0 0 24px;">${escapeHtml(options.preview)}</p>
        <p style="margin: 0 0 24px;">
          <a href="${escapedUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; text-decoration: none; border-radius: 6px;">
            ${escapeHtml(options.actionText)}
          </a>
        </p>
        <p style="font-size: 14px; color: #52616b; margin: 0 0 8px;">${escapeHtml(options.fallbackText)}</p>
        <p style="font-size: 14px; color: #52616b; word-break: break-all; margin: 0;">${escapedUrl}</p>
      </div>
    `,
  }
}
