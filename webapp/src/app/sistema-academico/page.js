"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function SistemaAcademicoPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alumnos, setAlumnos] = useState([]);
  const [catedraticos, setCatedraticos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const [newAlumno, setNewAlumno] = useState({ carnet: "", nombre: "", apellido: "", email: "" });
  const [autoCarnet, setAutoCarnet] = useState(false);
  const [newCatedratico, setNewCatedratico] = useState({ codigo: "", nombre: "", apellido: "", email: "" });
  const [newCurso, setNewCurso] = useState({ codigo: "", nombre: "", creditos: "" });
  const [newCarrera, setNewCarrera] = useState({ codigo: "", nombre: "", facultad: "" });
  const [newAsignacion, setNewAsignacion] = useState({ alumnoId: "", cursoId: "", ciclo: "" });
  const [newHorario, setNewHorario] = useState({ cursoId: "", catedraticoId: "", dia: "", horaInicio: "", horaFin: "", salon: "" });
  const [newAsistencia, setNewAsistencia] = useState({ alumnoId: "", horarioId: "", fecha: "", presente: true });

  const handleDeleteAlumno = async (id, carnet) => {
    if (!confirm(`¿Eliminar al alumno con carnet ${carnet}? Esta acción también eliminará sus asignaciones y asistencias.`)) return;
    try {
      await axios.delete(`/api/sistema-academico/alumnos/${id}`);
      showNotification(`Alumno ${carnet} eliminado correctamente`);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAlumnos, resCatedraticos, resCursos, resCarreras, resAsignaciones, resHorarios, resAsistencias, resSolicitudes] = await Promise.all([
        axios.get("/api/sistema-academico/alumnos"),
        axios.get("/api/sistema-academico/catedraticos"),
        axios.get("/api/sistema-academico/cursos"),
        axios.get("/api/sistema-academico/carreras"),
        axios.get("/api/sistema-academico/asignaciones"),
        axios.get("/api/sistema-academico/horarios"),
        axios.get("/api/sistema-academico/asistencias"),
        axios.get("/api/sistema-academico/solicitudes"),
      ]);
      setAlumnos(resAlumnos.data.data || []);
      setCatedraticos(resCatedraticos.data.data || []);
      setCursos(resCursos.data.data || []);
      setCarreras(resCarreras.data.data || []);
      setAsignaciones(resAsignaciones.data.data || []);
      setHorarios(resHorarios.data.data || []);
      setAsistencias(resAsistencias.data.data || []);
      setSolicitudes(resSolicitudes.data.data || []);
    } catch (error) {
      showNotification("Error cargando datos: " + (error.response?.data?.error || error.message), "danger");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
  };

  const handleCreateAlumno = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newAlumno, autoCarnet };
      const res = await axios.post("/api/sistema-academico/alumnos", payload);
      showNotification(res.data.message || "Alumno registrado exitosamente");
      setNewAlumno({ carnet: "", nombre: "", apellido: "", email: "" });
      setAutoCarnet(false);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateCatedratico = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/catedraticos", newCatedratico);
      showNotification("Catedrático registrado exitosamente");
      setNewCatedratico({ codigo: "", nombre: "", apellido: "", email: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateCurso = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/cursos", newCurso);
      showNotification("Curso creado exitosamente");
      setNewCurso({ codigo: "", nombre: "", creditos: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateCarrera = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/carreras", newCarrera);
      showNotification("Carrera creada exitosamente");
      setNewCarrera({ codigo: "", nombre: "", facultad: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateAsignacion = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/asignaciones", newAsignacion);
      showNotification("Asignación registrada exitosamente");
      setNewAsignacion({ alumnoId: "", cursoId: "", ciclo: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateHorario = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/horarios", newHorario);
      showNotification("Horario creado exitosamente");
      setNewHorario({ cursoId: "", catedraticoId: "", dia: "", horaInicio: "", horaFin: "", salon: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateAsistencia = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/asistencias", newAsistencia);
      showNotification("Asistencia registrada exitosamente");
      setNewAsistencia({ alumnoId: "", horarioId: "", fecha: "", presente: true });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return (
    <div className="section-body">
      {notification.show && (
        <div className={`alert alert-${notification.type} position-fixed`} style={{ top: "20px", right: "20px", zIndex: 9999, minWidth: "300px" }}>
          {notification.message}
        </div>
      )}

      <div className="container-fluid">
        {/* TABS */}
        <div className="row clearfix">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <ul className="nav nav-tabs page-header-tab">
                  {[
                    { key: "dashboard", icon: "fa-dashboard", label: "Dashboard" },
                    { key: "alumnos", icon: "fa-users", label: "Alumnos" },
                    { key: "catedraticos", icon: "fa-chalkboard-teacher", label: "Catedráticos" },
                    { key: "cursos", icon: "fa-book", label: "Cursos" },
                    { key: "carreras", icon: "fa-graduation-cap", label: "Carreras" },
                    { key: "asignaciones", icon: "fa-link", label: "Asignaciones" },
                    { key: "horarios", icon: "fa-calendar", label: "Horarios" },
                    { key: "asistencias", icon: "fa-check-square", label: "Asistencias" },
                  ].map(tab => (
                    <li className="nav-item" key={tab.key}>
                      <a className={`nav-link ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)} href="#">
                        <i className={`fa ${tab.icon} mr-2`}></i>{tab.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div className="row clearfix">
              {[
                { label: "Alumnos", value: alumnos.length, icon: "fa-users", color: "primary" },
                { label: "Catedráticos", value: catedraticos.length, icon: "fa-chalkboard-teacher", color: "success" },
                { label: "Cursos", value: cursos.length, icon: "fa-book", color: "warning" },
                { label: "Carreras", value: carreras.length, icon: "fa-graduation-cap", color: "info" },
                { label: "Asignaciones", value: asignaciones.length, icon: "fa-link", color: "danger" },
                { label: "Asistencias", value: asistencias.length, icon: "fa-check-square", color: "secondary" },
              ].map(card => (
                <div className="col-lg-2 col-md-4 col-sm-6" key={card.label}>
                  <div className="card">
                    <div className="card-body text-center p-4">
                      <div className={`h1 m-0 text-${card.color}`}><i className={`fa ${card.icon}`}></i> {card.value}</div>
                      <div className="text-muted mt-2">{card.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row clearfix">
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Últimos Alumnos Registrados</h3></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover table-vcenter table-striped mb-0">
                        <thead><tr><th>Carnet</th><th>Nombre</th><th>Email</th></tr></thead>
                        <tbody>
                          {alumnos.slice(0, 5).map(a => (
                            <tr key={a.id}>
                              <td><span className="tag tag-primary">{a.carnet}</span></td>
                              <td>{a.nombre} {a.apellido}</td>
                              <td className="text-muted">{a.email}</td>
                            </tr>
                          ))}
                          {alumnos.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Sin alumnos registrados</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Horarios Activos</h3></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover table-vcenter table-striped mb-0">
                        <thead><tr><th>Curso</th><th>Catedrático</th><th>Día</th><th>Horario</th></tr></thead>
                        <tbody>
                          {horarios.slice(0, 5).map(h => (
                            <tr key={h.id}>
                              <td>{h.curso?.nombre}</td>
                              <td>{h.catedratico?.nombre} {h.catedratico?.apellido}</td>
                              <td><span className="tag tag-info">{h.dia}</span></td>
                              <td>{h.horaInicio} - {h.horaFin}</td>
                            </tr>
                          ))}
                          {horarios.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Sin horarios registrados</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ALUMNOS */}
        {activeTab === "alumnos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Alumno</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateAlumno}>
                    <div className="form-group">
                      <label>Tipo de registro</label>
                      <div className="d-flex" style={{ gap: "10px" }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${!autoCarnet ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setAutoCarnet(false)}
                        >
                          <i className="fa fa-user mr-1"></i> Alumno existente
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${autoCarnet ? "btn-success" : "btn-outline-secondary"}`}
                          onClick={() => setAutoCarnet(true)}
                        >
                          <i className="fa fa-magic mr-1"></i> Alumno nuevo
                        </button>
                      </div>
                      <small className="text-muted mt-1 d-block">
                        {autoCarnet
                          ? "Se generará un carnet automático con formato 260XXXX"
                          : "Ingresa el carnet del alumno existente"}
                      </small>
                    </div>

                    {!autoCarnet && (
                      <div className="form-group">
                        <label>Carnet</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej: 2400111"
                          value={newAlumno.carnet}
                          onChange={e => setNewAlumno({ ...newAlumno, carnet: e.target.value })}
                          required={!autoCarnet}
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre" value={newAlumno.nombre} onChange={e => setNewAlumno({ ...newAlumno, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input type="text" className="form-control" placeholder="Apellido" value={newAlumno.apellido} onChange={e => setNewAlumno({ ...newAlumno, apellido: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" className="form-control" placeholder="correo@uspg.edu.gt" value={newAlumno.email} onChange={e => setNewAlumno({ ...newAlumno, email: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Alumno</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Listado de Alumnos ({alumnos.length})</h3>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Carnet</th><th>Nombre Completo</th><th>Email Personal</th><th>Email Institucional</th><th>Cursos Asignados</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {alumnos.map(a => (
                        <tr key={a.id}>
                          <td><span className="tag tag-primary">{a.carnet}</span></td>
                          <td>{a.nombre} {a.apellido}</td>
                          <td className="text-muted">{a.email}</td>
                          <td>
                            {a.correoInstitucional
                              ? <span className="tag tag-info">{a.correoInstitucional}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td><span className="tag tag-default">{a.asignaciones?.length || 0} cursos</span></td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteAlumno(a.id, a.carnet)}
                              title="Eliminar alumno"
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {alumnos.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay alumnos registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEDRÁTICOS */}
        {activeTab === "catedraticos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Catedrático</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateCatedratico}>
                    <div className="form-group">
                      <label>Código</label>
                      <input type="text" className="form-control" placeholder="Ej: CAT-001" value={newCatedratico.codigo} onChange={e => setNewCatedratico({ ...newCatedratico, codigo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre" value={newCatedratico.nombre} onChange={e => setNewCatedratico({ ...newCatedratico, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input type="text" className="form-control" placeholder="Apellido" value={newCatedratico.apellido} onChange={e => setNewCatedratico({ ...newCatedratico, apellido: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" className="form-control" placeholder="correo@uspg.edu.gt" value={newCatedratico.email} onChange={e => setNewCatedratico({ ...newCatedratico, email: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Catedrático</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Listado de Catedráticos ({catedraticos.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Código</th><th>Nombre Completo</th><th>Email</th><th>Cursos Asignados</th></tr></thead>
                    <tbody>
                      {catedraticos.map(c => (
                        <tr key={c.id}>
                          <td><span className="tag tag-success">{c.codigo}</span></td>
                          <td>{c.nombre} {c.apellido}</td>
                          <td className="text-muted">{c.email}</td>
                          <td><span className="tag tag-default">{c.horarios?.length || 0} horarios</span></td>
                        </tr>
                      ))}
                      {catedraticos.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay catedráticos registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CURSOS */}
        {activeTab === "cursos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Curso</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateCurso}>
                    <div className="form-group">
                      <label>Código</label>
                      <input type="text" className="form-control" placeholder="Ej: INF-101" value={newCurso.codigo} onChange={e => setNewCurso({ ...newCurso, codigo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre del curso" value={newCurso.nombre} onChange={e => setNewCurso({ ...newCurso, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Créditos</label>
                      <input type="number" className="form-control" min="1" max="10" placeholder="Ej: 4" value={newCurso.creditos} onChange={e => setNewCurso({ ...newCurso, creditos: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Curso</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Catálogo de Cursos ({cursos.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Código</th><th>Nombre</th><th>Créditos</th><th>Horarios</th></tr></thead>
                    <tbody>
                      {cursos.map(c => (
                        <tr key={c.id}>
                          <td><span className="tag tag-warning">{c.codigo}</span></td>
                          <td>{c.nombre}</td>
                          <td><span className="tag tag-default">{c.creditos} créditos</span></td>
                          <td><span className="tag tag-info">{c.horarios?.length || 0} horarios</span></td>
                        </tr>
                      ))}
                      {cursos.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay cursos registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARRERAS */}
        {activeTab === "carreras" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nueva Carrera</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateCarrera}>
                    <div className="form-group">
                      <label>Código</label>
                      <input type="text" className="form-control" placeholder="Ej: ISC" value={newCarrera.codigo} onChange={e => setNewCarrera({ ...newCarrera, codigo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre de la carrera" value={newCarrera.nombre} onChange={e => setNewCarrera({ ...newCarrera, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Facultad</label>
                      <input type="text" className="form-control" placeholder="Ej: Ciencias Empresariales" value={newCarrera.facultad} onChange={e => setNewCarrera({ ...newCarrera, facultad: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Carrera</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Listado de Carreras ({carreras.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Código</th><th>Nombre</th><th>Facultad</th><th>Alumnos</th></tr></thead>
                    <tbody>
                      {carreras.map(c => (
                        <tr key={c.id}>
                          <td><span className="tag tag-info">{c.codigo}</span></td>
                          <td>{c.nombre}</td>
                          <td className="text-muted">{c.facultad || "—"}</td>
                          <td><span className="tag tag-default">{c._count?.alumnos || 0} alumnos</span></td>
                        </tr>
                      ))}
                      {carreras.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay carreras registradas</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASIGNACIONES */}
        {activeTab === "asignaciones" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nueva Asignación</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateAsignacion}>
                    <div className="form-group">
                      <label>Alumno</label>
                      <select className="form-control" value={newAsignacion.alumnoId} onChange={e => setNewAsignacion({ ...newAsignacion, alumnoId: e.target.value })} required>
                        <option value="">Seleccionar alumno...</option>
                        {alumnos.map(a => <option key={a.id} value={a.id}>{a.carnet} — {a.nombre} {a.apellido}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Curso</label>
                      <select className="form-control" value={newAsignacion.cursoId} onChange={e => setNewAsignacion({ ...newAsignacion, cursoId: e.target.value })} required>
                        <option value="">Seleccionar curso...</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Ciclo</label>
                      <input type="text" className="form-control" placeholder="Ej: 2026-1" value={newAsignacion.ciclo} onChange={e => setNewAsignacion({ ...newAsignacion, ciclo: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Asignación</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Asignaciones Registradas ({asignaciones.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Carnet</th><th>Alumno</th><th>Curso</th><th>Ciclo</th></tr></thead>
                    <tbody>
                      {asignaciones.map(a => (
                        <tr key={a.id}>
                          <td><span className="tag tag-primary">{a.alumno?.carnet}</span></td>
                          <td>{a.alumno?.nombre} {a.alumno?.apellido}</td>
                          <td>{a.curso?.nombre}</td>
                          <td><span className="tag tag-success">{a.ciclo}</span></td>
                        </tr>
                      ))}
                      {asignaciones.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay asignaciones registradas</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HORARIOS */}
        {activeTab === "horarios" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Horario</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateHorario}>
                    <div className="form-group">
                      <label>Curso</label>
                      <select className="form-control" value={newHorario.cursoId} onChange={e => setNewHorario({ ...newHorario, cursoId: e.target.value })} required>
                        <option value="">Seleccionar curso...</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Catedrático</label>
                      <select className="form-control" value={newHorario.catedraticoId} onChange={e => setNewHorario({ ...newHorario, catedraticoId: e.target.value })} required>
                        <option value="">Seleccionar catedrático...</option>
                        {catedraticos.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Día</label>
                      <select className="form-control" value={newHorario.dia} onChange={e => setNewHorario({ ...newHorario, dia: e.target.value })} required>
                        <option value="">Seleccionar día...</option>
                        {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group row">
                      <div className="col-6">
                        <label>Hora Inicio</label>
                        <input type="time" className="form-control" value={newHorario.horaInicio} onChange={e => setNewHorario({ ...newHorario, horaInicio: e.target.value })} required />
                      </div>
                      <div className="col-6">
                        <label>Hora Fin</label>
                        <input type="time" className="form-control" value={newHorario.horaFin} onChange={e => setNewHorario({ ...newHorario, horaFin: e.target.value })} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Salón</label>
                      <input type="text" className="form-control" placeholder="Ej: A-101" value={newHorario.salon} onChange={e => setNewHorario({ ...newHorario, salon: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Horario</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Horarios Registrados ({horarios.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Curso</th><th>Catedrático</th><th>Día</th><th>Horario</th><th>Salón</th></tr></thead>
                    <tbody>
                      {horarios.map(h => (
                        <tr key={h.id}>
                          <td>{h.curso?.nombre}</td>
                          <td>{h.catedratico?.nombre} {h.catedratico?.apellido}</td>
                          <td><span className="tag tag-info">{h.dia}</span></td>
                          <td>{h.horaInicio} - {h.horaFin}</td>
                          <td>{h.salon}</td>
                        </tr>
                      ))}
                      {horarios.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No hay horarios registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASISTENCIAS */}
        {activeTab === "asistencias" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Registrar Asistencia</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateAsistencia}>
                    <div className="form-group">
                      <label>Alumno</label>
                      <select className="form-control" value={newAsistencia.alumnoId} onChange={e => setNewAsistencia({ ...newAsistencia, alumnoId: e.target.value })} required>
                        <option value="">Seleccionar alumno...</option>
                        {alumnos.map(a => <option key={a.id} value={a.id}>{a.carnet} — {a.nombre} {a.apellido}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Horario</label>
                      <select className="form-control" value={newAsistencia.horarioId} onChange={e => setNewAsistencia({ ...newAsistencia, horarioId: e.target.value })} required>
                        <option value="">Seleccionar horario...</option>
                        {horarios.map(h => <option key={h.id} value={h.id}>{h.curso?.nombre} — {h.dia} {h.horaInicio}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fecha</label>
                      <input type="date" className="form-control" value={newAsistencia.fecha} onChange={e => setNewAsistencia({ ...newAsistencia, fecha: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select className="form-control" value={newAsistencia.presente} onChange={e => setNewAsistencia({ ...newAsistencia, presente: e.target.value === "true" })}>
                        <option value="true">Presente</option>
                        <option value="false">Ausente</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Asistencia</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Registro de Asistencias ({asistencias.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Alumno</th><th>Curso</th><th>Fecha</th><th>Estado</th></tr></thead>
                    <tbody>
                      {asistencias.map(a => (
                        <tr key={a.id}>
                          <td>{a.alumno?.nombre} {a.alumno?.apellido}</td>
                          <td>{a.horario?.curso?.nombre}</td>
                          <td>{new Date(a.fecha).toLocaleDateString()}</td>
                          <td>
                            <span className={`tag ${a.presente ? "tag-success" : "tag-danger"}`}>
                              {a.presente ? "Presente" : "Ausente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {asistencias.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay asistencias registradas</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}