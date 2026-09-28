"use client";

import React, { useRef } from "react";
import { HiOutlineUpload } from "react-icons/hi";

interface PortfolioFileFieldProps {
  kind: "image" | "video";
  accept: string;
  maxBytes: number;
  /** Local blob: URL of the selected file, or the saved file's URL. */
  previewUrl: string | null;
  fileName: string | null;
  helpText: string;
  hasError?: boolean;
  onSelect: (file: File) => void;
  onError: (message: string) => void;
}

// Some browsers/OSes report an empty `type` for certain files — fall back to
// the file extension in that case. The backend re-validates by magic bytes.
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
const VIDEO_EXTENSIONS = [".mp4", ".webm"];

export default function PortfolioFileField({
  kind,
  accept,
  maxBytes,
  previewUrl,
  fileName,
  helpText,
  hasError,
  onSelect,
  onError,
}: PortfolioFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const extensions = kind === "image" ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
  // The OS file picker filters by both MIME type and extension when both are
  // present, so a file with an empty/unknown MIME type (which the browser
  // itself can't predict) would otherwise be greyed out even though
  // handleFiles below would accept it via the extension fallback.
  const inputAccept = `${accept},${extensions.join(",")}`;

  // Quick client-side check for a friendly message; the backend re-validates by magic bytes.
  function handleFiles(files: FileList | null) {
    const selected = files?.[0];
    if (!selected) return;

    const acceptedMimeTypes = accept.split(",");
    const hasKnownType = selected.type !== "" && acceptedMimeTypes.includes(selected.type);
    const matchesExtension =
      selected.type === "" && extensions.some((ext) => selected.name.toLowerCase().endsWith(ext));

    if (!hasKnownType && !matchesExtension) {
      onError("Formato no permitido");
      return;
    }
    if (selected.size > maxBytes) {
      onError(`El archivo excede ${Math.round(maxBytes / (1024 * 1024))} MB`);
      return;
    }
    onSelect(selected);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-3 text-center ${
        hasError ? "border-red bg-red/5" : "border-black/15"
      }`}
    >
      {previewUrl &&
        (kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: previews can't go through next/image
          <img src={previewUrl} alt="Vista previa" className="h-20 max-w-[200px] object-contain" />
        ) : (
          <video src={previewUrl} controls preload="metadata" className="w-full max-h-48 rounded-lg bg-black" />
        ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 border border-black/15 text-dark-blue/70 hover:text-dark-blue hover:bg-beige font-montserrat font-semibold px-4 py-2 rounded-xl text-sm transition-all"
      >
        <HiOutlineUpload size={16} />
        {previewUrl ? "Reemplazar archivo" : "Seleccionar archivo"}
      </button>
      <p className="text-dark-blue/50 text-xs font-montserrat break-all">{fileName ?? helpText}</p>
      <input
        ref={inputRef}
        type="file"
        accept={inputAccept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
