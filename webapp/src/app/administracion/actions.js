'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// ── Helper: enriquecer registros con datos de auth.User ───────────────────────
// Recibe un array de registros y los campos que contienen IDs de usuario,
// devuelve los registros con un objeto _usuario_X añadido por cada campo.
async function enrichWithUsers(records, ...camposId) {
  if (!records.length) return records

  const ids = [...new Set(
      records.flatMap(r => camposId.map(c => r[c]).filter(Boolean))
  )]

  if (!ids.length) return records

  const usuarios = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, first_name: true, last_name: true, email: true, carnet: true, role: true },
  })

  const map = Object.fromEntries(usuarios.map(u => [u.id, u]))

  return records.map(r => {
    const extra = {}
    for (const campo of camposId) {
      if (r[campo]) extra[`_${campo}`] = map[r[campo]] ?? null
    }
    return { ...r, ...extra }
  })
}

// ══════════════════════════════════════════════════════════════════
// ESPACIOS
// ══════════════════════════════════════════════════════════════════

export async function crearEspacio(data) {
  try {
    const espacio = await prisma.espacio.create({
      data: {
        codigo:                data.codigo,
        nombre:                data.nombre,
        tipo:                  data.tipo,
        capacidad:             data.capacidad,
        ubicacion:             data.ubicacion,
        descripcion:           data.descripcion   || null,
        piso:                  data.piso           || null,
        estado:                data.estado         || 'DISPONIBLE',
        tieneProyector:        data.tieneProyector         || false,
        tieneAireAcondicionado:data.tieneAireAcondicionado || false,
        tieneInternetWifi:     data.tieneInternetWifi      || false,
        tienePizarron:         data.tienePizarron          || false,
        tienePizarronDigital:  data.tienePizarronDigital   || false,
        notasRecursos:         data.notasRecursos  || null,
        activo:                true,
      },
    })
    revalidatePath('/administracion')
    return { success: true, espacio }
  } catch (e) {
    if (e.code === 'P2002') return { success: false, error: 'Ya existe un espacio con ese código.' }
    return { success: false, error: 'No se pudo crear el espacio.' }
  }
}

export async function actualizarEstadoEspacio(id, estado) {
  try {
    await prisma.espacio.update({ where: { id }, data: { estado } })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo actualizar el estado.' }
  }
}

export async function eliminarEspacio(id) {
  try {
    await prisma.espacio.delete({ where: { id } })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo eliminar el espacio.' }
  }
}

// ══════════════════════════════════════════════════════════════════
// RESERVAS
// ══════════════════════════════════════════════════════════════════

// ── MEJORA 2: validación de solapamiento ─────────────────────────
async function verificarSolapamiento(espacioId, fechaInicio, fechaFin, excluirId = null) {
  const where = {
    espacioId,
    estado: { in: ['PENDIENTE', 'APROBADA'] },
    AND: [
      { fechaInicio: { lt: fechaFin   } },
      { fechaFin:    { gt: fechaInicio } },
    ],
  }
  if (excluirId) where.id = { not: excluirId }

  const conflictos = await prisma.reservaEspacio.findMany({
    where,
    include: { espacio: { select: { nombre: true, codigo: true } } },
    take: 3,
  })
  return conflictos
}

