# Guía: Apache Guacamole en entorno real — USPG Laboratorios

Documentación para desplegar acceso remoto a estaciones de **alto rendimiento (fila B)** del laboratorio de computación, integrado con el portal USPG.

**Diagramas visuales (Mermaid):** [DIAGRAMAS.md](./DIAGRAMAS.md)

---

## 1. Arquitectura

Ver diagramas detallados en [DIAGRAMAS.md](./DIAGRAMAS.md) (vista general, flujo secuencial, red y mapa butacas).

```
[Estudiante en casa]
        │
        ▼ HTTPS
[Portal USPG — Next.js]
  · Reserva butaca B5
  · Admin aprueba
  · Botón "Conectar remotamente"
        │
        ▼ URL generada (ej. /guacamole/#/client/PC-B5)
[Apache Guacamole — gateway]
  · Autenticación Guacamole
  · Túnel web → RDP/VNC
        │
        ▼ RDP puerto 3389 (solo red interna)
[PC fila B del lab — 192.168.x.x]
```

**Principio de seguridad:** los estudiantes **nunca** se conectan directo por RDP a internet. Solo llegan a Guacamole (HTTPS). Guacamole habla RDP con las PCs en la red del campus.

---

## 2. Requisitos

### Servidor Guacamole (VM o físico en el lab / DMZ)

| Recurso | Mínimo recomendado |
|---------|-------------------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Disco | 40 GB SSD |
| SO | Ubuntu 22.04 LTS o Windows Server con Docker |
| Red | IP fija en VLAN del laboratorio |

### Estaciones fila B (Windows)

- Windows 10/11 Pro o Enterprise (**RDP habilitado**)
- IP fija o reserva DHCP por MAC
- Usuario local o dominio AD para sesiones remotas
- Firewall: permitir **3389/tcp solo desde la IP del servidor Guacamole**

### Portal USPG

- Variables de entorno configuradas (ver sección 8)
- Reservas con butacas **fila B** y estado **APROBADA**

---

## 3. Despliegue inicial (Docker)

### 3.1 Clonar y entrar al stack

```bash
cd infra/guacamole
cp .env.production.example .env   # si existe; si no, editar docker-compose.yml
docker compose up -d
```

### 3.2 Inicializar base de datos (solo primera vez)

**Windows (PowerShell):**

```powershell
.\init-db.ps1
```

**Linux:**

```bash
docker run --rm guacamole/guacamole:1.5.5 /opt/guacamole/bin/initdb.sh --postgresql \
  | docker exec -i guacamole-postgres-1 psql -U guacamole_user -d guacamole_db
docker compose restart guacamole
```

### 3.3 Primer acceso

- URL temporal: `http://IP-SERVIDOR:8080/guacamole`
- Usuario: `guacadmin`
- Contraseña: `guacadmin`
- **Cambiar contraseña inmediatamente** en Settings → Preferences

### 3.4 Cambiar credenciales de PostgreSQL

En `docker-compose.yml`, sustituir `change_me_guacamole` por contraseñas fuertes **antes** de producción. Tras cambiar:

```bash
docker compose down
docker compose up -d
# Si la BD ya existía con password vieja, recrear volumen o alterar user en postgres
```

---

## 4. HTTPS en producción (obligatorio)

No expongas Guacamole en HTTP plano hacia internet.

### Opción A — Nginx + Let's Encrypt (recomendada)

```nginx
server {
    listen 443 ssl http2;
    server_name lab.uspg.edu.gt;

    ssl_certificate     /etc/letsencrypt/live/lab.uspg.edu.gt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lab.uspg.edu.gt/privkey.pem;

    location /guacamole/ {
        proxy_pass http://127.0.0.1:8080/guacamole/;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cookie_path /guacamole/ /guacamole/;
    }
}
```

En `guacamole.properties` (montado en el contenedor si hace falta):

```properties
proxy-uri: https://lab.uspg.edu.gt/guacamole
```

### Opción B — Cloudflare Tunnel

Útil si no hay IP pública en el campus. El túnel apunta a `localhost:8080` y Cloudflare termina HTTPS.

