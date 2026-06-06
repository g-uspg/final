"use client";

import { useEffect, useState } from "react";

// ── Modal Confirm ───────────────────────────────────────────────────────────
function ModalConfirm({ titulo, mensaje, onConfirmar, onCancelar }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "white", borderRadius: "12px", padding: "28px",
        maxWidth: "380px", width: "90%", boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
      }}>
        <h5 style={{ marginBottom: "10px" }}>{titulo}</h5>
        <p style={{ color: "#555", fontSize: "14px", marginBottom: "20px" }}>{mensaje}</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ border: "1.5px solid #ccc", background: "white", color: "#444" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ background: "#c62828", color: "white", fontWeight: 700 }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Detalle Alumno ─────────────────────────────────────────────────────
function ModalDetalleAlumno({ carnet, nombre, onCerrar }) {
  const [notas, setNotas] = useState(null);
  const [solvencia, setSolvencia] = useState(null);
  const [graduacion, setGraduacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState("notas");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch(`/api/control-de-notas/notas/${carnet}`),
          fetch(`/api/solvencia/${carnet}`),
          fetch(`/api/control-de-notas/graduacion/requisitos/${carnet}`),
        ]);
        const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
        if (d1.success) setNotas(d1);
        if (d2.success) setSolvencia(d2);
        if (d3.success) setGraduacion(d3);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [carnet]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "760px", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid #1976d2", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <div>
            <h5 style={{ margin: 0, color: "#0d47a1" }}>🔍 Detalle: {nombre}</h5>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>Carnet: {carnet}</p>
          </div>
          <button onClick={onCerrar} style={{ background: "#f5f5f5", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {cargando ? (
            <p style={{ textAlign: "center" }}>Cargando información...</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {[
                  { label: "Promedio", valor: notas?.resumen?.promedioGeneral ?? "—", color: "#1976d2", bg: "#e3f2fd" },
                  { label: "Aprobados", valor: notas?.resumen?.cursosAprobados ?? "—", color: "#2e7d32", bg: "#e8f5e9" },
                  { label: "Reprobados", valor: notas?.resumen?.cursosReprobados ?? "—", color: "#c62828", bg: "#ffebee" },
                  { label: "Créditos", valor: notas?.resumen?.creditosAprobados ?? "—", color: "#e65100", bg: "#fff3e0" },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "10px 14px", borderRadius: "8px", background: s.bg, textAlign: "center", minWidth: "100px" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: s.color }}>{s.valor}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid #eee" }}>
                {[
                  { id: "notas", label: "📝 Notas" },
                  { id: "solvencia", label: "💳 Solvencia" },
                  { id: "graduacion", label: "🎓 Graduación" },
                ].map((t) => (
                  <button key={t.id} onClick={() => setTabActiva(t.id)} style={{
                    padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
                    borderBottom: tabActiva === t.id ? "2px solid #1976d2" : "2px solid transparent",
                    color: tabActiva === t.id ? "#1976d2" : "#666", fontWeight: tabActiva === t.id ? 700 : 400,
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tabActiva === "notas" && notas && (
                <table className="table">
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Curso</th><th>Período</th><th className="text-center">Zona</th><th className="text-center">Final</th><th className="text-center">Nota</th><th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(notas.notas ?? []).map((n, i) => (
                      <tr key={i}>
                        <td><strong>{n.curso}</strong><br /><small>{n.nombreCurso}</small></td>
                        <td>{n.periodo}</td>
                        <td className="text-center">{n.zona}</td>
                        <td className="text-center">{n.examenFinal}</td>
                        <td className="text-center" style={{ fontWeight: 700, color: n.notaFinal >= 61 ? "#2e7d32" : "#c62828" }}>{n.notaFinal}</td>
                        <td className="text-center">{n.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tabActiva === "solvencia" && solvencia && (
                <div style={{ padding: "14px 16px", borderRadius: "8px", background: solvencia.solvente ? "#e8f5e9" : "#ffebee" }}>
                  <h6>Solvencia Económica</h6>
                  <p><strong>Estado:</strong> {solvencia.solvente ? "✅ Solvente" : "❌ Con Mora"}</p>
                  {solvencia.total_pendiente > 0 && <p><strong>Pendiente:</strong> Q{solvencia.total_pendiente.toFixed(2)}</p>}
                  {solvencia.mensualidades_pendientes > 0 && <p><strong>Mensualidades pendientes:</strong> {solvencia.mensualidades_pendientes}</p>}
                </div>
              )}

              {tabActiva === "graduacion" && graduacion?.data && (
                <div style={{ padding: "14px 16px", borderRadius: "8px", background: graduacion.data.puedeGraduarse ? "#e8f5e9" : "#ffebee" }}>
                  <h6>Estado de Graduación</h6>
                  <p><strong>Puede graduarse:</strong> {graduacion.data.puedeGraduarse ? "✅ Sí" : "❌ No"}</p>
                  <p><strong>Cursos aprobados:</strong> {graduacion.data.cursosAprobados} / {graduacion.data.cursosMinimos}</p>
                  <p><strong>Solicitud activa:</strong> {graduacion.data.tieneSolicitudActiva ? "Sí" : "No"}</p>
                  <p><strong>Título emitido:</strong> {graduacion.data.tieneTituloEmitido ? "Sí" : "No"}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Editar Notas ─────────────────────────────────────────────────────
function ModalEditarNotas({ alumno, onCerrar, onGuardar }) {
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`/api/control-de-notas/notas/${alumno.carnet}`);
        const data = await res.json();
        if (data.success && data.notas) {
          setCursos(data.notas.map(n => ({
            id: n.id_matricula,
            curso: n.curso,
            nombre: n.nombreCurso,
            zona: n.zona,
            examenFinal: n.examenFinal,
          })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [alumno.carnet]);

  const handleChange = (id, campo, valor) => {
    setCursos(prev => prev.map(c => c.id === id ? { ...c, [campo]: Number(valor) } : c));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      for (const curso of cursos) {
        await fetch(`/api/control-de-notas/notas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carnet: alumno.carnet,
            curso: curso.curso,
            id_evaluacion: 1, // Temporal, deberías obtener el ID real
            valor: curso.zona + curso.examenFinal,
            registrado_por: "guia",
          }),
        });
      }
      alert(`✅ Notas guardadas para ${alumno.nombre}`);
      if (onGuardar) onGuardar();
      onCerrar();
    } catch (e) {
      alert("❌ Error: " + e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div style={{ padding: "40px", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "780px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "2px solid #1976d2", display: "flex", justifyContent: "space-between" }}>
          <h5>✏️ Editar Notas — {alumno.nombre}</h5>
          <button onClick={onCerrar}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <table className="table">
            <thead>
              <tr><th>Curso</th><th>Zona</th><th>Examen Final</th><th>Nota Final</th></tr>
            </thead>
            <tbody>
              {cursos.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.curso}</strong> - {c.nombre}</td>
                  <td><input type="number" value={c.zona} onChange={e => handleChange(c.id, 'zona', e.target.value)} style={{ width: "70px" }} min="0" max="40" /></td>
                  <td><input type="number" value={c.examenFinal} onChange={e => handleChange(c.id, 'examenFinal', e.target.value)} style={{ width: "80px" }} min="0" max="60" /></td>
                  <td style={{ fontWeight: 700, color: (c.zona + c.examenFinal) >= 61 ? "#2e7d32" : "#c62828" }}>{c.zona + c.examenFinal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "15px 24px", textAlign: "right", borderTop: "1px solid #eee" }}>
          <button onClick={onCerrar}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: "#1976d2", color: "white", padding: "10px 20px", marginLeft: "10px" }}>
            {guardando ? "Guardando..." : "Guardar Notas"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Asistencias ─────────────────────────────────────────────────────
function ModalAsistencias({ alumno, onCerrar }) {
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`/api/control-de-notas/asistencias/${alumno.carnet}/MAT101`);
        const data = await res.json();
        if (data.success) {
          setAsistencias(data.asistencias || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [alumno.carnet]);

  const toggle = (index) => {
    setAsistencias(prev => prev.map((a, i) => i === index ? { ...a, presente: !a.presente } : a));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      for (const asist of asistencias) {
        await fetch(`/api/control-de-notas/asistencias`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carnet: alumno.carnet,
            curso: "MAT101",
            fecha: asist.fecha,
            presente: asist.presente,
          }),
        });
      }
      alert("✅ Asistencias guardadas");
      onCerrar();
    } catch (e) {
      alert("❌ Error: " + e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div>Cargando...</div>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "600px" }}>
        <div style={{ padding: "20px 24px", borderBottom: "2px solid #1976d2" }}>
          <h5>📅 Asistencias — {alumno.nombre}</h5>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Asistencia</th></tr></thead>
            <tbody>
              {asistencias.map((a, i) => (
                <tr key={i}>
                  <td>{a.fecha}</td>
                  <td>
                    <button onClick={() => toggle(i)} style={{ padding: "6px 14px", borderRadius: "999px", background: a.presente ? "#e8f5e9" : "#ffebee" }}>
                      {a.presente ? "✅ Presente" : "❌ Ausente"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "15px 24px", textAlign: "right" }}>
          <button onClick={onCerrar}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: "#1976d2", color: "white" }}>
            {guardando ? "Guardando..." : "Guardar Asistencias"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal Guía ───────────────────────────────────────────────────
export default function GuiaAdminPage() {
  const [usuario, setUsuario] = useState(null);
  const [tabActiva, setTabActiva] = useState("Alumnos");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalEditarNotas, setModalEditarNotas] = useState(null);
  const [modalAsistencias, setModalAsistencias] = useState(null);

  const [alumnos, setAlumnos] = useState([]);
  const [catedraticos, setCatedraticos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("cn_usuario");
    if (!raw) { window.location.href = "/control-de-notas"; return; }
    const u = JSON.parse(raw);
    if (!["ADMIN", "GUIA"].includes(u.rol)) { window.location.href = "/control-de-notas"; return; }
    setUsuario(u);
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/sistema-academico/alumnos"),
        fetch("/api/sistema-academico/catedraticos"),
        fetch("/api/sistema-academico/cursos"),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      if (d1.success) setAlumnos(d1.data);
      if (d2.success) setCatedraticos(d2.data);
      if (d3.success) setCursos(d3.data);
      
      // Cargar solicitudes de graduación
      const resGrad = await fetch("/api/control-de-notas/graduacion");
      if (resGrad.ok) {
        const gradData = await resGrad.json();
        if (gradData.success) {
          setSolicitudes(gradData.solicitudes || []);
        }
      }
    } catch (e) {
      console.error("Error cargando datos", e);
    } finally {
      setCargando(false);
    }
  };

  const aprobarCierre = async (id) => {
    try {
      const res = await fetch(`/api/control-de-notas/graduacion/${id}/aprobar`, { method: "PUT" });
      if (res.ok) {
        setMensaje({ tipo: "ok", texto: "Solicitud aprobada" });
        cargarDatos();
      }
    } catch (e) {
      setMensaje({ tipo: "error", texto: "Error al aprobar" });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const rechazarCierre = async (id) => {
    try {
      const res = await fetch(`/api/control-de-notas/graduacion/${id}/rechazar`, { method: "PUT" });
      if (res.ok) {
        setMensaje({ tipo: "error", texto: "Solicitud rechazada" });
        cargarDatos();
      }
    } catch (e) {
      setMensaje({ tipo: "error", texto: "Error al rechazar" });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const alumnosFiltrados = alumnos.filter(a =>
    [a.carnet, `${a.nombre} ${a.apellido}`, a.email].some(v => 
      String(v || "").toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  if (cargando) return <div style={{ padding: "80px", textAlign: "center" }}>Cargando...</div>;

  return (
    <>
      {modalDetalle && <ModalDetalleAlumno carnet={modalDetalle.carnet} nombre={`${modalDetalle.nombre} ${modalDetalle.apellido}`} onCerrar={() => setModalDetalle(null)} />}
      {modalEditarNotas && <ModalEditarNotas alumno={modalEditarNotas} onCerrar={() => setModalEditarNotas(null)} onGuardar={cargarDatos} />}
      {modalAsistencias && <ModalAsistencias alumno={modalAsistencias} onCerrar={() => setModalAsistencias(null)} />}

      <div className="row clearfix">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1976d2" }}>
              <div>
                <h3 style={{ color: "#0d47a1", marginBottom: "4px" }}>👨‍🏫 Panel de Guía Académico</h3>
                <p style={{ color: "#888", margin: 0 }}>Administración + Gestión de Estudiantes</p>
              </div>
              <a href="/control-de-notas" style={{ color: "#888" }}>Salir</a>
            </div>

            <div className="card-body">
              {mensaje && (
                <div style={{ padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", background: mensaje.tipo === "ok" ? "#e8f5e9" : "#ffebee", color: mensaje.tipo === "ok" ? "#2e7d32" : "#c62828" }}>
                  {mensaje.texto}
                </div>
              )}

              <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #f0f0f0", flexWrap: "wrap" }}>
                {["Alumnos", "Catedráticos", "Cursos", "Solicitudes de Cierre"].map((tab) => (
                  <button key={tab} onClick={() => setTabActiva(tab)} style={{
                    padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                    borderBottom: tabActiva === tab ? "3px solid #1976d2" : "3px solid transparent",
                    color: tabActiva === tab ? "#1976d2" : "#666", fontWeight: tabActiva === tab ? 700 : 400,
                  }}>
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <input className="form-control" placeholder="🔍 Buscar por nombre, carnet..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ maxWidth: "360px" }} />
              </div>

              {/* Tab Alumnos */}
              {tabActiva === "Alumnos" && (
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Carnet</th><th>Nombre</th><th>Carrera</th><th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.carnet}</td>
                        <td>{a.nombre} {a.apellido}</td>
                        <td>{a.carrera?.nombre || "—"}</td>
                        <td className="text-center">
                          <button className="btn btn-sm" style={{ background: "#1976d2", color: "white", margin: "2px" }} onClick={() => setModalDetalle(a)}>Detalle</button>
                          <button className="btn btn-sm" style={{ background: "#ff9800", color: "white", margin: "2px" }} onClick={() => setModalEditarNotas(a)}>Editar Notas</button>
                          <button className="btn btn-sm" style={{ background: "#1976d2", color: "white", margin: "2px" }} onClick={() => setModalAsistencias(a)}>Asistencias</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab Catedráticos */}
              {tabActiva === "Catedráticos" && (
                <table className="table">
                  <thead><tr><th>Código</th><th>Nombre</th><th>Email</th></tr></thead>
                  <tbody>
                    {catedraticos.map(c => (
                      <tr key={c.id}>
                        <td>{c.codigo}</td>
                        <td>{c.nombre} {c.apellido}</td>
                        <td>{c.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab Cursos */}
              {tabActiva === "Cursos" && (
                <table className="table">
                  <thead><tr><th>Código</th><th>Nombre</th><th>Créditos</th></tr></thead>
                  <tbody>
                    {cursos.map(c => (
                      <tr key={c.id}>
                        <td>{c.codigo}</td>
                        <td>{c.nombre}</td>
                        <td>{c.creditos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab Solicitudes de Cierre */}
              {tabActiva === "Solicitudes de Cierre" && (
                <div>
                  <h5>Solicitudes de Graduación</h5>
                  <table className="table">
                    <thead>
                      <tr><th>Carnet</th><th>Alumno</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr>
                    </thead>
                    <tbody>
                      {solicitudes.map(s => (
                        <tr key={s.id}>
                          <td>{s.carnet}</td>
                          <td>{s.alumno}</td>
                          <td>{s.fecha}</td>
                          <td>{s.estado}</td>
                          <td>
                            {s.estado === "solicitada" && (
                              <>
                                <button onClick={() => aprobarCierre(s.id)} style={{ background: "#2e7d32", color: "white", marginRight: "5px" }}>Aprobar</button>
                                <button onClick={() => rechazarCierre(s.id)} style={{ background: "#c62828", color: "white" }}>Rechazar</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
