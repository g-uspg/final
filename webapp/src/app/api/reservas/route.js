import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const reservas = await prisma.reservaEspacio.findMany({
            include: {
                espacio: true
            },
            orderBy: {
                fechaInicio: 'desc'
            }
        })

        return Response.json({
            success: true,
            data: reservas
        })
    } catch (error) {
        return Response.json(
            {
                success: false,
                error: error.message
            },
            {
                status: 500
            }
        )
    }
}