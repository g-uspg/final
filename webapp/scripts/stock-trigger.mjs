import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sqlFunction = `
    CREATE OR REPLACE FUNCTION handle_stock_management() RETURNS TRIGGER AS $$
    BEGIN
        -- On NEW Loan
        IF (TG_OP = 'INSERT') THEN
            -- Check stock
            IF (SELECT stock FROM lib_libro WHERE id = NEW.libro_id) <= 0 THEN
                RAISE EXCEPTION 'No hay stock disponible para este libro';
            END IF;
            
            -- Deduct stock
            UPDATE lib_libro SET stock = stock - 1 WHERE id = NEW.libro_id;
        END IF;

        -- On RETURN
        IF (TG_OP = 'UPDATE') THEN
            IF (OLD.estado = 'PENDIENTE' AND NEW.estado = 'DEVUELTO') THEN
                -- Restore stock
                UPDATE lib_libro SET stock = stock + 1 WHERE id = NEW.libro_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const sqlDropTrigger = `DROP TRIGGER IF EXISTS trg_stock_management ON lib_prestamo;`;
  const sqlCreateTrigger = `
    CREATE TRIGGER trg_stock_management
    BEFORE INSERT OR UPDATE ON lib_prestamo
    FOR EACH ROW
    EXECUTE FUNCTION handle_stock_management();
  `;

  try {
    await prisma.$executeRawUnsafe(sqlFunction);
    await prisma.$executeRawUnsafe(sqlDropTrigger);
    await prisma.$executeRawUnsafe(sqlCreateTrigger);
    console.log('Stock management trigger created successfully');
  } catch (error) {
    console.error('Error creating stock trigger:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
