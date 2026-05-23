import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sqlFunction = `
    CREATE OR REPLACE FUNCTION handle_late_return() RETURNS TRIGGER AS $$
    BEGIN
        IF (NEW.fecha_devolucion_real IS NOT NULL AND NEW.fecha_devolucion_real > NEW.fecha_devolucion_esc) 
           OR (NEW.fecha_devolucion_real IS NULL AND NEW.fecha_devolucion_esc < CURRENT_TIMESTAMP AND NEW.estado != 'DEVUELTO') THEN
            
            IF NOT EXISTS (SELECT 1 FROM lib_multa WHERE prestamo_id = NEW.id) THEN
                INSERT INTO lib_multa (prestamo_id, monto, fecha_multa, pagada)
                VALUES (NEW.id, 50.00, CURRENT_TIMESTAMP, false);
                
                INSERT INTO lib_autor (nombre)
                VALUES ('Audit: Late Return - ' || (SELECT titulo FROM lib_libro WHERE id = NEW.libro_id));
            END IF;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const sqlDropTrigger = `DROP TRIGGER IF EXISTS trg_late_return ON lib_prestamo;`;
  const sqlCreateTrigger = `
    CREATE TRIGGER trg_late_return
    AFTER INSERT OR UPDATE ON lib_prestamo
    FOR EACH ROW
    EXECUTE FUNCTION handle_late_return();
  `;

  try {
    await prisma.$executeRawUnsafe(sqlFunction);
    await prisma.$executeRawUnsafe(sqlDropTrigger);
    await prisma.$executeRawUnsafe(sqlCreateTrigger);
    console.log('Trigger created successfully');
  } catch (error) {
    console.error('Error creating trigger:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
