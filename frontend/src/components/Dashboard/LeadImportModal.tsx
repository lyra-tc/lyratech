"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  HiOutlineX,
  HiOutlineDownload,
  HiOutlineUpload,
  HiOutlineDocumentText,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";
import { leadsApi, downloadLeadTemplate, downloadBase64Xlsx } from "@/lib/api";
import type { LeadImportResult } from "@/lib/api";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface LeadImportModalProps {
  onClose: () => void;
  onImported: (result: LeadImportResult) => void;
}

const ACCEPT = [".csv", ".xlsx"];

function isAccepted(file: File) {
  const n = file.name.toLowerCase();
  return ACCEPT.some((ext) => n.endsWith(ext));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function reportName(fileName: string) {
  return `no-importados-${fileName.replace(/\.(csv|xlsx)$/i, "")}.xlsx`;
}

type FileStatus = "pending" | "processing" | "done" | "failed";

interface FileProgress {
  file: File;
  status: FileStatus;
  startedAt?: number;
  result?: LeadImportResult;
  error?: string;
}

function sumResults(entries: FileProgress[]) {
  return {
    inserted: entries.reduce((n, p) => n + (p.result?.inserted ?? 0), 0),
    skipped_count: entries.reduce((n, p) => n + (p.result?.skipped_count ?? 0), 0),
  };
}

function ImportFileRow({ entry }: { entry: FileProgress }) {
  const { file, status, startedAt, result, error } = entry;
  return (
    <div className="flex items-start gap-2.5 bg-beige/60 rounded-lg px-3 py-2.5">
      <span className="flex-shrink-0 mt-0.5">
        {status === "done" ? (
          <HiCheckCircle className="text-lyratech-green" size={17} />
        ) : status === "failed" ? (
          <HiXCircle className="text-red" size={17} />
        ) : status === "processing" ? (
          <span className="block w-[15px] h-[15px] rounded-full border-2 border-lyratech-purple/30 border-t-lyratech-purple animate-spin motion-reduce:animate-none" />
        ) : (
          <HiOutlineDocumentText className="text-dark-blue/40" size={16} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-montserrat text-dark-blue text-sm truncate flex-1">
            {file.name}
          </span>
          {status === "pending" && (
            <span className="font-montserrat text-dark-blue/40 text-xs flex-shrink-0">
              {formatSize(file.size)}
            </span>
          )}
          {status === "processing" && startedAt !== undefined && (
            <span className="font-montserrat text-dark-blue/50 text-xs flex-shrink-0">
              Procesando…{" "}
              <span className="tabular-nums">{formatElapsed(Date.now() - startedAt)}</span>
            </span>
          )}
        </div>

        {status === "processing" && (
          <div className="relative h-1.5 bg-black/10 rounded-full overflow-hidden mt-1.5">
            <span className="absolute inset-y-0 left-0 h-full w-1/3 bg-lyratech-purple rounded-full animate-import-shimmer motion-reduce:animate-none" />
          </div>
        )}

        {status === "pending" && (
          <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">En espera</p>
        )}

        {status === "done" && result && (
          <p className="font-montserrat text-xs mt-0.5">
            <span className="text-lyratech-green font-semibold">{result.inserted}</span>
            <span className="text-dark-blue/50"> importados</span>
            {result.skipped_count > 0 && (
              <>
                <span className="text-dark-blue/40"> · </span>
                <span className="text-red font-semibold">{result.skipped_count}</span>
                <span className="text-dark-blue/50"> omitidos</span>
              </>
            )}
          </p>
        )}

        {status === "failed" && (
          <p className="font-montserrat text-red/90 text-xs mt-0.5">
            {error || "No se pudo procesar"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LeadImportModal({ onClose, onImported }: LeadImportModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<FileProgress[] | null>(null);
  // bumped every second by an interval during import so the per-file elapsed counters re-render
  const [, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEscapeKey(onClose, !importing);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    []
  );

  const completedCount = progress
    ? progress.filter((p) => p.status === "done" || p.status === "failed").length
    : 0;
  const anyProcessing = (progress ?? []).some((p) => p.status === "processing");
  const finished =
    !importing &&
    progress !== null &&
    progress.length > 0 &&
    completedCount === progress.length;
  const { inserted: insertedTotal, skipped_count: skippedTotal } = sumResults(
    progress ?? []
  );

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const rejected = list.filter((f) => !isAccepted(f));
    const accepted = list.filter(isAccepted);
    setError(rejected.length ? `Solo .csv o .xlsx: ${rejected.map((f) => f.name).join(", ")}` : "");
    setFiles((prev) => {
      const key = (f: File) => `${f.name}:${f.size}`;
      const seen = new Set(prev.map(key));
      return [...prev, ...accepted.filter((f) => !seen.has(key(f)))];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleTemplate() {
    setDownloadingTemplate(true);
    setError("");
    try {
      await downloadLeadTemplate();
    } catch {
      setError("No se pudo descargar la plantilla.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleImport() {
    if (!files.length) return;
    setImporting(true);
    setError("");

    const entries: FileProgress[] = files.map((file) => ({ file, status: "pending" }));
    setProgress(entries.slice());

    tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);

    for (let i = 0; i < entries.length; i++) {
      entries[i] = { ...entries[i], status: "processing", startedAt: Date.now() };
      setProgress(entries.slice());
      try {
        const res = await leadsApi.importLeadsOne(entries[i].file);
        entries[i] = { ...entries[i], status: "done", result: res };
      } catch (err: unknown) {
        entries[i] = {
          ...entries[i],
          status: "failed",
          error: err instanceof Error ? err.message : "Error al importar",
        };
      }
      setProgress(entries.slice());
    }

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setImporting(false);

    onImported({
      ...sumResults(entries),
      skipped: [],
      report_xlsx_base64: null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => !importing && onClose()}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">Importar leads</h2>
          <button
            onClick={() => !importing && onClose()}
            className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors"
          >
            <HiOutlineX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {finished ? (
            <div className="space-y-4">
              <p className="font-montserrat text-dark-blue text-sm">
                <span className="font-semibold text-lyratech-green">{insertedTotal}</span> leads importados
                {skippedTotal > 0 && (
                  <> · <span className="font-semibold text-red">{skippedTotal}</span> omitidos</>
                )}
              </p>

              {progress!.map((p) =>
                p.status === "done" &&
                p.result &&
                p.result.skipped_count > 0 &&
                p.result.report_xlsx_base64 ? (
                  <button
                    key={`rep-${p.file.name}:${p.file.size}`}
                    onClick={() =>
                      downloadBase64Xlsx(p.result!.report_xlsx_base64!, reportName(p.file.name))
                    }
                    className="flex items-center gap-1.5 text-lyratech-purple font-montserrat font-semibold text-sm hover:underline text-left"
                  >
                    <HiOutlineDownload size={16} className="flex-shrink-0" />
                    <span className="truncate">Descargar no importados — {p.file.name}</span>
                  </button>
                ) : null
              )}

              {progress!.some((p) => p.status === "failed") && (
                <div className="bg-red/10 border border-red/30 rounded-lg px-4 py-2.5 space-y-1">
                  {progress!
                    .filter((p) => p.status === "failed")
                    .map((p) => (
                      <p
                        key={`err-${p.file.name}:${p.file.size}`}
                        className="font-montserrat text-red text-xs"
                      >
                        {p.file.name}: {p.error}
                      </p>
                    ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Cerrar
              </button>
            </div>
          ) : progress ? (
            <>
              <div className="space-y-1.5">
                <p
                  role="status"
                  aria-live="polite"
                  className="font-montserrat text-dark-blue/70 text-sm"
                >
                  {completedCount >= progress.length
                    ? "Finalizando…"
                    : `Procesando archivo ${Math.min(completedCount + 1, progress.length)} de ${progress.length}`}
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={completedCount}
                  aria-valuemin={0}
                  aria-valuemax={progress.length}
                  className="h-2 bg-black/10 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-lyratech-purple rounded-full transition-all duration-300"
                    style={{
                      width: `${((completedCount + (anyProcessing ? 0.5 : 0)) / progress.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {progress.map((entry, i) => (
                  <ImportFileRow key={`${entry.file.name}:${entry.file.size}:${i}`} entry={entry} />
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  disabled
                  className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl text-sm opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 bg-lyratech-purple opacity-50 text-white font-montserrat font-semibold py-2.5 rounded-xl text-sm shadow-button"
                >
                  <HiOutlineUpload size={16} />
                  Importando…
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleTemplate}
                disabled={downloadingTemplate}
                className="inline-flex items-center gap-1.5 text-lyratech-purple font-montserrat font-semibold text-sm hover:underline disabled:opacity-50"
              >
                <HiOutlineDownload size={16} />
                {downloadingTemplate ? "Descargando..." : "Descargar plantilla"}
              </button>

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  dragDepth.current++;
                  setDragOver(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => {
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dragDepth.current = 0;
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-lyratech-purple bg-lyratech-purple/5"
                    : "border-black/15 hover:border-lyratech-purple/50"
                }`}
              >
                <HiOutlineUpload className="mx-auto text-dark-blue/30 mb-2" size={28} />
                <p className="font-montserrat text-dark-blue/60 text-sm">
                  Arrastra archivos <span className="font-semibold">.csv</span> o{" "}
                  <span className="font-semibold">.xlsx</span> aquí, o haz clic para elegir
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}:${f.size}`}
                      className="flex items-center gap-2 bg-beige/60 rounded-lg px-3 py-2"
                    >
                      <HiOutlineDocumentText className="text-dark-blue/40 flex-shrink-0" size={16} />
                      <span className="font-montserrat text-dark-blue text-sm truncate flex-1">
                        {f.name}
                      </span>
                      <span className="font-montserrat text-dark-blue/40 text-xs">
                        {formatSize(f.size)}
                      </span>
                      <button
                        onClick={() => removeFile(i)}
                        className="p-1 rounded hover:bg-red/10 text-red flex-shrink-0"
                        title="Quitar"
                      >
                        <HiOutlineX size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 border border-black/15 text-dark-blue/70 hover:text-dark-blue font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!files.length}
                  className="flex-1 flex items-center justify-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm shadow-button"
                >
                  <HiOutlineUpload size={16} />
                  Importar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
