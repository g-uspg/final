#!/bin/bash
# ── Reset Demo — Sistema de Parqueo USPG ─────────────────────────────────────
# Limpia sesiones, pagos, reservas y logs de prueba.
# Deja intactos: usuarios, vehículos, espacios, tarifas y configuración.
# Uso: ./reset-demo.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║     Reset Demo — Sistema de Parqueo USPG         ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${YELLOW}⚠  Esto borrará sesiones, pagos, reservas y logs.${RESET}"
echo -e "  ${YELLOW}   Usuarios, vehículos y espacios NO se tocan.${RESET}"
echo ""
echo -ne "  ¿Continuar? [s/N] → "
read -r confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo -e "\n  ${YELLOW}Cancelado.${RESET}\n"
  exit 0
fi

echo ""
echo -ne "  Limpiando base de datos..."

node -e "
const { PrismaClient } = require('./webapp/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.barrierLog.deleteMany();
  await prisma.visitorQR.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.parkingSpace.updateMany({ data: { status: 'AVAILABLE' } });
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
" 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e " ${GREEN}✓${RESET}"
  echo ""
  echo -e "  ${GREEN}✓ Demo lista. Todos los espacios disponibles.${RESET}"
  echo -e "  ${GREEN}  Usuarios y vehículos del seed intactos.${RESET}"
else
  echo -e " ${RED}✗ Error — verifica que el servidor de BD esté corriendo.${RESET}"
fi
echo ""
