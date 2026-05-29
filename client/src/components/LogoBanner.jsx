import { useState, useEffect } from "react";

const logos = [
  {
    src: "/logos/gobierno_de_la_provincia.png",
    alt: "Gobierno de la Provincia de Córdoba",
  },
  {
    src: "/logos/ministerio_de_educacion.png",
    alt: "Ministerio de Educación de Córdoba",
  },
  {
    src: "/logos/unc.png",
    alt: "Universidad Nacional de Córdoba",
  },
];

const INTERVAL_MS = 4000;
const FADE_MS = 300;

export default function LogoBanner() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % logos.length);
        setVisible(true);
      }, FADE_MS);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "48px",
        backgroundColor: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        key={current}
        src={logos[current].src}
        alt={logos[current].alt}
        style={{
          maxHeight: "30px",
          maxWidth: "75%",
          objectFit: "contain",
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />

      
    </div>
  );
}
