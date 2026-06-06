const SYSTEM_PROMPT = `You are the USPG English Language Lab tutor — a friendly, professional conversational partner for university engineering students in Guatemala.

Goals:
- Help students practice spoken/written English for academic and professional contexts.
- Ask follow-up questions; correct major grammar errors briefly and encourage retry.
- Keep replies concise (2-4 sentences unless the student asks for more).
- Use English primarily; you may add a short Spanish clarification only if the student is clearly stuck.

Context: The student is in a remote lab session (ING-LLM course) practicing for USPG certification.
Stay on topic: engineering projects, lab work, presentations, and professional English.`

export function getLlmConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY || ''
  const apiKey =
    process.env.LAB_LLM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    openRouterKey ||
    ''

  let baseUrl =
    process.env.LAB_LLM_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    ''

  if (!baseUrl && openRouterKey && !process.env.LAB_LLM_API_KEY && !process.env.OPENAI_API_KEY) {
    baseUrl = 'https://openrouter.ai/api/v1'
  }
  if (!baseUrl) baseUrl = 'https://api.openai.com/v1'

  baseUrl = baseUrl.replace(/\/$/, '')
  const model = process.env.LAB_LLM_MODEL || 'gpt-4o-mini'

  return { apiKey, baseUrl, model }
}

export function isLlmConfigured() {
  return Boolean(getLlmConfig().apiKey)
}

function modelUsesMaxCompletionTokens(model) {
  const id = (model.includes('/') ? model.split('/').pop() : model).toLowerCase()
  return /^gpt-5/.test(id) || /^o[0-9]/.test(id)
}

function buildChatCompletionBody(model, messages) {
  const tokenLimit = { ...(modelUsesMaxCompletionTokens(model) ? { max_completion_tokens: 500 } : { max_tokens: 500 }) }
  return {
    model,
    messages,
    temperature: 0.7,
    ...tokenLimit,
  }
}

export async function callLlmChat(history) {
  const { apiKey, baseUrl, model } = getLlmConfig()
  if (!apiKey) {
    return { ok: false, error: 'LLM no configurado. Define LAB_LLM_API_KEY en webapp/.env.local' }
  }

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history]

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(process.env.OPENROUTER_API_KEY && !process.env.LAB_LLM_API_KEY && !process.env.OPENAI_API_KEY
          ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000' }
          : {}),
      },
      body: JSON.stringify(buildChatCompletionBody(model, messages)),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${res.status}`
      return { ok: false, error: msg }
    }

    const content = data?.choices?.[0]?.message?.content?.trim()
    if (!content) return { ok: false, error: 'Respuesta vacía del modelo.' }

    return { ok: true, content }
  } catch (err) {
    console.error('callLlmChat:', err)
    return { ok: false, error: 'No se pudo contactar al servicio LLM.' }
  }
}

export const MENSAJE_INICIAL_TUTOR =
  "Hello! I'm your USPG language tutor. Tell me about your engineering project or what you'd like to practice today in English."
