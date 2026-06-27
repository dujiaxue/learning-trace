"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";

interface UploadButtonProps<T = Record<string, unknown>> {
  onUploaded: (paper: T) => void;
}

export function UploadButton<T = Record<string, unknown>>({ onUploaded }: UploadButtonProps<T>) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (file.type !== "application/pdf") {
      setError("只支持 PDF 文件");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("文件大小不能超过 50MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/papers", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "上传失败");
      }

      const data = await res.json();
      onUploaded(data.paper as T);
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败，请重试";
      setError(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            上传中...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            导入新论文
          </>
        )}
      </button>
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError(null)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
}
