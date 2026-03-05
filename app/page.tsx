"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Inicio() {
  const router = useRouter();
  const [revisando, setRevisando] = useState(true);

  useEffect(() => {
    // El "cadenero invisible" revisa las memorias
    const sesionJoven = localStorage.getItem("sesionJoven");
    const sesionNegocio = localStorage.getItem("sesionNegocio");

    if (sesionJoven) {
      router.push("/tarjeta"); // Pásale directo, es un joven
    } else if (sesionNegocio) {
      router.push("/portal-negocios"); // Pásale directo, es un negocio aliado
    } else {
      setRevisando(false); // No hay nadie logueado, mostramos los botones
    }
  }, [router]);

  // Pantalla de carga sutil
  if (revisando) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        {/* Usamos el naranja para la carga */}
        <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center relative overflow-hidden font-sans">
      
      {/* DECORACIÓN INSTITUCIONAL SUPERIOR (Línea delgada con tus colores) */}
      <div className="absolute top-0 left-0 w-full h-1.5 flex">
        <div className="w-1/3 h-full bg-[#702032]"></div> {/* Rojo Vino */}
        <div className="w-1/3 h-full bg-white"></div>     {/* Blanco */}
        <div className="w-1/3 h-full bg-[#F57C00]"></div> {/* Naranja Vibrante */}
      </div>
      
      {/* CONTENEDOR PRINCIPAL - Enfocado en el móvil */}
      <div className="z-10 w-full max-w-lg flex flex-col items-center px-6 pt-20 pb-12">
        
        {/* SECCIÓN DE LOGOS (Aquí está la magia, Fernando) */}
        <div className="mb-10 flex flex-col items-center gap-6 w-full">
          
          {/* Logo Principal (IMJU) - Más grande y central */}
          <div className="bg-white p-4 rounded-full shadow-2xl border border-slate-100 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            {/* INSTRUCCIÓN PARA FERNANDO:
                1. Guarda tu logo en la carpeta 'public' (ej. public/imju-oficial.png)
                2. Cambia el 'src' de abajo por '/imju-oficial.png'
            */}
            <img 
              src="/imju-oficial.png" //<-- CAMBIA ESTO
              alt="Logo IMJU Escuinapa" 
              className="w-28 h-28 object-contain"
            />
          </div>

          {/* Co-branding (Ayuntamiento) - Más sutil debajo */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <img 
              src="/escudo-escuinapa.png" //<-- CAMBIA ESTO TAMBIÉN
              alt="Escudo Escuinapa" 
              className="w-8 h-8 object-contain opacity-70"
            />
            <div className="border-l border-slate-200 h-6"></div>
            <div className="text-left">
              <h2 className="text-[9px] font-black tracking-widest text-[#702032] uppercase">H. Ayuntamiento de Escuinapa</h2>
              <p className="text-[11px] font-bold text-slate-600 uppercase">¡TIERRA DE OPORTUNIDADES!</p>
            </div>
          </div>
        </div>

        {/* TÍTULO Y BIENVENIDA */}
        <div className="text-center mb-12">
          {/* Usamos Rojo Vino para el título serio */}
          <h1 className="text-5xl font-black text-[#702032] tracking-tighter">
            Tarjeta <span className="text-[#F57C00]">Joven</span>
          </h1>
          {/* Línea decorativa naranja */}
          <div className="w-20 h-1.5 bg-[#F57C00] mx-auto mt-2 rounded-full"></div>
          
          <p className="text-slate-600 mt-6 text-base font-medium leading-relaxed px-2">
            Tu acceso exclusivo a descuentos, oportunidades de empleo y beneficios en todo el municipio.
          </p>
        </div>

        {/* BOTONES DE ACCESO (MODERNOS Y VISUALES) */}
        <div className="w-full space-y-5">
          
          {/* Botón Joven - Usamos Naranja (Juvenil/Acción) */}
          <Link href="/login" className="flex items-center gap-5 bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-orange-100 hover:border-orange-200 transition-all group overflow-hidden relative">
            {/* Destello de fondo al pasar el mouse */}
            <div className="absolute inset-0 bg-orange-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-10"></div>
            
            <div className="w-16 h-16 bg-orange-100 text-[#F57C00] rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
              🪪
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-800">Soy Joven</h3>
              <p className="text-xs text-slate-500 font-medium">Accede a tu tarjeta digital y beneficios.</p>
            </div>
            {/* Flecha naranja */}
            <span className="text-[#F57C00] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-2xl pr-2">→</span>
          </Link>

          {/* Botón Negocio - Usamos Rojo Vino (Formal/Aliado) */}
          <Link href="/login-negocio" className="flex items-center gap-5 bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-rose-50 hover:border-rose-100 transition-all group overflow-hidden relative">
            {/* Destello de fondo al pasar el mouse */}
            <div className="absolute inset-0 bg-rose-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-10"></div>

            <div className="w-16 h-16 bg-rose-100 text-[#702032] rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
              🏪
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-800">Soy Aliado</h3>
              <p className="text-xs text-slate-500 font-medium">Portal para comercios y empresas.</p>
            </div>
            {/* Flecha rojo vino */}
            <span className="text-[#702032] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-2xl pr-2">→</span>
          </Link>

        </div>

        {/* PIE DE PÁGINA INSTITUCIONAL */}
        <footer className="mt-20 text-center w-full border-t border-slate-100 pt-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Escuinapa de Hidalgo, Sinaloa</p>
          <div className="flex justify-center gap-2">
            <Link href="/panel-imju-2026" className="inline-block px-4 py-2 bg-[#702032] text-white rounded-full text-[9px] font-black transition-colors uppercase tracking-widest hover:bg-[#8e2d41]">
              Administración
            </Link>
            <a href="https://www.facebook.com/profile.php?id=61569425962267" target="_blank" className="inline-block px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black transition-colors uppercase tracking-widest hover:bg-slate-200">
              Facebook
            </a>
          </div>
        </footer>

      </div>

      {/* Detalle visual de fondo sutil */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-slate-100 to-transparent -z-20"></div>
    </main>
  );
}