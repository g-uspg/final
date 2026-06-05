import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/server-auth'
import { isLabAdminRole, isLabClientRole } from '@/lib/laboratorios/usuario-lab'
import { getLaboratorioById, getUsuariosSelect, getLaboratorioClienteData } from '../actions'
import { serialize } from '@/lib/serialize'
import LaboratorioDetail from './LaboratorioDetail'
import LaboratorioClienteDetail from './LaboratorioClienteDetail'

export const dynamic = 'force-dynamic'

export default async function LaboratorioDetailPage({ params }) {
  const user = await getServerUser()
  if (!user) redirect('/login?redirect=/laboratorios')

  const { id } = await params

  if (isLabClientRole(user.role)) {
    const data = await getLaboratorioClienteData(id)
    if (!data) notFound()
    return (
      <LaboratorioClienteDetail
        laboratorio={serialize(data.laboratorio)}
        labUsuario={serialize(data.labUsuario)}
        eligibility={serialize(data.eligibility)}
      />
    )
  }

  if (isLabAdminRole(user.role)) {
    const [lab, usuarios] = await Promise.all([
      getLaboratorioById(id),
      getUsuariosSelect(),
    ])
    if (!lab) notFound()
    return <LaboratorioDetail laboratorio={serialize(lab)} usuarios={serialize(usuarios)} />
  }

  redirect('/login?redirect=/laboratorios')
}
