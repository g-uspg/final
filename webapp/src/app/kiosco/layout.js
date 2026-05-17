"use client";
import { useEffect } from "react";

export default function KioscoLayout({ children }) {
  useEffect(() => {
    // Resetear estilos del body que aplica el root layout
    document.body.style.cssText = "margin:0;background:#0f1419;min-height:100vh;";
    document.body.className = "";

    // Cargar Font Awesome si no está ya cargado
    if (!document.getElementById("fa-kiosco")) {
      const link = document.createElement("link");
      link.id = "fa-kiosco";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
      document.head.appendChild(link);
    }

    return () => {
      document.body.style.cssText = "";
      document.body.className = "font-muli theme-blush";
    };
  }, []);

  return (
    <div style={{ margin: 0, background: "#0f1419", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      {children}
    </div>
  );
}
