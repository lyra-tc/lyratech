"use client";

import React, { useEffect, useRef, useState } from "react";
import { HiChevronDown } from "react-icons/hi";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  hasError?: boolean;
}

export default function Dropdown({ value, onChange, options, placeholder = "Seleccionar...", hasError }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat outline-none transition-all bg-white flex items-center justify-between text-left ${
          hasError
            ? "border-red bg-red/5 focus:border-red"
            : "border-black/15 focus:border-lyratech-purple"
        }`}
      >
        <span className={selected ? "text-dark-blue" : "text-dark-blue/40"}>
          {selected ? selected.label : placeholder}
        </span>
        <HiChevronDown
          className={`text-dark-blue/40 text-lg flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-black/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden max-h-60 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-montserrat transition-colors duration-150 ${
                value === o.value
                  ? "bg-lyratech-light-purple text-lyratech-purple font-semibold"
                  : "text-dark-blue/70 hover:bg-lyratech-light-purple/40 hover:text-lyratech-purple"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
