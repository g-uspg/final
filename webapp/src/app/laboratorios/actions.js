'use server'

import { prisma } from '@/lib/prisma-laboratorios'
import { revalidatePath } from 'next/cache'
import { requireServerRole, getServerUser } from '@/lib/server-auth'
import { getOrCreateLabUsuario, getLabEligibility, isLabAdminRole } from '@/lib/laboratorios/usuario-lab'
import {
  DEFAULT_FILAS,
  DEFAULT_COLUMNAS,
  TOTAL_ASIENTOS,
  ASIENTOS_SIMULADOS_DEMO,
  FILA_ACCESO_REMOTO,
  etiquetaAsiento,
} from '@/lib/laboratorios/asientos'
import {
  evaluarAccesoRemoto,
  minutosTranscurridos,
  montoPorMinutos,
} from '@/lib/laboratorios/sesion-remota'

const labInclude = {
  configuraciones: { where: { activo: true }, orderBy: { orden: 'asc' } },
  estaciones: { where: { activo: true }, orderBy: { orden: 'asc' } },
  _count: { select: { equipos: true, reservas: true } },
}

export async function getClientPortalData() {
  try {
    const jwtUser = await getServerUser()
    if (!jwtUser) return null

    const labUsuario = await getOrCreateLabUsuario(jwtUser)
    if (!labUsuario) return null

    const eligibility = await getLabEligibility(jwtUser, labUsuario)

    const [laboratorios, misReservas, usoPendiente, cursosLibres, sesionRemotaActiva] =
      await Promise.all([
      prisma.laboratorio.findMany({
        where: { estado: 'ACTIVO', disponiblePublico: true },
        include: {
          configuraciones: { where: { activo: true }, orderBy: { orden: 'asc' } },
          _count: { select: { equipos: true } },
          reservas: {
            where: {
              estado: { in: ['APROBADA', 'PENDIENTE'] },
              fechaFin: { gte: new Date() },
            },
            orderBy: { fechaInicio: 'asc' },
            take: 3,
          },
        },
        orderBy: [{ faseImplementacion: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.reserva.findMany({
        where: { usuarioId: labUsuario.id },
        include: {
          laboratorio: { select: { id: true, nombre: true, codigo: true } },
          configuracionDivision: { select: { etiqueta: true } },
          asientosReservados: {
            include: {
              asiento: { select: { id: true, fila: true, numero: true, etiqueta: true } },
            },
          },
        },
        orderBy: { fechaInicio: 'desc' },
        take: 30,
      }),
      prisma.pago.aggregate({
        where: {
          usuarioId: labUsuario.id,
          tipoCobro: 'PAGO_HORA',
          estado: 'PENDIENTE',
        },
        _sum: { monto: true },
        _count: true,
      }),
      getCursosLibres(true),
      prisma.sesionUso.findFirst({
        where: {
          usuarioId: labUsuario.id,
          tipoConexion: 'REMOTA',
          fin: null,
        },
        include: {
          laboratorio: { select: { nombre: true } },
          equipo: { select: { nombre: true, codigoInventario: true } },
        },
      }),
    ])

    return {
      labUsuario: {
        id: labUsuario.id,
        nombre: labUsuario.nombre,
        apellido: labUsuario.apellido,
        correo: labUsuario.correo,
        categoria: labUsuario.categoria,
        carrera: labUsuario.carrera,
      },
      eligibility,
      laboratorios,
      misReservas,
      cursosLibres,
      misInscripcionesIds: cursosLibres
        .filter((c) => c.inscripciones?.some((i) => i.usuarioId === labUsuario.id))
        .map((c) => c.id),
      cobroPendiente: {
        total: Number(usoPendiente._sum.monto ?? 0),
        registros: usoPendiente._count,
      },
      sesionRemotaActiva,
    }
  } catch (error) {
    console.error('getClientPortalData:', error)
    return null
  }
}

export async function getLaboratorioClienteData(id) {
  try {
    const jwtUser = await getServerUser()
    if (!jwtUser) return null

    const labUsuario = await getOrCreateLabUsuario(jwtUser)
    if (!labUsuario) return null

    const eligibility = await getLabEligibility(jwtUser, labUsuario)

    const laboratorio = await prisma.laboratorio.findUnique({
      where: { id: Number(id) },
      include: {
        configuraciones: { where: { activo: true }, orderBy: { orden: 'asc' } },
        equipos: { where: { estado: 'OPERATIVO' }, orderBy: { nombre: 'asc' } },
        reservas: {
          where: {
            usuarioId: labUsuario.id,
          },
          include: {
            configuracionDivision: true,
            asientosReservados: {
              include: { asiento: { select: { etiqueta: true, fila: true, numero: true } } },
            },
          },
          orderBy: { fechaInicio: 'desc' },
          take: 20,
        },
      },
    })

    if (!laboratorio) return null

    return { laboratorio, labUsuario, eligibility }
  } catch (error) {
    console.error('getLaboratorioClienteData:', error)
    return null
  }
}

export async function getDashboardData() {
  try {
    const [laboratorios, reservasPendientes, equipos, pagosRecientes, usuariosActivos, cursosLibres] =
      await Promise.all([
        prisma.laboratorio.findMany({
          include: {
            ...labInclude,
            reservas: {
              where: {
                estado: { in: ['APROBADA', 'PENDIENTE'] },
                fechaFin: { gte: new Date() },
              },
              orderBy: { fechaInicio: 'asc' },
              take: 5,
            },
          },
          orderBy: [{ faseImplementacion: 'asc' }, { nombre: 'asc' }],
        }),
        prisma.reserva.findMany({
          where: { estado: 'PENDIENTE' },
          include: {
            usuario: { select: { nombre: true, apellido: true, correo: true } },
            laboratorio: { select: { nombre: true, codigo: true } },
            configuracionDivision: { select: { etiqueta: true } },
            asientosReservados: {
              include: { asiento: { select: { etiqueta: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.equipo.findMany({
          include: { laboratorio: { select: { nombre: true, codigo: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 8,
        }),
        prisma.pago.findMany({
          include: {
            usuario: { select: { nombre: true, correo: true } },
            laboratorio: { select: { nombre: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.usuario.count({ where: { activo: true, sancionado: false } }),
        getCursosLibres(false),
      ])

    const stats = {
      totalLabs: laboratorios.length,
      labsActivos: laboratorios.filter((l) => l.estado === 'ACTIVO').length,
      reservasPendientes: reservasPendientes.length,
      equiposOperativos: equipos.filter((e) => e.estado === 'OPERATIVO').length,
      usuariosActivos,
    }

    return { laboratorios, reservasPendientes, equipos, pagosRecientes, cursosLibres, stats }
  } catch (error) {
    console.error('getDashboardData:', error)
    return {
      laboratorios: [],
      reservasPendientes: [],
      equipos: [],
      pagosRecientes: [],
      cursosLibres: [],
      stats: {
        totalLabs: 0,
        labsActivos: 0,
        reservasPendientes: 0,
        equiposOperativos: 0,
        usuariosActivos: 0,
      },
    }
  }
}

export async function getLaboratorioById(id) {
  try {
    return await prisma.laboratorio.findUnique({
      where: { id: Number(id) },
      include: {
        configuraciones: { orderBy: { orden: 'asc' } },
        estaciones: { orderBy: { orden: 'asc' } },
        equipos: { orderBy: { nombre: 'asc' } },
        reservas: {
          include: {
            usuario: { select: { nombre: true, apellido: true, correo: true } },
            configuracionDivision: true,
            asientosReservados: {
              include: { asiento: { select: { etiqueta: true } } },
            },
          },
          orderBy: { fechaInicio: 'desc' },
          take: 20,
        },
        pagos: {
          include: { usuario: { select: { nombre: true, correo: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
  } catch (error) {
    console.error('getLaboratorioById:', error)
    return null
  }
}

export async function crearLaboratorio(formData) {
  try {
    await requireServerRole('ADMIN', 'TEACHER')
    const nombre = String(formData.get('nombre') || '').trim()
    const codigo = String(formData.get('codigo') || '').trim().toUpperCase()
    const descripcion = String(formData.get('descripcion') || '').trim() || null
    const ubicacion = String(formData.get('ubicacion') || '').trim() || null
    const tipo = String(formData.get('tipo') || 'COMPUTACION')
    const capacidadTotal = parseInt(formData.get('capacidadTotal') || '30', 10)
    const faseImplementacion = parseInt(formData.get('faseImplementacion') || '1', 10)
    const permiteDivision = formData.get('permiteDivision') === 'on'

    if (!nombre || !codigo) {
      return { success: false, error: 'Nombre y código son obligatorios.' }
    }

    await prisma.laboratorio.create({
      data: {
        nombre,
        codigo,
        descripcion,
        ubicacion,
        tipo,
        capacidadTotal,
        permiteDivision,
        faseImplementacion,
        estado: 'ACTIVO',
        configuraciones: permiteDivision
          ? {
              create: [
                { etiqueta: 'Grupo completo', cupo: capacidadTotal, esGrupoCompleto: true, orden: 99 },
              ],
            }
          : {
              create: [
                {
                  etiqueta: `Grupo completo (${capacidadTotal})`,
                  cupo: capacidadTotal,
                  esGrupoCompleto: true,
                  orden: 1,
                },
              ],
            },
      },
    })

    revalidatePath('/laboratorios')
    return { success: true }
  } catch (error) {
    console.error('crearLaboratorio:', error)
    if (error.code === 'P2002') {
      return { success: false, error: 'El código de laboratorio ya existe.' }
    }
    return { success: false, error: 'No se pudo crear el laboratorio.' }
  }
}

export async function actualizarLaboratorio(id, formData) {
  try {
    await requireServerRole('ADMIN', 'TEACHER')
    await prisma.laboratorio.update({
      where: { id: Number(id) },
      data: {
        nombre: String(formData.get('nombre') || '').trim(),
        descripcion: String(formData.get('descripcion') || '').trim() || null,
        ubicacion: String(formData.get('ubicacion') || '').trim() || null,
        capacidadTotal: parseInt(formData.get('capacidadTotal') || '30', 10),
        disponiblePublico: formData.get('disponiblePublico') === 'on',
      },
    })
    revalidatePath('/laboratorios')
    revalidatePath(`/laboratorios/${id}`)
    return { success: true }
  } catch (error) {
    console.error('actualizarLaboratorio:', error)
    return { success: false, error: 'No se pudo actualizar.' }
  }
}

export async function cambiarEstadoLaboratorio(id, nuevoEstado) {
  try {
    await requireServerRole('ADMIN')
    await prisma.laboratorio.update({
      where: { id: Number(id) },
      data: { estado: nuevoEstado },
    })
    revalidatePath('/laboratorios')
    revalidatePath(`/laboratorios/${id}`)
    return { success: true }
  } catch (error) {
    console.error('cambiarEstadoLaboratorio:', error)
    return { success: false, error: 'No se pudo cambiar el estado.' }
  }
}

export async function crearEquipo(laboratorioId, formData) {
  try {
    await requireServerRole('ADMIN')
    await prisma.equipo.create({
      data: {
        laboratorioId: Number(laboratorioId),
        codigoInventario: String(formData.get('codigoInventario') || '').trim(),
        nombre: String(formData.get('nombre') || '').trim(),
        esServidor: formData.get('esServidor') === 'on',
        ubicacionFisica: String(formData.get('ubicacionFisica') || '').trim() || null,
        estado: 'OPERATIVO',
      },
    })
    revalidatePath(`/laboratorios/${laboratorioId}`)
    revalidatePath('/laboratorios')
    return { success: true }
  } catch (error) {
    console.error('crearEquipo:', error)
    return { success: false, error: 'No se pudo registrar el equipo.' }
  }
}

export async function crearReserva(formData) {
  try {
    const jwtUser = await getServerUser()
    let usuarioId = String(formData.get('usuarioId') || '').trim()

    if (jwtUser && isLabAdminRole(jwtUser.role)) {
      if (!usuarioId) {
        return { success: false, error: 'Seleccione un solicitante.' }
      }
    } else {
      if (!jwtUser) {
        return { success: false, error: 'Debe iniciar sesión para reservar.' }
      }
      const labUsuario = await getOrCreateLabUsuario(jwtUser)
      const eligibility = await getLabEligibility(jwtUser, labUsuario)
      if (!eligibility.canReserve) {
        return { success: false, error: eligibility.reason || 'No puedes reservar laboratorios.' }
      }
      usuarioId = labUsuario.id
    }

    const laboratorioId = Number(formData.get('laboratorioId'))
    const cursoLibreId = String(formData.get('cursoLibreId') || '').trim() || null
    const configuracionDivisionId = formData.get('configuracionDivisionId')
      ? Number(formData.get('configuracionDivisionId'))
      : null
    const fechaInicio = new Date(String(formData.get('fechaInicio')))
    const fechaFin = new Date(String(formData.get('fechaFin')))
    const cantidadPersonas = parseInt(formData.get('cantidadPersonas') || '1', 10)
    const proposito = String(formData.get('proposito') || '').trim()
    const asientoIdsRaw = String(formData.get('asientoIds') || '').trim()
    const asientoIds = asientoIdsRaw
      ? asientoIdsRaw.split(',').map((id) => Number(id)).filter(Boolean)
      : []

    if (fechaFin <= fechaInicio) {
      return { success: false, error: 'La fecha de fin debe ser posterior al inicio.' }
    }

    if (asientoIds.length > 0) {
      const mapa = await getAsientosDisponibles(laboratorioId, fechaInicio.toISOString(), fechaFin.toISOString())
      const invalid = asientoIds.filter((id) => {
        const seat = mapa.find((s) => s.id === id)
        return !seat || seat.estado !== 'disponible'
      })
      if (invalid.length > 0) {
        return { success: false, error: 'Una o más butacas ya no están disponibles. Actualiza la selección.' }
      }
    } else {
      const conflicto = await prisma.reserva.findFirst({
        where: {
          laboratorioId,
          estado: { in: ['PENDIENTE', 'APROBADA'] },
          fechaInicio: { lt: fechaFin },
          fechaFin: { gt: fechaInicio },
          asientosReservados: { none: {} },
        },
      })
      if (conflicto) {
        return { success: false, error: 'Conflicto de horario con otra reservación.' }
      }
    }

    await prisma.reserva.create({
      data: {
        laboratorioId,
        usuarioId,
        cursoLibreId,
        configuracionDivisionId,
        fechaInicio,
        fechaFin,
        cantidadPersonas: asientoIds.length || cantidadPersonas,
        proposito,
        estado: 'PENDIENTE',
        asientosReservados: asientoIds.length
          ? { create: asientoIds.map((asientoId) => ({ asientoId })) }
          : undefined,
      },
    })

    revalidatePath('/laboratorios')
    revalidatePath(`/laboratorios/${laboratorioId}`)
    return { success: true }
  } catch (error) {
    console.error('crearReserva:', error)
    return { success: false, error: 'No se pudo crear la reservación.' }
  }
}

export async function resolverReserva(reservaId, accion, motivo = '') {
  try {
    await requireServerRole('ADMIN', 'TEACHER')
    const tecnico = await prisma.usuario.findFirst({ where: { rol: 'TECNICO' } })
    const data =
      accion === 'aprobar'
        ? {
            estado: 'APROBADA',
            aprobadaPorId: tecnico?.id ?? null,
            motivoRechazo: null,
          }
        : accion === 'rechazar'
          ? { estado: 'RECHAZADA', motivoRechazo: motivo || 'Rechazada por el técnico' }
          : { estado: 'CANCELADA', motivoCancelacion: motivo || 'Cancelada' }

    const reserva = await prisma.reserva.update({
      where: { id: reservaId },
      data,
    })

    revalidatePath('/laboratorios')
    revalidatePath(`/laboratorios/${reserva.laboratorioId}`)
    return { success: true }
  } catch (error) {
    console.error('resolverReserva:', error)
    return { success: false, error: 'No se pudo actualizar la reservación.' }
  }
}

export async function registrarPago(formData) {
  try {
    await requireServerRole('ADMIN')
    await prisma.pago.create({
      data: {
        usuarioId: String(formData.get('usuarioId')),
        laboratorioId: formData.get('laboratorioId')
          ? Number(formData.get('laboratorioId'))
          : null,
        monto: parseFloat(String(formData.get('monto') || '0')),
        tipoCobro: String(formData.get('tipoCobro') || 'PAGO_HORA'),
        metodoPago: String(formData.get('metodoPago') || 'EFECTIVO'),
        estado: 'PAGADO',
        notas: String(formData.get('notas') || '').trim() || null,
      },
    })
    revalidatePath('/laboratorios')
    return { success: true }
  } catch (error) {
    console.error('registrarPago:', error)
    return { success: false, error: 'No se pudo registrar el pago.' }
  }
}

export async function cancelarMiReserva(reservaId) {
  try {
    const jwtUser = await getServerUser()
    if (!jwtUser) return { success: false, error: 'No autenticado.' }

    const labUsuario = await getOrCreateLabUsuario(jwtUser)
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } })

    if (!reserva || reserva.usuarioId !== labUsuario.id) {
      return { success: false, error: 'Reserva no encontrada.' }
    }

    if (!['PENDIENTE', 'APROBADA'].includes(reserva.estado)) {
      return { success: false, error: 'Esta reserva ya no se puede cancelar.' }
    }

    await prisma.reserva.update({
      where: { id: reservaId },
      data: { estado: 'CANCELADA', motivoCancelacion: 'Cancelada por el usuario' },
    })

    revalidatePath('/laboratorios')
    revalidatePath(`/laboratorios/${reserva.laboratorioId}`)
    return { success: true }
  } catch (error) {
    console.error('cancelarMiReserva:', error)
    return { success: false, error: 'No se pudo cancelar la reservación.' }
  }
}

export async function ensureAsientosLaboratorio(laboratorioId) {
  const labId = Number(laboratorioId)

  async function layoutEsCorrecto(count) {
    if (count !== TOTAL_ASIENTOS) return false
    if (prisma.asientoLaboratorio?.findFirst) {
      const extra = await prisma.asientoLaboratorio.findFirst({
        where: {
          laboratorioId: labId,
          OR: [
            { fila: { notIn: DEFAULT_FILAS } },
            { numero: { lt: 1 } },
            { numero: { gt: DEFAULT_COLUMNAS } },
          ],
        },
      })
      return !extra
    }
    const [{ extra }] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS extra FROM asiento_laboratorio
      WHERE laboratorio_id = ${labId}
        AND (fila NOT IN ('A', 'B') OR numero < 1 OR numero > ${DEFAULT_COLUMNAS})
    `
    return extra === 0
  }

  async function crearLayout() {
    if (prisma.asientoLaboratorio?.deleteMany) {
      const reservas = await prisma.reserva.findMany({
        where: { laboratorioId: labId },
        select: { id: true },
      })
      const reservaIds = reservas.map((r) => r.id)
      if (reservaIds.length > 0 && prisma.reservaAsiento?.deleteMany) {
        await prisma.reservaAsiento.deleteMany({ where: { reservaId: { in: reservaIds } } })
      }
      await prisma.asientoLaboratorio.deleteMany({ where: { laboratorioId: labId } })
      const data = []
      for (const fila of DEFAULT_FILAS) {
        for (let numero = 1; numero <= DEFAULT_COLUMNAS; numero += 1) {
          const sim = ASIENTOS_SIMULADOS_DEMO.some((s) => s.fila === fila && s.numero === numero)
          data.push({
            laboratorioId: labId,
            fila,
            numero,
            etiqueta: etiquetaAsiento(fila, numero),
            esSimulado: sim,
            activo: true,
          })
        }
      }
      await prisma.asientoLaboratorio.createMany({ data, skipDuplicates: true })
      return
    }

    await prisma.$executeRaw`
      DELETE FROM reserva_asiento ra
      USING reserva r
      WHERE ra.reserva_id = r.id AND r.laboratorio_id = ${labId}
    `
    await prisma.$executeRaw`DELETE FROM asiento_laboratorio WHERE laboratorio_id = ${labId}`

    for (const fila of DEFAULT_FILAS) {
      for (let numero = 1; numero <= DEFAULT_COLUMNAS; numero += 1) {
        const sim = ASIENTOS_SIMULADOS_DEMO.some((s) => s.fila === fila && s.numero === numero)
        await prisma.$executeRaw`
          INSERT INTO asiento_laboratorio (laboratorio_id, fila, numero, etiqueta, activo, es_simulado)
          VALUES (${labId}, ${fila}, ${numero}, ${etiquetaAsiento(fila, numero)}, true, ${sim})
          ON CONFLICT (laboratorio_id, fila, numero) DO NOTHING
        `
      }
    }
  }

  let count = 0
  if (prisma.asientoLaboratorio?.count) {
    count = await prisma.asientoLaboratorio.count({ where: { laboratorioId: labId } })
  } else {
    const [{ c }] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c FROM asiento_laboratorio WHERE laboratorio_id = ${labId}
    `
    count = c
  }

  if (count > 0 && (await layoutEsCorrecto(count))) return

  await crearLayout()

  if (prisma.laboratorio?.update) {
    await prisma.laboratorio.update({
      where: { id: labId },
      data: { capacidadTotal: TOTAL_ASIENTOS },
    })
  }
}

export async function ensureCursoInglesDemo() {
  let lab = await prisma.laboratorio.findFirst({
    where: { tipo: 'COMPUTACION', estado: 'ACTIVO' },
    orderBy: { id: 'asc' },
  })

  if (!lab) {
    lab = await prisma.laboratorio.create({
      data: {
        codigo: 'LAB-COMP-01',
        nombre: 'Laboratorio de Computación',
        descripcion: 'Laboratorio principal para prácticas con equipos y LLM.',
        ubicacion: 'Edificio Ingeniería, Nivel 2',
        tipo: 'COMPUTACION',
        capacidadTotal: TOTAL_ASIENTOS,
        estado: 'ACTIVO',
        faseImplementacion: 1,
        disponiblePublico: true,
      },
    })
  }

  await ensureAsientosLaboratorio(lab.id)
  await ensureEquiposRemotos(lab.id)

  if (!prisma.cursoLibre?.findUnique) {
    const existing = await prisma.$queryRaw`
      SELECT id FROM curso_libre WHERE codigo = 'ING-LLM-2026' LIMIT 1
    `
    if (existing.length > 0) return
    await prisma.$executeRaw`
      INSERT INTO curso_libre (
        id, codigo, nombre, descripcion, laboratorio_id, tipo, usa_llm,
        certificado_uspg, examenes_anuales, duracion_minutos, activo, created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text,
        'ING-LLM-2026',
        'Práctica de inglés con LLM — Requisito de graduación',
        'Práctica conversacional asistida por LLM en laboratorio de computación. Certificado avalado por USPG.',
        ${lab.id},
        'INGLES_LLM',
        true,
        true,
        4,
        90,
        true,
        NOW(),
        NOW()
      )
    `
    return
  }

  const exists = await prisma.cursoLibre.findUnique({ where: { codigo: 'ING-LLM-2026' } })
  if (exists) return

  const curso = await prisma.cursoLibre.create({
    data: {
      codigo: 'ING-LLM-2026',
      nombre: 'Práctica de inglés con LLM — Requisito de graduación',
      descripcion:
        'Práctica conversacional asistida por LLM en laboratorio de computación. Certificado avalado por USPG. Evaluaciones distribuidas a lo largo del año académico.',
      laboratorioId: lab.id,
      tipo: 'INGLES_LLM',
      usaLLM: true,
      certificadoUSPG: true,
      examenesAnuales: 4,
      duracionMinutos: 90,
      activo: true,
    },
  })

  const now = new Date()
  const examenes = [
    { nombre: 'Diagnóstico inicial', mes: 0 },
    { nombre: 'Evaluación parcial I', mes: 3 },
    { nombre: 'Evaluación parcial II', mes: 6 },
    { nombre: 'Examen de certificación USPG', mes: 10 },
  ]
  for (const [i, ex] of examenes.entries()) {
    const fecha = new Date(now.getFullYear(), ex.mes, 15, 9, 0, 0)
    await prisma.examenCurso.create({
      data: {
        cursoLibreId: curso.id,
        nombre: ex.nombre,
        fechaProgramada: fecha,
        orden: i + 1,
      },
    })
  }
}

export async function getAsientosDisponibles(laboratorioId, fechaInicioIso, fechaFinIso) {
  try {
    await ensureAsientosLaboratorio(Number(laboratorioId))

    let fechaInicio = new Date(fechaInicioIso)
    let fechaFin = new Date(fechaFinIso)
    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      return []
    }
    if (fechaFin <= fechaInicio) {
      fechaFin = new Date(fechaInicio.getTime() + 60 * 60000)
    }

    const labId = Number(laboratorioId)

    let asientos
    if (prisma.asientoLaboratorio?.findMany) {
      asientos = await prisma.asientoLaboratorio.findMany({
        where: { laboratorioId: labId },
        orderBy: [{ fila: 'asc' }, { numero: 'asc' }],
      })
    } else {
      asientos = await prisma.$queryRaw`
        SELECT id, laboratorio_id AS "laboratorioId", fila, numero, etiqueta, activo, es_simulado AS "esSimulado"
        FROM asiento_laboratorio
        WHERE laboratorio_id = ${labId}
        ORDER BY fila ASC, numero ASC
      `
    }

    let reservasSolapadas
    if (prisma.reserva?.findMany && prisma.asientoLaboratorio?.findMany) {
      reservasSolapadas = await prisma.reserva.findMany({
        where: {
          laboratorioId: labId,
          estado: { in: ['PENDIENTE', 'APROBADA'] },
          fechaInicio: { lt: fechaFin },
          fechaFin: { gt: fechaInicio },
        },
        include: { asientosReservados: { select: { asientoId: true } } },
      })
    } else {
      const rows = await prisma.$queryRaw`
        SELECT ra.asiento_id AS "asientoId"
        FROM reserva r
        JOIN reserva_asiento ra ON ra.reserva_id = r.id
        WHERE r.laboratorio_id = ${labId}
          AND r.estado IN ('PENDIENTE', 'APROBADA')
          AND r.fecha_inicio < ${fechaFin}
          AND r.fecha_fin > ${fechaInicio}
      `
      reservasSolapadas = [{ asientosReservados: rows }]
    }

    const ocupados = new Set()
    for (const r of reservasSolapadas) {
      for (const ar of r.asientosReservados || []) {
        ocupados.add(ar.asientoId ?? ar.asiento_id)
      }
    }

    return asientos.map((a) => {
      if (!a.activo) return { ...a, estado: 'bloqueado' }
      if (a.esSimulado || ocupados.has(a.id)) return { ...a, estado: 'ocupado' }
      return { ...a, estado: 'disponible' }
    })
  } catch (error) {
    console.error('getAsientosDisponibles:', error)
    return []
  }
}

export async function getCursosLibres(soloActivos = true) {
  try {
    await ensureCursoInglesDemo()
    if (!prisma.cursoLibre?.findMany) {
      const rows = await prisma.$queryRaw`
        SELECT c.*, l.nombre AS lab_nombre, l.codigo AS lab_codigo
        FROM curso_libre c
        JOIN laboratorio l ON l.id = c.laboratorio_id
        WHERE (${soloActivos} = false OR c.activo = true)
        ORDER BY c.nombre ASC
      `
      return rows.map((c) => ({
        ...c,
        laboratorio: { id: c.laboratorio_id, nombre: c.lab_nombre, codigo: c.lab_codigo },
        examenes: [],
        inscripciones: [],
        _count: { inscripciones: 0 },
      }))
    }
    return await prisma.cursoLibre.findMany({
      where: soloActivos ? { activo: true } : undefined,
      include: {
        laboratorio: { select: { id: true, nombre: true, codigo: true } },
        examenes: { orderBy: { orden: 'asc' } },
        inscripciones: { select: { id: true, usuarioId: true, estado: true } },
        _count: { select: { inscripciones: true } },
      },
      orderBy: { nombre: 'asc' },
    })
  } catch (error) {
    console.error('getCursosLibres:', error)
    return []
  }
}

export async function crearCursoLibre(formData) {
  try {
    await requireServerRole('ADMIN', 'TEACHER')
    const codigo = String(formData.get('codigo') || '').trim().toUpperCase()
    const nombre = String(formData.get('nombre') || '').trim()
    const descripcion = String(formData.get('descripcion') || '').trim() || null
    const laboratorioId = Number(formData.get('laboratorioId'))
    const tipo = String(formData.get('tipo') || 'GENERAL')
    const duracionMinutos = parseInt(formData.get('duracionMinutos') || '60', 10)
    const examenesAnuales = parseInt(formData.get('examenesAnuales') || '0', 10)
    const usaLLM = formData.get('usaLLM') === 'on'
    const certificadoUSPG = formData.get('certificadoUSPG') === 'on'

    if (!codigo || !nombre || !laboratorioId) {
      return { success: false, error: 'Código, nombre y laboratorio son obligatorios.' }
    }

    await ensureAsientosLaboratorio(laboratorioId)

    const curso = await prisma.cursoLibre.create({
      data: {
        codigo,
        nombre,
        descripcion,
        laboratorioId,
        tipo,
        usaLLM,
        certificadoUSPG,
        examenesAnuales,
        duracionMinutos,
        activo: true,
      },
    })

    for (let i = 1; i <= examenesAnuales; i += 1) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() + i * 2)
      await prisma.examenCurso.create({
        data: {
          cursoLibreId: curso.id,
          nombre: `Evaluación ${i}`,
          fechaProgramada: fecha,
          orden: i,
        },
      })
    }

    revalidatePath('/laboratorios')
    return { success: true }
  } catch (error) {
    console.error('crearCursoLibre:', error)
    if (error.code === 'P2002') return { success: false, error: 'El código del curso ya existe.' }
    return { success: false, error: 'No se pudo crear el curso libre.' }
  }
}

export async function inscribirCursoLibre(cursoLibreId) {
  try {
    const jwtUser = await getServerUser()
    if (!jwtUser) return { success: false, error: 'Debe iniciar sesión.' }

    const labUsuario = await getOrCreateLabUsuario(jwtUser)
    const eligibility = await getLabEligibility(jwtUser, labUsuario)
    if (!eligibility.canReserve && jwtUser.role === 'STUDENT') {
      return { success: false, error: eligibility.reason || 'No cumples los requisitos.' }
    }

    const curso = await prisma.cursoLibre.findUnique({ where: { id: cursoLibreId, activo: true } })
    if (!curso) return { success: false, error: 'Curso no encontrado.' }

    await prisma.cursoLibreInscripcion.upsert({
      where: { cursoLibreId_usuarioId: { cursoLibreId, usuarioId: labUsuario.id } },
      create: { cursoLibreId, usuarioId: labUsuario.id, estado: 'ACTIVA' },
      update: { estado: 'ACTIVA' },
    })

    revalidatePath('/laboratorios')
    return { success: true }
  } catch (error) {
    console.error('inscribirCursoLibre:', error)
    return { success: false, error: 'No se pudo completar la inscripción.' }
  }
}

export async function toggleCursoLibreActivo(cursoLibreId, activo) {
  try {
    await requireServerRole('ADMIN')
    await prisma.cursoLibre.update({ where: { id: cursoLibreId }, data: { activo } })
    revalidatePath('/laboratorios')
    return { success: true }
  } catch (error) {
    console.error('toggleCursoLibreActivo:', error)
    return { success: false, error: 'No se pudo actualizar el curso.' }
  }
}

const equiposRemotosEnsured = new Map()

async function ensureEquiposRemotos(laboratorioId) {
  const labId = Number(laboratorioId)
  if (equiposRemotosEnsured.has(labId)) {
    return equiposRemotosEnsured.get(labId)
  }

  const task = (async () => {
    for (let numero = 1; numero <= DEFAULT_COLUMNAS; numero += 1) {
      const etiqueta = etiquetaAsiento(FILA_ACCESO_REMOTO, numero)
      const codigo = `PC-${etiqueta}`
      try {
        if (prisma.equipo?.upsert) {
          await prisma.equipo.upsert({
            where: { codigoInventario: codigo },
            create: {
              laboratorioId: labId,
              codigoInventario: codigo,
              nombre: `Workstation ${etiqueta} (alto rendimiento)`,
              esServidor: true,
              estado: 'OPERATIVO',
              ubicacionFisica: `Fila ${FILA_ACCESO_REMOTO}, puesto ${numero}`,
            },
            update: {},
          })
        } else {
          await prisma.$executeRaw`
            INSERT INTO equipo (
              laboratorio_id, codigo_inventario, nombre, es_servidor, estado,
              ubicacion_fisica, created_at, updated_at
            ) VALUES (
              ${labId}, ${codigo}, ${`Workstation ${etiqueta} (alto rendimiento)`},
              true, 'OPERATIVO', ${`Fila ${FILA_ACCESO_REMOTO}, puesto ${numero}`},
              NOW(), NOW()
            )
            ON CONFLICT (codigo_inventario) DO NOTHING
          `
        }
      } catch (error) {
        if (error?.code !== 'P2002') throw error
      }
    }
  })()

  equiposRemotosEnsured.set(labId, task)
  try {
    await task
  } finally {
    equiposRemotosEnsured.delete(labId)
  }
}

async function resolverEquipoRemoto(laboratorioId, etiquetaAsientoReserva) {
  const codigo = `PC-${etiquetaAsientoReserva}`
  let equipo = await prisma.equipo.findUnique({ where: { codigoInventario: codigo } })
  if (!equipo) {
    await ensureEquiposRemotos(laboratorioId)
    equipo = await prisma.equipo.findUnique({ where: { codigoInventario: codigo } })
  }
  return equipo
}

export async function iniciarSesionRemota(reservaId) {
  try {
    const jwtUser = await getServerUser()
    if (!jwtUser) return { success: false, error: 'Debe iniciar sesión.' }

    const labUsuario = await getOrCreateLabUsuario(jwtUser)
    if (!labUsuario) return { success: false, error: 'Usuario de laboratorio no encontrado.' }

    const reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
      include: {
        asientosReservados: { include: { asiento: true } },
        laboratorio: { select: { id: true, nombre: true } },
      },
    })

    if (!reserva || reserva.usuarioId !== labUsuario.id) {
      return { success: false, error: 'Reserva no encontrada.' }
    }

    const acceso = evaluarAccesoRemoto(reserva)
    if (!acceso.puede) {
      return { success: false, error: acceso.razon }
    }

    const sesionAbierta = await prisma.sesionUso.findFirst({
      where: { usuarioId: labUsuario.id, tipoConexion: 'REMOTA', fin: null },
    })
    if (sesionAbierta) {
      return { success: true, sesion: sesionAbierta, yaActiva: true }
    }

    const equipo = await resolverEquipoRemoto(reserva.laboratorioId, acceso.etiqueta)

    const sesion = await prisma.sesionUso.create({
      data: {
        usuarioId: labUsuario.id,
        laboratorioId: reserva.laboratorioId,
        equipoId: equipo?.id ?? null,
        tipoConexion: 'REMOTA',
        registroActividad: {
          simulado: true,
          reservaId: reserva.id,
          asientoEtiqueta: acceso.etiqueta,
          host: acceso.host,
          laboratorio: reserva.laboratorio?.nombre,
        },
      },
      include: {
        laboratorio: { select: { nombre: true } },
        equipo: { select: { nombre: true, codigoInventario: true } },
      },
    })

    revalidatePath('/laboratorios')
    return { success: true, sesion }
  } catch (error) {
    console.error('iniciarSesionRemota:', error)
    return { success: false, error: 'No se pudo iniciar la sesión remota.' }
  }
}

export async function finalizarSesionRemota(sesionId) {
  try {
    const jwtUser = await getServerUser()
    if (!jwtUser) return { success: false, error: 'Debe iniciar sesión.' }

    const labUsuario = await getOrCreateLabUsuario(jwtUser)
    if (!labUsuario) return { success: false, error: 'Usuario no encontrado.' }

    const sesion = await prisma.sesionUso.findUnique({ where: { id: sesionId } })
    if (!sesion || sesion.usuarioId !== labUsuario.id) {
      return { success: false, error: 'Sesión no encontrada.' }
    }
    if (sesion.fin) {
      return { success: false, error: 'La sesión ya fue cerrada.' }
    }

    const fin = new Date()
    const minutos = minutosTranscurridos(sesion.inicio, fin)
    const meta = sesion.registroActividad || {}

    await prisma.sesionUso.update({
      where: { id: sesionId },
      data: {
        fin,
        registroActividad: { ...meta, minutosUsados: minutos, cerradaEn: fin.toISOString() },
      },
    })

    const eligibility = await getLabEligibility(jwtUser, labUsuario)
    let montoCobrado = 0

    if (eligibility.modoCobro === 'PAGO_HORA' && minutos > 0) {
      montoCobrado = montoPorMinutos(minutos)
      await prisma.pago.create({
        data: {
          usuarioId: labUsuario.id,
          laboratorioId: sesion.laboratorioId,
          reservaId: meta.reservaId || null,
          monto: montoCobrado,
          tipoCobro: 'PAGO_HORA',
          metodoPago: 'PENDIENTE_FIN_MES',
          estado: 'PENDIENTE',
          notas: `Sesión remota simulada · ${minutos} min · ${meta.asientoEtiqueta || '—'}`,
        },
      })
    }

    revalidatePath('/laboratorios')
    return {
      success: true,
      minutos,
      montoCobrado,
      incluidoEnCuota: eligibility.modoCobro === 'INCLUIDO',
    }
  } catch (error) {
    console.error('finalizarSesionRemota:', error)
    return { success: false, error: 'No se pudo cerrar la sesión.' }
  }
}

export async function getUsuariosSelect() {
  try {
    return await prisma.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellido: true, correo: true, rol: true },
      orderBy: { nombre: 'asc' },
    })
  } catch {
    return []
  }
}
