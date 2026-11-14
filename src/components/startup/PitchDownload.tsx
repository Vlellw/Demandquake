import { useRef, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { savePitchPdf } from "@/lib/pitch-download";

export function PitchDownload({ name, total, children }: { name: string; total: number; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  async function prepare() {
    setOpen(true);
    setBusy(true);
    setBlob(null);
    setError(false);
    setProgress(0);
    const request = ++generation.current;
    try {
      // Wait for the off-screen static slides to mount, without changing the player.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const nodes = Array.from(container.current?.children ?? []).filter((node): node is HTMLElement => node instanceof HTMLElement);
      if (nodes.length !== total) throw new Error("Pitch slides unavailable");
      const { createPitchPdf } = await import("@/lib/pitch-download");
      const result = await createPitchPdf(nodes, name, (page) => { if (request === generation.current) setProgress(page); });
      if (request === generation.current) setBlob(result);
    } catch { if (request === generation.current) setError(true); }
    finally { if (request === generation.current) setBusy(false); }
  }

  return <>
    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-foreground/70" aria-label="Download pitch as PDF" title="Download pitch as PDF" onClick={() => void prepare()}>
      <Download />
    </Button>
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { generation.current++; setBusy(false); setBlob(null); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Download pitch</DialogTitle>
          <DialogDescription>{name} · {total} slides · PDF</DialogDescription>
        </DialogHeader>
        {busy ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Preparing slides {progress} / {total}</p>
          : error ? <><p role="alert" className="text-sm text-negative">Couldn’t prepare the PDF. Please try again.</p><Button variant="outline" onClick={() => void prepare()}>Try again</Button></>
          : <Button disabled={!blob} onClick={() => { if (blob) void savePitchPdf(blob, name).catch(() => setError(true)); }}><Download /> Save PDF</Button>}
      </DialogContent>
    </Dialog>
    {open && <div ref={container} aria-hidden="true" className="pitch-export-stage">{children}</div>}
  </>;
}