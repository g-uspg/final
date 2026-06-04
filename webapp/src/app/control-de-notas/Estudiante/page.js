"use client";
import { useState } from "react";

const notasMock = [
  { curso: "ING101", nombre: "Matemática 1",         zona: 35, final: 40, nota: 75, estado: "aprobado" },
  { curso: "ING102", nombre: "Programación 1",        zona: 30, final: 25, nota: 55, estado: "reprobado" },
  { curso: "ING201", nombre: "Estructuras de Datos",  zona: 38, final: 42, nota: 80, estado: "aprobado" },
  { curso: "GEN101", nombre: "Comunicación",          zona: 36, final: 38, nota: 74, estado: "aprobado" },
];

export default function EstudiantePage() {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = notasMock.filter((n) =>
    n.curso.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

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
              <h3 style={{ color: "#0d47a1", marginBottom: "4px" }}>🎓 Portal del Estudiante</h3>
              <p style={{ color: "#888", margin: 0 }}>Control de Notas — Vista alumno</p>
            </div>
            <a href="/control-de-notas" style={{ color: "#888", fontSize: "13px" }}>🚪 Salir</a>
          </div>

          <div className="card-body">

            {/* Stats */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Promedio",   valor: "71.0", color: "#1976d2", bg: "#e3f2fd" },
                { label: "Aprobados",  valor: "3",    color: "#2e7d32", bg: "#e8f5e9" },
                { label: "Reprobados", valor: "1",    color: "#c62828", bg: "#ffebee" },
                { label: "Créditos",   valor: "12",   color: "#e65100", bg: "#fff3e0" },
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

            {/* Buscador */}
            <div style={{ marginBottom: "16px" }}>
              <input
                className="form-control"
                placeholder="🔍 Buscar por curso..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ maxWidth: "360px" }}
              />
            </div>

            {/* Tabla */}
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  <th>Curso</th>
                  <th className="text-center">Zona</th>
                  <th className="text-center">Final</th>
                  <th className="text-center">Nota</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#aaa", padding: "30px" }}>Sin resultados.</td></tr>
                ) : filtradas.map((n, i) => (
                  <tr key={i} style={{ background: n.estado === "reprobado" ? "#fff8f8" : "white" }}>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: "12px" }}>{n.curso}</span><br />
                      <span style={{ fontSize: "12px", color: "#888" }}>{n.nombre}</span>
                    </td>
                    <td className="text-center">{n.zona}</td>
                    <td className="text-center">{n.final}</td>
                    <td className="text-center">
                      <span style={{ fontWeight: 700, color: n.nota >= 61 ? "#2e7d32" : "#c62828" }}>{n.nota}</span>
                    </td>
                    <td className="text-center">
                      <span style={{
                        padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
                        background: n.estado === "aprobado" ? "#e8f5e9" : "#ffebee",
                        color: n.estado === "aprobado" ? "#2e7d32" : "#c62828",
                      }}>
                        {n.estado === "aprobado" ? "✅ Aprobado" : "❌ Reprobado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
}