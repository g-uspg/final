const MODOS_REMOTOS = ['simulacion', 'guacamole', 'url']

const DEFAULT_URL_TEMPLATE = '{base}/#/client/PC-{etiqueta}'

export function getRemotoConfig() {
  const modoRaw = (process.env.LAB_REMOTO_MODO || 'simulacion').toLowerCase().trim()
  const modo = MODOS_REMOTOS.includes(modoRaw) ? modoRaw : 'simulacion'
  const base = (process.env.LAB_GUACAMOLE_BASE || '').replace(/\/$/, '')
  const urlTemplate = process.env.LAB_GUACAMOLE_URL_TEMPLATE || DEFAULT_URL_TEMPLATE
  const nuevaPestana = process.env.LAB_REMOTO_NUEVA_PESTANA !== 'false'

  return { modo, base, urlTemplate, nuevaPestana }
}

/** Modo efectivo: guacamole solo si hay base URL configurada. */
export function resolveRemotoModoEfectivo(config = getRemotoConfig()) {
  if (config.modo === 'simulacion') return 'simulacion'
  if (!config.base) return 'simulacion'
  return 'guacamole'
}

export function buildGuacamoleConnectUrl(etiqueta, host, config = getRemotoConfig()) {
  if (!config.base || !etiqueta) return null

  return config.urlTemplate
    .replace(/\{base\}/g, config.base)
    .replace(/\{etiqueta\}/g, String(etiqueta))
    .replace(/\{host\}/g, String(host || ''))
}

export function metaRegistroRemoto({ reservaId, acceso, laboratorioNombre, config = getRemotoConfig() }) {
  const modoEfectivo = resolveRemotoModoEfectivo(config)
  const guacamoleUrl =
    modoEfectivo === 'guacamole'
      ? buildGuacamoleConnectUrl(acceso.etiqueta, acceso.host, config)
      : null

  const modo = guacamoleUrl ? 'guacamole' : 'simulacion'

  return {
    simulado: modo === 'simulacion',
    modo,
    reservaId,
    asientoEtiqueta: acceso.etiqueta,
    host: acceso.host,
    laboratorio: laboratorioNombre,
    guacamoleUrl: guacamoleUrl || undefined,
    nuevaPestana: config.nuevaPestana,
  }
}

export function esSesionGuacamole(sesion) {
  const meta = sesion?.registroActividad || {}
  return meta.modo === 'guacamole' && Boolean(meta.guacamoleUrl)
}
