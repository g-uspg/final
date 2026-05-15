import { PrismaClient, Role, Zone, SpaceType, SpaceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:admin123@localhost:5432/parqueo_db', ssl: false });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.barrierLog.deleteMany();
  await prisma.blacklist.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.visitorQR.deleteMany();
  await prisma.parkingSpace.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();

  const campus = await prisma.campus.create({
    data: {
      id: uuidv4(),
      name: 'Campus Central USPG',
      address: 'Calzada Roosevelt Zona 11, Guatemala City',
      lat: 14.5847,
      lng: -90.5085,
      total_spaces: 500,
    },
  });
  console.log('✅ Campus created');

  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  const admin = await prisma.user.create({
    data: {
      id: uuidv4(), email: 'admin@uspg.edu.gt', password_hash: hash('Admin1234!'),
      first_name: 'Carlos', last_name: 'Mendoza', role: Role.ADMIN,
      qr_code: uuidv4(), is_active: true,
    },
  });

  const teachers = await Promise.all([
    prisma.user.create({ data: { id: uuidv4(), email: 'prof.garcia@uspg.edu.gt', password_hash: hash('Teacher123!'), first_name: 'María', last_name: 'García', role: Role.TEACHER, qr_code: uuidv4(), is_active: true } }),
    prisma.user.create({ data: { id: uuidv4(), email: 'prof.lopez@uspg.edu.gt', password_hash: hash('Teacher123!'), first_name: 'Roberto', last_name: 'López', role: Role.TEACHER, qr_code: uuidv4(), is_active: true } }),
    prisma.user.create({ data: { id: uuidv4(), email: 'prof.martinez@uspg.edu.gt', password_hash: hash('Teacher123!'), first_name: 'Ana', last_name: 'Martínez', role: Role.TEACHER, qr_code: uuidv4(), is_active: true } }),
  ]);

  const studentNames = [
    ['Luis', 'Pérez'], ['Sofia', 'Rodríguez'], ['Diego', 'Hernández'], ['Valentina', 'González'],
    ['Andrés', 'Díaz'], ['Isabella', 'Torres'], ['Sebastián', 'Ramírez'], ['Camila', 'Flores'],
    ['Mateo', 'Reyes'], ['Daniela', 'Cruz'], ['Juan', 'Morales'], ['Paula', 'Jiménez'],
    ['Miguel', 'Sánchez'], ['Laura', 'Ruiz'], ['Carlos', 'Vargas'],
  ];
  const students = await Promise.all(studentNames.map(([fn, ln], i) =>
    prisma.user.create({ data: { id: uuidv4(), email: `student${i + 1}@uspg.edu.gt`, password_hash: hash('Student123!'), first_name: fn, last_name: ln, role: Role.STUDENT, qr_code: uuidv4(), is_active: true } })
  ));

  const securityUsers = await Promise.all([
    prisma.user.create({ data: { id: uuidv4(), email: 'security1@uspg.edu.gt', password_hash: hash('Security123!'), first_name: 'Pedro', last_name: 'Castillo', role: Role.SECURITY, qr_code: uuidv4(), is_active: true } }),
    prisma.user.create({ data: { id: uuidv4(), email: 'security2@uspg.edu.gt', password_hash: hash('Security123!'), first_name: 'José', last_name: 'Aguilar', role: Role.SECURITY, qr_code: uuidv4(), is_active: true } }),
    prisma.user.create({ data: { id: uuidv4(), email: 'security3@uspg.edu.gt', password_hash: hash('Security123!'), first_name: 'Rosa', last_name: 'Mendez', role: Role.SECURITY, qr_code: uuidv4(), is_active: true } }),
  ]);

  const visitors = await Promise.all([
    prisma.user.create({ data: { id: uuidv4(), email: 'visitor1@example.com', password_hash: hash('Visitor123!'), first_name: 'Juan', last_name: 'Visitante', role: Role.VISITOR, qr_code: uuidv4(), is_active: true } }),
    prisma.user.create({ data: { id: uuidv4(), email: 'visitor2@example.com', password_hash: hash('Visitor123!'), first_name: 'María', last_name: 'Invitada', role: Role.VISITOR, qr_code: uuidv4(), is_active: true } }),
  ]);
  console.log('✅ Users created (1 admin, 3 teachers, 15 students, 3 security, 2 visitors)');

  const allUsers = [admin, ...teachers, ...students, ...securityUsers];
  const vehicles = [];
  const plates = ['P-001ABC', 'P-002DEF', 'P-003GHI', 'P-004JKL', 'P-005MNO', 'P-006PQR', 'P-007STU', 'P-008VWX', 'P-009YZA', 'P-010BCD'];
  const brands = ['Toyota', 'Honda', 'Nissan', 'Chevrolet', 'Volkswagen'];
  const colors = ['Blanco', 'Negro', 'Gris', 'Azul', 'Rojo'];

  for (let i = 0; i < Math.min(10, allUsers.length); i++) {
    const v = await prisma.vehicle.create({
      data: {
        id: uuidv4(),
        placa: plates[i],
        brand: brands[i % brands.length],
        model: 'Sedan',
        color: colors[i % colors.length],
        year: 2018 + (i % 6),
        user_id: allUsers[i].id,
        is_authorized: true,
      },
    });
    vehicles.push(v);
  }
  console.log('✅ Vehicles created');

  const zones: Zone[] = [Zone.A, Zone.B, Zone.C, Zone.D];
  const spacesPerZone = 125;
  const spaces = [];

  const baseLat = 14.5847;
  const baseLng = -90.5085;

  for (let zi = 0; zi < zones.length; zi++) {
    const zone = zones[zi];
    for (let i = 0; i < spacesPerZone; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const space = await prisma.parkingSpace.create({
        data: {
          id: uuidv4(),
          code: `${zone}-${String(i + 1).padStart(3, '0')}`,
          zone,
          type: i < 5 ? SpaceType.HANDICAPPED : i < 15 ? SpaceType.ELECTRIC : i < 20 ? SpaceType.RESERVED : SpaceType.STANDARD,
          status: SpaceStatus.AVAILABLE,
          is_active: true,
          floor: 0,
          lat: baseLat + (zi * 0.001) + (row * 0.0001),
          lng: baseLng + (col * 0.0001),
          campus_id: campus.id,
        },
      });
      spaces.push(space);
    }
  }
  console.log('✅ 500 parking spaces created');

  const now = new Date();
  const activeSessions = [];
  for (let i = 0; i < 5; i++) {
    const entry_time = new Date(now.getTime() - (i + 1) * 3600000);
    const session = await prisma.parkingSession.create({
      data: {
        id: uuidv4(),
        vehicle_id: vehicles[i].id,
        space_id: spaces[i].id,
        user_id: vehicles[i].user_id,
        entry_method: 'QR',
        status: 'ACTIVE',
        entry_time,
      },
    });
    await prisma.parkingSpace.update({ where: { id: spaces[i].id }, data: { status: SpaceStatus.OCCUPIED } });
    activeSessions.push(session);
  }
  console.log('✅ 5 active sessions created');

  const historySessions = [];
  for (let day = 1; day <= 30; day++) {
    const sessionCount = 5 + Math.floor(Math.random() * 10);
    for (let s = 0; s < sessionCount; s++) {
      const vehicleIdx = Math.floor(Math.random() * vehicles.length);
      const spaceIdx = 5 + s + (day % 50);
      if (spaceIdx >= spaces.length) continue;

      const entry_time = new Date(now.getTime() - day * 86400000 + s * 3600000);
      const duration_minutes = 30 + Math.floor(Math.random() * 180);
      const exit_time = new Date(entry_time.getTime() + duration_minutes * 60000);
      const amount_due = parseFloat(((duration_minutes / 60) * 5).toFixed(2));

      const session = await prisma.parkingSession.create({
        data: {
          id: uuidv4(),
          vehicle_id: vehicles[vehicleIdx].id,
          space_id: spaces[spaceIdx].id,
          user_id: vehicles[vehicleIdx].user_id,
          entry_method: 'QR',
          status: 'COMPLETED',
          entry_time,
          exit_time,
          duration_minutes,
          amount_due,
          is_paid: Math.random() > 0.2,
        },
      });
      historySessions.push(session);
    }
  }
  console.log('✅ 30 days of session history created');

  await prisma.camera.createMany({
    data: [
      { id: uuidv4(), name: 'Cámara Entrada A', location: 'Entrada Principal Zona A', has_lpr: true, is_active: true, campus_id: campus.id, lat: baseLat, lng: baseLng },
      { id: uuidv4(), name: 'Cámara Entrada B', location: 'Entrada Zona B', has_lpr: true, is_active: true, campus_id: campus.id, lat: baseLat + 0.001, lng: baseLng },
      { id: uuidv4(), name: 'Cámara Peatonal', location: 'Acceso Peatonal Central', has_lpr: false, is_active: true, campus_id: campus.id, lat: baseLat, lng: baseLng + 0.001 },
    ],
  });
  console.log('✅ Cameras created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('📋 Credentials:');
  console.log('   Admin:    admin@uspg.edu.gt / Admin1234!');
  console.log('   Teacher:  prof.garcia@uspg.edu.gt / Teacher123!');
  console.log('   Student:  student1@uspg.edu.gt / Student123!');
  console.log('   Security: security1@uspg.edu.gt / Security123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await pool.end(); });
