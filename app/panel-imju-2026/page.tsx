"use client";

import { useState, useRef, useEffect } from "react";
import { Camera } from "react-camera-pro"; 
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { db } from "../../firebase";
import emailjs from '@emailjs/browser';
import { useRouter } from "next/navigation";

export default function PanelAdministrativo() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const PIN_CORRECTO = "IMJU123"; 

  // --- ESTADOS DE VISTAS Y DATOS ---
  const [pestaña, setPestaña] = useState("jovenes"); 
  const [modalJoven, setModalJoven] = useState(false);
  const [modalNegocio, setModalNegocio] = useState(false);
  
  const [listaJovenes, setListaJovenes] = useState<any[]>([]);
  const [listaNegocios, setListaNegocios] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]); 
  const [cargando, setCargando] = useState(false);
  
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().substring(0, 7));
  
  const [busqueda, setBusqueda] = useState("");

  // --- ESTADOS PARA JÓVENES ---
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState("");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [correo, setCorreo] = useState("");
  const [genero, setGenero] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

  // --- ESTADOS PARA NEGOCIOS ---
  const [modoEdicionNegocio, setModoEdicionNegocio] = useState(false);
  const [idEditandoNegocio, setIdEditandoNegocio] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [giroNegocio, setGiroNegocio] = useState("");
  const [correoNegocio, setCorreoNegocio] = useState("");
  const [passwordNegocio, setPasswordNegocio] = useState("");
  const [logoNegocioBase64, setLogoNegocioBase64] = useState<string | null>(null);

  // --- CÁMARA ORIGINAL ---
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const cameraRef = useRef<any>(null);

  // 1. LOGIN
  const verificarPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === PIN_CORRECTO) { setAccesoConcedido(true); cargarDirectorio(); } 
    else { alert("PIN Incorrecto. Acceso denegado."); setPin(""); }
  };

  // 2. CARGA DE DATOS
  const cargarDirectorio = async () => {
    setCargando(true);
    try {
      const queryJovenes = await getDocs(collection(db, "jovenes"));
      const tempJovenes: any[] = [];
      queryJovenes.forEach((doc) => tempJovenes.push({ idFirebase: doc.id, ...doc.data() }));
      setListaJovenes(tempJovenes);

      const queryNegocios = await getDocs(collection(db, "negocios"));
      const tempNegocios: any[] = [];
      queryNegocios.forEach((doc) => tempNegocios.push({ idFirebase: doc.id, ...doc.data() }));
      setListaNegocios(tempNegocios);

      const queryVisitas = await getDocs(collection(db, "visitas"));
      const tempV: any[] = [];
      queryVisitas.forEach(doc => tempV.push({ idFirebase: doc.id, ...doc.data() }));
      tempV.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setVisitas(tempV);
    } catch(e) { console.error(e); }
    setCargando(false);
  };

  const jovenesFiltrados = listaJovenes.filter(j => 
    j.nombreCompleto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    j.codigoUnicoQR?.toLowerCase().includes(busqueda.toLowerCase()) ||
    j.correo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const negociosFiltrados = listaNegocios.filter(n => 
    n.nombreComercial?.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.nombreContacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.correo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const visitasFiltradas = visitas.filter(v => v.fecha && v.fecha.startsWith(mesSeleccionado));

  // 3. PROCESAMIENTO DE IMAGEN ORIGINAL
  const procesarImagen = (fuenteImagen: string, esLogo: boolean = false) => {
    const img = new Image();
    img.src = fuenteImagen;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = esLogo ? 400 : 300; 
      const MAX_HEIGHT = esLogo ? 400 : 300;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      
      const resultado = canvas.toDataURL("image/jpeg", 0.8);
      if (esLogo) { setLogoNegocioBase64(resultado); } 
      else { setFotoBase64(resultado); setMostrarCamara(false); }
    };
  };

  const manejarSubidaArchivo = (e: React.ChangeEvent<HTMLInputElement>, esLogo: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evento) => {
        if (evento.target?.result) procesarImagen(evento.target.result as string, esLogo);
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. CRUD JÓVENES
  const registrarJoven = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !edad || !localidad || !correo || !genero || !ocupacion) { alert("Llena todos los campos."); return; }
    if (!fotoBase64) { alert("Falta la fotografía."); return; }
    setCargando(true);
    try {
      const q = query(collection(db, "jovenes"), where("correo", "==", correo));
      const validacion = await getDocs(q);
      if (!validacion.empty) { alert("¡Alto! Este correo ya está registrado."); setCargando(false); return; }

      const idUnico = "IMJU-" + Math.floor(Math.random() * 1000000);
      await addDoc(collection(db, "jovenes"), {
        nombreCompleto: nombre.trim(), edad: parseInt(edad), localidad: localidad.trim(),
        correo: correo.trim(), genero: genero, ocupacion: ocupacion,
        codigoUnicoQR: idUnico, contrasena: idUnico, fotoPerfil: fotoBase64, estatus: "Activo", fechaRegistro: new Date().toISOString()
      });

      try {
        await emailjs.send("service_dozo56w", "template_16bs6rm", { nombre: nombre.trim(), correo: correo.trim(), password: idUnico }, { publicKey: "9JzdP1W3ubDAarkRt" });
      } catch (errorCorreo: any) { console.error("Fallo EmailJS:", errorCorreo); }

      alert(`¡Éxito! Joven registrado y correo enviado.\nSu código es: ${idUnico}`);
      cancelarEdicionJoven(); cargarDirectorio();
    } catch (error) { alert("Hubo un error al guardar los datos."); }
    setCargando(false);
  };

  const actualizarJoven = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !edad || !localidad || !correo || !genero || !ocupacion) { alert("Llena todos los campos."); return; }
    setCargando(true);
    try {
      const q = query(collection(db, "jovenes"), where("correo", "==", correo));
      const validacion = await getDocs(q);
      if (validacion.docs.some(doc => doc.id !== idEditando)) { alert("¡Ese correo ya pertenece a otro joven!"); setCargando(false); return; }

      await updateDoc(doc(db, "jovenes", idEditando), {
        nombreCompleto: nombre.trim(), edad: parseInt(edad), localidad: localidad.trim(),
        correo: correo.trim(), genero: genero, ocupacion: ocupacion, fotoPerfil: fotoBase64 
      });
      alert("¡Datos del joven actualizados!");
      cancelarEdicionJoven(); cargarDirectorio();
    } catch (error) { alert("Error al guardar los cambios."); }
    setCargando(false);
  };

  const eliminarJoven = async (id: string, nom: string) => {
    if (window.confirm(`¿Eliminar a ${nom}?`)) { await deleteDoc(doc(db, "jovenes", id)); cargarDirectorio(); }
  };

  const iniciarEdicionJoven = (j: any) => {
    setNombre(j.nombreCompleto); setEdad(j.edad.toString()); setLocalidad(j.localidad);
    setCorreo(j.correo); setGenero(j.genero || ""); setOcupacion(j.ocupacion || "");
    setFotoBase64(j.fotoPerfil); setIdEditando(j.idFirebase); setModoEdicion(true); setModalJoven(true);
  };

  const cancelarEdicionJoven = () => {
    setNombre(""); setEdad(""); setLocalidad(""); setCorreo(""); setGenero(""); setOcupacion(""); 
    setFotoBase64(null); setIdEditando(""); setModoEdicion(false); setModalJoven(false); setMostrarCamara(false);
  };

  // 5. CRUD NEGOCIOS
  const registrarNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNegocio || !giroNegocio || !correoNegocio || !passwordNegocio) { alert("Llena todos los campos del negocio."); return; }
    if (!logoNegocioBase64) { alert("Falta subir el logo."); return; }
    setCargando(true);
    try {
      const q = query(collection(db, "negocios"), where("correo", "==", correoNegocio));
      if (!(await getDocs(q)).empty) { alert("¡Correo en uso por otro negocio!"); setCargando(false); return; }

      await addDoc(collection(db, "negocios"), {
        nombreComercial: nombreNegocio.trim(), giro: giroNegocio, correo: correoNegocio.trim(),
        contrasena: passwordNegocio, logo: logoNegocioBase64, estatus: "Activo", fechaRegistro: new Date().toISOString()
      });
      alert(`¡Negocio "${nombreNegocio}" registrado!`);
      cancelarEdicionNegocio(); cargarDirectorio();
    } catch (error) { alert("Error al registrar el negocio."); }
    setCargando(false);
  };

  const actualizarNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNegocio || !giroNegocio || !correoNegocio || !passwordNegocio) { alert("Llena todos los campos."); return; }
    setCargando(true);
    try {
      const q = query(collection(db, "negocios"), where("correo", "==", correoNegocio));
      const validacion = await getDocs(q);
      if (validacion.docs.some(doc => doc.id !== idEditandoNegocio)) { alert("¡Ese correo ya pertenece a otro negocio!"); setCargando(false); return; }

      await updateDoc(doc(db, "negocios", idEditandoNegocio), {
        nombreComercial: nombreNegocio.trim(), giro: giroNegocio, correo: correoNegocio.trim(),
        contrasena: passwordNegocio, logo: logoNegocioBase64 
      });
      alert("¡Datos del negocio actualizados!");
      cancelarEdicionNegocio(); cargarDirectorio();
    } catch (error) { alert("Error al actualizar."); }
    setCargando(false);
  };

  const eliminarNegocio = async (id: string, nom: string) => {
    if (window.confirm(`¿Eliminar definitivamente el negocio ${nom}?`)) { await deleteDoc(doc(db, "negocios", id)); cargarDirectorio(); }
  };

  const iniciarEdicionNegocio = (n: any) => {
    setNombreNegocio(n.nombreComercial); setGiroNegocio(n.giro); setCorreoNegocio(n.correo);
    setPasswordNegocio(n.contrasena); setLogoNegocioBase64(n.logo); setIdEditandoNegocio(n.idFirebase);
    setModoEdicionNegocio(true); setModalNegocio(true);
  };

  const cancelarEdicionNegocio = () => {
    setNombreNegocio(""); setGiroNegocio(""); setCorreoNegocio(""); setPasswordNegocio(""); 
    setLogoNegocioBase64(null); setIdEditandoNegocio(""); setModoEdicionNegocio(false); setModalNegocio(false);
  };

  // 6. DESCARGA EXCEL INTELIGENTE (Basado en la búsqueda)
  const descargarExcel = (tipo: string) => {
    let csvContent = "\uFEFF"; 
    let nombreArchivo = "";
    const limpiar = (texto: string) => `"${(texto || "").toString().replace(/"/g, '""')}"`;

    if (tipo === "jovenes") {
      nombreArchivo = "Directorio_Jovenes.csv"; csvContent += "Nombre,Edad,Ocupación,Localidad,Correo,Código QR\n";
      jovenesFiltrados.forEach(j => { csvContent += `${limpiar(j.nombreCompleto)},${limpiar(j.edad)},${limpiar(j.ocupacion)},${limpiar(j.localidad)},${limpiar(j.correo)},${limpiar(j.codigoUnicoQR)}\n`; });
    } else if (tipo === "negocios") {
      nombreArchivo = "Directorio_Negocios.csv"; csvContent += "Comercio,Giro,Correo,Contraseña\n";
      negociosFiltrados.forEach(n => { csvContent += `${limpiar(n.nombreComercial)},${limpiar(n.giro)},${limpiar(n.correo)},${limpiar(n.contrasena)}\n`; });
    } else if (tipo === "visitas") {
      nombreArchivo = `Reporte_Visitas_${mesSeleccionado}.csv`; csvContent += "Fecha,Joven,Negocio,Promoción\n";
      visitasFiltradas.forEach(v => { const f = new Date(v.fecha).toLocaleString("es-MX"); csvContent += `${limpiar(f)},${limpiar(v.nombreJoven)},${limpiar(v.nombreNegocio)},${limpiar(v.nombrePromo)}\n`; });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.setAttribute("download", nombreArchivo); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const cambiarPestaña = (nuevaPestaña: string) => {
    setPestaña(nuevaPestaña);
    setBusqueda(""); 
  };

  if (!accesoConcedido) {
    return (
      <main className="min-h-screen bg-[#F3F5F9] flex items-center justify-center px-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-slate-100">
          <div className="w-20 h-20 bg-[#702032] rounded-full mx-auto mb-6 flex items-center justify-center"><img src="/logo-imju.png" alt="IMJU" className="w-12 h-12 object-contain filter brightness-0 invert" /></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Panel Central</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Administración IMJU</p>
          <form onSubmit={verificarPin}>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN de Acceso" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-center text-xl font-black text-slate-700 tracking-[0.3em] outline-none focus:border-[#702032] mb-6" required />
            <button className="w-full bg-[#702032] text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-lg">Acceder</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9] font-sans pb-20">
      
      <div className="bg-[#702032] pt-8 pb-20 px-8 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg"><img src="/logo-imju.png" alt="IMJU" className="w-12 h-12 object-contain" /></div>
            <div><p className="text-rose-200 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Ayuntamiento de Escuinapa</p><h1 className="text-2xl md:text-3xl font-black text-white">Centro de Control</h1></div>
          </div>
          <button onClick={() => { setAccesoConcedido(false); window.location.href = "/"; }} className="bg-white/10 hover:bg-red-500/80 px-5 py-2.5 rounded-full text-white text-[10px] font-black uppercase border border-white/10 hidden md:block">Cerrar Sesión</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-20">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Juventud Registrada</p><p className="text-5xl font-black text-[#702032]">{listaJovenes.length}</p></div>
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-3xl">🪪</div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Negocios Aliados</p><p className="text-5xl font-black text-emerald-600">{listaNegocios.length}</p></div>
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-3xl">🏪</div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitas del Mes</p><p className="text-5xl font-black text-indigo-600">{visitasFiltradas.length}</p></div>
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-3xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-3 flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button onClick={() => cambiarPestaña("jovenes")} className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest ${pestaña === "jovenes" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Jóvenes</button>
            <button onClick={() => cambiarPestaña("negocios")} className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest ${pestaña === "negocios" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Negocios</button>
            <button onClick={() => cambiarPestaña("visitas")} className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest ${pestaña === "visitas" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Métricas</button>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            {pestaña === "jovenes" && <button onClick={() => {cancelarEdicionJoven(); setModalJoven(true)}} className="flex-1 md:flex-none bg-[#702032] text-white px-5 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">+ Nuevo Joven</button>}
            {pestaña === "negocios" && <button onClick={() => {cancelarEdicionNegocio(); setModalNegocio(true)}} className="flex-1 md:flex-none bg-emerald-600 text-white px-5 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">+ Nuevo Negocio</button>}
            <button onClick={() => descargarExcel(pestaña)} className="flex-1 md:flex-none bg-[#107C41] text-white px-5 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">📊 Excel</button>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 min-h-[400px] overflow-hidden">
          
          {(pestaña === "jovenes" || pestaña === "negocios") && (
            <div className="mb-6 relative animate-fade-in">
              <input 
                type="text" 
                placeholder={`Buscar en ${pestaña === "jovenes" ? "Jóvenes (Nombre, ID, Correo)" : "Negocios (Comercio, Contacto, Correo)"}...`} 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#702032]/20 transition-all"
              />
              <span className="absolute right-6 top-4 text-slate-400 text-lg">🔍</span>
            </div>
          )}

          {cargando ? (
             <div className="flex flex-col items-center justify-center h-64"><div className="w-12 h-12 border-4 border-[#702032]/20 border-t-[#702032] rounded-full animate-spin mb-4"></div></div>
          ) : (
            <>
              {pestaña === "jovenes" && (
                <div className="overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="border-b-2 border-slate-100"><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joven</th><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil</th><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso</th><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th></tr></thead>
                    <tbody>
                      {jovenesFiltrados.length === 0 ? (
                        <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-bold text-sm">No se encontraron resultados.</td></tr>
                      ) : (
                        jovenesFiltrados.map(j => (<tr key={j.idFirebase} className="border-b border-slate-50"><td className="py-4"><div className="flex items-center gap-3"><img src={j.fotoPerfil} className="w-10 h-10 rounded-full object-cover" /><div><p className="font-black text-slate-800">{j.nombreCompleto}</p><p className="text-[10px] font-bold text-slate-400">{j.edad} años • {j.localidad}</p></div></div></td><td className="py-4"><p className="text-xs font-bold text-slate-600 mb-1">{j.ocupacion}</p><span className="text-[9px] text-slate-400 font-bold uppercase">{j.genero}</span></td><td className="py-4"><p className="text-xs font-bold text-slate-600 mb-1">{j.correo}</p><span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-2 py-1 rounded-lg">{j.codigoUnicoQR}</span></td><td className="py-4 text-right flex flex-col items-end gap-2"><button onClick={() => iniciarEdicionJoven(j)} className="bg-blue-50 text-blue-600 font-bold py-1 px-3 rounded-md text-[10px] uppercase">Editar</button><button onClick={() => eliminarJoven(j.idFirebase, j.nombreCompleto)} className="bg-red-50 text-red-600 font-bold py-1 px-3 rounded-md text-[10px] uppercase">Borrar</button></td></tr>))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {pestaña === "negocios" && (
                <div className="overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="border-b-2 border-slate-100"><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Comercio</th><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giro</th><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso</th><th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th></tr></thead>
                    <tbody>
                      {negociosFiltrados.length === 0 ? (
                        <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-bold text-sm">No se encontraron resultados.</td></tr>
                      ) : (
                        negociosFiltrados.map(n => (<tr key={n.idFirebase} className="border-b border-slate-50"><td className="py-4"><div className="flex items-center gap-3"><img src={n.logo} className="w-10 h-10 rounded-xl object-contain bg-slate-50" /><p className="font-black text-slate-800">{n.nombreComercial}</p></div></td><td className="py-4"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">{n.giro}</span></td><td className="py-4 text-sm font-bold text-slate-600">{n.correo}<br/><span className="text-[10px] font-mono text-slate-400">Pass: {n.contrasena}</span></td><td className="py-4 text-right flex flex-col items-end gap-2"><button onClick={() => iniciarEdicionNegocio(n)} className="bg-blue-50 text-blue-600 font-bold py-1 px-3 rounded-md text-[10px] uppercase">Editar</button><button onClick={() => eliminarNegocio(n.idFirebase, n.nombreComercial)} className="bg-red-50 text-red-600 font-bold py-1 px-3 rounded-md text-[10px] uppercase">Borrar</button></td></tr>))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {pestaña === "visitas" && (
                <div className="overflow-x-auto animate-fade-in">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl mb-6">
                    <p className="text-sm font-black text-slate-800">Filtrar por Mes:</p>
                    <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="text-xs font-black text-[#702032] bg-white px-4 py-2 rounded-xl shadow-sm outline-none border border-slate-200" />
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100">
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joven que canjeó</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Promoción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitasFiltradas.length === 0 ? (
                        <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-bold text-sm">No hay movimientos en el mes seleccionado.</td></tr>
                      ) : (
                        visitasFiltradas.map(v => (
                          <tr key={v.idFirebase} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 text-[11px] font-black text-slate-500 uppercase">{new Date(v.fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}</td>
                            <td className="py-4 font-black text-emerald-600">{v.nombreNegocio}</td>
                            <td className="py-4 text-sm font-bold text-slate-800">{v.nombreJoven}</td>
                            <td className="py-4"><span className="bg-[#702032]/10 text-[#702032] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">{v.nombrePromo}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {visitasFiltradas.length > 0 && (
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest">Mostrando los {visitasFiltradas.length} movimientos del mes. Descarga el Excel para respaldar.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =========================================
          MODAL: JOVEN 
          ========================================= */}
      {modalJoven && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 shadow-2xl relative">
            <button onClick={cancelarEdicionJoven} className="absolute top-6 right-6 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500">✕</button>
            <h3 className="text-2xl font-black text-[#702032] mb-6">{modoEdicion ? "Editar Joven" : "Registro de Joven"}</h3>
            
            <form onSubmit={modoEdicion ? actualizarJoven : registrarJoven} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#702032] outline-none font-bold" placeholder="Nombre Completo" required />
                </div>
                <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#702032] outline-none font-bold" placeholder="Edad" required />
                <input type="text" value={localidad} onChange={(e) => setLocalidad(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#702032] outline-none font-bold" placeholder="Localidad" required />
                
                <select value={genero} onChange={(e) => setGenero(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#702032] outline-none font-bold text-slate-600" required>
                  <option value="">Género...</option><option value="Femenino">Femenino</option><option value="Masculino">Masculino</option><option value="Prefiero no decir">Prefiero no decir</option>
                </select>
                <select value={ocupacion} onChange={(e) => setOcupacion(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#702032] outline-none font-bold text-slate-600" required>
                  <option value="">Ocupación...</option><option value="Estudiante">Estudiante</option><option value="Empleado">Empleado (Trabaja)</option><option value="Emprendedor">Emprendedor</option><option value="Buscando Empleo">Buscando Empleo</option>
                </select>
                
                <div className="md:col-span-2">
                  <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#702032] outline-none font-bold" placeholder="Correo Electrónico" required />
                </div>

                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  <label className="block text-sm font-semibold text-slate-700 mb-4">Fotografía del Joven</label>
                  
                  {!mostrarCamara && !fotoBase64 && (
                    <div className="flex justify-center gap-4">
                      <button type="button" onClick={() => setMostrarCamara(true)} className="bg-[#702032] text-white font-bold py-3 px-6 rounded-xl shadow-md text-xs uppercase tracking-widest">📸 Activar Cámara</button>
                      <label className="bg-white text-slate-600 border-2 border-slate-200 font-bold py-3 px-6 rounded-xl cursor-pointer shadow-sm text-xs uppercase tracking-widest">
                        📁 Galería <input type="file" accept="image/*" onChange={(e) => manejarSubidaArchivo(e, false)} className="hidden" />
                      </label>
                    </div>
                  )}

                  {mostrarCamara && (
                    <div className="relative w-full h-72 rounded-2xl overflow-hidden mb-4 border-4 border-[#702032]">
                      {/* @ts-ignore: Bypass para Vercel */}
                      <Camera ref={cameraRef} facingMode="user" errorMessages={{ noCameraAccessible: 'Sin cámara', permissionDenied: 'Sin permiso', switchCamera: 'Error', canvas: 'Error' }} />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        <button type="button" onClick={() => setMostrarCamara(false)} className="bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs">Cancelar</button>
                        <button type="button" onClick={() => { const d = cameraRef.current?.takePhoto(); if(d) procesarImagen(d, false); }} className="bg-[#702032] text-white font-bold py-2 px-4 rounded-xl text-xs shadow-xl border-2 border-white">Tomar Foto</button>
                      </div>
                    </div>
                  )}

                  {fotoBase64 && (
                    <div className="flex flex-col items-center">
                        <img src={fotoBase64} alt="Previa" className="w-32 h-32 object-cover rounded-full border-4 border-[#702032] mb-3 shadow-lg" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setMostrarCamara(true)} className="text-xs bg-white text-[#702032] font-bold px-4 py-2 rounded-xl border border-slate-200">📸 Cámara</button>
                          <label className="text-xs bg-white text-slate-600 font-bold px-4 py-2 rounded-xl border border-slate-200 cursor-pointer">
                            📁 Galería <input type="file" accept="image/*" onChange={(e) => manejarSubidaArchivo(e, false)} className="hidden" />
                          </label>
                        </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="w-5 h-5 mt-0.5 accent-[#702032] cursor-pointer rounded" />
                  <span className="text-xs font-medium text-slate-600 leading-tight">
                    Confirmo que el usuario ha leído y acepta el <a href="#" className="text-[#702032] font-bold underline">Aviso de Privacidad</a> del Instituto Municipal de la Juventud de Escuinapa.
                  </span>
                </label>
              </div>
              
              <button type="submit" disabled={cargando} className={`w-full mt-4 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all ${cargando ? "bg-slate-400" : "bg-[#702032] hover:bg-slate-900 shadow-lg"}`}>
                {cargando ? "Procesando..." : (modoEdicion ? "Guardar Cambios" : "Registrar y Enviar Correo")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: NEGOCIO
          ========================================= */}
      {modalNegocio && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 shadow-2xl relative">
            <button onClick={cancelarEdicionNegocio} className="absolute top-6 right-6 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500">✕</button>
            <h3 className="text-2xl font-black text-emerald-600 mb-6">{modoEdicionNegocio ? "Editar Negocio" : "Alta de Negocio"}</h3>
            
            <form onSubmit={modoEdicionNegocio ? actualizarNegocio : registrarNegocio} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input type="text" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold" placeholder="Nombre Comercial" required />
                </div>
                
                <div className="md:col-span-2">
                  <select value={giroNegocio} onChange={(e) => setGiroNegocio(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-600" required>
                    <option value="">Selecciona el giro...</option><option value="Alimentos y Bebidas">Alimentos y Bebidas</option><option value="Ropa y Calzado">Ropa y Calzado</option><option value="Salud y Belleza">Salud y Belleza</option><option value="Educación y Cursos">Educación y Cursos</option><option value="Servicios">Servicios Profesionales</option><option value="Entretenimiento">Entretenimiento</option><option value="Otro">Otro</option>
                  </select>
                </div>
                
                <input type="email" value={correoNegocio} onChange={(e) => setCorreoNegocio(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold" placeholder="Correo (Usuario)" required />
                <input type="text" value={passwordNegocio} onChange={(e) => setPasswordNegocio(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold" placeholder="Contraseña asignada" required />

                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  <label className="block text-sm font-semibold text-slate-700 mb-4">Logo del Negocio</label>
                  {!logoNegocioBase64 ? (
                    <label className="bg-white text-emerald-600 border-2 border-emerald-600 font-bold py-3 px-6 rounded-xl cursor-pointer shadow-sm text-xs uppercase tracking-widest inline-block">
                      📁 Subir Logo <input type="file" accept="image/*" onChange={(e) => manejarSubidaArchivo(e, true)} className="hidden" />
                    </label>
                  ) : (
                    <div className="flex flex-col items-center">
                        <img src={logoNegocioBase64} alt="Logo" className="w-32 h-32 object-contain rounded-xl border border-slate-200 mb-3 bg-white" />
                        <label className="text-xs bg-white text-slate-600 font-bold px-4 py-2 rounded-xl border border-slate-200 cursor-pointer">
                          📁 Cambiar <input type="file" accept="image/*" onChange={(e) => manejarSubidaArchivo(e, true)} className="hidden" />
                        </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="w-5 h-5 mt-0.5 accent-emerald-600 cursor-pointer rounded" />
                  <span className="text-xs font-medium text-slate-600 leading-tight">
                    Confirmo que el negocio ha leído y acepta el <a href="#" className="text-emerald-600 font-bold underline">Aviso de Privacidad</a> del IMJU.
                  </span>
                </label>
              </div>
              
              <button type="submit" disabled={cargando} className={`w-full mt-4 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all ${cargando ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700 shadow-lg"}`}>
                {cargando ? "Procesando..." : (modoEdicionNegocio ? "Guardar Cambios" : "Registrar Negocio")}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}