/** Semestre académico USPG: ciclo I (ene–jun), ciclo II (jul–dic). */
export function getSemestreActual(fecha = new Date()) {
  const anio = fecha.getFullYear()
  const ciclo = fecha.getMonth() < 6 ? 'I' : 'II'
  return { anio, ciclo, etiqueta: `${ciclo}-${anio}` }
}

export function etiquetaSemestre({ ciclo, anio }) {
  return `${ciclo}-${anio}`
}
