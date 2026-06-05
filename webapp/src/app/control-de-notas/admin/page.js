"use client";

import { useEffect, useState } from "react";

// ── Modal Confirmación ─────────────────────────────────────────────────────
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
          <button className="btn" onClick={onCancelar}
            style={{ border: "1.5px solid #ccc", background: "white", color: "#444" }}>
            Cancelar
          </button>
          <button className="btn" onClick={onConfirmar}
            style={{ background: "#c62828", color: "white", fontWeight: 700 }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Detalle Alumno (completo) ───────────────────────────────────────
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
          fetch(`/api/control-de-notas/notas/${carnet}/solvencia-estado`),
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
          <button onClick={onCerrar} style={{ background: "#f5f5f5", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {cargando ? (
            <p style={{ textAlign: "center", color: "#888" }}>⏳ Cargando información...</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {[
                  { label: "Promedio", valor: notas?.resumen?.promedioGeneral ?? "—", color: "#1976d2", bg: "#e3f2fd" },
                  { label: "Aprobados", valor: notas?.resumen?.cursosAprobados ?? "—", color: "#2e7d32", bg: "#e8f5e9" },
                  { label: "Reprobados", valor: notas?.resumen?.cursosReprobados ?? "—", color: "#c62828", bg: "#ffebee" },
                  { label: "Créditos", valor: notas?.resumen?.creditosAprobados ?? "—", color: "#e65100", bg: "#fff3e0" },
                  { label: "Graduación", valor: graduacion?.aptoParaGraduarse ? "✅ Apto" : "⏳ Pendiente", color: graduacion?.aptoParaGraduarse ? "#2e7d32" : "#e65100", bg: graduacion?.aptoParaGraduarse ? "#e8f5e9" : "#fff3e0" },
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

              {tabActiva === "notas" && (
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Curso</th><th>Período</th><th className="text-center">Zona</th><th className="text-center">Final</th><th className="text-center">Nota</th><th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(notas?.notas ?? []).map((n, i) => (
                      <tr key={i} style={{ background: n.estado === "reprobado" ? "#fff8f8" : "white" }}>
                        <td><span style={{ fontWeight: 600, fontSize: "12px" }}>{n.curso}</span><br /><span style={{ fontSize: "12px", color: "#888" }}>{n.nombreCurso}</span></td>
                        <td style={{ fontSize: "13px", color: "#888" }}>{n.periodo}</td>
                        <td className="text-center">{n.zona}</td>
                        <td className="text-center">{n.examenFinal}</td>
                        <td className="text-center"><span style={{ fontWeight: 700, color: n.notaFinal >= 61 ? "#2e7d32" : "#c62828" }}>{n.notaFinal}</span></td>
                        <td className="text-center">
                          <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, background: n.estado === "aprobado" ? "#e8f5e9" : "#ffebee", color: n.estado === "aprobado" ? "#2e7d32" : "#c62828" }}>
                            {n.estado === "aprobado" ? "✅ Aprobado" : "❌ Reprobado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tabActiva === "solvencia" && solvencia && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ padding: "14px 16px", borderRadius: "8px", background: solvencia.solvenciaNotas?.solvente ? "#e8f5e9" : "#ffebee", border: `1px solid ${solvencia.solvenciaNotas?.solvente ? "#a5d6a7" : "#ef9a9a"}` }}>
                    <p style={{ margin: 0, fontWeight: 600, color: solvencia.solvenciaNotas?.solvente ? "#2e7d32" : "#c62828" }}>📝 Solvencia de Notas: {solvencia.solvenciaNotas?.solvente ? "✅ Solvente" : "❌ Insolvente"}</p>
                  </div>
                  <div style={{ padding: "14px 16px", borderRadius: "8px", background: solvencia.solvenciaPagos?.solvente ? "#e8f5e9" : "#ffebee", border: `1px solid ${solvencia.solvenciaPagos?.solvente ? "#a5d6a7" : "#ef9a9a"}` }}>
                    <p style={{ margin: 0, fontWeight: 600, color: solvencia.solvenciaPagos?.solvente ? "#2e7d32" : "#c62828" }}>💳 Solvencia de Pagos: {solvencia.solvenciaPagos?.solvente ? "✅ Solvente" : "❌ Con mora"}</p>
                  </div>
                </div>
              )}

              {tabActiva === "graduacion" && graduacion && (
                <div>
                  <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", background: graduacion.aptoParaGraduarse ? "#e8f5e9" : "#fff8e1", border: `1px solid ${graduacion.aptoParaGraduarse ? "#a5d6a7" : "#ffe082"}` }}>
                    🎓 {graduacion.resumenEstado}
                  </div>
                  {/* Más contenido de graduación si lo necesitas */}
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
function ModalEditarNotas({ alumno, onCerrar }) {
  const [cursos, setCursos] = useState([
    { id: 1, curso: "MAT101", nombre: "Matemática I", zona: 28, examenFinal: 35 },
    { id: 2, curso: "SIS201", nombre: "Programación II", zona: 32, examenFinal: 40 },
  ]);
  const [guardando, setGuardando] = useState(false);

  const handleChange = (id, campo, valor) => {
    setCursos(prev => prev.map(c => c.id === id ? { ...c, [campo]: Number(valor) } : c));
  };

  const guardar = () => {
    setGuardando(true);
    setTimeout(() => {
      alert(`✅ Notas guardadas para ${alumno.nombre}`);
      onCerrar();
      setGuardando(false);
    }, 700);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "780px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "2px solid #1976d2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h5>✏️ Editar Notas — {alumno.nombre}</h5>
          <button onClick={onCerrar}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <table className="table">
            <thead><tr><th>Curso</th><th>Zona</th><th>Examen Final</th><th>Nota Final</th></tr></thead>
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
        <div style={{ padding: "15px 24px", borderTop: "1px solid #eee", textAlign: "right" }}>
          <button onClick={onCerrar} style={{ marginRight: "10px" }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: "#1976d2", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px" }}>
            {guardando ? "Guardando..." : "💾 Guardar Notas"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Asistencias ─────────────────────────────────────────────────────
function ModalAsistencias({ alumno, onCerrar }) {
  const [asistencias, setAsistencias] = useState([
    { fecha: "2026-05-10", presente: true },
    { fecha: "2026-05-17", presente: false },
    { fecha: "2026-05-24", presente: true },
    { fecha: "2026-05-31", presente: true },
  ]);

  const toggle = (index) => {
    setAsistencias(prev => prev.map((a, i) => i === index ? { ...a, presente: !a.presente } : a));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "600px" }}>
        <div style={{ padding: "20px 24px", borderBottom: "2px solid #1976d2", display: "flex", justifyContent: "space-between" }}>
          <h5>📅 Asistencias — {alumno.nombre}</h5>
          <button onClick={onCerrar}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Asistencia</th></tr></thead>
            <tbody>
              {asistencias.map((a, i) => (
                <tr key={i}>
                  <td>{a.fecha}</td>
                  <td>
                    <button onClick={() => toggle(i)} style={{ padding: "6px 14px", borderRadius: "999px", background: a.presente ? "#e8f5e9" : "#ffebee", color: a.presente ? "#2e7d32" : "#c62828", border: "none" }}>
                      {a.presente ? "✅ Presente" : "❌ Ausente"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "15px 24px", textAlign: "right", borderTop: "1px solid #eee" }}>
          <button onClick={onCerrar} style={{ background: "#1976d2", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px" }}>Guardar Asistencias</button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────
export default function GuiaAdminPage() {
  const [usuario, setUsuario] = useState(null);
  const [tabActiva, setTabActiva] = useState("Alumnos");
  const [busqueda, setBusqueda] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalEditarNotas, setModalEditarNotas] = useState(null);
  const [modalAsistencias, setModalAsistencias] = useState(null);

  // Solicitudes de cierre de pensum (quemadas)
  const [solicitudes, setSolicitudes] = useState([
    { id: 1, carnet: "2021001", nombre: "Carlos Andrés Pérez López", fecha: "2026-06-02", estado: "pendiente", motivo: "Completó todos los créditos" },
    { id: 2, carnet: "2019003", nombre: "José Roberto Méndez Cruz", fecha: "2026-06-03", estado: "pendiente", motivo: "Pendiente de aprobación de guía" },
    { id: 3, carnet: "2020004", nombre: "Ana Lucía Rodríguez Vásquez", fecha: "2026-06-04", estado: "pendiente", motivo: "Solicitud de catedrático" },
  ]);

  const alumnosMock = [
    { id: "1", carnet: "2021001", nombre: "Carlos Andrés", apellido: "Pérez López", email: "carlos.perez@universidad.edu", carrera: { nombre: "Ingeniería en Sistemas" } },
    { id: "2", carnet: "2021002", nombre: "María Fernanda", apellido: "García Ramos", email: "maria.garcia@universidad.edu", carrera: { nombre: "Administración de Empresas" } },
    { id: "3", carnet: "2019003", nombre: "José Roberto", apellido: "Méndez Cruz", email: "jose.mendez@universidad.edu", carrera: { nombre: "Ingeniería en Sistemas" } },
    { id: "4", carnet: "2020004", nombre: "Ana Lucía", apellido: "Rodríguez Vásquez", email: "ana.rodriguez@universidad.edu", carrera: { nombre: "Contaduría Pública" } },
    { id: "5", carnet: "2018005", nombre: "Luis Enrique", apellido: "Torres Molina", email: "luis.torres@universidad.edu", carrera: { nombre: "Ingeniería en Sistemas" } },
  ];

  const catedraticosMock = [
    { id: "1", codigo: "CAT001", nombre: "Roberto", apellido: "Hernández", email: "roberto.hernandez@universidad.edu" },
    { id: "2", codigo: "CAT002", nombre: "Sandra", apellido: "Martínez", email: "sandra.martinez@universidad.edu" },
    { id: "3", codigo: "CAT003", nombre: "Miguel", apellido: "López", email: "miguel.lopez@universidad.edu" },
  ];

  const cursosMock = [
    { id: "1", codigo: "ING101", nombre: "Matemática 1", creditos: 4 },
    { id: "2", codigo: "ING102", nombre: "Programación 1", creditos: 4 },
    { id: "3", codigo: "ING201", nombre: "Estructuras de Datos", creditos: 4 },
  ];

  const [alumnos, setAlumnos] = useState(alumnosMock);
  const [catedraticos, setCatedraticos] = useState(catedraticosMock);
  const [cursos, setCursos] = useState(cursosMock);

  useEffect(() => {
    const raw = sessionStorage.getItem("cn_usuario");
    if (!raw) { window.location.href = "/control-de-notas"; return; }
    const u = JSON.parse(raw);
    if (!["ADMIN", "GUIA"].includes(u.rol)) { window.location.href = "/control-de-notas"; return; }
    setUsuario(u);
  }, []);

  const aprobarCierre = (id) => {
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: "aprobado" } : s));
    setMensaje({ tipo: "ok", texto: "✅ Solicitud de cierre aprobada correctamente" });
    setTimeout(() => setMensaje(null), 3000);
  };

  const rechazarCierre = (id) => {
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: "rechazado" } : s));
    setMensaje({ tipo: "error", texto: "❌ Solicitud rechazada" });
    setTimeout(() => setMensaje(null), 3000);
  };

  const alumnosFiltrados = alumnos.filter(a =>
    [a.carnet, `${a.nombre} ${a.apellido}`, a.email].some(v => v.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const catedraticosFiltrados = catedraticos.filter(c =>
    [c.codigo, `${c.nombre} ${c.apellido}`].some(v => v.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const cursosFiltrados = cursos.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <>
      {confirm && <ModalConfirm {...confirm} />}
      {modalDetalle && <ModalDetalleAlumno carnet={modalDetalle.carnet} nombre={`${modalDetalle.nombre} ${modalDetalle.apellido}`} onCerrar={() => setModalDetalle(null)} />}
      {modalEditarNotas && <ModalEditarNotas alumno={modalEditarNotas} onCerrar={() => setModalEditarNotas(null)} />}
      {modalAsistencias && <ModalAsistencias alumno={modalAsistencias} onCerrar={() => setModalAsistencias(null)} />}

      <div className="row clearfix">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1976d2" }}>
              <div>
                <h3 style={{ color: "#0d47a1", marginBottom: "4px" }}>👨‍🏫 Panel de Guía Académico</h3>
                <p style={{ color: "#888", margin: 0 }}>Administración + Revisión de Solicitudes</p>
              </div>
              <a href="/control-de-notas" style={{ color: "#888", fontSize: "13px" }}>🚪 Salir</a>
            </div>

            <div className="card-body">
              {mensaje && (
                <div style={{ padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", background: mensaje.tipo === "ok" ? "#e8f5e9" : "#ffebee", color: mensaje.tipo === "ok" ? "#2e7d32" : "#c62828", fontWeight: 600 }}>
                  {mensaje.texto}
                </div>
              )}

              <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #f0f0f0", flexWrap: "wrap" }}>
                {["Alumnos", "Catedráticos", "Cursos", "Solicitudes de Cierre"].map((tab) => (
                  <button key={tab} onClick={() => { setTabActiva(tab); setBusqueda(""); }} style={{
                    padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                    borderBottom: tabActiva === tab ? "3px solid #1976d2" : "3px solid transparent",
                    color: tabActiva === tab ? "#1976d2" : "#666", fontWeight: tabActiva === tab ? 700 : 400,
                  }}>
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <input className="form-control" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ maxWidth: "360px" }} />
              </div>

              {/* Tab Alumnos */}
              {tabActiva === "Alumnos" && (
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Carnet</th><th>Nombre</th><th>Email</th><th>Carrera</th><th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.carnet}</td>
                        <td>{a.nombre} {a.apellido}</td>
                        <td style={{ fontSize: "13px", color: "#666" }}>{a.email}</td>
                        <td>{a.carrera?.nombre}</td>
                        <td className="text-center">
                          <div style={{ display: "flex", gap: "5px", justifyContent: "center", flexWrap: "wrap" }}>
                            <button className="btn btn-sm" style={{ background: "#1976d2", color: "white" }} onClick={() => setModalDetalle(a)}>🔍 Detalle</button>
                            <button className="btn btn-sm" style={{ background: "#ff9800", color: "white" }} onClick={() => setModalEditarNotas(a)}>✏️ Notas</button>
                            <button className="btn btn-sm" style={{ background: "#1976d2", color: "white" }} onClick={() => setModalAsistencias(a)}>📅 Asistencias</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab Catedráticos */}
              {tabActiva === "Catedráticos" && (
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Código</th><th>Nombre</th><th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catedraticosFiltrados.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.codigo}</td>
                        <td>{c.nombre} {c.apellido}</td>
                        <td style={{ fontSize: "13px", color: "#666" }}>{c.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab Cursos */}
              {tabActiva === "Cursos" && (
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Código</th><th>Nombre</th><th className="text-center">Créditos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursosFiltrados.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.codigo}</td>
                        <td>{c.nombre}</td>
                        <td className="text-center">{c.creditos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab Solicitudes de Cierre */}
              {tabActiva === "Solicitudes de Cierre" && (
                <div>
                  <h5 style={{ marginBottom: "16px" }}>📋 Solicitudes de Cierre de Pensum recibidas de Catedráticos</h5>
                  <table className="table">
                    <thead>
                      <tr><th>Carnet</th><th>Alumno</th><th>Fecha</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {solicitudes.map(s => (
                        <tr key={s.id}>
                          <td>{s.carnet}</td>
                          <td>{s.nombre}</td>
                          <td>{s.fecha}</td>
                          <td style={{ fontSize: "13px" }}>{s.motivo}</td>
                          <td>
                            <span style={{ padding: "4px 12px", borderRadius: "999px", background: s.estado === "aprobado" ? "#e8f5e9" : s.estado === "rechazado" ? "#ffebee" : "#fff3e0", color: s.estado === "aprobado" ? "#2e7d32" : s.estado === "rechazado" ? "#c62828" : "#e65100" }}>
                              {s.estado === "pendiente" ? "⏳ Pendiente" : s.estado === "aprobado" ? "✅ Aprobado" : "❌ Rechazado"}
                            </span>
                          </td>
                          <td>
                            {s.estado === "pendiente" && (
                              <>
                                <button onClick={() => aprobarCierre(s.id)} style={{ background: "#2e7d32", color: "white", marginRight: "6px", padding: "6px 14px", borderRadius: "6px" }}>Aprobar</button>
                                <button onClick={() => rechazarCierre(s.id)} style={{ background: "#c62828", color: "white", padding: "6px 14px", borderRadius: "6px" }}>Rechazar</button>
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
