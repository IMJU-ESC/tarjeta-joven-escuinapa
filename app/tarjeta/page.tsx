"use client";

import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore"; 
import { db } from "../../firebase";

export default function TarjetaDigital() {
  const [datosJoven, setDatosJoven] = useState<any>(null);
  const [pestañaActiva, setPestañaActiva] = useState("promos"); 
  const [filtroTipoPromo, setFiltroTipoPromo] = useState("todos"); 
  
  const [qrAmpliado, setQrAmpliado] = useState(false);
  const [listaPromos, setListaPromos] = useState<any[]>([]);
  const [listaEmpleos, setListaEmpleos] = useState<any[]>([]);
  const [miHistorial, setMiHistorial] = useState<any[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modoOscuro, setModoOscuro] = useState(false);
  const [empleosContactados, setEmpleosContactados] = useState<string[]>([]);

  const [modalNivel, setModalNivel] = useState<{mostrar: boolean, nivelNuevo: string, visitas: number} | null>(null);

  const [modalAjustes, setModalAjustes] = useState(false);
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [cambiandoPass, setCambiandoPass] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const sesionGuardada = localStorage.getItem("sesionJoven");
    if (sesionGuardada) {
      const joven = JSON.parse(sesionGuardada);
      setDatosJoven(joven);
      
      const contactadosGuardados = localStorage.getItem(`empleos_${joven.idFirebase}`);
      if(contactadosGuardados) setEmpleosContactados(JSON.parse(contactadosGuardados));

      cargarTodo(joven.idFirebase);
    } else {
      router.push("/login");
    }

    const temaGuardado = localStorage.getItem("temaTarjeta");
    if (temaGuardado === "dark") setModoOscuro(true);
  }, [router]);

  const cargarTodo = async (idJoven: string) => {
    setCargandoDatos(true);
    try {
      const snapPromos = await getDocs(query(collection(db, "promociones")));
      const pTemp: any[] = [];
      snapPromos.forEach((d) => pTemp.push({ idFirebase: d.id, ...d.data() }));
      setListaPromos(pTemp);

      const snapEmpleos = await getDocs(query(collection(db, "empleos")));
      const eTemp: any[] = [];
      snapEmpleos.forEach((d) => eTemp.push({ idFirebase: d.id, ...d.data() }));
      setListaEmpleos(eTemp);

      const qHistorial = query(collection(db, "visitas"), where("idJoven", "==", idJoven));
      const snapHistorial = await getDocs(qHistorial);
      const hTemp: any[] = [];
      snapHistorial.forEach((d) => hTemp.push({ idFirebase: d.id, ...d.data() }));
      hTemp.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setMiHistorial(hTemp);
    } catch (error) { console.error(error); }
    setCargandoDatos(false);
  };

  useEffect(() => {
    if (miHistorial.length > 0 && datosJoven) {
      const fechaActual = new Date();
      const activas = miHistorial.filter(v => {
        const dias = (fechaActual.getTime() - new Date(v.fecha).getTime()) / (1000 * 3600 * 24);
        return dias <= 90; 
      }).length;

      let nivelCalculado = "Clásica";
      let jerarquiaCalculada = 1;
      
      if (activas >= 40) { nivelCalculado = "VIP Black"; jerarquiaCalculada = 3; }
      else if (activas >= 15) { nivelCalculado = "Nivel Oro"; jerarquiaCalculada = 2; }

      const keyNivel = `nivel_guardado_${datosJoven.idFirebase}`;
      const nivelAnterior = localStorage.getItem(keyNivel);
      
      if (!nivelAnterior) {
        localStorage.setItem(keyNivel, nivelCalculado);
      } else {
        const jerarquiaAnterior = nivelAnterior === "VIP Black" ? 3 : (nivelAnterior === "Nivel Oro" ? 2 : 1);
        if (jerarquiaCalculada > jerarquiaAnterior) {
          setModalNivel({ mostrar: true, nivelNuevo: nivelCalculado, visitas: activas });
          localStorage.setItem(keyNivel, nivelCalculado); 
        } else if (jerarquiaCalculada < jerarquiaAnterior) {
          localStorage.setItem(keyNivel, nivelCalculado);
        }
      }
    }
  }, [miHistorial, datosJoven]);

  const obtenerProgreso = (idPromo: string, meta: number) => {
    const usos = miHistorial.filter(v => v.idPromo === idPromo).length;
    let actual = usos % meta;
    if (usos > 0 && actual === 0) actual = meta;
    const porcentaje = (actual / meta) * 100;
    return { actual, porcentaje, usosTotales: usos };
  };

  const descargarQR = () => {
    const canvas = document.getElementById("qr-joven") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl; downloadLink.download = `QR_${datosJoven.nombreCompleto.split(" ")[0]}.png`;
      document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);
    }
  };

  const toggleTema = () => {
    const nuevoEstado = !modoOscuro;
    setModoOscuro(nuevoEstado);
    localStorage.setItem("temaTarjeta", nuevoEstado ? "dark" : "light");
  };

  const actualizarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaContrasena.length < 6) { alert("La contraseña debe tener al menos 6 caracteres."); return; }
    setCambiandoPass(true);
    try {
      await updateDoc(doc(db, "jovenes", datosJoven.idFirebase), { contrasena: nuevaContrasena });
      const datosActualizados = { ...datosJoven, contrasena: nuevaContrasena };
      localStorage.setItem("sesionJoven", JSON.stringify(datosActualizados));
      setDatosJoven(datosActualizados);
      alert("✅ ¡Contraseña actualizada con éxito!");
      setModalAjustes(false); setNuevaContrasena("");
    } catch (error) { alert("Hubo un error al actualizar. Intenta de nuevo."); }
    setCambiandoPass(false);
  };

  const cerrarSesion = () => {
    localStorage.removeItem("sesionJoven");
    window.location.href = "/";
  };

  const abrirWhatsAppEmpleo = (empleo: any) => {
    if (!empleosContactados.includes(empleo.idFirebase)) {
      const nuevosGuardados = [...empleosContactados, empleo.idFirebase];
      setEmpleosContactados(nuevosGuardados);
      localStorage.setItem(`empleos_${datosJoven.idFirebase}`, JSON.stringify(nuevosGuardados));
    }
    window.open(`https://wa.me/52${empleo.telefonoContacto}`, '_blank');
  };

  if (!datosJoven) return null;

  const fechaActual = new Date();
  const visitasActivas = miHistorial.filter(v => {
    const fechaVisita = new Date(v.fecha);
    const diasTranscurridos = (fechaActual.getTime() - fechaVisita.getTime()) / (1000 * 3600 * 24);
    return diasTranscurridos <= 90; 
  }).length;

  const esBlack = visitasActivas >= 40;
  const esOro = visitasActivas >= 15 && visitasActivas < 40;
  
  const nivelUserNum = esBlack ? 3 : (esOro ? 2 : 1);
  const jerarquiaPromos = { "Clásica": 1, "Oro": 2, "Black": 3 };

  const hoy = new Date().toISOString().split("T")[0];
  const promosVigentes = listaPromos.filter(p => !p.fechaVencimiento || p.fechaVencimiento >= hoy);

  const filtrados = pestañaActiva === "promos" 
    ? promosVigentes
        .filter(p => {
          const coincideBusqueda = p.nombreNegocio.toLowerCase().includes(busqueda.toLowerCase()) || p.titulo.toLowerCase().includes(busqueda.toLowerCase());
          const coincideFiltro = filtroTipoPromo === "todos" || p.tipo === filtroTipoPromo;
          return coincideBusqueda && coincideFiltro;
        })
        .sort((a, b) => {
          const numA = jerarquiaPromos[a.nivelRequerido as keyof typeof jerarquiaPromos] || 1;
          const numB = jerarquiaPromos[b.nivelRequerido as keyof typeof jerarquiaPromos] || 1;
          const blockA = numA > nivelUserNum;
          const blockB = numB > nivelUserNum;
          if (blockA !== blockB) return blockA ? 1 : -1;
          if (!blockA && !blockB) return numB - numA;
          return numA - numB;
        })
    : listaEmpleos.filter(e => e.titulo.toLowerCase().includes(busqueda.toLowerCase()));

  
  const themeColors = esBlack 
    ? { bg: "bg-[#050505]", border: "border-white/10", glow1: "bg-violet-600 animate-pulse", glow2: "bg-fuchsia-600 animate-pulse", text: "from-violet-400 to-fuchsia-400", badge: "VIP BLACK" }
    : esOro 
    ? { bg: "bg-gradient-to-br from-yellow-900 to-[#1a1300]", border: "border-yellow-500/30", glow1: "bg-yellow-500 animate-pulse", glow2: "bg-orange-500 animate-pulse", text: "from-yellow-300 to-yellow-600", badge: "NIVEL ORO" }
    : { bg: "bg-gradient-to-br from-slate-900 to-[#0a1128]", border: "border-blue-500/30", glow1: "bg-blue-500 animate-pulse", glow2: "bg-cyan-500 animate-pulse", text: "from-blue-300 to-cyan-300", badge: "CLÁSICA" };

  return (
    <main className={`min-h-screen pb-24 font-sans selection:bg-violet-500/30 transition-colors duration-500 overflow-x-hidden ${modoOscuro ? "bg-[#080A12] text-white" : "bg-[#F3F5F9] text-slate-900"}`}>
      
      {/* HEADER */}
      <div className="pt-10 pb-6 px-6 max-w-md mx-auto flex justify-between items-center animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100">
             <img src="/imju-oficial.png" alt="IMJU" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${modoOscuro ? "text-violet-400" : "text-slate-400"}`}>Escuinapa</p>
            <h1 className={`text-2xl font-black tracking-tighter ${modoOscuro ? "text-white" : "text-slate-900"}`}>¡Qué onda, {datosJoven.nombreCompleto.split(" ")[0]}!</h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setModalAjustes(true)} className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${modoOscuro ? "bg-[#161B2C] text-slate-300 hover:text-white" : "bg-white shadow-md border border-slate-100 text-slate-400 hover:text-slate-800"}`}>⚙️</button>
          <button onClick={toggleTema} className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${modoOscuro ? "bg-[#161B2C] text-yellow-400" : "bg-white shadow-md border border-slate-100 text-slate-400"}`}>{modoOscuro ? "☀️" : "🌙"}</button>
          <button onClick={cerrarSesion} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${modoOscuro ? "bg-[#161B2C] text-red-400" : "bg-white shadow-md border border-slate-100 text-slate-400"}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
        </div>
      </div>

      {/* TARJETA DIGITAL (CON ANIMACIONES AMBIENTALES ACTIVAS PARA MÓVIL) */}
      <div className="max-w-md mx-auto px-6 relative z-20 perspective-1000 animate-slide-up">
        <div className={`relative transition-all duration-700 hover:shadow-2xl ${themeColors.bg} rounded-[3rem] p-8 overflow-hidden border ${themeColors.border} animate-[float_6s_ease-in-out_infinite]`}>
          
          {/* HOLOGRAMA INFINITO */}
          <div className="absolute inset-0 z-20 pointer-events-none opacity-40 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>
          
          <div className="absolute inset-0 opacity-[0.03] text-white font-mono text-[7px] overflow-hidden rotate-12 scale-150">
             {Array(50).fill(`IMJU PLUS ${themeColors.badge} ESCUINAPA `).map((t,i) => <p key={i}>{t}</p>)}
          </div>
          
          {/* LUCES VIVAS */}
          <div className={`absolute -top-24 -right-24 w-60 h-60 rounded-full mix-blend-screen filter blur-[70px] opacity-60 transition-colors duration-700 ${themeColors.glow1}`}></div>
          <div className={`absolute -bottom-24 -left-24 w-60 h-60 rounded-full mix-blend-screen filter blur-[70px] opacity-60 transition-colors duration-700 ${themeColors.glow2}`}></div>

          <div className="relative z-30 flex justify-between items-start mb-10">
            <div>
              <span className={`text-transparent bg-clip-text bg-gradient-to-r text-[11px] font-black tracking-[0.4em] uppercase ${themeColors.text}`}>Tarjeta Joven</span>
              <p className="text-white/50 text-[9px] font-mono mt-1.5 tracking-widest italic">{datosJoven.codigoUnicoQR}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
               <span className="bg-white/10 backdrop-blur-lg border border-white/20 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                 {esBlack ? "👑" : esOro ? "⭐" : "🔹"} {themeColors.badge}
               </span>
               <div className="w-10 h-6 bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-400 rounded-md shadow-inner border border-white/30 flex flex-col justify-center gap-0.5 px-1 opacity-90">
                 <div className="w-full h-px bg-black/20"></div>
                 <div className="w-full h-px bg-black/20"></div>
               </div>
            </div>
          </div>
          
          <div className="relative z-30 flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-tr animate-spin-slow blur-sm opacity-50 ${themeColors.text}`}></div>
                <img src={datosJoven.fotoPerfil} className={`relative w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-2xl ${themeColors.bg}`} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">{datosJoven.nombreCompleto}</h2>
                <div className="mt-1 flex flex-col">
                  <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">
                    Puntos de Nivel: <span className={`font-black text-sm ml-1 ${esBlack ? 'text-fuchsia-400' : esOro ? 'text-yellow-400' : 'text-cyan-400'}`}>{visitasActivas}</span>
                  </p>
                  <p className="text-white/30 text-[7px] uppercase mt-0.5">Últimos 90 días</p>
                </div>
              </div>
            </div>
            <div className="cursor-pointer bg-white p-2 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95 transition-transform flex-shrink-0" onClick={() => setQrAmpliado(true)}>
              <QRCodeCanvas value={datosJoven.codigoUnicoQR} size={55} />
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(150%); } }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}} />

      {/* BUSCADOR Y FILTROS */}
      <div className="max-w-md mx-auto px-6 mt-10">
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Buscar descuentos o lugares..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`w-full rounded-[2rem] px-7 py-5 text-sm font-medium outline-none transition-all focus:ring-4 focus:ring-violet-500/20 shadow-lg ${modoOscuro ? "bg-[#111625] border-transparent text-white placeholder-slate-600" : "bg-white border border-slate-100 text-slate-800 placeholder-slate-300"}`}
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
          {[
            { id: "promos", icon: "🎁", label: "Beneficios" },
            { id: "empleos", icon: "💼", label: "Empleos" },
            { id: "actividad", icon: "⚡", label: "Actividad" }
          ].map((tab) => {
            const activo = pestañaActiva === tab.id;
            return (
              <button key={tab.id} onClick={() => setPestañaActiva(tab.id)} className={`whitespace-nowrap px-7 py-3.5 rounded-full text-[12px] font-black uppercase tracking-widest transition-all duration-300 ${activo ? (modoOscuro ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50" : "bg-slate-950 text-white shadow-lg") : (modoOscuro ? "bg-[#111625] text-slate-400" : "bg-white text-slate-400 border border-slate-100")}`}>{tab.icon} {tab.label}</button>
            )
          })}
        </div>

        {pestañaActiva === "promos" && (
            <div className={`flex gap-2.5 py-4 border-t border-b mb-6 ${modoOscuro ? 'border-white/5' : 'border-slate-100'}`}>
                <button onClick={() => setFiltroTipoPromo("todos")} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${filtroTipoPromo === "todos" ? (modoOscuro ? "bg-white text-slate-950" : "bg-slate-100 text-slate-800") : "text-slate-500"}`}>🔥 Todos</button>
                <button onClick={() => setFiltroTipoPromo("Directa")} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${filtroTipoPromo === "Directa" ? "bg-emerald-500 text-white" : "text-slate-500"}`}>🏷️ Descuentos</button>
                <button onClick={() => setFiltroTipoPromo("Frecuente")} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${filtroTipoPromo === "Frecuente" ? "bg-fuchsia-600 text-white" : "text-slate-500"}`}>⭐ Lealtad</button>
            </div>
        )}

        <div className="space-y-6 mt-2">
          {cargandoDatos ? (
            <div className="flex flex-col items-center py-20"><div className="w-9 h-9 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div></div>
          ) : (
            filtrados.length === 0 && pestañaActiva !== "actividad" ? (
              <div className={`text-center py-20 rounded-[3rem] ${modoOscuro ? "bg-[#111625]" : "bg-white border border-slate-100"}`}><p className={`font-bold text-sm ${modoOscuro ? "text-slate-500" : "text-slate-400"}`}>Pronto habrá más oportunidades.</p></div>
            ) : (
              <>
                {pestañaActiva === "promos" && filtrados.map((p) => {
                  
                  const nivelPromo = p.nivelRequerido || "Clásica";
                  const promoNum = jerarquiaPromos[nivelPromo as keyof typeof jerarquiaPromos] || 1;
                  const bloqueada = promoNum > nivelUserNum;

                  if (bloqueada) {
                    return (
                      <div key={p.idFirebase} className={`relative rounded-[2.5rem] p-6 transition-all duration-300 overflow-hidden ${modoOscuro ? "bg-[#111625] border border-white/5" : "bg-white shadow-sm border border-slate-100"}`}>
                        <div className="filter blur-md opacity-40 pointer-events-none select-none">
                          <div className="flex gap-4 items-center mb-5">
                            <div className={`w-16 h-16 rounded-2xl ${modoOscuro ? "bg-slate-800" : "bg-slate-200"}`}></div>
                            <div className="flex-1 space-y-2">
                              <div className={`h-2 w-1/3 rounded ${modoOscuro ? "bg-slate-700" : "bg-slate-300"}`}></div>
                              <div className={`h-4 w-3/4 rounded ${modoOscuro ? "bg-slate-700" : "bg-slate-300"}`}></div>
                            </div>
                          </div>
                          <div className={`h-3 w-full rounded mb-2 ${modoOscuro ? "bg-slate-800" : "bg-slate-200"}`}></div>
                          <div className={`h-3 w-4/5 rounded ${modoOscuro ? "bg-slate-800" : "bg-slate-200"}`}></div>
                        </div>

                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-6 ${modoOscuro ? "bg-black/40" : "bg-white/40"} backdrop-blur-sm`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 shadow-2xl ${nivelPromo === "Black" ? "bg-[#050505] text-fuchsia-400 border border-white/10" : "bg-gradient-to-br from-yellow-500 to-yellow-700 text-white border border-yellow-300/30"}`}>🔒</div>
                          <h4 className={`text-xl font-black leading-tight drop-shadow-md ${modoOscuro ? "text-white" : "text-slate-900"}`}>Exclusivo Nivel {nivelPromo}</h4>
                          <p className={`text-[9px] font-black uppercase tracking-widest mt-2 drop-shadow-md ${modoOscuro ? "text-slate-300" : "text-slate-700"}`}>Acumula visitas para desbloquear</p>
                        </div>
                      </div>
                    );
                  }

                  const { actual, porcentaje } = obtenerProgreso(p.idFirebase, p.visitasMeta);
                  const esFrecuente = p.tipo === "Frecuente";
                  const esUnicoUso = p.usoUnico === true;
                  const yaCanjeado = esUnicoUso && miHistorial.some(v => v.idPromo === p.idFirebase);

                  return (
                    <div key={p.idFirebase} className={`rounded-[2.5rem] p-6 transition-all duration-300 ${modoOscuro ? "bg-[#111625] border border-white/5" : "bg-white shadow-lg border border-slate-50"} ${yaCanjeado ? "opacity-60 grayscale" : ""}`}>
                      <div className="flex gap-4 items-center mb-5">
                        <img src={p.logoNegocio || "https://via.placeholder.com/100"} className={`w-16 h-16 rounded-2xl object-cover ${modoOscuro ? "bg-[#080A12]" : "bg-slate-50"}`} />
                        <div className="flex-1">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${esFrecuente ? 'text-fuchsia-400' : 'text-emerald-500'}`}>{p.nombreNegocio}</p>
                          <h4 className={`text-xl font-black leading-tight ${modoOscuro ? "text-white" : "text-slate-900"}`}>{p.titulo}</h4>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                         {esUnicoUso && <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Válido 1 Vez</span>}
                         {p.diasValidos && p.diasValidos !== "Todos los días" && <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{p.diasValidos}</span>}
                      </div>

                      <p className={`text-sm font-medium leading-relaxed mb-5 ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>{p.descripcion}</p>
                      
                      {esFrecuente && (
                        <div className={`mb-6 p-5 rounded-2xl border ${modoOscuro ? "bg-[#080A12] border-white/5" : "bg-slate-50 border-slate-100"}`}>
                          <div className="flex justify-between items-end mb-2.5">
                             <p className={`text-[10px] font-black uppercase tracking-widest ${actual === p.visitasMeta ? "text-fuchsia-500 animate-pulse" : (modoOscuro ? "text-slate-500" : "text-slate-400")}`}>
                               {actual === p.visitasMeta ? "¡Premio listo para canjear! 🎁" : "Progreso de Lealtad"}
                             </p>
                             <p className={`text-sm font-black ${modoOscuro ? "text-white" : "text-slate-800"}`}>{actual} <span className={modoOscuro ? "text-slate-500" : "text-slate-400"}>/ {p.visitasMeta}</span></p>
                          </div>
                          <div className={`w-full h-3 rounded-full overflow-hidden ${modoOscuro ? "bg-[#111625]" : "bg-slate-200"}`}>
                             <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-1000" style={{ width: `${porcentaje}%` }}></div>
                          </div>
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between pt-5 border-t ${modoOscuro ? "border-white/5" : "border-slate-100"}`}>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion + ', Escuinapa, Sinaloa')}`} target="_blank" rel="noopener noreferrer" className={`text-[10px] font-bold flex items-center gap-1.5 hover:underline cursor-pointer ${modoOscuro ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}>
                           <span className="text-red-500 text-sm">📍</span> {p.direccion}
                        </a>

                        {yaCanjeado ? (
                          <span className="text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest bg-slate-200 text-slate-500">Canjeado ✔️</span>
                        ) : (
                          <button onClick={() => setQrAmpliado(true)} className={`text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest transition-all ${modoOscuro ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50" : "bg-slate-950 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"}`}>Usar Cupón</button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {pestañaActiva === "empleos" && filtrados.map((e) => {
                   const yaContactado = empleosContactados.includes(e.idFirebase);
                   return (
                     <div key={e.idFirebase} className={`rounded-[2.5rem] p-7 transition-all ${modoOscuro ? "bg-[#111625] border border-white/5" : "bg-white shadow-lg border border-slate-50"}`}>
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">{e.nombreNegocio}</p>
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${modoOscuro ? "bg-[#080A12] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{e.tipo}</span>
                        </div>
                        <h4 className={`text-2xl font-black tracking-tight leading-tight mb-4 ${modoOscuro ? "text-white" : "text-slate-900"}`}>{e.titulo}</h4>
                        
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.direccion + ', Escuinapa, Sinaloa')}`} target="_blank" rel="noopener noreferrer" className={`text-[10px] font-bold flex items-center gap-1.5 hover:underline cursor-pointer mb-5 ${modoOscuro ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}>
                           <span className="text-red-500 text-sm">📍</span> {e.direccion}
                        </a>

                        <p className={`font-black text-xl mt-1.5 mb-5 ${modoOscuro ? "text-emerald-400" : "text-emerald-600"}`}>{e.sueldo}</p>
                        <button onClick={() => abrirWhatsAppEmpleo(e)} className={`w-full font-black py-4.5 rounded-2xl text-[11px] uppercase tracking-widest transition-colors shadow-sm ${yaContactado ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200" : (modoOscuro ? "bg-[#080A12] hover:bg-black text-white" : "bg-slate-950 hover:bg-slate-800 text-white")}`}>
                          {yaContactado ? "✅ Ya contactado (WhatsApp)" : "💬 WhatsApp"}
                        </button>
                     </div>
                   );
                })}

                {pestañaActiva === "actividad" && (
                  <div className="space-y-4">
                    {miHistorial.length === 0 ? (
                      <p className={`text-center py-10 text-sm font-medium ${modoOscuro ? "text-slate-500" : "text-slate-400"}`}>Tu historial está vacío.</p>
                    ) : (
                      miHistorial.map((v) => (
                        <div key={v.idFirebase} className={`p-5 rounded-3xl flex items-center gap-5 ${modoOscuro ? "bg-[#111625] border border-white/5" : "bg-white shadow-sm border border-slate-100"}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${modoOscuro ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600"}`}>⚡</div>
                          <div className="flex-1">
                            <p className={`font-black text-lg leading-tight ${modoOscuro ? "text-white" : "text-slate-900"}`}>{v.nombreNegocio}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${modoOscuro ? "text-slate-400" : "text-slate-400"}`}>{v.nombrePromo}</p>
                          </div>
                          <p className={`text-[10px] font-black uppercase ${modoOscuro ? "text-slate-500" : "text-slate-300"}`}>{new Date(v.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>

      {modalNivel && modalNivel.mostrar && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex justify-center items-center p-6 animate-fade-in" onClick={() => setModalNivel(null)}>
          <div className={`p-8 rounded-[3rem] shadow-[0_0_60px_rgba(255,215,0,0.3)] relative w-full max-w-sm text-center transform transition-all animate-slide-up bg-gradient-to-b ${modalNivel.nivelNuevo === "VIP Black" ? "from-slate-900 to-black border-2 border-fuchsia-500/50" : "from-yellow-50 to-white border-2 border-yellow-400"}`} onClick={e => e.stopPropagation()}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl animate-bounce">
              {modalNivel.nivelNuevo === "VIP Black" ? "👑" : "⭐"}
            </div>
            <h2 className={`text-3xl font-black mt-6 mb-2 tracking-tighter ${modalNivel.nivelNuevo === "VIP Black" ? "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400" : "text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-700"}`}>
              ¡NUEVO ESTATUS!
            </h2>
            <p className={`text-sm font-bold mb-6 uppercase tracking-widest ${modalNivel.nivelNuevo === "VIP Black" ? "text-slate-400" : "text-slate-500"}`}>
              Has alcanzado el {modalNivel.nivelNuevo}
            </p>
            <div className={`p-5 rounded-2xl mb-6 ${modalNivel.nivelNuevo === "VIP Black" ? "bg-white/5 border border-white/10" : "bg-yellow-100/50 border border-yellow-200"}`}>
              <p className={`text-xs font-medium leading-relaxed ${modalNivel.nivelNuevo === "VIP Black" ? "text-slate-300" : "text-slate-600"}`}>
                ¡Felicidades, {datosJoven.nombreCompleto.split(" ")[0]}! Con tus <span className="font-black text-lg">{modalNivel.visitas}</span> visitas acabas de evolucionar tu tarjeta. 
                <br/><br/>
                Ahora tienes acceso a <span className="font-black">beneficios exclusivos</span> que están bloqueados para otros usuarios.
              </p>
            </div>
            <button onClick={() => setModalNivel(null)} className={`w-full font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest transition-all shadow-lg hover:scale-105 ${modalNivel.nivelNuevo === "VIP Black" ? "bg-fuchsia-600 hover:bg-fuchsia-500 text-white" : "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white"}`}>
              Reclamar mi Estatus
            </button>
          </div>
        </div>
      )}

      {modalAjustes && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-6 animate-fade-in" onClick={() => setModalAjustes(false)}>
          <div className={`p-8 rounded-[3rem] shadow-2xl relative w-full max-w-sm ${modoOscuro ? "bg-[#161B2C] border border-white/10" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalAjustes(false)} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${modoOscuro ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>✕</button>
            <h3 className={`text-xl font-black mb-2 tracking-tight ${modoOscuro ? "text-white" : "text-slate-900"}`}>Ajustes de Perfil</h3>
            <p className={`text-xs font-medium mb-6 ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>Aquí puedes personalizar tu seguridad.</p>
            <form onSubmit={actualizarContrasena} className="space-y-4">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${modoOscuro ? "text-violet-400" : "text-violet-600"}`}>Nueva Contraseña</label>
                <input type="password" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} placeholder="Mínimo 6 caracteres" className={`w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all ${modoOscuro ? "bg-[#080A12] text-white focus:ring-2 focus:ring-violet-500" : "bg-slate-50 text-slate-800 focus:ring-2 focus:ring-violet-500"}`} required minLength={6} />
              </div>
              <button type="submit" disabled={cambiandoPass} className={`w-full mt-4 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest transition-all ${cambiandoPass ? "bg-slate-400 text-white" : (modoOscuro ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg")}`}>
                {cambiandoPass ? "Guardando..." : "Actualizar Contraseña"}
              </button>
            </form>
          </div>
        </div>
      )}

      {qrAmpliado && (
        <div className="fixed inset-0 z-[100] bg-[#080A12]/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in" onClick={() => setQrAmpliado(false)}>
          <div className={`p-8 rounded-[3rem] shadow-2xl flex flex-col items-center relative w-full max-w-sm ${modoOscuro ? "bg-[#111625] border border-white/10" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-sm font-black mb-6 uppercase tracking-[0.2em] ${modoOscuro ? "text-white" : "text-slate-900"}`}>Escáner de Beneficio</h3>
            <div className="bg-white p-4 rounded-[2rem] shadow-[0_0_60px_rgba(124,58,237,0.25)] border-2 border-violet-100 mb-8">
              <QRCodeCanvas id="qr-joven" value={datosJoven.codigoUnicoQR} size={210} />
            </div>
            <div className="flex w-full gap-3">
              <button onClick={() => setQrAmpliado(false)} className={`flex-1 font-black py-4.5 rounded-2xl text-[10px] uppercase tracking-widest transition-colors ${modoOscuro ? "bg-[#080A12] text-slate-400" : "bg-slate-100 text-slate-500"}`}>Cerrar</button>
              <button onClick={descargarQR} className="flex-1 bg-violet-600 text-white font-black py-4.5 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-violet-500/30">Guardar QR</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}