import { prisma } from '@/lib/prisma'
import AdministracionDashboard from './AdministracionDashboard'
import { ToastProvider } from './components/ToastProvider'
import { cookies } from 'next/headers'
import { getReservasPendientes, getReportesAbiertos, getPrestamos } from './actions'

export default async function AdministracionPage() {
  // ✅ Fix: await cookies() en Next.js 15
  const cookieStore = await cookies()
  const userRole = cookieStore.get('userRole')?.value || 'ADMIN'

  const [
    espacios,
    reservasPendientes,
    reservasHoy,
    reportesAbiertos,
    usuarios,
    equipos,
    prestamos,
    limpiezas,
  ] = await Promise.all([
    prisma.espacio.findMany({
      where: { activo: true },
      include: {
        reservasEspacio: {
          where: { estado: 'APROBADA', fechaInicio: { gte: new Date() } },
          orderBy: { fechaInicio: 'asc' },
          take: 3,
        },
      },
      orderBy: { nombre: 'asc' },
    }),
    getReservasPendientes(),   // ✅ incluye _solicitanteId con nombre real
    prisma.reservaEspacio.findMany({
      where: {
        estado:     'APROBADA',
        fechaInicio: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        fechaFin:    { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      },
      include: { espacio: true },
    }),
    getReportesAbiertos(),     // ✅ incluye _reportadoPorId con nombre real
    prisma.user.findMany({
      where:   { role: { in: ['TEACHER', 'ADMIN'] }, is_active: true },
      select:  { id: true, first_name: true, last_name: true, carnet: true },
      orderBy: { last_name: 'asc' },
    }),
    prisma.equipo.findMany({
      include: { espacio: { select: { id: true, nombre: true, codigo: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    getPrestamos(),            // ✅ marca vencidos automáticamente + nombre del solicitante
    prisma.programaLimpieza.findMany({
      where:   { estado: { in: ['PROGRAMADA', 'EN_PROCESO'] } },
      include: { espacio: { select: { id: true, nombre: true, codigo: true } } },
      orderBy: { fechaProgramada: 'asc' },
    }),
  ])

  const stats = {
    totalEspacios:       espacios.length,
    espaciosDisponibles: espacios.filter(e => e.estado === 'DISPONIBLE').length,
    reservasHoy:         reservasHoy.length,
    reservasPendientes:  reservasPendientes.length,
    reportesAbiertos:    reportesAbiertos.length,
    reportesUrgentes:    reportesAbiertos.filter(r => r.prioridad === 'URGENTE').length,
    equiposDisponibles:  equipos.filter(e => e.estado === 'DISPONIBLE' && e.esMovil).length,
    prestamosActivos:    prestamos.filter(p => p.estado === 'ACTIVO').length,
    limpiezasPendientes: limpiezas.filter(l => l.estado === 'PROGRAMADA').length,
  }

  return (
      <ToastProvider>
        <AdministracionDashboard
            initialData={{
              espacios,
              reservasPendientes,
              reservasHoy,
              reportesAbiertos,
              usuarios,
              equipos,
              prestamos,
              limpiezas,
              stats,
            }}
            userRole={userRole}
        />
      </ToastProvider>
  )
}