"use client";

import React, { useState } from "react";
import { HiOutlineX } from "react-icons/hi";
import { PORTFOLIO_TECH_MAX_COUNT, PORTFOLIO_TECH_MAX_LENGTH } from "@/lib/portfolioConstants";

interface PortfolioTechInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  hasError?: boolean;
}

export default function PortfolioTechInput({ value, onChange, hasError }: PortfolioTechInputProps) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const full = value.length >= PORTFOLIO_TECH_MAX_COUNT;

  function commit() {
    const tech = draft.trim();
    if (!tech) return;
    if (value.some((t) => t.toLowerCase() === tech.toLowerCase())) {
      setHint("Esa tecnología ya está agregada");
      return;
    }
    onChange([...value, tech]);
    setDraft("");
    setHint("");
  }

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-2 border rounded-xl px-3 py-2 transition-all focus-within:border-lyratech-purple focus-within:ring-1 focus-within:ring-lyratech-purple ${
          hasError ? "border-red bg-red/5" : "border-black/15"
        }`}
      >
        {value.map((tech) => (
          <span
            key={tech}
            className="inline-flex items-center gap-1 font-montserrat text-xs text-dark-blue border border-black/15 rounded-full pl-3 pr-1.5 py-1"
          >
            {tech}
            <button
              type="button"
              aria-label={`Quitar ${tech}`}
              onClick={() => onChange(value.filter((t) => t !== tech))}
              className="p-0.5 rounded-full hover:bg-beige"
            >
              <HiOutlineX size={12} />
            </button>
          </span>
        ))}
        {!full && (
          <input
            type="text"
            value={draft}
            maxLength={PORTFOLIO_TECH_MAX_LENGTH}
            onChange={(e) => {
              setDraft(e.target.value.replace(/,/g, ""));
              setHint("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commit();
              } else if (e.key === "Backspace" && !draft && value.length > 0) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={commit}
            placeholder={value.length ? "" : "Ej. Next.js y presiona Enter"}
            className="flex-1 min-w-[140px] outline-none text-sm font-montserrat text-dark-blue py-1 bg-transparent"
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <p className="text-dark-blue/50 text-xs font-montserrat">
          {hint || (full ? "Llegaste al máximo de tecnologías" : "Enter o coma para agregar")}
        </p>
        <p className="text-dark-blue/50 text-xs font-montserrat">
          {value.length}/{PORTFOLIO_TECH_MAX_COUNT}
        </p>
      </div>
    </div>
  );
}
