"use client";

import { useEffect, useRef, useState } from "react";

// ── Toast flotante ────────────────────────────────────────────────────────────
function SolvenciaToast({ icono, titulo, badge, solvente, children, visible, onClose }) {
  const [show, setShow] = useState(false);
  const [barWidth, setBarWidth] = useState(100);
  const timerRef = useRef(null);
  const duration = 5000;

  useEffect(() => {
    if (visible) {
      setBarWidth(100);
      requestAnimationFrame(() => {
        setShow(true);
        requestAnimationFrame(() => setBarWidth(0));
      });
      timerRef.current = setTimeout(() => onClose(), duration);
    } else {
      setShow(false);
      clearTimeout(timerRef.current);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible, onClose]);

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
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#aaa" }}>✕</button>
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

// ── Badge de estado de nota ───────────────────────────────────────────────────
function BadgeNota({ nota }) {
  const color = nota >= 61 ? "#2e7d32" : "#c62828";
  const bg = nota >= 61 ? "#e8f5e9" : "#ffebee";
  return (
    <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, background: bg, color }}>
      {nota}
    </span>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
function BarraProgreso({ valor, max, color }) {
  const pct = Math.min(100, (valor / max) * 100);
  return (
    <div style={{ background: "#f0f0f0", borderRadius: "999px", height: "8px", width: "100%" }}>
      <div style={{ width: `${pct}%`, background: color, borderRadius: "999px", height: "100%", transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EstudiantePage() {
  const [usuario, setUsuario] = useState(null);
  const [notas, setNotas] = useState(null);
  const [solvencia, setSolvencia] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tabActiva, setTabActiva] = useState("notas");
  const [toastVisible, setToastVisible] = useState({ solvencia: false });
  const [modoDemo, setModoDemo] = useState(false);

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
    
    // Usar carnet como identificador principal
    const identificador = u.carnet;
    if (identificador) {
      cargarDatos(identificador);
    } else {
      setError("No se encontró el carnet del alumno");
      setCargando(false);
    }
  }, []);

  const cargarDatos = async (carnet) => {
    setCargando(true);
    setError("");
    setModoDemo(false);
    
    try {
      console.log("🔍 Cargando datos para carnet:", carnet);
      
      // Llamar a las APIs del Grupo 1
      const [resNotas, resSolvencia] = await Promise.all([
        fetch(`/api/control-de-notas/notas/${carnet}`),
        fetch(`/api/control-de-notas/notas/${carnet}/solvencia-estado`),
      ]);

      console.log("📡 Respuesta notas:", resNotas.status);
      console.log("📡 Respuesta solvencia:", resSolvencia.status);

      // Validar respuestas HTTP
      if (!resNotas.ok) {
        throw new Error(`Error al obtener notas: ${resNotas.status} ${resNotas.statusText}`);
      }
      
      if (!resSolvencia.ok) {
        throw new Error(`Error al obtener solvencia: ${resSolvencia.status} ${resSolvencia.statusText}`);
      }

      const dNotas = await resNotas.json();
      const dSolvencia = await resSolvencia.json();

      console.log("✅ Datos de notas:", dNotas);
      console.log("✅ Datos de solvencia:", dSolvencia);

      if (!dNotas.success) {
        throw new Error(dNotas.message || "Error al cargar las notas");
      }

      if (!dSolvencia.success) {
        throw new Error(dSolvencia.message || "Error al cargar la solvencia");
      }

      setNotas(dNotas);
      setSolvencia(dSolvencia);

    } catch (e) {
      console.error("❌ Error cargando datos:", e);
      
      // Mostrar el error real
      setError(e.message || "No se pudieron cargar los datos");
      setModoDemo(true);
      
      // Datos mock de respaldo
      setNotas({
        success: true,
        alumno: {
          nombre: usuario?.nombre || "Estudiante",
          carnet: carnet,
          carrera: usuario?.carrera || "Sin carrera asignada"
        },
        notas: [],
        resumen: {
          promedioGeneral: 0,
          totalCursos: 0,
          cursosAprobados: 0,
          cursosReprobados: 0,
          creditosAprobados: 0
        }
      });
      
      setSolvencia({
        success: true,
        solvenciaGeneral: true,
        solvenciaNotas: {
          solvente: true,
          totalReprobados: 0,
          cursosReprobados: []
        },
        solvenciaPagos: {
          solvente: true,
          montoPendiente: 0.00,
          mensualidadesPendientes: 0,
          enMora: false
        }
      });
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return (
    <div style={{ textAlign: "center", padding: "80px" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
      <p style={{ fontSize: "18px", color: "#666" }}>Cargando tu información académica...</p>
      <p style={{ fontSize: "14px", color: "#999", marginTop: "8px" }}>
        Consultando base de datos del sistema académico
      </p>
    </div>
  );

  // Extraer datos (ya sean reales o de demo)
  const notasLista = notas?.notas ?? [];
  const resumen = notas?.resumen ?? {};
  const alumnoData = notas?.alumno ?? {};
  const solvGeneral = solvencia?.solvenciaGeneral ?? false;
  const reproList = notasLista.filter((n) => n.estado === "reprobado");
  
  const carnetDisplay = alumnoData?.carnet ?? usuario?.carnet ?? "—";

  return (
    <div className="row clearfix">
      <div className="col-lg-12">
        <div className="card" style={{ background: "#fff" }}>
          
          {/* Banner de modo demo/error */}
          {modoDemo && (
            <div style={{
              background: "#fff3cd", 
              border: "1px solid #ffc107", 
              color: "#856404", 
              padding: "12px 20px", 
              fontSize: "14px",
              borderRadius: "8px 8px 0 0", 
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <div>
                <strong>Modo demostración:</strong> {error}
                {notasLista.length === 0 && (
                  <div style={{ marginTop: "4px", fontSize: "12px" }}>
                    No se encontraron notas registradas. Por favor contacta al departamento académico.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="card-header" style={{
            background: "#fff", 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center", 
            borderBottom: "2px solid #800020", 
            padding: "20px",
          }}>
            <div>
              <h3 style={{ color: "#800020", marginBottom: "4px", fontWeight: 700 }}>
                👨‍🎓 {alumnoData?.nombre || usuario?.nombre || "Estudiante"}
              </h3>
              <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
                <strong>Carnet:</strong> {carnetDisplay} | <strong>Carrera:</strong> {alumnoData?.carrera || usuario?.carrera || "Sin asignar"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setToastVisible((p) => ({ ...p, solvencia: !p.solvencia }))}
                style={{
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  padding: "8px 16px", 
                  borderRadius: "10px", 
                  cursor: "pointer",
                  border: `1.5px solid ${solvGeneral ? "#2e7d32" : "#c62828"}`,
                  background: solvGeneral ? "#e8f5e9" : "#ffebee",
                  color: solvGeneral ? "#2e7d32" : "#c62828",
                  fontWeight: 600, 
                  fontSize: "13px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {solvGeneral ? "✅" : "⚠️"} Solvencia
              </button>
              <a 
                href="/control-de-notas" 
                style={{ 
                  color: "#888", 
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                🚪 Salir
              </a>
            </div>
          </div>

          <div className="card-body" style={{ padding: "20px" }}>

            {/* Stats rápidos */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
              {[
                { 
                  label: "Promedio General", 
                  valor: typeof resumen.promedioGeneral === 'number' 
                    ? resumen.promedioGeneral.toFixed(1) 
                    : "—", 
                  color: "#1976d2", 
                  bg: "#e3f2fd" 
                },
                { 
                  label: "Cursos Aprobados", 
                  valor: resumen.cursosAprobados ?? 0, 
                  color: "#2e7d32", 
                  bg: "#e8f5e9" 
                },
                { 
                  label: "Cursos Reprobados", 
                  valor: resumen.cursosReprobados ?? 0, 
                  color: "#c62828", 
                  bg: "#ffebee" 
                },
                { 
                  label: "Créditos Obtenidos", 
                  valor: resumen.creditosAprobados ?? 0, 
                  color: "#e65100", 
                  bg: "#fff3e0" 
                },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: "14px 20px", 
                  borderRadius: "10px", 
                  background: s.bg,
                  border: `1.5px solid ${s.color}22`, 
                  minWidth: "130px", 
                  textAlign: "center",
                  flex: "1 1 calc(25% - 12px)",
                  minHeight: "80px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: s.color }}>
                    {s.valor}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#666" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #f0f0f0" }}>
              {[
                { id: "notas", label: `📝 Mis Notas (${notasLista.length})` },
                { id: "reprobados", label: `❌ Reprobados (${reproList.length})` },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
                  padding: "10px 20px", 
                  border: "none", 
                  background: "none", 
                  cursor: "pointer",
                  borderBottom: tabActiva === tab.id ? "3px solid #800020" : "3px solid transparent",
                  color: tabActiva === tab.id ? "#800020" : "#666",
                  fontWeight: tabActiva === tab.id ? 700 : 400,
                  fontSize: "14px", 
                  marginBottom: "-2px",
                  transition: "all 0.2s ease"
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Todas las notas */}
            {tabActiva === "notas" && (
              <div>
                {notasLista.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "60px 20px",
                    background: "#f9f9f9",
                    borderRadius: "10px"
                  }}>
                    <p style={{ fontSize: "48px", margin: "0 0 16px" }}>📚</p>
                    <p style={{ fontSize: "18px", color: "#666", fontWeight: 600, margin: "0 0 8px" }}>
                      No hay notas registradas
                    </p>
                    <p style={{ fontSize: "14px", color: "#999", margin: 0 }}>
                      Aún no tienes cursos con calificaciones asignadas
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                        <thead>
                          <tr style={{ background: "#f9f9f9" }}>
                            <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Código</th>
                            <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Curso</th>
                            <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Período</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Zona</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Final</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Nota Final</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Estado</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Créditos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notasLista.map((n, i) => (
                            <tr key={i} style={{ 
                              background: n.estado === "reprobado" ? "#fff8f8" : "white", 
                              borderBottom: "1px solid #eee",
                              transition: "background 0.2s ease"
                            }}>
                              <td style={{ padding: "12px", fontWeight: 600, fontSize: "13px" }}>{n.curso}</td>
                              <td style={{ padding: "12px" }}>{n.nombreCurso}</td>
                              <td style={{ padding: "12px", fontSize: "13px", color: "#888" }}>{n.periodo}</td>
                              <td style={{ padding: "12px", textAlign: "center" }}>{n.zona}</td>
                              <td style={{ padding: "12px", textAlign: "center" }}>{n.examenFinal}</td>
                              <td style={{ padding: "12px", textAlign: "center" }}><BadgeNota nota={n.notaFinal} /></td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                <span style={{
                                  padding: "3px 10px", 
                                  borderRadius: "999px", 
                                  fontSize: "11px", 
                                  fontWeight: 600,
                                  background: n.estado === "aprobado" ? "#e8f5e9" : "#ffebee",
                                  color: n.estado === "aprobado" ? "#2e7d32" : "#c62828",
                                }}>
                                  {n.estado === "aprobado" ? "✅ Aprobado" : "❌ Reprobado"}
                                </span>
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>{n.creditos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Barra de progreso de créditos */}
                    <div style={{ 
                      marginTop: "20px", 
                      padding: "16px", 
                      background: "#f9f9f9", 
                      borderRadius: "10px",
                      border: "1px solid #e0e0e0"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: 600, fontSize: "14px" }}>📊 Progreso de créditos</span>
                        <span style={{ fontSize: "13px", color: "#666", fontWeight: 600 }}>
                          {resumen.creditosAprobados ?? 0} / 200
                        </span>
                      </div>
                      <BarraProgreso valor={resumen.creditosAprobados ?? 0} max={200} color="#800020" />
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#888" }}>
                        Te faltan <strong>{200 - (resumen.creditosAprobados ?? 0)}</strong> créditos para completar la carrera
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Reprobados */}
            {tabActiva === "reprobados" && (
              <div>
                {reproList.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "60px 20px",
                    background: "#f0fdf4",
                    borderRadius: "10px",
                    border: "1px solid #bbf7d0"
                  }}>
                    <p style={{ fontSize: "64px", margin: "0 0 16px" }}>🎉</p>
                    <p style={{ 
                      color: "#2e7d32", 
                      fontWeight: 700, 
                      fontSize: "20px",
                      margin: "0 0 8px"
                    }}>
                      ¡Excelente trabajo!
                    </p>
                    <p style={{ color: "#15803d", fontSize: "14px", margin: 0 }}>
                      No tenés cursos reprobados
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: "12px 16px", 
                      borderRadius: "8px", 
                      marginBottom: "16px",
                      background: "#ffebee", 
                      border: "1px solid #ef9a9a", 
                      fontSize: "13px", 
                      color: "#c62828",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ fontSize: "18px" }}>⚠️</span>
                      <div>
                        Tenés <strong>{reproList.length}</strong> curso(s) reprobado(s). 
                        Debés repetirlos para completar tu pensum.
                      </div>
                    </div>
                    
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                        <thead>
                          <tr style={{ background: "#f9f9f9" }}>
                            <th style={{ padding: "12px", fontWeight: 600 }}>Código</th>
                            <th style={{ padding: "12px", fontWeight: 600 }}>Curso</th>
                            <th style={{ padding: "12px", fontWeight: 600 }}>Período</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Zona</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Examen Final</th>
                            <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Nota Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reproList.map((n, i) => (
                            <tr key={i} style={{ background: "#fff8f8", borderBottom: "1px solid #eee" }}>
                              <td style={{ padding: "12px", fontWeight: 600 }}>{n.curso}</td>
                              <td style={{ padding: "12px" }}>{n.nombreCurso}</td>
                              <td style={{ padding: "12px", fontSize: "13px", color: "#888" }}>{n.periodo}</td>
                              <td style={{ padding: "12px", textAlign: "center", color: "#c62828", fontWeight: 600 }}>{n.zona}</td>
                              <td style={{ padding: "12px", textAlign: "center", color: "#c62828", fontWeight: 600 }}>{n.examenFinal}</td>
                              <td style={{ padding: "12px", textAlign: "center" }}><BadgeNota nota={n.notaFinal} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Toast solvencia */}
      <div style={{
        position: "fixed", 
        top: "16px", 
        right: "16px",
        display: "flex", 
        flexDirection: "column", 
        gap: "10px",
        zIndex: 9999, 
        pointerEvents: "none",
      }}>
        <SolvenciaToast
          icono={solvGeneral ? "✅" : "⚠️"}
          titulo="Estado de Solvencia"
          badge={solvGeneral ? "Solvente" : "Con pendientes"}
          solvente={solvGeneral}
          visible={toastVisible.solvencia}
          onClose={() => setToastVisible((p) => ({ ...p, solvencia: false }))}
        >
          <div style={{ fontSize: "13px" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#444" }}>📚 Notas:</p>
            <p style={{ 
              margin: "0 0 4px", 
              color: solvencia?.solvenciaNotas?.solvente ? "#2e7d32" : "#c62828",
              fontSize: "12px"
            }}>
              {solvencia?.solvenciaNotas?.solvente
                ? "✅ Sin cursos reprobados"
                : `❌ ${solvencia?.solvenciaNotas?.totalReprobados || reproList.length} curso(s) reprobado(s)`}
            </p>
            
            <p style={{ margin: "12px 0 6px", fontWeight: 600, color: "#444" }}>💰 Pagos:</p>
            <p style={{ 
              margin: 0, 
              color: solvencia?.solvenciaPagos?.solvente ? "#2e7d32" : "#c62828",
              fontSize: "12px"
            }}>
              {solvencia?.solvenciaPagos?.solvente
                ? "✅ Sin mora pendiente"
                : `❌ Q${(solvencia?.solvenciaPagos?.montoPendiente || 0).toFixed(2)} pendiente`}
            </p>
          </div>
        </SolvenciaToast>
      </div>
    </div>
  );
}
