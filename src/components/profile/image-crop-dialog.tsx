"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Loader2, X, ZoomIn } from 'lucide-react';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = /^image\/(png|jpe?g|webp)$/i;

/** Check a picked file before cropping; returns an error message or null. */
export function validateImageFile(file: File): string | null {
    if (!TYPES.test(file.type)) return 'Choose a PNG, JPG or WEBP image';
    if (file.size > MAX_BYTES) return 'Images must be 8 MB or smaller';
    return null;
}

/**
 * Crop an image to a fixed aspect ratio: drag to position, slider to zoom.
 * Produces a JPEG `File` at `outputWidth` (height follows the aspect).
 */
export function ImageCropDialog({
    file,
    aspect,
    outputWidth,
    shape = 'rect',
    title,
    onCancel,
    onCropped,
}: {
    file: File;
    aspect: number;
    outputWidth: number;
    shape?: 'rect' | 'circle';
    title: string;
    onCancel: () => void;
    onCropped: (file: File) => Promise<void> | void;
}) {
    const [src, setSrc] = useState<string | null>(null);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

    // Frame size on screen.
    const frameW = Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 64 : 420);
    const frameH = frameW / aspect;

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        const image = new Image();
        image.onload = () => setImg(image);
        image.onerror = () => setError('This image could not be read');
        image.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Scale so the image always covers the frame.
    const base = img ? Math.max(frameW / img.width, frameH / img.height) : 1;
    const scale = base * zoom;
    const drawnW = img ? img.width * scale : 0;
    const drawnH = img ? img.height * scale : 0;
    const clamp = (o: { x: number; y: number }) => ({
        x: Math.min(0, Math.max(frameW - drawnW, o.x)),
        y: Math.min(0, Math.max(frameH - drawnH, o.y)),
    });

    useEffect(() => {
        if (!img) return;
        // Centre on load and whenever the zoom changes the bounds.
        setOffset((o) => clamp(o.x === 0 && o.y === 0 ? { x: (frameW - drawnW) / 2, y: (frameH - drawnH) / 2 } : o));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [img, zoom]);

    const onDown = (e: ReactPointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    };
    const onMove = (e: ReactPointerEvent) => {
        const d = drag.current;
        if (d) setOffset(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }));
    };

    const save = async () => {
        if (!img) return;
        setBusy(true);
        setError(null);
        try {
            const outH = Math.round(outputWidth / aspect);
            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas unavailable');
            const sx = -offset.x / scale;
            const sy = -offset.y / scale;
            ctx.drawImage(img, sx, sy, frameW / scale, frameH / scale, 0, 0, outputWidth, outH);
            const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
            if (!blob) throw new Error('Could not process the image');
            await onCropped(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        } catch (e) {
            setError((e as Error).message || 'Upload failed');
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onCancel} />
            <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onCancel} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Cancel">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div
                        className="relative mx-auto overflow-hidden bg-gray-100 dark:bg-gray-800 touch-none cursor-grab active:cursor-grabbing select-none"
                        style={{ width: frameW, height: frameH, borderRadius: shape === 'circle' ? '9999px' : 12 }}
                        onPointerDown={onDown}
                        onPointerMove={onMove}
                        onPointerUp={() => (drag.current = null)}
                        onPointerCancel={() => (drag.current = null)}
                    >
                        {!img && !error && <Loader2 className="absolute inset-0 m-auto w-6 h-6 animate-spin text-gray-400" />}
                        {src && img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={src}
                                alt=""
                                draggable={false}
                                className="absolute top-0 left-0 max-w-none pointer-events-none"
                                style={{ width: drawnW, height: drawnH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
                            />
                        )}
                    </div>
                    <label className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <ZoomIn className="w-4 h-4 shrink-0" />
                        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-blue-600" aria-label="Zoom" />
                    </label>
                    <p className="text-xs text-gray-400 text-center">Drag to position · use the slider to zoom</p>
                    {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancel
                    </button>
                    <button onClick={save} disabled={busy || !img} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
                    </button>
                </div>
            </div>
        </div>
    );
}
