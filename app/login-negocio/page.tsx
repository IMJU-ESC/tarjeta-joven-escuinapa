"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
// Ajusta la ruta de Firebase si te marca error (puede ser "../firebase" dependiendo de tu estructura)
import { db } from "../../firebase"; 
import Link from "next/link";

export default function LoginNegocio() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correo || !password) {
      alert("Por favor, ingresa el correo y contraseña de tu negocio.");
      return;
    }

    setCargando(true);

    try {
      // Buscamos en la colección exclusiva de "negocios"
      const q = query(collection(db, "negocios"), where("correo", "==", correo));
      const resultado = await getDocs(q);

      if (resultado.empty) {
        alert("No encontramos ningún negocio aliado con este correo.");
      } else {
        const datosDelNegocio = resultado.docs[0].data();
        const idFirebase = resultado.docs[0].id; 

        // Verificamos si la contraseña coincide con la que el IMJU le asignó
        if (password === datosDelNegocio.contrasena) {
          // Guardamos sus datos en la memoria "sesionNegocio" (separada de los jóvenes)
          localStorage.setItem("sesionNegocio", JSON.stringify({ idFirebase, ...datosDelNegocio }));
          
          // Lo mandamos a su portal de escáner
          router.push("/portal-negocios");
        } else {
          alert("Contraseña incorrecta. Verifica tus datos de acceso.");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al conectar con el servidor.");
    }

    setCargando(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-emerald-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-emerald-100">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
            🏪
          </div>
          <h2 className="text-3xl font-black text-emerald-800">Portal Negocios</h2>
          <p className="text-slate-500 mt-2 text-sm">Acceso exclusivo para Aliados IMJU</p>
        </div>
        
        <form onSubmit={iniciarSesion} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" 
              placeholder="negocio@correo.com" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" 
              placeholder="Tu contraseña asignada" 
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando} 
            className={`w-full text-white font-extrabold text-lg py-3 px-4 rounded-xl transition-all shadow-lg mt-4 ${cargando ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {cargando ? "Verificando acceso..." : "Entrar a mi Portal"}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4 flex flex-col">
          <p className="text-xs text-slate-400">¿Olvidaste tu contraseña? Contacta al IMJU Escuinapa para restablecerla.</p>
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-800 font-bold transition-colors">
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </main>
  );
}