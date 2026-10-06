"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

let lib: Promise<typeof import("pdfjs-dist")> | null = null;

function pdfjs() {
  if (!lib) {
    lib = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return lib;
}

export async function openPdf(blob: Blob): Promise<PDFDocumentProxy> {
  const { getDocument } = await pdfjs();
  const data = new Uint8Array(await blob.arrayBuffer());
  return getDocument({ data }).promise;
}

export async function countPdfPages(blob: Blob) {
  const doc = await openPdf(blob);
  const n = doc.numPages;
  await doc.loadingTask.destroy();
  return n;
}

/** Renders into a fresh canvas so overlapping renders (zoom changes) never share one. */
export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number, width: number) {
  const canvas = document.createElement("canvas");
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const dpr = window.devicePixelRatio || 1;
  const viewport = page.getViewport({ scale: (width / base.width) * dpr });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
  await page.render({ canvas, viewport }).promise;
  return canvas;
}
