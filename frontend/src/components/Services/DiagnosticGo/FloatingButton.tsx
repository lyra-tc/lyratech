"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { HiOutlineClipboardCheck } from "react-icons/hi";
import DiagnosticGoModal from "./Modal";

export default function DiagnosticGoFloatingButton() {
  const t = useTranslations("diagnosticGo");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("floatingButtonLabel")}
        className="fixed bottom-24 right-5 z-50 rounded-full p-[2px] bg-gradient-to-br from-lyratech-purple via-[#7b88e8] to-lyratech-blue shadow-[0_0_15px_#5f66ae] transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lyratech-purple"
      >
        <div className="flex items-center justify-center rounded-full bg-black p-2">
          <HiOutlineClipboardCheck className="text-white" size={35} />
        </div>
      </button>

      {open && <DiagnosticGoModal onClose={() => setOpen(false)} />}
    </>
  );
}
