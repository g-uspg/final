"use client";
import { useState } from "react";

const ROLES = [
  {
    id: "ADMIN",
    titulo: "Administrador",
    icono: "⚙️",
    descripcion: "Gestión completa de alumnos, catedráticos y cursos.",
    color: "#0d47a1",
    bg: "#e3f2fd",
    border: "#1976d2",
    href: "/control-de-notas/admin",
  },
  {
    id: "PROFESOR",
    titulo: "Catedrático",
    icono: "👨‍🏫",
    descripcion: "Ingreso y consulta de notas de tus cursos asignados.",
    color: "#1b5e20",
    bg: "#e8f5e9",
    border: "#2e7d32",
    href: "/control-de-notas/profesor",
  },
  {
    id: "ESTUDIANTE",
    titulo: "Estudiante",
    icono: "🎓",
    descripcion: "Consulta tus notas, solvencia y estado de graduación.",
    color: "#e65100",
    bg: "#fff3e0",
    border: "#ef6c00",
    href: "/control-de-notas/estudiante",
  },
];

export default function GuiaPage() {
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!usuario.trim() || !password.trim()) {
      setError("Por favor ingresa usuario y contraseña.");
      return;
    }
    // Mock: redirige sin validar
    setError("");
    alert(`Login mock como ${rolSeleccionado.titulo} — usuario: ${usuario}`);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#f4f6fb",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Logo / título */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px", borderRadius: "16px",
            background: "#1976d2", marginBottom: "12px", fontSize: "28px",
          }}>📋</div>
          <h2 style={{ color: "#0d47a1", marginBottom: "4px" }}>Control de Notas</h2>
          <p style={{ color: "#888", fontSize: "14px" }}>Sistema Académico — Selecciona tu rol para continuar</p>
        </div>

        <div className="card" style={{ borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div className="card-body" style={{ padding: "28px" }}>

            {!rolSeleccionado ? (
              <>
                <p style={{ fontWeight: 600, color: "#555", marginBottom: "16px", fontSize: "14px" }}>
                  ¿Con qué rol vas a ingresar?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRolSeleccionado(r)}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        padding: "14px 16px", borderRadius: "10px",
                        background: r.bg, border: `1.5px solid ${r.border}33`,
                        cursor: "pointer", textAlign: "left", transition: "border 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.border = `1.5px solid ${r.border}`}
                      onMouseLeave={(e) => e.currentTarget.style.border = `1.5px solid ${r.border}33`}
                    >
                      <span style={{ fontSize: "28px" }}>{r.icono}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: r.color }}>{r.titulo}</p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#777" }}>{r.descripcion}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Formulario login */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <button
                    onClick={() => { setRolSeleccionado(null); setError(""); }}
                    style={{ background: "#f5f5f5", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}
                  >
                    ← Volver
                  </button>
                  <span style={{
                    padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                    background: rolSeleccionado.bg, color: rolSeleccionado.color,
                  }}>
                    {rolSeleccionado.icono} {rolSeleccionado.titulo}
                  </span>
                </div>

                {error && (
                  <div style={{
                    padding: "8px 14px", borderRadius: "8px", marginBottom: "14px",
                    background: "#ffebee", color: "#c62828", fontSize: "13px", fontWeight: 600,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#555", display: "block", marginBottom: "6px" }}>
                    Usuario / Carnet
                  </label>
                  <input
                    className="form-control"
                    placeholder="Ej. 2021001"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#555", display: "block", marginBottom: "6px" }}>
                    Contraseña
                  </label>
                  <input
                    className="form-control"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <button
                  className="btn"
                  style={{
                    width: "100%", background: rolSeleccionado.border, color: "white",
                    fontWeight: 700, padding: "10px", borderRadius: "8px", fontSize: "14px",
                  }}
                  onClick={handleLogin}
                >
                  Ingresar como {rolSeleccionado.titulo}
                </button>
              </>
            )}

          </div>
        </div>

        <p style={{ textAlign: "center", color: "#bbb", fontSize: "12px", marginTop: "16px" }}>
          Sistema de Control de Notas — Universidad
        </p>
      </div>
    </div>
  );
}