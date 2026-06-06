# Guacamole — acceso remoto al lab (fila B)

Stack mínimo para conectar estaciones **PC-B1 … PC-B15** vía navegador (RDP/VNC/SSH).

## Levantar

```bash
cd infra/guacamole
docker compose up -d
```

**Primera vez:** hay que crear las tablas en PostgreSQL (si no, verás ERROR al entrar):

```powershell
# Windows
.\init-db.ps1
```

```bash
# Linux / macOS
docker run --rm guacamole/guacamole:1.5.5 /opt/guacamole/bin/initdb.sh --postgresql \
  | docker exec -i guacamole-postgres-1 psql -U guacamole_user -d guacamole_db
docker compose restart guacamole
```

UI: http://localhost:8080/guacamole  
Usuario/contraseña por defecto: `guacadmin` / `guacadmin` (cámbialos al primer acceso).

## Configurar conexiones

1. Inicia sesión en Guacamole.
2. **Settings → Connections → New connection**
3. Nombre: `PC-B5` (debe coincidir con la plantilla URL del portal).
4. Protocolo: RDP (Windows) o VNC.
5. Hostname: IP de la estación en la red del lab.
6. Repite para cada butaca de la fila B que quieras exponer.

## Enlazar con el portal USPG

En `webapp/.env.local`:

```env
LAB_REMOTO_MODO=guacamole
LAB_GUACAMOLE_BASE=http://localhost:8080/guacamole
LAB_GUACAMOLE_URL_TEMPLATE={base}/#/client/PC-{etiqueta}
LAB_REMOTO_NUEVA_PESTANA=true
```

Reinicia `npm run dev`. Sin `LAB_GUACAMOLE_BASE`, el portal usa **simulación** automáticamente.

## Producción

- Pon Guacamole detrás de HTTPS (nginx o Cloudflare Tunnel).
- RDP solo desde el servidor Guacamole, no expuesto a internet.
- Cambia contraseñas de PostgreSQL y guacadmin.
