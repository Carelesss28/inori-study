"use client";

import { useEffect, useState } from "react";
import { loadFile } from "./files";

/**
 * Shrinks an uploaded picture so it stores and loads quickly.
 * PNG/WebP/GIF keep transparency (saved as PNG); photos become JPEG.
 */
export function shrinkImage(file: File, maxSide: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const keepAlpha = /png|webp|gif/i.test(file.type);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that picture."))), keepAlpha ? "image/png" : "image/jpeg", 0.88);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a picture we can read."));
    };
    img.src = url;
  });
}

/** Object URL for a picture saved in IndexedDB; `version` forces a reload after a re-upload. */
export function useStoredImage(id: string | null | undefined, version?: number) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let made: string | null = null;
    let cancelled = false;
    loadFile(id)
      .then((blob) => {
        if (cancelled || !blob) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [id, version]);
  return id ? url : null;
}
