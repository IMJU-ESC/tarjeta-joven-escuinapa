"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Scanner } from '@yudiel/react-qr-scanner';

export default function PortalNegocios() {
  const [datosNegocio, setDatosNegocio] = useState<any>(null);
  const [pestañaActiva, setPestañaActiva] = useState("escaner"); 
  
  const [modoEscaner, setModoEscaner] = useState(false);
  const [jovenEscaneado, setJovenEscaneado] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [registrandoVisita, setRegistrandoVisita] = useState(false);
  const [promoAplicada, setPromoAplicada] = useState("");

  const [historialVisitas, setHistorialVisitas] = useState<any[]>([]);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().substring(0, 7));

  const [listaEmpleos, setListaEmpleos] = useState<any[]>([]);
  const [listaPromos, setListaPromos] = useState<any[]>([]);
  
  const [creandoModal, setCreandoModal] = useState<"promo" | "empleo" | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [sueldo, setSueldo] = useState("");
  const [tipoEmpleo, setTipoEmpleo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoPromo, setTipoPromo] = useState("");
  const [visitasRequeridas, setVisitasRequeridas] = useState("");
  const [diasValidos, setDiasValidos] = useState("Todos los días");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [usoUnico, setUsoUnico] = useState(false);
  
  // NUEVO: Nivel de Tarjeta
  const [nivelRequerido, setNivelRequerido] = useState("Clásica");

  const [modalAjustes, setModalAjustes] = useState(false);
  const [contrasenaActualInput, setContrasenaActualInput] = useState(""); 
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [cambiandoPass, setCambiandoPass] = useState(false);

  const [ultimaVisitaId, setUltimaVisitaId] = useState<string | null>(null);

  const router = useRouter();
  const audioExito = useRef<HTMLAudioElement | null>(null);
  const audioError = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem("sesionNegocio");
    if (sesionGuardada) { setDatosNegocio(JSON.parse(sesionGuardada)); } 
    else { router.push("/login-negocio"); }
    
    audioExito.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    audioError.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3");
  }, [router]);

  useEffect(() => {
    if (datosNegocio) { cargarEstadisticas(); cargarEmpleos(); cargarPromos(); }
  }, [pestañaActiva, datosNegocio]);

  useEffect(() => {
    if (ultimaVisitaId) {
      const timer = setTimeout(() => setUltimaVisitaId(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [ultimaVisitaId]);

  const cargarEstadisticas = async () => {
    if (!datosNegocio) return;
    setCargandoMetricas(true);
    const q = query(collection(db, "visitas"), where("idNegocio", "==", datosNegocio.idFirebase));
    const snap = await getDocs(q);
    const temp: any[] = [];
    snap.forEach((doc) => temp.push({ idVisita: doc.id, ...doc.data() }));
    temp.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    setHistorialVisitas(temp);
    setCargandoMetricas(false);
  };

  const cargarEmpleos = async () => {
    const q = query(collection(db, "empleos"), where("idNegocio", "==", datosNegocio.idFirebase));
    const snap = await getDocs(q);
    const temp: any[] = [];
    snap.forEach((d) => temp.push({ idFirebase: d.id, ...d.data() }));
    setListaEmpleos(temp);
  };

  const cargarPromos = async () => {
    const q = query(collection(db, "promociones"), where("idNegocio", "==", datosNegocio.idFirebase));
    const snap = await getDocs(q);
    const temp: any[] = [];
    snap.forEach((d) => temp.push({ idFirebase: d.id, ...d.data() }));
    setListaPromos(temp);
  };

  const procesarQR = async (codigoQR: string) => {
    if (buscando) return; setBuscando(true);
    try {
      const q = query(collection(db, "jovenes"), where("codigoUnicoQR", "==", codigoQR));
      const res = await getDocs(q);
      if (res.empty) {
        audioError.current?.play(); alert("❌ Código no válido."); setModoEscaner(true);
      } else {
        audioExito.current?.play(); setJovenEscaneado({ idFirebase: res.docs[0].id, ...res.docs[0].data() }); setModoEscaner(false);
      }
    } catch (error) { audioError.current?.play(); }
    setBuscando(false);
  };

  const registrarVisita = async () => {
    setRegistrandoVisita(true);
    const p = listaPromos.find(x => x.idFirebase === promoAplicada);
    
    if (p && p.tipo === "Directa" && p.usoUnico) {
      const yaLoUso = historialVisitas.some(v => v.idJoven === jovenEscaneado.idFirebase && v.idPromo === p.idFirebase);
      if (yaLoUso) {
        audioError.current?.play();
        alert("❌ OPERACIÓN RECHAZADA:\nEste joven ya utilizó este cupón de Único Uso.");
        setRegistrandoVisita(false);
        return;
      }
    }

    try {
      const docRef = await addDoc(collection(db, "visitas"), {
        idNegocio: datosNegocio.idFirebase, nombreNegocio: datosNegocio.nombreComercial,
        idJoven: jovenEscaneado.idFirebase, nombreJoven: jovenEscaneado.nombreCompleto,
        idPromo: promoAplicada || "ninguna", nombrePromo: p ? p.titulo : "Visita estándar",
        fecha: new Date().toISOString()
      });
      
      audioExito.current?.play(); 
      setJovenEscaneado(null); 
      setPromoAplicada(""); 
      setUltimaVisitaId(docRef.id);
      cargarEstadisticas();
    } catch (e) { audioError.current?.play(); }
    setRegistrandoVisita(false);
  };

  const deshacerUltimaVisita = async () => {
    if (!ultimaVisitaId) return;
    try {
      await deleteDoc(doc(db, "visitas", ultimaVisitaId));
      setUltimaVisitaId(null);
      cargarEstadisticas();
      alert("✅ Movimiento deshecho y eliminado de la base de datos.");
    } catch(e) { alert("Error al intentar deshacer el movimiento."); }
  };

  const limpiarFormulario = () => {
    setTitulo(""); setDescripcion(""); setDireccion(""); setSueldo(""); setTipoEmpleo(""); setTelefono(""); 
    setTipoPromo(""); setVisitasRequeridas(""); setDiasValidos("Todos los días"); setFechaVencimiento(""); setUsoUnico(false); setNivelRequerido("Clásica"); setCreandoModal(null);
  };

  const publicarEmpleo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "empleos"), {
        idNegocio: datosNegocio.idFirebase, nombreNegocio: datosNegocio.nombreComercial, logoNegocio: datosNegocio.logo || null,
        titulo: titulo.trim(), sueldo: sueldo.trim(), tipo: tipoEmpleo, descripcion: descripcion.trim(), telefonoContacto: telefono.trim(), direccion: direccion.trim(), estatus: "Activa", fechaPublicacion: new Date().toISOString()
      });
      alert("¡Vacante publicada!"); limpiarFormulario(); cargarEmpleos(); 
    } catch (error) { alert("Error al publicar."); }
  };

  const publicarPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "promociones"), {
        idNegocio: datosNegocio.idFirebase, nombreNegocio: datosNegocio.nombreComercial, logoNegocio: datosNegocio.logo || null,
        titulo: titulo.trim(), tipo: tipoPromo, descripcion: descripcion.trim(), direccion: direccion.trim(), 
        visitasMeta: tipoPromo === "Frecuente" ? parseInt(visitasRequeridas) : null, 
        diasValidos: diasValidos, fechaVencimiento: fechaVencimiento || null, 
        usoUnico: tipoPromo === "Directa" ? usoUnico : false, 
        nivelRequerido: nivelRequerido, // Se guarda el nivel VIP
        estatus: "Activa", fechaPublicacion: new Date().toISOString()
      });
      alert("¡Promoción activada!"); limpiarFormulario(); cargarPromos(); 
    } catch (error) { alert("Error al guardar."); }
  };

  const actualizarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contrasenaActualInput !== datosNegocio.contrasena) { alert("❌ La contraseña actual es incorrecta."); return; }
    if (nuevaContrasena.length < 6) { alert("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    setCambiandoPass(true);
    try {
      await updateDoc(doc(db, "negocios", datosNegocio.idFirebase), { contrasena: nuevaContrasena });
      const datosActualizados = { ...datosNegocio, contrasena: nuevaContrasena };
      localStorage.setItem("sesionNegocio", JSON.stringify(datosActualizados));
      setDatosNegocio(datosActualizados);
      alert("✅ ¡Contraseña del negocio actualizada con éxito!");
      setModalAjustes(false); setContrasenaActualInput(""); setNuevaContrasena("");
    } catch (error) { alert("Hubo un error al actualizar."); }
    setCambiandoPass(false);
  };

  const visitasFiltradas = historialVisitas.filter(v => v.fecha.startsWith(mesSeleccionado));

  if (!datosNegocio) return null;

  return (
    <main className="min-h-screen bg-[#F3F5F9] pb-32 font-sans text-slate-900 selection:bg-emerald-500/30 relative">
      
      {ultimaVisitaId && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-xs bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between animate-slide-up border border-slate-700">
          <div className="flex items-center gap-3"><span className="text-emerald-400 text-xl">✅</span><p className="text-xs font-bold leading-tight">Visita registrada.</p></div>
          <button onClick={deshacerUltimaVisita} className="bg-slate-700 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-colors">Deshacer</button>
        </div>
      )}

      {/* HEADER */}
      <div className="pt-10 pb-6 px-6 max-w-md mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center">
             <img src="/imju-oficial.png" alt="IMJU" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <p className="text-[#702032] text-[11px] font-black uppercase tracking-widest mb-0.5">Portal Aliado</p>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter truncate max-w-[180px] leading-tight">{datosNegocio.nombreComercial}</h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setModalAjustes(true)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 text-slate-400 hover:text-slate-800 transition-colors">⚙️</button>
          <button onClick={() => { localStorage.removeItem("sesionNegocio"); window.location.href = "/"; }} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 text-slate-400 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 mt-4 relative z-20">
        
        {/* VISTA ESCÁNER */}
        {pestañaActiva === "escaner" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-900/10 p-8 text-center border border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
              <h2 className="text-sm font-black text-[#702032] mb-8 uppercase tracking-[0.3em]">Validación TPV</h2>
              
              {!modoEscaner && !jovenEscaneado && (
                <button onClick={() => setModoEscaner(true)} className="bg-emerald-500 text-white font-black py-8 rounded-[2rem] shadow-xl shadow-emerald-500/30 w-full flex flex-col items-center gap-3 transition-all hover:scale-[1.02] hover:bg-emerald-600 group">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📷</div>
                  <span className="text-xs uppercase tracking-[0.2em]">Escanear QR</span>
                </button>
              )}

              {modoEscaner && (
                <div className="animate-fade-in">
                  <div className="rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 mb-6 aspect-square shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-slate-900 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 z-0"></div>
                    <div className="relative z-10 w-full h-full"><Scanner onScan={(res) => res && res.length > 0 && procesarQR(res[0].rawValue)} formats={['qr_code']} /></div>
                  </div>
                  <button onClick={() => setModoEscaner(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-6 py-3 rounded-full hover:bg-slate-200 transition-colors">Cancelar Escaneo</button>
                </div>
              )}

              {jovenEscaneado && (
                <div className="animate-fade-in bg-emerald-50/50 p-6 rounded-[2.5rem] border-2 border-emerald-100/50">
                  <div className="relative inline-block mb-4">
                    <img src={jovenEscaneado.fotoPerfil} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl" alt="Joven" />
                    <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">{jovenEscaneado.nombreCompleto}</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6">Identidad Verificada</p>
                  
                  <div className="text-left space-y-4 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">¿Qué va a canjear?</label>
                    <select value={promoAplicada} onChange={(e) => setPromoAplicada(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all">
                      <option value="">Ninguna (Visita Estándar)</option>
                      {listaPromos.map(p => ( <option key={p.idFirebase} value={p.idFirebase}>🎁 {p.titulo} {p.usoUnico ? "(1 Solo Uso)" : ""}</option> ))}
                    </select>
                  </div>

                  <button onClick={registrarVisita} disabled={registrandoVisita} className={`w-full text-white font-black py-5 rounded-[2rem] shadow-lg mt-6 uppercase text-[11px] tracking-[0.2em] transition-all ${registrandoVisita ? "bg-slate-300" : "bg-[#702032] hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1"}`}>
                    {registrandoVisita ? "Procesando..." : "Confirmar Movimiento"}
                  </button>
                  <button onClick={() => setJovenEscaneado(null)} className="text-[10px] font-black text-slate-400 uppercase mt-6 tracking-widest hover:text-slate-600">Cerrar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA ESTADÍSTICAS */}
        {pestañaActiva === "estadisticas" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Reporte Mensual</h2>
              <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="text-xs font-black text-[#702032] bg-rose-50 px-4 py-2.5 rounded-xl outline-none border border-rose-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/50 text-center border border-slate-50 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-6xl opacity-5">📈</div>
                <p className="text-5xl font-black text-[#702032] tracking-tighter">{visitasFiltradas.length}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">Visitas Totales</p>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/50 text-center border border-slate-50 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-6xl opacity-5">👥</div>
                <p className="text-5xl font-black text-emerald-500 tracking-tighter">{new Set(visitasFiltradas.map(v => v.idJoven)).size}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">Clientes Únicos</p>
              </div>
            </div>
          </div>
        )}

        {/* VISTA PROMOS Y EMPLEOS */}
        {(pestañaActiva === "promos" || pestañaActiva === "empleos") && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center px-2 mb-2">
               <h2 className="text-xl font-black text-slate-900 tracking-tighter">{pestañaActiva === "promos" ? "Mis Cupones Activos" : "Bolsa de Trabajo"}</h2>
               <button onClick={() => setCreandoModal(pestañaActiva === "promos" ? "promo" : "empleo")} className="bg-[#702032] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:bg-slate-900 transition-all text-[10px] font-black uppercase tracking-widest">
                 + Nuevo
               </button>
            </div>
            
            {(pestañaActiva === "promos" ? listaPromos : listaEmpleos).length === 0 ? (
               <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100">
                  <p className="text-slate-400 font-bold text-sm">No tienes publicaciones activas.</p>
               </div>
            ) : (
              (pestañaActiva === "promos" ? listaPromos : listaEmpleos).map((item: any) => {
                const hoy = new Date().toISOString().split("T")[0];
                const estaExpirado = item.fechaVencimiento && item.fechaVencimiento < hoy;
                
                return (
                  <div key={item.idFirebase} className={`bg-white rounded-[2.5rem] shadow-lg p-7 border relative group transition-all hover:shadow-2xl ${estaExpirado ? "border-red-200 opacity-75" : "border-slate-50 hover:border-emerald-100"}`}>
                    <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${estaExpirado ? "bg-red-400" : "bg-[#702032]/10 group-hover:bg-[#702032]"}`}></div>
                    <button onClick={() => { if(window.confirm("¿Eliminar publicación?")) deleteDoc(doc(db, pestañaActiva === "promos" ? "promociones" : "empleos", item.idFirebase)).then(() => pestañaActiva === "promos" ? cargarPromos() : cargarEmpleos()) }} className="absolute top-5 right-6 w-8 h-8 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors">🗑️</button>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`${estaExpirado ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"} text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest`}>
                        {estaExpirado ? "Expirado" : "Activo"}
                      </span>
                      {item.usoUnico && <span className="bg-orange-50 text-orange-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">1 Solo Uso</span>}
                      {item.nivelRequerido && item.nivelRequerido !== "Clásica" && <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${item.nivelRequerido === 'Black' ? 'bg-slate-900 text-fuchsia-400' : 'bg-yellow-100 text-yellow-700'}`}>Solo {item.nivelRequerido}</span>}
                    </div>
                    
                    <h4 className="font-black text-slate-900 text-2xl tracking-tight leading-tight pr-10">{item.titulo}</h4>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-2 mb-1"><span className="text-red-400">📍</span> {item.direccion}</p>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-3"><span className="text-blue-400">📅</span> {item.diasValidos}</p>

                    <p className="text-sm font-medium text-slate-500 leading-relaxed">{item.descripcion}</p>
                    
                    {item.sueldo && <p className="text-lg font-black text-emerald-500 mt-4">{item.sueldo}</p>}
                    {item.tipo === "Frecuente" && <p className="text-[10px] font-black bg-rose-50 text-[#702032] inline-block px-3 py-1.5 rounded-lg mt-4 uppercase tracking-widest">Meta: {item.visitasMeta} Visitas</p>}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL FORMULARIOS CREADOR */}
      {creandoModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
          <div className="bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-[3rem] p-8 pb-32 shadow-2xl animate-slide-up relative">
             <button onClick={limpiarFormulario} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">✕</button>
             <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Crear {creandoModal === "promo" ? "Beneficio" : "Vacante"}</h3>
             
             <form onSubmit={creandoModal === "promo" ? publicarPromo : publicarEmpleo} className="space-y-5">
                {creandoModal === "promo" && (
                  <>
                    <select value={tipoPromo} onChange={(e) => setTipoPromo(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" required>
                      <option value="">Selecciona el tipo...</option><option value="Directa">🏷️ Descuento Directo</option><option value="Frecuente">⭐ Lealtad (Visitas)</option>
                    </select>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-amber-800">¿Para qué Nivel de Tarjeta es?</label>
                      <select value={nivelRequerido} onChange={(e) => setNivelRequerido(e.target.value)} className="w-full bg-white border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all" required>
                        <option value="Clásica">🔹 Nivel Clásico (Todos los jóvenes)</option>
                        <option value="Oro">⭐ Nivel Oro (Solo clientes frecuentes)</option>
                        <option value="Black">👑 Nivel VIP Black (Solo los de élite)</option>
                      </select>
                    </div>
                  </>
                )}
                
                {tipoPromo === "Directa" && (
                  <label className="flex items-center gap-3 bg-orange-50 p-4 rounded-2xl border border-orange-100 cursor-pointer">
                    <input type="checkbox" checked={usoUnico} onChange={(e) => setUsoUnico(e.target.checked)} className="w-5 h-5 accent-orange-600" />
                    <div>
                      <p className="text-sm font-black text-orange-800 leading-tight">Válido solo 1 vez por joven</p>
                      <p className="text-[10px] text-orange-600 font-medium">El cupón se bloqueará después de usarlo.</p>
                    </div>
                  </label>
                )}

                {tipoPromo === "Frecuente" && <input type="number" value={visitasRequeridas} onChange={(e) => setVisitasRequeridas(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" placeholder="Meta de visitas (Ej. 5)" required />}
                
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" placeholder="Título principal" required />
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all h-28 resize-none" placeholder="Descripción detallada..." required></textarea>
                <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" placeholder="📍 Dirección o Sucursal" required />
                
                {creandoModal === "empleo" && (
                  <>
                    <input type="text" value={sueldo} onChange={(e) => setSueldo(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" placeholder="Sueldo (Ej. $1,500 Semanales)" required />
                    <select value={tipoEmpleo} onChange={(e) => setTipoEmpleo(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" required><option value="">Jornada...</option><option value="Medio Tiempo">Medio Tiempo</option><option value="Tiempo Completo">Tiempo Completo</option></select>
                    <input type="number" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-[2rem] px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" placeholder="WhatsApp (10 dígitos)" required />
                  </>
                )}

                {creandoModal === "promo" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-slate-400 pl-2">Días que aplica</label>
                      <select value={diasValidos} onChange={(e) => setDiasValidos(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-2xl px-4 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all">
                        <option value="Todos los días">Todos los días</option>
                        <option value="Lunes a Viernes">Lun-Vie</option>
                        <option value="Fines de semana">Fines de semana</option>
                        <option value="Solo Lunes">Solo Lunes</option>
                        <option value="Solo Martes">Solo Martes</option>
                        <option value="Solo Miércoles">Solo Miércoles</option>
                        <option value="Solo Jueves">Solo Jueves</option>
                        <option value="Solo Viernes">Solo Viernes</option>
                        <option value="Solo Sábado">Solo Sábado</option>
                        <option value="Solo Domingo">Solo Domingo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-slate-400 pl-2 text-center">Vencimiento</label>
                      <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full bg-slate-50 border-transparent rounded-2xl px-4 py-4 text-xs font-bold text-slate-500 outline-none focus:ring-4 focus:ring-[#702032]/10 transition-all" />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <button type="submit" className="w-full bg-[#702032] text-white font-black py-5 rounded-[2rem] text-[11px] uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-[#702032]/20 transition-all">Publicar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MENÚ INFERIOR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-300/50 border border-white rounded-[2rem] px-6 py-4 z-40">
        <div className="flex justify-between items-center">
          {[
            { id: "escaner", icon: "📷", label: "TPV" },
            { id: "promos", icon: "🎟️", label: "Cupones" },
            { id: "empleos", icon: "💼", label: "Empleos" },
            { id: "estadisticas", icon: "📊", label: "Métricas" }
          ].map((btn) => {
            const activo = pestañaActiva === btn.id;
            return (
              <button 
                key={btn.id}
                onClick={() => setPestañaActiva(btn.id)} 
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activo ? "text-[#702032] scale-110" : "text-slate-400 hover:text-slate-600"}`}
              >
                <span className="text-2xl">{btn.icon}</span>
                <span className={`text-[9px] font-black uppercase tracking-tighter ${activo ? "opacity-100" : "opacity-0 h-0"}`}>{btn.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* MODAL AJUSTES (Omitido visualmente, pero funcional arriba) */}
    </main>
  );
}