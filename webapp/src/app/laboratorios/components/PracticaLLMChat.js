'use client'

import { useEffect, useRef, useState } from 'react'
import { chatPracticaInglesLLM } from '../actions'

export default function PracticaLLMChat({ sesionId, llmDisponible = true }) {
  const [mensajes, setMensajes] = useState([
    {
      id: 'inicio',
      role: 'assistant',
      content:
        "Hello! I'm your USPG language tutor. Tell me about your engineering project or what you'd like to practice today in English.",
    },
  ])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const finChatRef = useRef(null)

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, enviando])

  async function handleEnviar(e) {
    e.preventDefault()
    const texto = input.trim()
    if (!texto || enviando) return

    setError('')
    setInput('')
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: texto }
    setMensajes((prev) => [...prev, userMsg])
    setEnviando(true)

    const history = [...mensajes, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    const result = await chatPracticaInglesLLM(sesionId, history)

    setEnviando(false)

    if (result.success && result.reply) {
      setMensajes((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: result.reply },
      ])
    } else {
      setError(result.error || 'No se pudo obtener respuesta.')
    }
  }

  return (
    <div className="lab-remote-llm lab-remote-llm--live">
      <div className="lab-remote-llm-header">
        <h3>Práctica de inglés con LLM</h3>
        <span className={`lab-remote-llm-status ${llmDisponible ? 'lab-remote-llm-status--on' : ''}`}>
          <i className="fa fa-circle" aria-hidden="true" />
          {llmDisponible ? 'Tutor en línea' : 'Sin API key'}
        </span>
      </div>

      {!llmDisponible && (
        <div className="lab-remote-llm-alert">
          Configura <code>LAB_LLM_API_KEY</code> en <code>webapp/.env.local</code> y reinicia{' '}
          <code>npm run dev</code>.
        </div>
      )}

      <div className="lab-remote-chat lab-remote-chat--scroll" role="log" aria-live="polite">
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`lab-remote-chat-bubble ${
              m.role === 'user'
                ? 'lab-remote-chat-bubble--user'
                : 'lab-remote-chat-bubble--bot'
            }`}
          >
            {m.content}
          </div>
        ))}
        {enviando && (
          <div className="lab-remote-chat-bubble lab-remote-chat-bubble--bot lab-remote-chat-bubble--typing">
            <i className="fa fa-spinner fa-spin" aria-hidden="true" /> Thinking…
          </div>
        )}
        <div ref={finChatRef} />
      </div>

      {error && <p className="lab-remote-llm-error">{error}</p>}

      <form className="lab-remote-llm-form" onSubmit={handleEnviar}>
        <input
          type="text"
          className="lab-remote-llm-input"
          placeholder="Write in English…"
          value={input}
          disabled={enviando || !llmDisponible}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Mensaje para el tutor de inglés"
        />
        <button
          type="submit"
          className="lab-remote-llm-send"
          disabled={enviando || !input.trim() || !llmDisponible}
        >
          <i className="fa fa-paper-plane" aria-hidden="true" />
        </button>
      </form>

      <p className="lab-remote-hint mt-3">
        Práctica conversacional avalada por USPG · Curso ING-LLM · Respuestas generadas por IA en
        tiempo real.
      </p>
    </div>
  )
}
