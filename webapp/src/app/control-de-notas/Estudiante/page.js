"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Toast flotante ────────────────────────────────────────────────────────────
function SolvenciaToast({ icono, titulo, badge, solvente, children, visible, onClose }) {
  const [show, setShow] = useState(false);
  const [barWidth, setBarWidth] = useState(100);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const duration = 5000;

  useEffect(() => {
    if (visible) {
      // Resetear barra primero (sin transicion)
      setBarWidth(100);
      setShow(true);

      // Iniciar animacion de barra en el siguiente frame
      rafRef.current = requestAnimationFrame(() => {
        setBarWidth(0);
      });

      // Cerrar automaticamente despues de duration ms
      timerRef.current = setTimeout(onClose, duration);
    } else {
      setShow(false);
    }

    return () => {
      clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, onClose]); // onClose ya es estable gracias a useCallback en el padre

  return (
    <div style={{
      width: "340px", background: "white", borderRadius: "12px",
      border: "0.5px solid #e0e0e0",
      borderTop: `3px solid ${solvente ? "#2e7d32" : "#c62828"}`,
      boxShadow: "0 8px 24px rgba(0,0,0,0.14)", overflow: "hidden",
      transform: show ? "translateX(0) scale(1)" : "translateX(400px) scale(0.96)",
      opacity: show ? 1 : 0,
      transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
      pointerEvents: show ? "all" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>{icono}</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#222" }}>{titulo}</span>
          <span style={{
            padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
            backgroundColor: solvente ? "#e8f5e9" : "#ffebee",
            color: solvente ? "#2e7d32" : "#c62828",
          }}>{badge}</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#aaa" }}>x</button>
      </div>
      <div style={{ height: "3px", background: "#f0f0f0" }}>
        <div style={{
          height: "100%", background: solvente ? "#2e7d32" : "#c62828",
          width: `${barWidth}%`,
          transition: barWidth === 0 ? `width ${duration}ms linear` : "none",
        }} />
      </div>
      <div style={{ padding: "10px 14px 14px" }}>{children}</div>
    </div>
  );
}

// ── Badge de estado ─────────────────────────────────────────────────────────
function BadgeEstado({ estado }) {
  const configs = {
    pendiente: { bg: "#fff3e0", color: "#e65100", texto: "Pendiente" },
    aprobado:  { bg: "#e8f5e9", color: "#2e7d32", texto: "Aprobado"  },
    reprobado: { bg: "#ffebee", color: "#c62828", texto: "Reprobado" },
  };

  const config = configs[estado] || configs.pendiente;

  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      background: config.bg,
      color: config.color,
    }}>
      {config.texto}
    </span>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
function BarraProgreso({ valor, max, color }) {
  const pct = Math.min(100, (valor / max) * 100);
  return (
    <div style={{ background: "#f0f0f0", borderRadius: "999px", height: "8px", width: "100%" }}>
      <div style={{
        width: `${pct}%`,
        background: color,
        borderRadius: "999px",
        height: "100%",
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EstudiantePage() {
  const [usuario,      setUsuario]      = useState(null);
  const [notas,        setNotas]        = useState(null);
  const [solvencia,    setSolvencia]    = useState(null);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState("");
  const [tabActiva,    setTabActiva]    = useState("cursos");
  const [toastVisible, setToastVisible] = useState({ solvencia: false });

  // ✅ FIX 1: useCallback para que onClose sea referencia estable
  // Evita que el useEffect del Toast se ejecute en cada render
  const handleCloseSolvencia = useCallback(() => {
    setToastVisible((p) => ({ ...p, solvencia: false }));
  }, []);

  // ✅ FIX 2: cargarDatos envuelto en useCallback con dependencias vacias
  // Evita que se recree en cada render y permite usarlo como dependencia de useEffect
  const cargarDatos = useCallback(async (carnet) => {
    setCargando(true);
    setError("");

    try {
      const [resNotas, resSolvencia] = await Promise.all([
        fetch(`/api/control-de-notas/notas/${carnet}`),
        fetch(`/api/control-de-notas/notas/${carnet}/solvencia-estado`),
      ]);

      if (!resNotas.ok || !resSolvencia.ok) {
        throw new Error(
          `Error en servidor: Notas(${resNotas.status}) Solvencia(${resSolvencia.status})`
        );
      }

      const dNotas     = await resNotas.json();
      const dSolvencia = await resSolvencia.json();

      if (!dNotas.success) {
        throw new Error(dNotas.message || "Error al cargar las notas");
      }
      if (!dSolvencia.success) {
        throw new Error(dSolvencia.message || "Error al cargar la solvencia");
      }

      setNotas(dNotas);
      setSolvencia(dSolvencia);
    } catch (e) {
      setError(e.message || "Error de conexion con el servidor");
    } finally {
      setCargando(false);
    }
  }, []); // sin dependencias externas: solo usa setters de useState (estables)

  // ✅ FIX 3: cargarDatos como dependencia del useEffect
  useEffect(() => {
    const raw = sessionStorage.getItem("cn_usuario");
    if (!raw) {
      window.location.href = "/control-de-notas";
      return;
    }

    const u = JSON.parse(raw);
    if (u.rol !== "ALUMNO") {
      window.location.href = "/control-de-notas";
      return;
    }

    setUsuario(u);

    if (u.carnet) {
      cargarDatos(u.carnet);
    } else {
      setError("No se encontro el carnet del alumno");
      setCargando(false);
    }
  }, [cargarDatos]); // ← dependencia correcta

  // ── Loading ───────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div style={{ textAlign: "center", padding: "80px" }}>
        <p style={{ fontSize: "18px", color: "#666", fontWeight: 600 }}>
          Cargando informacion academica...
        </p>
        <p style={{ fontSize: "14px", color: "#999", marginTop: "8px" }}>
          Consultando sistema academico
        </p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="row clearfix">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-body" style={{ padding: "40px", textAlign: "center" }}>
              <h3 style={{ color: "#c62828", marginBottom: "16px" }}>Error al cargar datos</h3>
              <p style={{ color: "#666", marginBottom: "24px" }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px", background: "#800020", color: "white",
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600,
                }}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Datos ─────────────────────────────────────────────────────────────────
  const cursosLista    = notas?.notas    ?? [];
  const alumnoData     = notas?.alumno   ?? {};
  const solvGeneral    = solvencia?.solvenciaGeneral ?? true;
  const carnetDisplay  = alumnoData?.carnet ?? usuario?.carnet ?? "—";
  const totalCreditos  = cursosLista.reduce((sum, c) => sum + (c.creditos || 0), 0);

  return (
    <div className="row clearfix">
      <div className="col-lg-12">
        <div className="card" style={{ background: "#fff" }}>

          {/* Header */}
          <div className="card-header" style={{
            background: "#fff", display: "flex", justifyContent: "space-between",
            alignItems: "center", borderBottom: "2px solid #800020", padding: "20px",
          }}>
            <div>
              <h3 style={{ color: "#800020", marginBottom: "4px", fontWeight: 700 }}>
                {alumnoData?.nombre || "Estudiante"}
              </h3>
              <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
                <strong>Carnet:</strong> {carnetDisplay} | <strong>Carrera:</strong>{" "}
                {alumnoData?.carrera || "Sin asignar"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setToastVisible((p) => ({ ...p, solvencia: !p.solvencia }))}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 16px", borderRadius: "10px", cursor: "pointer",
                  border: `1.5px solid ${solvGeneral ? "#2e7d32" : "#c62828"}`,
                  background: solvGeneral ? "#e8f5e9" : "#ffebee",
                  color: solvGeneral ? "#2e7d32" : "#c62828",
                  fontWeight: 600, fontSize: "13px", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Solvencia
              </button>
              <a
                href="/control-de-notas"
                style={{ color: "#888", fontSize: "13px", textDecoration: "none",
                  display: "flex", alignItems: "center", gap: "4px" }}
              >
                Salir
              </a>
            </div>
          </div>

          <div className="card-body" style={{ padding: "20px" }}>

            {/* Stats */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Total Cursos",       valor: cursosLista.length,               color: "#1976d2", bg: "#e3f2fd" },
                { label: "Creditos Asignados", valor: totalCreditos,                    color: "#e65100", bg: "#fff3e0" },
                { label: "Estado",             valor: "Activo",                         color: "#2e7d32", bg: "#e8f5e9" },
                { label: "Solvencia",          valor: solvGeneral ? "OK" : "Pendiente", color: solvGeneral ? "#2e7d32" : "#c62828", bg: solvGeneral ? "#e8f5e9" : "#ffebee" },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: "14px 20px", borderRadius: "10px", background: s.bg,
                  border: `1.5px solid ${s.color}22`, minWidth: "140px", textAlign: "center",
                  flex: "1 1 calc(25% - 12px)", minHeight: "85px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                }}>
                  <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: s.color }}>
                    {s.valor}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#666" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #f0f0f0" }}>
              <button
                onClick={() => setTabActiva("cursos")}
                style={{
                  padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                  borderBottom: tabActiva === "cursos" ? "3px solid #800020" : "3px solid transparent",
                  color: tabActiva === "cursos" ? "#800020" : "#666",
                  fontWeight: tabActiva === "cursos" ? 700 : 400,
                  fontSize: "14px", marginBottom: "-2px", transition: "all 0.2s ease",
                }}
              >
                Mis Cursos ({cursosLista.length})
              </button>
            </div>

            {/* Tabla / Vacío */}
            {cursosLista.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#f9f9f9", borderRadius: "10px" }}>
                <p style={{ fontSize: "18px", color: "#666", fontWeight: 600, margin: "0 0 8px" }}>
                  No hay cursos asignados
                </p>
                <p style={{ fontSize: "14px", color: "#999", margin: 0 }}>
                  Aun no tienes cursos registrados en el sistema
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th style={{ padding: "12px", textAlign: "left",   fontWeight: 600 }}>Codigo</th>
                      <th style={{ padding: "12px", textAlign: "left",   fontWeight: 600 }}>Nombre del Curso</th>
                      <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Periodo</th>
                      <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Creditos</th>
                      <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ✅ FIX 4: key estable usando curso + periodo en vez del indice */}
                    {cursosLista.map((curso) => (
                      <tr
                        key={`${curso.curso}-${curso.periodo}`}
                        style={{ background: "white", borderBottom: "1px solid #eee", transition: "background 0.2s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                      >
                        <td style={{ padding: "12px", fontWeight: 600, fontSize: "13px" }}>{curso.curso}</td>
                        <td style={{ padding: "12px" }}>{curso.nombreCurso}</td>
                        <td style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "#888" }}>{curso.periodo}</td>
                        <td style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>{curso.creditos}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <BadgeEstado estado={curso.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Barra creditos */}
            {cursosLista.length > 0 && (
              <div style={{
                marginTop: "20px", padding: "16px", background: "#f9f9f9",
                borderRadius: "10px", border: "1px solid #e0e0e0",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>Creditos de cursos asignados</span>
                  <span style={{ fontSize: "13px", color: "#666", fontWeight: 600 }}>{totalCreditos} creditos</span>
                </div>
                <BarraProgreso valor={totalCreditos} max={200} color="#800020" />
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#888" }}>
                  Total de creditos en cursos actuales: <strong>{totalCreditos}</strong>
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Toast solvencia */}
      <div style={{
        position: "fixed", top: "16px", right: "16px",
        display: "flex", flexDirection: "column", gap: "10px",
        zIndex: 9999, pointerEvents: "none",
      }}>
        <SolvenciaToast
          icono={solvGeneral ? "+" : "!"}
          titulo="Estado de Solvencia"
          badge={solvGeneral ? "Solvente" : "Con pendientes"}
          solvente={solvGeneral}
          visible={toastVisible.solvencia}
          onClose={handleCloseSolvencia}  // ✅ referencia estable, no inline
        >
          <div style={{ fontSize: "13px" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#444" }}>Estado Academico:</p>
            <p style={{ margin: "0 0 4px", color: solvGeneral ? "#2e7d32" : "#c62828", fontSize: "12px" }}>
              {solvGeneral ? "Todo en orden" : "Revisar pendientes"}
            </p>
            <p style={{ margin: "12px 0 6px", fontWeight: 600, color: "#444" }}>Pagos:</p>
            <p style={{ margin: 0, color: "#2e7d32", fontSize: "12px" }}>Sin mora pendiente</p>
          </div>
        </SolvenciaToast>
      </div>
    </div>
  );
}