export async function crearReservaEspacio(data) {
  try {
    const inicio = new Date(data.fechaInicio)
    const fin    = new Date(data.fechaFin)
    const espId  = parseInt(data.espacioId)

    if (data.recurrente && data.diasRecurrencia?.length && data.fechaFinRecurrencia) {
      // ── Reserva recurrente ──────────────────────────────────────
      const diasSemana = { Lunes:1, Martes:2, 'Miércoles':3, Jueves:4, Viernes:5, Sábado:6 }
      const diasElegidos = data.diasRecurrencia.map(d => diasSemana[d]).filter(Boolean)
      const limite      = new Date(data.fechaFinRecurrencia)
      const duracionMs  = fin - inicio
      const reservas    = []
      const cursor      = new Date(inicio)
      cursor.setHours(0, 0, 0, 0)

      while (cursor <= limite && reservas.length < 500) {
        if (diasElegidos.includes(cursor.getDay())) {
          const fi = new Date(cursor)
          fi.setHours(inicio.getHours(), inicio.getMinutes(), 0, 0)
          const ff = new Date(fi.getTime() + duracionMs)
          reservas.push({
            espacioId:        espId,
            solicitanteId:    String(data.solicitanteId),
            titulo:           data.titulo,
            proposito:        data.proposito,
            fechaInicio:      fi,
            fechaFin:         ff,
            cantidadPersonas: parseInt(data.cantidadPersonas) || 1,
            estado:           'PENDIENTE',
            notas:            data.notas || null,
          })
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      // Verificar conflictos en TODAS las ocurrencias antes de insertar
      const conflictosTotal = []
      for (const r of reservas) {
        const conf = await verificarSolapamiento(espId, r.fechaInicio, r.fechaFin)
        if (conf.length) conflictosTotal.push({ fecha: r.fechaInicio, conflictos: conf })
      }

      if (conflictosTotal.length > 0) {
        const fechas = conflictosTotal
            .slice(0, 3)
            .map(c => new Date(c.fecha).toLocaleDateString('es-GT', { day:'numeric', month:'short' }))
            .join(', ')
        return {
          success: false,
          error: `${conflictosTotal.length} fecha(s) tienen conflicto de horario: ${fechas}${conflictosTotal.length > 3 ? '…' : ''}.`,
          conflictos: conflictosTotal,
        }
      }

      await prisma.reservaEspacio.createMany({ data: reservas })
      revalidatePath('/administracion')
      return { success: true, totalOcurrencias: reservas.length }
    }

    // ── Reserva simple — verificar solapamiento ─────────────────
    const conflictos = await verificarSolapamiento(espId, inicio, fin)
    if (conflictos.length > 0) {
      const c = conflictos[0]
      const hi = new Date(c.fechaInicio).toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' })
      const hf = new Date(c.fechaFin).toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' })
      return {
        success: false,
        error: `Conflicto de horario: "${c.titulo}" ya ocupa este espacio de ${hi} a ${hf}.`,
        conflictos,
      }
    }

    await prisma.reservaEspacio.create({
      data: {
        espacioId:        espId,
        solicitanteId:    String(data.solicitanteId),
        titulo:           data.titulo,
        proposito:        data.proposito,
        fechaInicio:      inicio,
        fechaFin:         fin,
        cantidadPersonas: parseInt(data.cantidadPersonas) || 1,
        estado:           'PENDIENTE',
        notas:            data.notas || null,
      },
    })
    revalidatePath('/administracion')
    return { success: true, totalOcurrencias: 1 }
  } catch {
    return { success: false, error: 'No se pudo crear la reserva.' }
  }
}

export async function resolverReservaEspacio(id, accion, motivo = '') {
  try {
    const estado = accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA'

    // Si se aprueba, verificar que no haya solapamiento con otras APROBADAS
    if (accion === 'aprobar') {
      const reserva = await prisma.reservaEspacio.findUnique({ where: { id } })
      if (reserva) {
        const conflictos = await prisma.reservaEspacio.findMany({
          where: {
            id:         { not: id },
            espacioId:  reserva.espacioId,
            estado:     'APROBADA',
            AND: [
              { fechaInicio: { lt: reserva.fechaFin   } },
              { fechaFin:    { gt: reserva.fechaInicio } },
            ],
          },
          include: { espacio: { select: { nombre: true } } },
          take: 1,
        })
        if (conflictos.length > 0) {
          const c = conflictos[0]
          const hi = new Date(c.fechaInicio).toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' })
          const hf = new Date(c.fechaFin).toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' })
          return {
            success: false,
            error: `Conflicto: "${c.titulo}" ya está aprobada para ese horario (${hi}–${hf}).`,
          }
        }
      }
    }

    await prisma.reservaEspacio.update({
      where: { id },
      data: {
        estado,
        motivoRechazo: accion === 'rechazar' ? (motivo || null) : null,
      },
    })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo resolver la reserva.' }
  }
}

export async function getReservasMes(anio, mes) {
  try {
    const inicio = new Date(anio, mes, 1)
    const fin    = new Date(anio, mes + 1, 0, 23, 59, 59)

    const reservas = await prisma.reservaEspacio.findMany({
      where: {
        fechaInicio: { gte: inicio, lte: fin },
        estado:      { in: ['APROBADA', 'PENDIENTE'] },
      },
      include: { espacio: { select: { id: true, nombre: true, codigo: true } } },
      orderBy: { fechaInicio: 'asc' },
    })

    // ── MEJORA 1: enriquecer con nombre del solicitante ──────────
    return await enrichWithUsers(reservas, 'solicitanteId')
  } catch {
    return []
  }
}

// ── MEJORA 1: reservas pendientes con nombre del solicitante ─────
export async function getReservasPendientes() {
  try {
    const reservas = await prisma.reservaEspacio.findMany({
      where:   { estado: 'PENDIENTE' },
      include: { espacio: true },
      orderBy: { createdAt: 'asc' },
    })
    return await enrichWithUsers(reservas, 'solicitanteId')
  } catch {
    return []
  }
}

// ── Historial de reservas de un usuario ─────────────────────────
export async function getReservasUsuario(solicitanteId) {
  try {
    return await prisma.reservaEspacio.findMany({
      where:   { solicitanteId: String(solicitanteId) },
      include: { espacio: { select: { id: true, nombre: true, codigo: true, ubicacion: true } } },
      orderBy: { fechaInicio: 'desc' },
    })
  } catch {
    return []
  }
}

// ══════════════════════════════════════════════════════════════════
// REPORTES DE MANTENIMIENTO
// ══════════════════════════════════════════════════════════════════

export async function crearReporteMantenimiento(data) {
  try {
    await prisma.reporteMantenimiento.create({
      data: {
        espacioId:     data.espacioId ? parseInt(data.espacioId) : null,
        reportadoPorId:String(data.reportadoPorId),
        titulo:        data.titulo,
        descripcion:   data.descripcion,
        tipoElemento:  data.tipoElemento,
        prioridad:     data.prioridad || 'MEDIA',
        estado:        'ABIERTO',
      },
    })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo crear el reporte.' }
  }
}

// ── MEJORA 3: actualizar estado con notas de resolución ──────────
export async function actualizarEstadoReporte(id, estado, notasResolucion = '') {
  try {
    await prisma.reporteMantenimiento.update({
      where: { id },
      data: {
        estado,
        notasResolucion: notasResolucion || null,
        fechaResolucion: estado === 'RESUELTO' ? new Date() : undefined,
      },
    })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo actualizar el reporte.' }
  }
}

// ── MEJORA 1: reportes con nombre del reportante ─────────────────
export async function getReportesAbiertos() {
  try {
    const reportes = await prisma.reporteMantenimiento.findMany({
      where:   { estado: { in: ['ABIERTO', 'EN_PROCESO'] } },
      include: { espacio: { select: { id: true, nombre: true } } },
      orderBy: [{ prioridad: 'desc' }, { createdAt: 'asc' }],
    })
    return await enrichWithUsers(reportes, 'reportadoPorId')
  } catch {
    return []
  }
}

// ── MEJORA 3: estadísticas de resolución (RF-12) ─────────────────
export async function getEstadisticasReportes() {
  try {
    const todos = await prisma.reporteMantenimiento.findMany({
      where: { estado: 'RESUELTO', fechaResolucion: { not: null } },
      select: { createdAt: true, fechaResolucion: true, tipoElemento: true, prioridad: true },
    })

    if (!todos.length) return { promedioDias: 0, porTipo: {}, porPrioridad: {} }

    const promedioDias = todos.reduce((acc, r) => {
      const diff = (new Date(r.fechaResolucion) - new Date(r.createdAt)) / (1000 * 60 * 60 * 24)
      return acc + diff
    }, 0) / todos.length

    const porTipo = todos.reduce((acc, r) => {
      acc[r.tipoElemento] = (acc[r.tipoElemento] || 0) + 1
      return acc
    }, {})

    const porPrioridad = todos.reduce((acc, r) => {
      acc[r.prioridad] = (acc[r.prioridad] || 0) + 1
      return acc
    }, {})

    return { promedioDias: Math.round(promedioDias * 10) / 10, porTipo, porPrioridad }
  } catch {
    return { promedioDias: 0, porTipo: {}, porPrioridad: {} }
  }
}

// ══════════════════════════════════════════════════════════════════
// EQUIPOS (RF-07)
// ══════════════════════════════════════════════════════════════════

export async function crearEquipo(data) {
  try {
    const equipo = await prisma.equipo.create({
      data: {
        codigo:      data.codigo,
        nombre:      data.nombre,
        tipo:        data.tipo,
        descripcion: data.descripcion || null,
        espacioId:   data.espacioId ? parseInt(data.espacioId) : null,
        estado:      'DISPONIBLE',
        esMovil:     data.esMovil || false,
      },
    })
    revalidatePath('/administracion')
    return { success: true, equipo }
  } catch (e) {
    if (e.code === 'P2002') return { success: false, error: 'Ya existe un equipo con ese código.' }
    return { success: false, error: 'No se pudo registrar el equipo.' }
  }
}

export async function actualizarEstadoEquipo(id, estado) {
  try {
    await prisma.equipo.update({ where: { id }, data: { estado } })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo actualizar el equipo.' }
  }
}

export async function eliminarEquipo(id) {
  try {
    await prisma.equipo.delete({ where: { id } })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo eliminar el equipo.' }
  }
}

export async function getEquipos() {
  try {
    return await prisma.equipo.findMany({
      include: { espacio: { select: { id: true, nombre: true, codigo: true } } },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

// ══════════════════════════════════════════════════════════════════
// PRÉSTAMOS (RF-08)
// ══════════════════════════════════════════════════════════════════

export async function crearPrestamo(data) {
  try {
    const equipo = await prisma.equipo.findUnique({ where: { id: parseInt(data.equipoId) } })
    if (!equipo)                        return { success: false, error: 'Equipo no encontrado.' }
    if (equipo.estado !== 'DISPONIBLE') return { success: false, error: 'El equipo no está disponible.' }

    const token = randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()

    await prisma.$transaction([
      prisma.prestamo.create({
        data: {
          equipoId:        parseInt(data.equipoId),
          solicitanteId:   String(data.solicitanteId),
          proposito:       data.proposito,
          fechaInicio:     new Date(data.fechaInicio),
          fechaDevolucion: new Date(data.fechaDevolucion),
          estado:          'ACTIVO',
          notas:           data.notas || null,
          tokenValidacion: token,
        },
      }),
      prisma.equipo.update({
        where: { id: parseInt(data.equipoId) },
        data:  { estado: 'EN_USO' },
      }),
    ])

    revalidatePath('/administracion')
    return { success: true, token }
  } catch {
    return { success: false, error: 'No se pudo registrar el préstamo.' }
  }
}

export async function devolverPrestamo(id) {
  try {
    const prestamo = await prisma.prestamo.findUnique({ where: { id } })
    if (!prestamo) return { success: false, error: 'Préstamo no encontrado.' }

    await prisma.$transaction([
      prisma.prestamo.update({
        where: { id },
        data:  { estado: 'DEVUELTO', fechaDevueltaReal: new Date() },
      }),
      prisma.equipo.update({
        where: { id: prestamo.equipoId },
        data:  { estado: 'DISPONIBLE' },
      }),
    ])

    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo registrar la devolución.' }
  }
}

// ── MEJORA 1: préstamos con nombre del solicitante ───────────────
// ── + marcar automáticamente vencidos ───────────────────────────
export async function getPrestamos() {
  try {
    // Marcar como VENCIDO los que ya pasaron su fecha
    await prisma.prestamo.updateMany({
      where: {
        estado:          'ACTIVO',
        fechaDevolucion: { lt: new Date() },
      },
      data: { estado: 'VENCIDO' },
    })

    const prestamos = await prisma.prestamo.findMany({
      where:   { estado: { in: ['ACTIVO', 'VENCIDO'] } },
      include: { equipo: { select: { id: true, nombre: true, codigo: true, tipo: true } } },
      orderBy: { fechaDevolucion: 'asc' },
    })

    // ── MEJORA 1: enriquecer con nombre del solicitante ──────────
    return await enrichWithUsers(prestamos, 'solicitanteId')
  } catch {
    return []
  }
}

export async function marcarPrestamoPerdido(id) {
  try {
    const prestamo = await prisma.prestamo.findUnique({ where: { id } })
    if (!prestamo) return { success: false, error: 'Préstamo no encontrado.' }

    await prisma.$transaction([
      prisma.prestamo.update({
        where: { id },
        data:  { estado: 'PERDIDO' },
      }),
      prisma.equipo.update({
        where: { id: prestamo.equipoId },
        data:  { estado: 'DADO_DE_BAJA' },
      }),
    ])

    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo actualizar.' }
  }
}

// ══════════════════════════════════════════════════════════════════
// LIMPIEZA (RF-09)
// ══════════════════════════════════════════════════════════════════

export async function crearProgramaLimpieza(data) {
  try {
    await prisma.programaLimpieza.create({
      data: {
        espacioId:       data.espacioId ? parseInt(data.espacioId) : null,
        asignadoAId:     data.asignadoAId || null,
        tipo:            data.tipo    || 'ORDINARIA',
        estado:          'PROGRAMADA',
        fechaProgramada: new Date(data.fechaProgramada),
        notas:           data.notas   || null,
      },
    })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo programar la limpieza.' }
  }
}

export async function actualizarEstadoLimpieza(id, estado) {
  try {
    await prisma.programaLimpieza.update({
      where: { id },
      data: {
        estado,
        fechaCompletada: estado === 'COMPLETADA' ? new Date() : undefined,
      },
    })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo actualizar la limpieza.' }
  }
}

export async function getLimpiezas() {
  try {
    return await prisma.programaLimpieza.findMany({
      where:   { estado: { in: ['PROGRAMADA', 'EN_PROCESO'] } },
      include: { espacio: { select: { id: true, nombre: true, codigo: true } } },
      orderBy: { fechaProgramada: 'asc' },
    })
  } catch {
    return []
  }
}