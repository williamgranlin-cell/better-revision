import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2, Download } from "lucide-react";

interface DrawingCanvasProps {
  /** Called with a PNG dataURL when user wants to save/export the drawing. */
  onExport?: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

/**
 * Feuille blanche libre où l'utilisateur dessine son schéma au doigt / à la souris.
 * - Trait noir, gomme, effacer tout, télécharger en PNG.
 */
export function DrawingCanvas({ onExport, width = 900, height = 560 }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [size, setSize] = useState(3);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Init blanche
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = getPos(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = getPos(e);
    ctx.strokeStyle = tool === "pen" ? "#111111" : "#ffffff";
    ctx.lineWidth = tool === "pen" ? size : size * 6;
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clearAll = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const downloadPng = () => {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    if (onExport) onExport(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mon-schema.png";
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={tool === "pen" ? "default" : "outline"}
          size="sm"
          onClick={() => setTool("pen")}
        >
          <Pencil className="w-4 h-4 mr-1" /> Crayon
        </Button>
        <Button
          type="button"
          variant={tool === "eraser" ? "default" : "outline"}
          size="sm"
          onClick={() => setTool("eraser")}
        >
          <Eraser className="w-4 h-4 mr-1" /> Gomme
        </Button>
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">Épaisseur</span>
          <input
            type="range"
            min={1}
            max={12}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <div className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-1" /> Effacer
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadPng}>
          <Download className="w-4 h-4 mr-1" /> Télécharger
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="block w-full h-auto touch-none cursor-crosshair"
          style={{ aspectRatio: `${width}/${height}` }}
        />
      </div>
    </div>
  );
}
