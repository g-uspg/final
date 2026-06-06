/**
 * Vincula est001/est002/est003 (parqueo) con grupo1_academico + matrícula grupo6.
 * Idempotente — se puede ejecutar varias veces.
 *
 * Uso: npm run seed:lab-estudiantes
 */
import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DEMO_ESTUDIANTES = [
  {
    email: 'est001@uspg.edu.gt',
    carnet: '2021-0001',
    nombre: 'Carlos',
    apellido: 'Pérez',
    qr: 'USP-QR-EST-001',
  },
  {
    email: 'est002@uspg.edu.gt',
    carnet: '2021-0002',
    nombre: 'Ana',
    apellido: 'García',
    qr: 'USP-QR-EST-002',
  },
  {
    email: 'est003@uspg.edu.gt',
    carnet: '2022-0003',
    nombre: 'Luis',
    apellido: 'Herrera',
    qr: 'USP-QR-EST-003',
  },
];

function semestreActual() {
  const now = new Date();
  const anio = now.getFullYear();
  const ciclo = now.getMonth() < 6 ? 'I' : 'II';
  return { anio, ciclo };
}

async function obtenerCarreraId(client) {
  const { rows } = await client.query(`
    SELECT id FROM grupo1_academico."Carrera"
    ORDER BY id ASC
    LIMIT 1
  `);
  if (rows[0]?.id) return rows[0].id;

  const inserted = await client.query(`
    INSERT INTO grupo1_academico."Carrera"(codigo, nombre, facultad, nivel)
    VALUES ('ING-SIS', 'Ingeniería en Sistemas', 'Ingeniería', 'LICENCIATURA')
    ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id
  `);
  return inserted.rows[0].id;
}

async function obtenerFormaPagoId(client) {
  const { rows } = await client.query(`
    SELECT id_forma_pago FROM grupo6_pago_alumnos.forma_pago
    ORDER BY id_forma_pago ASC
    LIMIT 1
  `);
  if (rows[0]?.id_forma_pago) return rows[0].id_forma_pago;

  const inserted = await client.query(`
    INSERT INTO grupo6_pago_alumnos.forma_pago (nombre)
    VALUES ('Efectivo')
    RETURNING id_forma_pago
  `);
  return inserted.rows[0].id_forma_pago;
}

async function upsertAlumno(client, { carnet, nombre, apellido, email, parqueoUserId, carreraId }) {
  await client.query(
    `
    INSERT INTO grupo1_academico."Alumno"
      (carnet, nombre, apellido, email, "carreraId", parqueo_user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (carnet) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      email = EXCLUDED.email,
      "carreraId" = COALESCE(EXCLUDED."carreraId", grupo1_academico."Alumno"."carreraId"),
      parqueo_user_id = COALESCE(EXCLUDED.parqueo_user_id, grupo1_academico."Alumno".parqueo_user_id)
    `,
    [carnet, nombre, apellido, email, carreraId, parqueoUserId]
  );
}

async function upsertMatricula(client, { carnet, ciclo, anio, idFormaPago, precio = 4500 }) {
  const { rows: existente } = await client.query(
    `
    SELECT id_matricula FROM grupo6_pago_alumnos.matricula
    WHERE carnet = $1 AND ciclo = $2 AND anio = $3
    `,
    [carnet, ciclo, anio]
  );

  if (existente.length > 0) {
    await client.query(
      `
      UPDATE grupo6_pago_alumnos.matricula
      SET estado = 'Confirmado', fecha_pago = CURRENT_DATE
      WHERE id_matricula = $1
      `,
      [existente[0].id_matricula]
    );
    return { id: existente[0].id_matricula, created: false };
  }

  const { rows } = await client.query(
    `
    INSERT INTO grupo6_pago_alumnos.matricula
      (carnet, ciclo, anio, fecha_pago, precio, id_forma_pago, estado)
    VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'Confirmado')
    RETURNING id_matricula
    `,
    [carnet, ciclo, anio, precio, idFormaPago]
  );

  const idMatricula = rows[0].id_matricula;

  await client.query(
    `
    INSERT INTO grupo6_pago_alumnos.recibos
      (carnet, id_referencia, tipo_referencia, monto_total, estado_validacion)
    VALUES ($1, $2, 'Matricula', $3, 'Emitido')
    ON CONFLICT DO NOTHING
    `,
    [carnet, idMatricula, precio]
  ).catch(() => {});

  return { id: idMatricula, created: true };
}

async function syncUsuarioLab(client, { email, parqueoUserId, carnet, nombre, apellido }) {
  await client.query(
    `
    UPDATE grupo3_laboratorios.usuario
    SET parqueo_user_id = $1, carnet = $2, nombre = $3, apellido = $4
    WHERE LOWER(correo) = LOWER($5)
    `,
    [parqueoUserId, carnet, nombre, apellido, email]
  );
}

async function main() {
  const client = await pool.connect();
  const { anio, ciclo } = semestreActual();

  try {
    console.log(`\n🌱 Seed estudiantes laboratorios — semestre ${ciclo}-${anio}\n`);

    const carreraId = await obtenerCarreraId(client);
    const idFormaPago = await obtenerFormaPagoId(client);

    for (const est of DEMO_ESTUDIANTES) {
      const { rows: users } = await client.query(
        `
        SELECT id, email, carnet, first_name, last_name
        FROM auth."User"
        WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
        LIMIT 1
        `,
        [est.email]
      );

      if (users.length === 0) {
        console.warn(`  ⚠ Usuario parqueo no encontrado: ${est.email} (ejecuta npm run seed primero)`);
        continue;
      }

      const user = users[0];
      const parqueoUserId = user.id;

      await upsertAlumno(client, {
        carnet: est.carnet,
        nombre: est.nombre,
        apellido: est.apellido,
        email: est.email,
        parqueoUserId,
        carreraId,
      });

      const mat = await upsertMatricula(client, {
        carnet: est.carnet,
        ciclo,
        anio,
        idFormaPago,
      });

      await syncUsuarioLab(client, {
        email: est.email,
        parqueoUserId,
        carnet: est.carnet,
        nombre: est.nombre,
        apellido: est.apellido,
      });

      console.log(
        `  ✅ ${est.email} | carnet ${est.carnet} | matrícula ${mat.created ? 'creada' : 'actualizada'} (#${mat.id})`
      );
    }

    console.log('\n✅ Listo. Cuenta de prueba recomendada: est002@uspg.edu.gt / Student2026!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
});
