'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── Datos del dashboard ──────────────────────────────────────────────────────

export async function getDashboardAdminData() {
  try {
    const hoy = new Date()
    const inicioDia = new Date(hoy)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(hoy)
    finDia.setHours(23, 59, 59, 999)

    const [
      espacios,
      reservasPendientes,
      reservasHoy,
      reportesAbiertos,
      usuarios,
    ] = await Promise.all([
      prisma.espacio.findMany({
        where: { activo: true },
        include: {
          _count: { select: { reservasEspacio: true, reportesMantenimiento: true } },
          reservasEspacio: {
            where: {
              estado: { in: ['APROBADA', 'PENDIENTE'] },
              fechaFin: { gte: new Date() },
            },
            orderBy: { fechaInicio: 'asc' },
            take: 3,
          },
          reportesMantenimiento: {
            where: { estado: { in: ['ABIERTO', 'EN_PROCESO'] } },
            select: { id: true, estado: true },
          },
        },
        orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.reservaEspacio.findMany({
        where: { estado: 'PENDIENTE' },
        include: {
          espacio: { select: { nombre: true, codigo: true, tipo: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.reservaEspacio.findMany({
        where: {
          estado: 'APROBADA',
          fechaInicio: { gte: inicioDia },
          fechaFin: { lte: finDia },
        },
        select: { id: true },
      }),
      prisma.reporteMantenimiento.findMany({
        where: { estado: { in: ['ABIERTO', 'EN_PROCESO'] } },
        include: {
          espacio: { select: { nombre: true, codigo: true } },
        },
        orderBy: [{ prioridad: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.catedraticoAcademico.findMany({
        select: { id: true, codigo: true, nombre: true, apellido: true, email: true },
        orderBy: { nombre: 'asc' },
      }),
    ])

    const stats = {
      totalEspacios: espacios.length,
      espaciosDisponibles: espacios.filter((e) => e.estado === 'DISPONIBLE').length,
      reservasPendientes: reservasPendientes.length,
      reservasHoy: reservasHoy.length,
      reportesAbiertos: reportesAbiertos.length,
      reportesUrgentes: reportesAbiertos.filter((r) => r.prioridad === 'URGENTE').length,
    }

    return { espacios, reservasPendientes, reservasHoy, reportesAbiertos, usuarios, stats }
  } catch (error) {
    console.error('getDashboardAdminData error:', error)
    throw error
  }
}

// ─── Reservas por mes (para calendario mensual) ───────────────────────────────

export async function getReservasMes(anio, mes) {
  try {
    const inicio = new Date(anio, mes, 1)
    const fin = new Date(anio, mes + 1, 0, 23, 59, 59, 999)

    const reservas = await prisma.reservaEspacio.findMany({
      where: {
        estado: { in: ['APROBADA', 'PENDIENTE'] },
        fechaInicio: { gte: inicio },
        fechaFin: { lte: fin },
      },
      include: {
        espacio: { select: { nombre: true, codigo: true } },
      },
      orderBy: { fechaInicio: 'asc' },
    })

    return reservas
  } catch (error) {
    console.error('getReservasMes error:', error)
    return []
  }
}

// ─── Espacios CRUD ────────────────────────────────────────────────────────────

export async function crearEspacio(data) {
  try {
    const espacio = await prisma.espacio.create({
      data: {
        codigo: data.codigo.toUpperCase(),
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        tipo: data.tipo,
        capacidad: parseInt(data.capacidad),
        ubicacion: data.ubicacion,
        piso: data.piso ? parseInt(data.piso) : null,
        tieneProyector: data.tieneProyector === true || data.tieneProyector === 'true',
        tieneAireAcondicionado: data.tieneAireAcondicionado === true || data.tieneAireAcondicionado === 'true',
        tieneInternetWifi: data.tieneInternetWifi === true || data.tieneInternetWifi === 'true',
        tienePizarron: data.tienePizarron === true || data.tienePizarron === 'true',
        tienePizarronDigital: data.tienePizarronDigital === true || data.tienePizarronDigital === 'true',
        notasRecursos: data.notasRecursos || null,
      },
    })
    revalidatePath('/administracion')
    return { success: true, espacio }
  } catch (error) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Ya existe un espacio con ese código.' }
    }
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

// ─── Reservaciones ────────────────────────────────────────────────────────────

export async function crearReservaEspacio(data) {
  try {
    const inicio = new Date(data.fechaInicio)
    const fin = new Date(data.fechaFin)

    if (fin <= inicio) {
      return { success: false, error: 'La fecha de fin debe ser posterior al inicio.' }
    }

    // Verificar que el espacio no esté en mantenimiento o fuera de servicio
    const espacio = await prisma.espacio.findUnique({
      where: { id: parseInt(data.espacioId) },
      select: { capacidad: true, nombre: true, estado: true },
    })

    if (espacio?.estado === 'MANTENIMIENTO') {
      return {
        success: false,
        error: `"${espacio.nombre}" está en mantenimiento y no puede reservarse.`,
      }
    }

    if (espacio?.estado === 'FUERA_DE_SERVICIO') {
      return {
        success: false,
        error: `"${espacio.nombre}" está fuera de servicio y no puede reservarse.`,
      }
    }

    if (espacio && parseInt(data.cantidadPersonas) > espacio.capacidad) {
      return {
        success: false,
        error: `Capacidad superada. "${espacio.nombre}" tiene un máximo de ${espacio.capacidad} personas.`,
      }
    }

    // ── Generar todas las ocurrencias ─────────────────────────────────────────
    // NOTA: La BD solo tiene los campos: recurrente (boolean) y diasRecurrencia (varchar 100).
    // No existen grupoRecurrenciaId ni fechaFinRecurrencia en la tabla.
    // Para recurrencia solo guardamos la PRIMERA ocurrencia marcada como recurrente.
    const ocurrencias = []

    if (data.recurrente && Array.isArray(data.diasRecurrencia) && data.diasRecurrencia.length > 0 && data.fechaFinRecurrencia) {
      const diasSemana = { Lunes: 1, Martes: 2, 'Miércoles': 3, Jueves: 4, Viernes: 5, Sábado: 6 }
      const diasElegidos = data.diasRecurrencia.map((d) => diasSemana[d]).filter(Boolean)
      const fechaLimite = new Date(data.fechaFinRecurrencia)
      fechaLimite.setHours(23, 59, 59, 999)
      const duracionMs = fin - inicio

      const cursor = new Date(inicio)
      cursor.setHours(0, 0, 0, 0)

      while (cursor <= fechaLimite) {
        if (diasElegidos.includes(cursor.getDay())) {
          const ocInicio = new Date(cursor)
          ocInicio.setHours(inicio.getHours(), inicio.getMinutes(), 0, 0)
          const ocFin = new Date(ocInicio.getTime() + duracionMs)
          ocurrencias.push({ fechaInicio: ocInicio, fechaFin: ocFin })
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      // Reserva simple (una sola vez)
      ocurrencias.push({ fechaInicio: inicio, fechaFin: fin })
    }

    if (ocurrencias.length === 0) {
      return {
        success: false,
        error: 'No se generaron fechas con los días y rango seleccionados. Verifica que la fecha límite sea posterior al inicio.',
      }
    }

    // ── Verificar conflictos para TODAS las ocurrencias ───────────────────────
    for (const oc of ocurrencias) {
      const conflicto = await prisma.reservaEspacio.findFirst({
        where: {
          espacioId: parseInt(data.espacioId),
          estado: { in: ['PENDIENTE', 'APROBADA'] },
          OR: [{ fechaInicio: { lt: oc.fechaFin }, fechaFin: { gt: oc.fechaInicio } }],
        },
      })
      if (conflicto) {
        const fechaStr = oc.fechaInicio.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })
        const horaIni = oc.fechaInicio.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
        const horaFin = oc.fechaFin.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
        return {
          success: false,
          error: `Conflicto de horario: el ${fechaStr} de ${horaIni} a ${horaFin} ya hay una reserva en ese espacio.`,
        }
      }
    }

    // ── Crear todas las reservas en una sola transacción ─────────────────────
    // Solo se usan los campos que existen en la tabla de la BD:
    // id, espacioId, solicitanteId, titulo, proposito, fechaInicio, fechaFin,
    // cantidadPersonas, recurrente, diasRecurrencia, notas, estado, motivoRechazo, createdAt
    await prisma.reservaEspacio.createMany({
      data: ocurrencias.map((oc) => ({
        espacioId: parseInt(data.espacioId),
        solicitanteId: String(data.solicitanteId),
        titulo: data.titulo,
        proposito: data.proposito,
        fechaInicio: oc.fechaInicio,
        fechaFin: oc.fechaFin,
        cantidadPersonas: parseInt(data.cantidadPersonas),
        recurrente: data.recurrente === true,
        diasRecurrencia: Array.isArray(data.diasRecurrencia)
          ? data.diasRecurrencia.join(',')
          : (data.diasRecurrencia || null),
        notas: data.notas || null,
      })),
    })

    revalidatePath('/administracion')
    return { success: true, totalOcurrencias: ocurrencias.length }
  } catch (error) {
    console.error('crearReservaEspacio error:', error)
    return { success: false, error: 'No se pudo crear la reserva.' }
  }
}

export async function eliminarReservaEspacio(id) {
  try {
    await prisma.reservaEspacio.delete({ where: { id } })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo eliminar la reserva.' }
  }
}

export async function resolverReservaEspacio(id, accion, motivo = null) {
  try {
    const estado = accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA'
    await prisma.reservaEspacio.update({
      where: { id },
      data: {
        estado,
        motivoRechazo: accion === 'rechazar' ? motivo : null,
      },
    })
    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo procesar la reserva.' }
  }
}

// ─── Reportes de mantenimiento ────────────────────────────────────────────────

export async function crearReporteMantenimiento(data) {
  try {
    // Crear el reporte
    const reporte = await prisma.reporteMantenimiento.create({
      data: {
        espacioId: data.espacioId ? parseInt(data.espacioId) : null,
        reportadoPorId: String(data.reportadoPorId),
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipoElemento: data.tipoElemento,
        prioridad: data.prioridad,
      },
    })

    // Si el reporte tiene espacio asociado → poner espacio en MANTENIMIENTO automáticamente
    if (data.espacioId) {
      await prisma.espacio.update({
        where: { id: parseInt(data.espacioId) },
        data: { estado: 'MANTENIMIENTO' },
      })
    }

    revalidatePath('/administracion')
    return { success: true, reporte }
  } catch (error) {
    console.error('crearReporteMantenimiento error:', error)
    return { success: false, error: 'No se pudo crear el reporte.' }
  }
}

export async function actualizarEstadoReporte(id, estado, notasResolucion = null) {
  try {
    // Obtener reporte para saber a qué espacio pertenece
    const reporte = await prisma.reporteMantenimiento.findUnique({
      where: { id },
      select: { espacioId: true },
    })

    // Actualizar el reporte
    await prisma.reporteMantenimiento.update({
      where: { id },
      data: {
        estado,
        notasResolucion,
        fechaResolucion: ['RESUELTO', 'CERRADO'].includes(estado) ? new Date() : null,
      },
    })

    // Si se resolvió/cerró y tiene espacio, verificar si quedan más reportes activos.
    // Solo volver a DISPONIBLE si NO quedan más reportes abiertos para ese espacio.
    if (['RESUELTO', 'CERRADO'].includes(estado) && reporte?.espacioId) {
      const reportesActivosRestantes = await prisma.reporteMantenimiento.count({
        where: {
          espacioId: reporte.espacioId,
          id: { not: id },
          estado: { in: ['ABIERTO', 'EN_PROCESO'] },
        },
      })

      if (reportesActivosRestantes === 0) {
        await prisma.espacio.update({
          where: { id: reporte.espacioId },
          data: { estado: 'DISPONIBLE' },
        })
      }
    }

    revalidatePath('/administracion')
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo actualizar el reporte.' }
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
