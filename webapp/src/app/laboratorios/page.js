import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/server-auth'
import { isLabAdminRole, isLabClientRole } from '@/lib/laboratorios/usuario-lab'
import { getDashboardData, getUsuariosSelect, getClientPortalData } from './actions'
import { serialize } from '@/lib/serialize'
import LaboratoriosDashboard from './LaboratoriosDashboard'
import LaboratoriosClienteDashboard from './LaboratoriosClienteDashboard'

export const dynamic = 'force-dynamic'

export default async function LaboratoriosPage() {
  const user = await getServerUser()
  if (!user) redirect('/login?redirect=/laboratorios')

  if (isLabClientRole(user.role)) {
    const clientData = await getClientPortalData()
    if (!clientData) redirect('/login?redirect=/laboratorios')
    return <LaboratoriosClienteDashboard initialData={serialize(clientData)} />
  }

  if (isLabAdminRole(user.role)) {
    const [data, usuarios] = await Promise.all([getDashboardData(), getUsuariosSelect()])
    return (
      <LaboratoriosDashboard
        initialData={serialize({ ...data, usuarios })}
      />
    )
  }

  redirect('/login?redirect=/laboratorios')
}