---

## 5. Configurar conexiones por estación

Cada butaca **fila B** del portal debe tener una conexión homónima en Guacamole.

| Butaca portal | Nombre conexión Guacamole | Host RDP (red interna) |
|---------------|---------------------------|-------------------------|
| B1 | `PC-B1` | `192.168.10.101` |
| B2 | `PC-B2` | `192.168.10.102` |
| … | … | … |
| B15 | `PC-B15` | `192.168.10.115` |

### Pasos por cada PC

1. Guacamole → **Settings → Connections → New connection**
2. **Name:** `PC-B5` (exacto; coincide con plantilla URL del portal)
3. **Location:** `ROOT`
4. **Protocol:** `RDP`
5. **PARÁMETROS → Red → Nombre de host:** IP de la estación (ej. `192.168.10.105`)
6. **PARÁMETROS → Red → Puerto:** `3389`
7. **PARÁMETROS → Autenticación:**
   - Usuario/contraseña del **Windows de esa PC**, o
   - Dejar vacío y que el estudiante ingrese credenciales al conectar (menos cómodo)
8. **Guardar**

> **No confundir:** el bloque "Proxy GUACD" arriba del formulario no es el host del RDP. El host va en **PARÁMETROS → Red**.

### Probar

Sal de Settings, clic en **PC-B5**. Debe abrir el escritorio Windows de esa máquina.

Copia la URL del navegador. Debe ser similar a:

```
https://lab.uspg.edu.gt/guacamole/#/client/PC-B5
```

Si usa un ID numérico (`#/client/5`), ajusta `LAB_GUACAMOLE_URL_TEMPLATE` en el portal (sección 8).

---

## 6. Preparar PCs del laboratorio (Windows)

En **cada** estación fila B:

1. **Configuración → Sistema → Escritorio remoto → Activar**
2. Usuario con permiso de inicio de sesión remota
3. IP fija documentada en inventario (`Equipo` en BD USPG: `PC-B5`, ubicación fila B)
4. Firewall Windows:

```powershell
New-NetFirewallRule -DisplayName "RDP desde Guacamole" `
  -Direction Inbound -Protocol TCP -LocalPort 3389 `
  -RemoteAddress IP-DEL-SERVIDOR-GUACAMOLE -Action Allow
```

5. Desactivar suspensión/hibernación durante horario de lab
6. Política: una sesión por reserva (el portal controla quién y cuándo; Guacamole puede limitar conexiones concurrentes = 1)

---

## 7. Usuarios y permisos en Guacamole

### Modelo simple (piloto / examen)

- Un usuario Guacamole compartido para estudiantes **o** credenciales RDP ingresadas al conectar
- El **control de acceso real** lo hace el portal USPG (reserva aprobada + ventana horaria)

### Modelo producción (recomendado)

| Rol | Guacamole | Portal USPG |
|-----|-----------|-------------|
| Admin lab | `guacadmin` | ADMIN / TEACHER |
| Estudiante | Usuario Guacamole por carnet o LDAP | STUDENT |

1. **Settings → Users → New user** por estudiante o integrar **LDAP/AD** universitario
2. **Settings → Connections → PC-B5 → Permissions:** asignar conexiones solo a usuarios/grupos autorizados
3. Opcional: API REST Guacamole para crear tokens temporales al conectar (fase avanzada)

---

## 8. Integración con el portal USPG

En el servidor del portal (`webapp/.env.local` o variables de Vercel/servidor):

```env
LAB_REMOTO_MODO=guacamole
LAB_GUACAMOLE_BASE=https://lab.uspg.edu.gt/guacamole
LAB_GUACAMOLE_URL_TEMPLATE={base}/#/client/PC-{etiqueta}
LAB_REMOTO_NUEVA_PESTANA=true
```

