/** Browser-only: loaded when a founder requests a PDF. */
export async function createPitchPdf(slides: HTMLElement[], name: string, onProgress: (page: number) => void) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  await document.fonts.ready;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [800, 600], compress: true });
  pdf.setProperties({ title: `${name} — pitch`, subject: "AI-generated startup pitch", creator: "Demandquake" });
  for (const [index, slide] of slides.entries()) {
    if (index) pdf.addPage([800, 600], "landscape");
    const canvas = await html2canvas(slide, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 800, 600, undefined, "FAST");
    const bounds = slide.getBoundingClientRect();
    for (const anchor of slide.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      if (!/^https?:\/\//.test(anchor.href)) continue;
      const rect = anchor.getBoundingClientRect();
      pdf.link((rect.left - bounds.left) * 800 / bounds.width, (rect.top - bounds.top) * 600 / bounds.height,
        rect.width * 800 / bounds.width, rect.height * 600 / bounds.height, { url: anchor.href });
    }
    onProgress(index + 1);
    canvas.width = 0;
    canvas.height = 0;
  }
  return pdf.output("blob");
}

export async function savePitchPdf(blob: Blob, name: string) {
  const filename = `${name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "startup"}-pitch.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `${name} pitch` }); return; }
    catch (error) { if ((error as DOMException).name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}