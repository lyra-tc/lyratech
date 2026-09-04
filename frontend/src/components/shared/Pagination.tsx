"use client";

import React from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import Dropdown from "@/components/shared/Dropdown";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} / pág.` }));

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page * pageSize < total;

  return (
    <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
      <p className="font-montserrat text-dark-blue/60 text-sm">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-32">
          <Dropdown
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            options={PAGE_SIZE_OPTIONS}
          />
        </div>
        <button
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className="flex items-center gap-1 border border-black/15 rounded-lg px-3 py-1.5 text-sm font-montserrat text-dark-blue/70 disabled:opacity-40 hover:bg-beige transition-colors"
        >
          <HiChevronLeft size={15} /> Anterior
        </button>
        <button
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className="flex items-center gap-1 border border-black/15 rounded-lg px-3 py-1.5 text-sm font-montserrat text-dark-blue/70 disabled:opacity-40 hover:bg-beige transition-colors"
        >
          Siguiente <HiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
