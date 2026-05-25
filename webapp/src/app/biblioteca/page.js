"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function BibliotecaPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [libros, setLibros] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [multas, setMultas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [autores, setAutores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const [newLibro, setNewLibro] = useState({ id: null, titulo: "", isbn: "", stock: 1, categoriaId: "", autorId: "" });
  const [newPrestamo, setNewPrestamo] = useState({ libroId: "", usuarioId: "", fechaDevolucionEsc: "" });
  const [newUsuario, setNewUsuario] = useState({ nombre: "", email: "", carnet: "" });
  const [newItem, setNewItem] = useState({ type: "categoria", nombre: "" });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLibros, resPrestamos, resMultas, resSetup, resUsuarios] = await Promise.all([
        axios.get("/api/biblioteca/libros"),
        axios.get("/api/biblioteca/prestamos"),
        axios.get("/api/biblioteca/multas"),
        axios.get("/api/biblioteca/setup"),
        axios.get("/api/biblioteca/usuarios")
      ]);
      setLibros(resLibros.data);
      setPrestamos(resPrestamos.data);
      setMultas(resMultas.data);
      setCategorias(resSetup.data.categorias);
      setAutores(resSetup.data.autores);
      setUsuarios(resUsuarios.data);
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error cargando datos: " + msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
  };

  const handleCreateLibro = async (e) => {
    e.preventDefault();
    try {
      if (newLibro.id) {
        await axios.put("/api/biblioteca/libros", newLibro);
        showNotification("Libro actualizado exitosamente");
      } else {
        await axios.post("/api/biblioteca/libros", newLibro);
        showNotification("Libro creado exitosamente");
      }
      setNewLibro({ id: null, titulo: "", isbn: "", stock: 1, categoriaId: "", autorId: "" });
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error guardando libro: " + msg, "danger");
    }
  };

  const toggleLibroStatus = async (libro) => {
    try {
      await axios.put("/api/biblioteca/libros", { ...libro, activo: !libro.activo });
      showNotification(`Libro ${!libro.activo ? 'activado' : 'desactivado'} exitosamente`);
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error actualizando estado: " + msg, "danger");
    }
  };

  const handleCreatePrestamo = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/biblioteca/prestamos", newPrestamo);
      showNotification("Préstamo registrado exitosamente");
      setNewPrestamo({ libroId: "", usuarioId: "", fechaDevolucionEsc: "" });
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error registrando préstamo: " + msg, "danger");
    }
  };


  const handleCreateUsuario = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/biblioteca/usuarios", newUsuario);
      showNotification("Usuario creado exitosamente");
      setNewUsuario({ nombre: "", email: "", carnet: "" });
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error creando usuario: " + msg, "danger");
    }
  };

  const handleCreateSetupItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/biblioteca/setup", newItem);
      showNotification(`${newItem.type === 'categoria' ? 'Categoría' : 'Autor'} creado exitosamente`);
      setNewItem({ ...newItem, nombre: "" });
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error creando item: " + msg, "danger");
    }
  };

  const handleDevolucion = async (id) => {
    try {
      await axios.put("/api/biblioteca/prestamos", {
        id,
        fechaDevolucionReal: new Date().toISOString(),
        estado: "DEVUELTO"
      });
      showNotification("Libro devuelto correctamente");
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error procesando devolución: " + msg, "danger");
    }
  };

  const handlePayMulta = async (id) => {
    try {
      await axios.put("/api/biblioteca/multas", { id, pagada: true });
      showNotification("Multa marcada como pagada");
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showNotification("Error procesando pago: " + msg, "danger");
    }
  };

  const activeLoans = prestamos.filter(p => p.estado === 'PENDIENTE');
  const librosWithStock = libros.filter(l => l.stock > 0);

  return (
    <div className="section-body">
      {notification.show && (
        <div className={`alert alert-${notification.type} position-fixed`} style={{ top: '20px', right: '20px', zIndex: 9999, minWidth: '300px' }}>
          {notification.message}
        </div>
      )}

      <div className="container-fluid">
        <div className="row clearfix">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <ul className="nav nav-tabs page-header-tab">
                  <li className="nav-item">
                    <a className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")} href="#"><i className="fa fa-dashboard mr-2"></i>Dashboard</a>
                  </li>
                  <li className="nav-item">
                    <a className={`nav-link ${activeTab === "prestamos" ? "active" : ""}`} onClick={() => setActiveTab("prestamos")} href="#"><i className="fa fa-exchange mr-2"></i>Préstamos</a>
                  </li>
                  <li className="nav-item">
                    <a className={`nav-link ${activeTab === "multas" ? "active" : ""}`} onClick={() => setActiveTab("multas")} href="#"><i className="fa fa-money mr-2"></i>Multas</a>
                  </li>
                  <li className="nav-item">
                    <a className={`nav-link ${activeTab === "libros" ? "active" : ""}`} onClick={() => setActiveTab("libros")} href="#"><i className="fa fa-book mr-2"></i>Inventario de Libros</a>
                  </li>
                  <li className="nav-item">
                    <a className={`nav-link ${activeTab === "config" ? "active" : ""}`} onClick={() => setActiveTab("config")} href="#"><i className="fa fa-cog mr-2"></i>Configuración - Usuarios</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "dashboard" && (
          <>
            <div className="row clearfix">
              <div className="col-lg-4 col-md-6 col-sm-12">
                <div className="card">
                  <div className="card-body text-center p-4">
                    <div className="h1 m-0 text-primary"><i className="fa fa-users"></i> {usuarios.length}</div>
                    <div className="text-muted mt-2">Usuarios Activos</div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <div className="card">
                  <div className="card-body text-center p-4">
                    <div className="h1 m-0 text-success"><i className="fa fa-book"></i> {librosWithStock.length}</div>
                    <div className="text-muted mt-2">Libros con Stock</div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <div className="card">
                  <div className="card-body text-center p-4">
                    <div className="h1 m-0 text-warning"><i className="fa fa-hand-holding"></i> {activeLoans.length}</div>
                    <div className="text-muted mt-2">Préstamos Activos</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row clearfix">
              <div className="col-lg-12">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Listado de Préstamos Activos</h3>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                        <thead>
                          <tr>
                            <th>Libro</th>
                            <th>Usuario</th>
                            <th>Fecha de Devolución</th>
                            <th>Días Restantes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeLoans.map(p => {
                            const diff = Math.ceil((new Date(p.fechaDevolucionEsc) - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                              <tr key={p.id}>
                                <td>{p.libro.titulo}</td>
                                <td>
                                  <div>{p.usuario.nombre}</div>
                                  <small className="text-muted">{p.usuario.carnet}</small>
                                </td>
                                <td>{new Date(p.fechaDevolucionEsc).toLocaleDateString()}</td>
                                <td>
                                  {diff < 0 ? (
                                    <span className="badge badge-danger">Vencido ({Math.abs(diff)} días)</span>
                                  ) : (
                                    <span className="badge badge-info">{diff} días</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {activeLoans.length === 0 && (
                            <tr>
                              <td colSpan="4" className="text-center text-muted">No hay préstamos activos actualmente</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "prestamos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Préstamo</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreatePrestamo}>
                    <div className="form-group row">
                      <label className="col-md-3 col-form-label">Libro</label>
                      <div className="col-md-9">
                        <select className="form-control" value={newPrestamo.libroId} onChange={e => setNewPrestamo({ ...newPrestamo, libroId: e.target.value })} required>
                          <option value="">Seleccionar...</option>
                          {libros.filter(l => l.activo).map(l => (
                            <option key={l.id} value={l.id} disabled={l.stock <= 0}>
                              {l.titulo} {l.stock <= 0 ? '(SIN STOCK)' : `(${l.stock} disponibles)`}
                            </option>
                          ))}
                        </select>
                        {newPrestamo.libroId && libros.find(l => l.id == newPrestamo.libroId)?.stock <= 0 && (
                          <small className="text-danger">Este libro no tiene ejemplares disponibles.</small>
                        )}
                      </div>
                    </div>
                    <div className="form-group row">
                      <label className="col-md-3 col-form-label">Usuario</label>
                      <div className="col-md-9">
                        <select className="form-control" value={newPrestamo.usuarioId} onChange={e => setNewPrestamo({ ...newPrestamo, usuarioId: e.target.value })} required>
                          <option value="">Seleccionar...</option>
                          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.carnet})</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group row">
                      <label className="col-md-3 col-form-label">Fecha Dev. Esp.</label>
                      <div className="col-md-9">
                        <input type="date" className="form-control" value={newPrestamo.fechaDevolucionEsc} onChange={e => setNewPrestamo({ ...newPrestamo, fechaDevolucionEsc: e.target.value })} required />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={!newPrestamo.libroId || libros.find(l => l.id == newPrestamo.libroId)?.stock <= 0}
                    >
                      Registrar Préstamo
                    </button>

                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Préstamos Activos</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead>
                      <tr>
                        <th>Libro</th>
                        <th>Usuario</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prestamos.map(p => (
                        <tr key={p.id}>
                          <td>{p.libro.titulo}</td>
                          <td>{p.usuario.nombre}</td>
                          <td>{new Date(p.fechaDevolucionEsc).toLocaleDateString()}</td>
                          <td>
                            <span className={`tag ${p.estado === 'PENDIENTE' ? 'tag-warning' : 'tag-success'}`}>{p.estado}</span>
                          </td>
                          <td>
                            {p.estado === 'PENDIENTE' && (
                              <button className="btn btn-sm btn-outline-success" onClick={() => handleDevolucion(p.id)}>Devolver</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "multas" && (
          <div className="row clearfix">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Gestión de Multas por Atraso</h3>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Libro</th>
                        <th>Monto</th>
                        <th>Fecha Multa</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {multas.map(m => (
                        <tr key={m.id}>
                          <td>{m.prestamo.usuario.nombre}</td>
                          <td>{m.prestamo.libro.titulo}</td>
                          <td><span className="font-weight-bold">Q{m.monto}</span></td>
                          <td>{new Date(m.fechaMulta).toLocaleString()}</td>
                          <td>
                            <span className={`tag ${m.pagada ? 'tag-success' : 'tag-danger'}`}>
                              {m.pagada ? 'PAGADA' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td>
                            {!m.pagada && (
                              <button className="btn btn-sm btn-success" onClick={() => handlePayMulta(m.id)}>
                                <i className="fa fa-money mr-1"></i> Cobrar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "libros" && (
          <div className="row clearfix">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">{newLibro.id ? 'Editar Libro' : 'Mantenimiento de Inventario'}</h3>
                  {newLibro.id && (
                    <div className="card-options">
                      <button className="btn btn-sm btn-secondary" onClick={() => setNewLibro({ id: null, titulo: "", isbn: "", stock: 1, categoriaId: "", autorId: "" })}>Cancelar Edición</button>
                    </div>
                  )}
                </div>
                <div className="card-body">
                  <form onSubmit={handleCreateLibro} className="mb-4">
                    <div className="row">
                      <div className="col-md-3">
                        <input type="text" className="form-control" placeholder="Título" value={newLibro.titulo} onChange={e => setNewLibro({ ...newLibro, titulo: e.target.value })} required />
                      </div>
                      <div className="col-md-2">
                        <input type="text" className="form-control" placeholder="ISBN" value={newLibro.isbn} onChange={e => setNewLibro({ ...newLibro, isbn: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <select className="form-control" value={newLibro.categoriaId} onChange={e => setNewLibro({ ...newLibro, categoriaId: e.target.value })} required>
                          <option value="">Categoría...</option>
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <select className="form-control" value={newLibro.autorId} onChange={e => setNewLibro({ ...newLibro, autorId: e.target.value })} required>
                          <option value="">Autor...</option>
                          {autores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-md-1">
                        <input type="number" className="form-control" value={newLibro.stock} onChange={e => setNewLibro({ ...newLibro, stock: e.target.value })} required />
                      </div>
                      <div className="col-md-2">
                        <button type="submit" className="btn btn-primary btn-block">{newLibro.id ? 'Actualizar' : 'Añadir'}</button>
                      </div>
                    </div>
                  </form>
                  <div className="table-responsive">
                    <table className="table table-hover table-vcenter mb-0">
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th>ISBN</th>
                          <th>Categoría</th>
                          <th>Autor</th>
                          <th>Stock</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {libros.map(l => (
                          <tr key={l.id} className={!l.activo ? 'bg-light' : ''}>
                            <td className={!l.activo ? 'text-muted' : ''}>{l.titulo}</td>
                            <td>{l.isbn}</td>
                            <td>{l.categoria.nombre}</td>
                            <td>{l.autor.nombre}</td>
                            <td>{l.stock}</td>
                            <td>
                              <span className={`tag ${l.activo ? 'tag-success' : 'tag-default'}`}>{l.activo ? 'Activo' : 'Inactivo'}</span>
                            </td>
                            <td>
                              <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => setNewLibro({ ...l })} title="Editar">
                                <i className="fa fa-edit"></i>
                              </button>
                              <button className={`btn btn-sm ${l.activo ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggleLibroStatus(l)} title={l.activo ? 'Desactivar' : 'Activar'}>
                                <i className={`fa ${l.activo ? 'fa-trash' : 'fa-check'}`}></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="row clearfix">
            <div className="col-lg-6 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Usuarios de Biblioteca</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateUsuario}>
                    <div className="form-group"><input type="text" className="form-control" placeholder="Nombre" value={newUsuario.nombre} onChange={e => setNewUsuario({ ...newUsuario, nombre: e.target.value })} required /></div>
                    <div className="form-group"><input type="email" className="form-control" placeholder="Email" value={newUsuario.email} onChange={e => setNewUsuario({ ...newUsuario, email: e.target.value })} required /></div>
                    <div className="form-group"><input type="text" className="form-control" placeholder="Carnet" value={newUsuario.carnet} onChange={e => setNewUsuario({ ...newUsuario, carnet: e.target.value })} required /></div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Usuario</button>
                  </form>
                  <div className="mt-4 table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>Nombre</th><th>Carnet</th></tr></thead>
                      <tbody>
                        {usuarios.map(u => <tr key={u.id}><td>{u.nombre}</td><td>{u.carnet}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Mantenimiento Auxiliar</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateSetupItem}>
                    <div className="form-group">
                      <select className="form-control" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                        <option value="categoria">Categoría</option>
                        <option value="autor">Autor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <input type="text" className="form-control" placeholder="Nombre" value={newItem.nombre} onChange={e => setNewItem({ ...newItem, nombre: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-success btn-block">Guardar</button>
                  </form>
                  <div className="row mt-4">
                    <div className="col-6">
                      <h6>Categorías</h6>
                      <ul className="list-group list-group-flush">
                        {categorias.map(c => <li key={c.id} className="list-group-item py-1">{c.nombre}</li>)}
                      </ul>
                    </div>
                    <div className="col-6">
                      <h6>Autores</h6>
                      <ul className="list-group list-group-flush">
                        {autores.map(a => <li key={a.id} className="list-group-item py-1">{a.nombre}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