| Variable | Descripción |
|----------|-------------|
| `LAB_REMOTO_MODO` | `guacamole` activa enlace real; `simulacion` usa escritorio demo |
| `LAB_GUACAMOLE_BASE` | URL pública HTTPS **sin** barra final |
| `LAB_GUACAMOLE_URL_TEMPLATE` | `{base}` y `{etiqueta}` los reemplaza la app (B5 → PC-B5) |
| `LAB_REMOTO_NUEVA_PESTANA` | `true` = nueva pestaña; `false` = iframe en el portal |

Reiniciar la app tras cambiar variables.

### Flujo del estudiante

1. Reserva butaca **fila B** en horario deseado
2. Técnico **aprueba** la reserva
3. En ventana horaria (10 min antes del inicio hasta el fin): **Conectar remotamente**
4. Se abre Guacamole → estación asignada
5. **Desconectar** en el portal → registra `SesionUso` REMOTA y cobro por hora si aplica

---

## 9. Seguridad — checklist

- [ ] HTTPS en Guacamole y portal
- [ ] Contraseña `guacadmin` y PostgreSQL cambiadas
- [ ] RDP **no** expuesto a internet (solo Guacamole → PCs)
- [ ] Firewall campus: 8080/443 solo donde corresponda
- [ ] Conexiones nombradas `PC-B1` … `PC-B15` alineadas con inventario
- [ ] Logs de Guacamole y PostgreSQL con retención
- [ ] Rotación de credenciales RDP de servicio por semestre
- [ ] `.env` con secretos **fuera** del repositorio git
- [ ] Revisar sesiones activas en Guacamole → Settings → Active Sessions

---

## 10. Operación y mantenimiento

### Comandos útiles

```bash
cd infra/guacamole
docker compose ps
docker compose logs -f guacamole
docker compose restart guacamole
docker compose pull && docker compose up -d   # actualizar imágenes
```

### Backups

- Volumen PostgreSQL: `guacamole-postgres`
- Backup diario:

```bash
docker exec guacamole-postgres-1 pg_dump -U guacamole_user guacamole_db > backup-guacamole-$(date +%F).sql
```

### Alta de nueva estación

1. Dar IP fija a la PC
2. Activar RDP + firewall
3. Crear conexión `PC-Bx` en Guacamole
4. Probar desde Guacamole y desde portal con reserva de prueba

---

## 11. Solución de problemas

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| ERROR al abrir Guacamole | BD sin inicializar | Ejecutar `init-db.ps1` / initdb.sh |
| Login Guacamole falla | Esquema corrupto o password PG | Revisar logs `docker compose logs guacamole` |
| Conexión RDP negada | RDP off, firewall, credenciales | Probar RDP desde servidor Guacamole con `xfreerdp` |
| Portal abre URL incorrecta | Plantilla URL no coincide | Clic en conexión en Guacamole y copiar URL real |
| No aparece "Conectar" | Reserva pendiente o butaca fila A | Aprobar reserva; usar fila B |
| Pantalla negra en RDP | Sesión local bloqueada en Windows | Política "RemoteApp" / usuario desconectado |
| `host.docker.internal` no funciona en Linux | Solo Docker Desktop Windows/Mac | Usar IP real de la PC en PARÁMETROS → Red |

---

## 12. Referencias

- [Apache Guacamole — Documentación oficial](https://guacamole.apache.org/doc/gug/)
- [Guacamole Docker](https://guacamole.apache.org/doc/gug/guacamole-docker.html)
- Código portal: `webapp/src/lib/laboratorios/remoto-config.js`
- Stack local: `infra/guacamole/docker-compose.yml`

---

## 13. Resumen para entrega / operación USPG

1. **Servidor Guacamole** en VLAN lab, HTTPS, Docker + PostgreSQL inicializado  
2. **15 conexiones** `PC-B1` … `PC-B15` → IPs fijas de estaciones fila B  
3. **Portal** con `LAB_REMOTO_MODO=guacamole` y URL pública en `LAB_GUACAMOLE_BASE`  
4. **Proceso:** reserva → aprobación → conexión en ventana horaria → registro de horas en USPG  

Para desarrollo y examen sin infraestructura, dejar `LAB_REMOTO_MODO=simulacion` (comportamiento por defecto).
