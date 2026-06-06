# Diagramas — Acceso remoto USPG + Guacamole

Diagramas visuales del flujo de reserva, conexión remota y arquitectura de red.

> Ver también: [GUIA_ENTORNO_REAL.md](./GUIA_ENTORNO_REAL.md)

---

## 1. Vista general (componentes)

```mermaid
flowchart TB
  subgraph CASA["Estudiante en casa"]
    NAV[Navegador web]
  end

  subgraph NUBE["Servidor USPG / Vercel"]
    PORTAL[Portal USPG — Next.js]
    BD[(PostgreSQL Neon<br/>reservas · SesionUso · pagos)]
  end

  subgraph CAMPUS["Campus — red del laboratorio"]
    GUA[Apache Guacamole<br/>HTTPS :443]
    GUACD[guacd — túnel RDP/VNC]
    PC1[PC-B1]
    PC5[PC-B5 — alto rendimiento]
    PC15[PC-B15]
  end

  NAV -->|1. Reserva butaca B5| PORTAL
  PORTAL <-->|2. Guarda y valida| BD
  NAV -->|3. Conectar remotamente| PORTAL
  PORTAL -->|4. URL PC-B5| GUA
  GUA --> GUACD
  GUACD -->|5. RDP :3389 red interna| PC5
  PORTAL -->|6. Registra tiempo y cobro| BD
```

---

## 2. Flujo paso a paso (reserva → escritorio)

```mermaid
sequenceDiagram
  autonumber
  participant E as Estudiante
  participant P as Portal USPG
  participant DB as Base de datos
  participant A as Admin
  participant G as Guacamole
  participant PC as PC fila B del lab

  E->>P: Reserva butaca B5 + horario
  P->>DB: Reserva PENDIENTE
  A->>P: Aprueba reserva
  P->>DB: Estado APROBADA

  Note over E,PC: Llega la hora de la reserva

  E->>P: Clic Conectar remotamente
  P->>DB: Valida fila B, horario, aprobación
  P->>DB: Crea SesionUso REMOTA
  P->>E: Abre guacamole/#/client/PC-B5

  E->>G: Login Guacamole si aplica
  G->>PC: RDP por red interna
  PC-->>E: Escritorio Windows en el navegador

  E->>P: Desconectar
  P->>DB: Cierra sesión y cobro por hora
```

---

## 3. Dos modos del portal (simulación vs Guacamole)

```mermaid
flowchart LR
  subgraph CONFIG["Variables .env"]
    MODO{LAB_REMOTO_MODO}
  end

  subgraph SIM["Modo simulación — examen / dev"]
    SIMUI[Escritorio simulado<br/>dentro del portal]
  end

  subgraph REAL["Modo Guacamole — producción"]
    GUAC[Apache Guacamole]
    REALPC[PC real del laboratorio]
  end

  RES[Reserva fila B aprobada] --> MODO
  MODO -->|simulacion| SIMUI
  MODO -->|guacamole + LAB_GUACAMOLE_BASE| GUAC
  GUAC --> REALPC
```

---

## 4. Red y seguridad (producción)

```mermaid
flowchart TB
  INTERNET[Internet]
  HTTPS[HTTPS 443<br/>lab.uspg.edu.gt]
  GUA[Apache Guacamole]
  VLAN[Red interna VLAN del lab]
  RDP[RDP puerto 3389]
  PC[PC-B5<br/>192.168.10.105]

  INTERNET -->|Permitido| HTTPS
  HTTPS --> GUA
  GUA --> VLAN
  VLAN --> RDP
  RDP --> PC

  INTERNET -.->|Bloqueado| PC
```

**Regla:** el estudiante nunca se conecta por RDP directo a la PC. Solo entra a Guacamole por HTTPS.

---

## 5. Mapa butaca ↔ conexión Guacamole ↔ PC física

```mermaid
flowchart TB
  subgraph PORTAL["Mapa de butacas — Portal USPG"]
    direction LR
    A1[Fila A — A1…A15<br/>solo presencial]
    B1[Fila B — B1…B15<br/>acceso remoto]
  end

  subgraph GUAC["Guacamole — Conexiones"]
    C1[PC-B1]
    C5[PC-B5]
    C15[PC-B15]
  end

  subgraph LAB["Laboratorio físico"]
    P1[Estación B1]
    P5[Estación B5]
    P15[Estación B15]
  end

  B1 -->|nombre conexión| C1 -->|RDP IP fija| P1
  B5 -->|PC-B5| C5 -->|RDP| P5
  B15 -->|PC-B15| C15 -->|RDP| P15
```

El **nombre** de la conexión en Guacamole debe coincidir con la plantilla URL:

`LAB_GUACAMOLE_URL_TEMPLATE={base}/#/client/PC-{etiqueta}`

Butaca **B5** → conexión **PC-B5** → URL `.../PC-B5`.

---

## 6. Construcción de la URL de conexión

```mermaid
flowchart LR
  ENV[.env.local]
  TPL["Plantilla<br/>{base}/#/client/PC-{etiqueta}"]
  APP[Portal USPG]
  URL["URL final<br/>.../guacamole/#/client/PC-B5"]
  GUA[Guacamole abre PC-B5]

  ENV -->|LAB_GUACAMOLE_BASE| APP
  ENV -->|LAB_GUACAMOLE_URL_TEMPLATE| APP
  RES[Reserva butaca B5] --> APP
  APP --> TPL
  TPL --> URL
  URL --> GUA
```

---

## Cómo ver estos diagramas renderizados

| Herramienta | Uso |
|-------------|-----|
| **GitHub** | Abre este `.md` en el repo; GitHub renderiza Mermaid |
| **VS Code / Cursor** | Extensión "Markdown Preview Mermaid Support" |
| **Mermaid Live** | Copia un bloque en https://mermaid.live |
