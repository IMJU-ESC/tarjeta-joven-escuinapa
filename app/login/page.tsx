"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Link from "next/link";
import emailjs from '@emailjs/browser';

export default function LoginJoven() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  
  // Estados para la recuperación de contraseña
  const [modoRecuperacion, setModoRecuperacion] = useState(false);
  const [correoRecuperacion, setCorreoRecuperacion] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const router = useRouter();

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !password) { alert("Por favor, llena ambos campos."); return; }
    setCargando(true);

    try {
      const q = query(collection(db, "jovenes"), where("correo", "==", correo));
      const resultado = await getDocs(q);

      if (resultado.empty) {
        alert("No encontramos ningún joven registrado con este correo.");
      } else {
        const datosDelJoven = resultado.docs[0].data();
        const idFirebase = resultado.docs[0].id; 
        const passwordCorrecta = datosDelJoven.contrasena || datosDelJoven.codigoUnicoQR;

        if (password === passwordCorrecta) {
          localStorage.setItem("sesionJoven", JSON.stringify({ idFirebase, ...datosDelJoven }));
          router.push("/tarjeta");
        } else {
          alert("Contraseña incorrecta. Verifica tus datos.");
        }
      }
    } catch (error) {
      alert("Hubo un error al conectar con el servidor.");
    }
    setCargando(false);
  };

  const recuperarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correoRecuperacion) { alert("Ingresa tu correo para buscarte en el sistema."); return; }
    setEnviandoCorreo(true);

    try {
      const q = query(collection(db, "jovenes"), where("correo", "==", correoRecuperacion));
      const resultado = await getDocs(q);

      if (resultado.empty) {
        alert("No encontramos ninguna cuenta vinculada a ese correo. Verifica que esté bien escrito.");
      } else {
        const docId = resultado.docs[0].id;
        const datos = resultado.docs[0].data();

        // 1. Reseteamos su contraseña en Firebase (Vuelve a ser su QR)
        await updateDoc(doc(db, "jovenes", docId), {
          contrasena: datos.codigoUnicoQR
        });

        // 2. Disparamos el correo con la plantilla que creaste
        await emailjs.send(
          "service_dozo56w", 
          "template_2525h7v", 
          {
            nombre: datos.nombreCompleto.split(" ")[0], 
            correo: datos.correo,
            password: datos.codigoUnicoQR
          },
          { publicKey: "9JzdP1W3ubDAarkRt" } 
        );

        alert("¡Listo! Te hemos enviado un correo con las instrucciones para recuperar tu acceso.");
        setModoRecuperacion(false);
        setCorreoRecuperacion("");
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al intentar recuperar la cuenta.");
    }
    setEnviandoCorreo(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6 overflow-hidden relative">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-200 relative overflow-hidden min-h-[450px]">
        
        {/* VISTA 1: INICIO DE SESIÓN NORMAL */}
        <div className={`transition-all duration-500 absolute w-full left-0 px-8 ${modoRecuperacion ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"}`}>
          <div className="text-center mb-8 mt-2">
            <h2 className="text-3xl font-black text-indigo-700">Tarjeta Joven</h2>
            <p className="text-slate-500 mt-2 text-sm">Ingresa a tu portal personal</p>
          </div>
          
          <form onSubmit={iniciarSesion} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="tu@correo.com" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Tu contraseña o código IMJU" />
            </div>

            <button type="submit" disabled={cargando} className={`w-full text-white font-extrabold text-lg py-3 px-4 rounded-xl transition-all shadow-lg mt-4 ${cargando ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}>
              {cargando ? "Verificando..." : "Entrar a mi Tarjeta"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4 flex flex-col">
            <button onClick={() => setModoRecuperacion(true)} type="button" className="text-sm text-slate-500 hover:text-indigo-600 font-bold transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
            <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-700 font-medium transition-colors">← Volver al inicio</Link>
          </div>
        </div>

        {/* VISTA 2: RECUPERACIÓN DE CONTRASEÑA */}
        <div className={`transition-all duration-500 absolute w-full left-0 px-8 ${!modoRecuperacion ? "translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"}`}>
          <div className="text-center mb-6 mt-2">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔐</div>
            <h2 className="text-2xl font-black text-slate-800">Recuperar Acceso</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">Ingresa el correo con el que te registraste y te enviaremos las instrucciones.</p>
          </div>
          
          <form onSubmit={recuperarContrasena} className="space-y-5">
            <div>
              <input type="email" value={correoRecuperacion} onChange={(e) => setCorreoRecuperacion(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-center" placeholder="tu@correo.com" required />
            </div>

            <button type="submit" disabled={enviandoCorreo} className={`w-full text-white font-extrabold py-3 px-4 rounded-xl transition-all shadow-lg ${enviandoCorreo ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {enviandoCorreo ? "Buscando y enviando..." : "Enviar correo de rescate"}
            </button>
          </form>

          <div className="mt-6 text-center pb-4">
            <button onClick={() => setModoRecuperacion(false)} type="button" className="text-sm text-slate-500 hover:text-indigo-600 font-bold transition-colors">
              Cancelar y volver
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}