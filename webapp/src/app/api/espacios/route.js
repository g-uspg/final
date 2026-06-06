import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const espacios = await prisma.espacio.findMany({
            where: {
                activo: true
            },
            include: {
                reservasEspacio: {
                    where: {
                        estado: 'APROBADA'
                    },
                    orderBy: {
                        fechaInicio: 'asc'
                    }
                }
            },
            orderBy: {
                nombre: 'asc'
            }
        })

        return Response.json({
            success: true,
            data: espacios
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

export async function POST(request) {
    try {
        const body = await request.json()

        const {
            codigo,
            nombre,
            tipo,
            capacidad,
            ubicacion,
            descripcion,
            piso
        } = body

        if (!codigo || !nombre || !tipo || !capacidad || !ubicacion) {
            return Response.json(
                {
                    success: false,
                    error: 'Todos los campos obligatorios deben enviarse'
                },
                {
                    status: 400
                }
            )
        }

        const existe = await prisma.espacio.findUnique({
            where: {
                codigo
            }
        })

        if (existe) {
            return Response.json(
                {
                    success: false,
                    error: `Ya existe un espacio con código ${codigo}`
                },
                {
                    status: 409
                }
            )
        }

        const espacio = await prisma.espacio.create({
            data: {
                codigo,
                nombre,
                tipo,
                capacidad: parseInt(capacidad),
                ubicacion,
                descripcion: descripcion || null,
                piso: piso || null,
                estado: 'DISPONIBLE',
                activo: true
            }
        })

        return Response.json(
            {
                success: true,
                data: espacio
            },
            {
                status: 201
            }
        )
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