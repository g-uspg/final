const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de carreras USPG...");

  // ── CARRERAS ──────────────────────────────────────────────────────────────

  const carreras = [
    // Licenciaturas
    { codigo: "ADE", nombre: "Administración de Empresas con especialidad en Emprendimiento", facultad: "Ciencias Empresariales", nivel: "LICENCIATURA" },
    { codigo: "ADR", nombre: "Administración de Empresas con Especialización en Retail", facultad: "Ciencias Empresariales", nivel: "LICENCIATURA" },
    { codigo: "ISC", nombre: "Ingeniería en Sistemas y Ciencias de la Computación", facultad: "Ingeniería", nivel: "LICENCIATURA" },
    { codigo: "ITI", nombre: "Ingeniería en Tecnología Industrial", facultad: "Ingeniería", nivel: "LICENCIATURA" },
    { codigo: "IAG", nombre: "Ingeniería Agronómica", facultad: "Ciencias Agrícolas", nivel: "LICENCIATURA" },
    { codigo: "PSI", nombre: "Psicología Industrial y Comportamiento Organizacional", facultad: "Ciencias Humanísticas", nivel: "LICENCIATURA" },
    { codigo: "MKT", nombre: "Marketing Estratégico con especialidad en e-commerce", facultad: "Ciencias Empresariales", nivel: "LICENCIATURA" },
    { codigo: "DGF", nombre: "Diseño Gráfico y Fotografía", facultad: "Artes y Diseño", nivel: "LICENCIATURA" },
    { codigo: "ARI", nombre: "Arquitectura Integral", facultad: "Arquitectura", nivel: "LICENCIATURA" },
    { codigo: "CJS", nombre: "Ciencias Jurídicas y Sociales", facultad: "Derecho", nivel: "LICENCIATURA" },
    { codigo: "TEP", nombre: "Teología Práctica", facultad: "Teología", nivel: "LICENCIATURA" },
    { codigo: "TBM", nombre: "Teología Bíblica y Ministerio", facultad: "Teología", nivel: "LICENCIATURA" },
    // Programas de Actualización
    { codigo: "PAAM", nombre: "Programa de Actualización y Acreditación Ministerial", facultad: "Teología", nivel: "LICENCIATURA" },
    { codigo: "PAAG", nombre: "Programa de Actualización y Acreditación Gerencial", facultad: "Ciencias Empresariales", nivel: "LICENCIATURA" },
    // Maestrías
    { codigo: "MLO", nombre: "Maestría en Liderazgo Organizacional", facultad: "Posgrados", nivel: "MAESTRIA" },
    { codigo: "MBA", nombre: "Maestría en Business Administration", facultad: "Posgrados", nivel: "MAESTRIA" },
    { codigo: "MAC", nombre: "Maestría en Artroplastia de Rodilla y Cadera", facultad: "Ciencias de la Salud", nivel: "MAESTRIA" },
    { codigo: "MET", nombre: "Maestría en Estudios Teológicos y Liderazgo", facultad: "Teología", nivel: "MAESTRIA" },
    { codigo: "MGG", nombre: "Maestría en Geriatría y Gerontología", facultad: "Ciencias de la Salud", nivel: "MAESTRIA" },
    { codigo: "MGR", nombre: "Maestría en Gestión Integral del Riesgo", facultad: "Posgrados", nivel: "MAESTRIA" },
    { codigo: "MPD", nombre: "Maestría en Planificación, Desarrollo y Evaluación Docente", facultad: "Educación", nivel: "MAESTRIA" },
    { codigo: "MSR", nombre: "Maestría en Sociología de la Religión y Liderazgo", facultad: "Teología", nivel: "MAESTRIA" },
    { codigo: "MDF", nombre: "Maestría en Derecho de Familia", facultad: "Derecho", nivel: "MAESTRIA" },
    { codigo: "MPI", nombre: "Maestría en Propiedad Intelectual y Fundamentos Constitucionales", facultad: "Derecho", nivel: "MAESTRIA" },
    // Doctorados
    { codigo: "DLO", nombre: "Doctorado en Liderazgo Organizacional", facultad: "Posgrados", nivel: "DOCTORADO" },
    { codigo: "DBA", nombre: "Doctorado en Business Administration", facultad: "Posgrados", nivel: "DOCTORADO" },
  ];

  for (const carrera of carreras) {
    const existe = await prisma.carrera.findUnique({ where: { codigo: carrera.codigo } });
    if (!existe) {
      await prisma.carrera.create({ data: carrera });
      console.log(`✅ Carrera creada: ${carrera.codigo} — ${carrera.nombre}`);
    } else {
      console.log(`⏭️  Ya existe: ${carrera.codigo} — ${carrera.nombre}`);
    }
  }

  // ── CURSOS BASE (Ingeniería en Sistemas) ──────────────────────────────────

  console.log("\n🌱 Creando cursos base para ISC...");

  const cursosISC = [
    { codigo: "ISC-101", nombre: "Matemática 1", creditos: 5 },
    { codigo: "ISC-102", nombre: "Física 1", creditos: 5 },
    { codigo: "ISC-103", nombre: "Introducción a la Programación", creditos: 4 },
    { codigo: "ISC-104", nombre: "Algebra Lineal", creditos: 4 },
    { codigo: "ISC-105", nombre: "Ética Profesional", creditos: 3 },
    { codigo: "ISC-201", nombre: "Matemática 2", creditos: 5 },
    { codigo: "ISC-202", nombre: "Física 2", creditos: 5 },
    { codigo: "ISC-203", nombre: "Programación Orientada a Objetos", creditos: 4 },
    { codigo: "ISC-204", nombre: "Estructura de Datos", creditos: 4 },
    { codigo: "ISC-205", nombre: "Bases de Datos 1", creditos: 4 },
    { codigo: "ISC-301", nombre: "Algoritmos y Complejidad", creditos: 4 },
    { codigo: "ISC-302", nombre: "Bases de Datos 2", creditos: 4 },
    { codigo: "ISC-303", nombre: "Redes de Computadoras", creditos: 4 },
    { codigo: "ISC-304", nombre: "Ingeniería de Software", creditos: 4 },
    { codigo: "ISC-305", nombre: "Arquitectura de Computadoras", creditos: 4 },
    { codigo: "ISC-401", nombre: "Desarrollo Web", creditos: 4 },
    { codigo: "ISC-402", nombre: "Inteligencia Artificial", creditos: 4 },
    { codigo: "ISC-403", nombre: "Seguridad Informática", creditos: 4 },
    { codigo: "ISC-404", nombre: "Sistemas Operativos", creditos: 4 },
    { codigo: "ISC-405", nombre: "Proyecto Final", creditos: 6 },
  ];

  for (const curso of cursosISC) {
    const existe = await prisma.curso.findUnique({ where: { codigo: curso.codigo } });
    if (!existe) {
      await prisma.curso.create({ data: curso });
      console.log(`✅ Curso creado: ${curso.codigo} — ${curso.nombre}`);
    } else {
      console.log(`⏭️  Ya existe: ${curso.codigo}`);
    }
  }

  // ── PLAN DE ESTUDIO ISC 2026 ───────────────────────────────────────────────

  console.log("\n🌱 Creando plan de estudio ISC 2026...");

  const carreraISC = await prisma.carrera.findUnique({ where: { codigo: "ISC" } });

  const planISC = await prisma.planEstudio.upsert({
    where: { id: 1 },
    update: {},
    create: {
      carreraId: carreraISC.id,
      nombre: "Pensum Ingeniería en Sistemas 2026",
      version: "2026-A",
      totalCreditos: 200,
      activo: true,
    },
  });

  const cursosPlan = [
    { codigo: "ISC-101", semestre: 1 },
    { codigo: "ISC-102", semestre: 1 },
    { codigo: "ISC-103", semestre: 1 },
    { codigo: "ISC-104", semestre: 1 },
    { codigo: "ISC-105", semestre: 1 },
    { codigo: "ISC-201", semestre: 2 },
    { codigo: "ISC-202", semestre: 2 },
    { codigo: "ISC-203", semestre: 2 },
    { codigo: "ISC-204", semestre: 2 },
    { codigo: "ISC-205", semestre: 2 },
    { codigo: "ISC-301", semestre: 3 },
    { codigo: "ISC-302", semestre: 3 },
    { codigo: "ISC-303", semestre: 3 },
    { codigo: "ISC-304", semestre: 3 },
    { codigo: "ISC-305", semestre: 3 },
    { codigo: "ISC-401", semestre: 4 },
    { codigo: "ISC-402", semestre: 4 },
    { codigo: "ISC-403", semestre: 4 },
    { codigo: "ISC-404", semestre: 4 },
    { codigo: "ISC-405", semestre: 4 },
  ];

  for (const cp of cursosPlan) {
    const curso = await prisma.curso.findUnique({ where: { codigo: cp.codigo } });
    if (curso) {
      const existe = await prisma.cursoPlan.findUnique({
        where: { planEstudioId_cursoId: { planEstudioId: planISC.id, cursoId: curso.id } },
      });
      if (!existe) {
        await prisma.cursoPlan.create({
          data: { planEstudioId: planISC.id, cursoId: curso.id, semestre: cp.semestre, obligatorio: true },
        });
        console.log(`✅ Curso ${cp.codigo} agregado al plan ISC 2026-A`);
      }
    }
  }

  console.log("\n✅ Seed completado exitosamente.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });