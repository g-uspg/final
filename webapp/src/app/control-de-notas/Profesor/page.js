"use client";
import { useState } from "react";

const cursosMock = [
  { codigo: "ING101", nombre: "Matemática 1",        seccion: "A", periodo: "2024-1", alumnos: 28 },
  { codigo: "ING201", nombre: "Estructuras de Datos", seccion: "B", periodo: "2024-1", alumnos: 22 },
  { codigo: "ING102", nombre: "Programación 1",       seccion: "A", periodo: "2024-1", alumnos: 30 },
];

const alumnosMock = [
  { carnet: "2021001", nombre: "Carlos Pérez",    zona: 35, final: null },
  { carnet: "2021002", nombre: "María García",    zona: 38, final: null },
  { carnet: "2021003", nombre: "José Méndez",     zona: 29, final: null },
  { carnet: "2021004", nombre: "Ana Rodríguez",   zona: 40, final: null },
];

export default function ProfesorPage() {
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [notas, setNotas] = useState({});

  const handleNota = (carnet, campo, valor) => {
    setNotas((prev) => ({
      ...prev,
      [carnet]: { ...prev[carnet], [campo]: valor },
    }));
  };

  return (
    <div className="row clearfix">
      <div className="col-lg-12">
        <div className="card">

          {/* Header */}
          <div className="card-header" style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "2px solid #1976d2",
          }}>
            <div>
              <h3 style={{ color: "#0d47a1", marginBottom: "4px" }}>👨‍🏫 Portal del Catedrático</h3>
              <p style={{ color: "#888", margin: 0 }}>Control de Notas — Ingreso de notas</p>
            </div>
            <a href="/control-de-notas" style={{ color: "#888", fontSize: "13px" }}>🚪 Salir</a>
          </div>

          <div className="card-body">

            {/* Stats */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Mis Cursos",  valor: cursosMock.length, color: "#1976d2", bg: "#e3f2fd" },
                { label: "Alumnos",     valor: cursosMock.reduce((s, c) => s + c.alumnos, 0), color: "#2e7d32", bg: "#e8f5e9" },
                { label: "Período",     valor: "2024-1",  color: "#e65100", bg: "#fff3e0" },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: "12px 20px", borderRadius: "10px",
                  background: s.bg, border: `1.5px solid ${s.color}22`,
                  minWidth: "100px", textAlign: "center",
                }}>
                  <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: s.color }}>{s.valor}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de cursos */}
            {!cursoSeleccionado ? (
              <>
                <h6 style={{ color: "#555", marginBottom: "12px" }}>📚 Mis Cursos Asignados</h6>
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Código</th><th>Nombre</th><th>Sección</th>
                      <th className="text-center">Alumnos</th>
                      <th className="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursosMock.map((c) => (
                      <tr key={c.codigo}>
                        <td style={{ fontWeight: 600 }}>{c.codigo}</td>
                        <td>{c.nombre}</td>
                        <td>{c.seccion}</td>
                        <td className="text-center">
                          <span className="badge" style={{ background: "#e3f2fd", color: "#0d47a1" }}>{c.alumnos}</span>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm"
                            style={{ background: "#1976d2", color: "white", fontSize: "12px" }}
                            onClick={() => setCursoSeleccionado(c)}
                          >
                            📝 Ingresar Notas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                {/* Vista ingreso de notas */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <button
                    className="btn btn-sm"
                    style={{ border: "1.5px solid #ccc", background: "white", color: "#444" }}
                    onClick={() => setCursoSeleccionado(null)}
                  >
                    ← Volver
                  </button>
                  <div>
                    <span style={{ fontWeight: 700, color: "#0d47a1" }}>{cursoSeleccionado.codigo}</span>
                    <span style={{ color: "#888", fontSize: "13px" }}> — {cursoSeleccionado.nombre} (Sección {cursoSeleccionado.seccion})</span>
                  </div>
                </div>

                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th>Carnet</th><th>Nombre</th>
                      <th className="text-center">Zona (0–40)</th>
                      <th className="text-center">Examen Final (0–60)</th>
                      <th className="text-center">Nota Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosMock.map((a) => {
                      const z = Number(notas[a.carnet]?.zona  ?? a.zona ?? 0);
                      const f = Number(notas[a.carnet]?.final ?? 0);
                      const total = z + f;
                      return (
                        <tr key={a.carnet}>
                          <td style={{ fontWeight: 600 }}>{a.carnet}</td>
                          <td>{a.nombre}</td>
                          <td className="text-center">
                            <input
                              type="number" min={0} max={40}
                              defaultValue={a.zona}
                              onChange={(e) => handleNota(a.carnet, "zona", e.target.value)}
                              style={{ width: "70px", textAlign: "center", border: "1px solid #ddd", borderRadius: "6px", padding: "4px" }}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="number" min={0} max={60}
                              placeholder="0"
                              onChange={(e) => handleNota(a.carnet, "final", e.target.value)}
                              style={{ width: "70px", textAlign: "center", border: "1px solid #ddd", borderRadius: "6px", padding: "4px" }}
                            />
                          </td>
                          <td className="text-center">
                            <span style={{ fontWeight: 700, color: total >= 61 ? "#2e7d32" : "#c62828" }}>
                              {total}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    className="btn"
                    style={{ background: "#1976d2", color: "white", fontWeight: 700 }}
                    onClick={() => alert("Notas guardadas (mock)")}
                  >
                    💾 Guardar Notas
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}