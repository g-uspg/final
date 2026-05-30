import { getDashboardData, getUsuariosSelect } from './actions'
import { serialize } from '@/lib/serialize'
import LaboratoriosDashboard from './LaboratoriosDashboard'

export const dynamic = 'force-dynamic'

export default async function LaboratoriosPage() {
  const data = await getDashboardData()
  const usuarios = await getUsuariosSelect()

  return (
    <LaboratoriosDashboard
      initialData={serialize({ ...data, usuarios })}
    />
  )
}
