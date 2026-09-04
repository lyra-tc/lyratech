"use client";

import { useEffect, useState } from "react";
import { HiArrowUp } from "react-icons/hi";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      aria-label="Subir al inicio"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={handleClick}
      className={`fixed z-40 right-4 bottom-24 md:right-6 md:bottom-6 flex h-11 w-11 items-center justify-center rounded-full bg-lyratech-purple text-white shadow-lg transition-[opacity,transform,background-color] duration-200 hover:bg-button-light-purple hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyratech-purple focus-visible:ring-offset-2 motion-reduce:transition-none ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <HiArrowUp size={20} />
    </button>
  );
}
