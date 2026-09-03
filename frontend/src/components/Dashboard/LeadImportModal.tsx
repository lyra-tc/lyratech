"use client";

import React, { useRef, useState } from "react";
import { HiOutlineX, HiOutlineDownload, HiOutlineUpload, HiOutlineDocumentText } from "react-icons/hi";
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

export default function LeadImportModal({ onClose, onImported }: LeadImportModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LeadImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEscapeKey(onClose, !importing);

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
    try {
      const res = await leadsApi.importLeads(files);
      setResult(res);
      onImported(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
    }
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
          <button onClick={() => !importing && onClose()} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {result ? (
            <div className="space-y-4">
              <p className="font-montserrat text-dark-blue text-sm">
                <span className="font-semibold text-lyratech-green">{result.inserted}</span> leads importados
                {result.skipped_count > 0 && (
                  <> · <span className="font-semibold text-red">{result.skipped_count}</span> omitidos</>
                )}
              </p>
              {result.skipped_count > 0 && result.report_xlsx_base64 && (
                <button
                  onClick={() => downloadBase64Xlsx(result.report_xlsx_base64!, "leads-no-importados.xlsx")}
                  className="inline-flex items-center gap-1.5 text-lyratech-purple font-montserrat font-semibold text-sm hover:underline"
                >
                  <HiOutlineDownload size={16} />
                  Descargar no importados
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Cerrar
              </button>
            </div>
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
                onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDragOver(true); }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false); }}
                onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragOver(false); addFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-lyratech-purple bg-lyratech-purple/5" : "border-black/15 hover:border-lyratech-purple/50"}`}
              >
                <HiOutlineUpload className="mx-auto text-dark-blue/30 mb-2" size={28} />
                <p className="font-montserrat text-dark-blue/60 text-sm">
                  Arrastra archivos <span className="font-semibold">.csv</span> o <span className="font-semibold">.xlsx</span> aquí, o haz clic para elegir
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={`${f.name}:${f.size}`} className="flex items-center gap-2 bg-beige/60 rounded-lg px-3 py-2">
                      <HiOutlineDocumentText className="text-dark-blue/40 flex-shrink-0" size={16} />
                      <span className="font-montserrat text-dark-blue text-sm truncate flex-1">{f.name}</span>
                      <span className="font-montserrat text-dark-blue/40 text-xs">{formatSize(f.size)}</span>
                      <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-red/10 text-red flex-shrink-0" title="Quitar">
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
                  disabled={importing}
                  className="flex-1 border border-black/15 text-dark-blue/70 hover:text-dark-blue font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!files.length || importing}
                  className="flex-1 flex items-center justify-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm shadow-button"
                >
                  <HiOutlineUpload size={16} />
                  {importing ? "Importando..." : "Importar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
