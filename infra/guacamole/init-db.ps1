# Ejecutar UNA VEZ después del primer "docker compose up -d"
# Crea las tablas y el usuario guacadmin en PostgreSQL.

Write-Host "Inicializando esquema Guacamole en PostgreSQL..." -ForegroundColor Cyan

docker run --rm guacamole/guacamole:1.5.5 /opt/guacamole/bin/initdb.sh --postgresql `
  | docker exec -i guacamole-postgres-1 psql -U guacamole_user -d guacamole_db

if ($LASTEXITCODE -eq 0) {
  Write-Host "Listo. Reiniciando Guacamole..." -ForegroundColor Green
  docker compose restart guacamole
  Write-Host "Abre http://localhost:8080/guacamole — guacadmin / guacadmin" -ForegroundColor Green
} else {
  Write-Host "Error al inicializar. ¿Está corriendo docker compose up -d?" -ForegroundColor Red
}
