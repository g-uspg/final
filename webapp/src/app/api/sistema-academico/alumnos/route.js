import { PrismaClient } from "@prisma/client";
import { enviarCorreoBienvenidaConQR } from "@/lib/email";

const prisma = new PrismaClient();

function normalizar(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function generarCorreoInstitucional(nombre, apellido) {
  const base    = `${normalizar(nombre.split(" ")[0])}.${normalizar(apellido.split(" ")[0])}`;
  const dominio = "alumno.uspg.edu.gt";
  const baseEmail = `${base}@${dominio}`;
  const existe = await prisma.alumno.findUnique({ where: { correoInstitucional: baseEmail } });
  if (!existe) return baseEmail;
  const similares = await prisma.alumno.findMany({ where: { correoInstitucional: { startsWith: base } }, select: { correoInstitucional: true } });
  const sufijos = similares.map(a => { const m = a.correoInstitucional?.match(new RegExp(`^${base}(\\d+)@`)); return m ? parseInt(m[1]) : 1; }).filter(n => !isNaN(n));
  const max = sufijos.length > 0 ? Math.max(...sufijos) : 1;
  return `${base}${String(max + 1).padStart(2, "0")}@${dominio}`;
}

async function generarCarnetAutomatico() {
  const ultimo = await prisma.alumno.findFirst({ where: { carnet: { startsWith: "260" } }, orderBy: { carnet: "desc" }, select: { carnet: true } });
  if (!ultimo) return "2600001";
  return `260${String(parseInt(ultimo.carnet.slice(3)) + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const alumnos = await prisma.alumno.findMany({ include: { asignaciones: true, carrera: true }, orderBy: { createdAt: "desc" } });
    return Response.json({ success: true, data: alumnos });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, apellido, email, carreraId, autoCarnet } = body;
    if (!nombre || !apellido || !email) return Response.json({ success: false, error: "nombre, apellido y email son requeridos" }, { status: 400 });
    let carnet = autoCarnet ? await generarCarnetAutomatico() : body.carnet?.trim();
    if (!carnet) return Response.json({ success: false, error: "El carnet es requerido para alumnos existentes" }, { status: 400 });
    const existeCarnet = await prisma.alumno.findUnique({ where: { carnet } });
    if (existeCarnet) return Response.json({ success: false, error: `El carnet ${carnet} ya está registrado` }, { status: 409 });
    const existeEmail = await prisma.alumno.findUnique({ where: { email } });
    if (existeEmail) return Response.json({ success: false, error: `El correo ${email} ya está registrado` }, { status: 409 });
    const correoInstitucional = autoCarnet ? await generarCorreoInstitucional(nombre, apellido) : null;
    const alumno = await prisma.alumno.create({ data: { carnet, nombre, apellido, email, correoInstitucional, carreraId: carreraId ?? null } });
    enviarCorreoBienvenidaConQR({ nombre: alumno.nombre, apellido: alumno.apellido, email: alumno.email, carnet: alumno.carnet, correoInstitucional: alumno.correoInstitucional }).catch(err => console.error("[email]", err.message));
    return Response.json({ success: true, data: alumno, message: `Alumno registrado con carnet ${alumno.carnet}${alumno.correoInstitucional ? ` y correo ${alumno.correoInstitucional}` : ""}.` }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
