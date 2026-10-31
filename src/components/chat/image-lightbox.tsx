"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, ImageOff, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface LightboxImage {
    src: string;
    alt: string;
    fileName?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

/**
 * Full-screen image viewer. The image fills as much of the viewport as it can
 * without changing its aspect ratio; zoom with the buttons, mouse wheel,
 * double-click/tap or +/−, drag to pan when zoomed, arrows to move through
 * the message's images, Esc to close.
 */
export function ImageLightbox({ images, startIndex = 0, onClose }: { images: LightboxImage[]; startIndex?: number; onClose: () => void }) {
    const [index, setIndex] = useState(Math.min(Math.max(0, startIndex), images.length - 1));
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [dragging, setDragging] = useState(false);
    const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const image = images[index];
    const many = images.length > 1;

    const resetView = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };
    const go = useCallback((delta: number) => {
        if (!many) return;
        setIndex((i) => (i + delta + images.length) % images.length);
        setStatus('loading');
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, [many, images.length]);
    const zoomBy = (factor: number) => {
        setZoom((z) => {
            const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
            if (next === 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    };

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === '+' || e.key === '=') zoomBy(1.5);
            else if (e.key === '-') zoomBy(1 / 1.5);
            else if (e.key === '0') resetView();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [go, onClose]);

    const onPointerDown = (e: ReactPointerEvent) => {
        if (zoom <= 1) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        setDragging(true);
    };
    const onPointerMove = (e: ReactPointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
    };
    const onPointerUp = () => {
        dragRef.current = null;
        setDragging(false);
    };

    if (!image) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col select-none" role="dialog" aria-modal="true" aria-label="Image viewer">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 sm:px-4 h-14 shrink-0 text-white">
                <span className="text-sm truncate flex-1 min-w-0 opacity-80">
                    {image.fileName || image.alt}
                    {many && <span className="ml-2 opacity-60">{index + 1} / {images.length}</span>}
                </span>
                <button onClick={() => zoomBy(1 / 1.5)} disabled={zoom <= MIN_ZOOM} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Zoom out">
                    <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-xs w-10 text-center tabular-nums opacity-70">{Math.round(zoom * 100)}%</span>
                <button onClick={() => zoomBy(1.5)} disabled={zoom >= MAX_ZOOM} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Zoom in">
                    <ZoomIn className="w-5 h-5" />
                </button>
                <a href={image.src} download={image.fileName} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/10" aria-label="Download image">
                    <Download className="w-5 h-5" />
                </a>
                <button ref={closeRef} onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Close image viewer">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Stage */}
            <div
                className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
            >
                {status === 'loading' && <Loader2 className="absolute w-10 h-10 text-white/70 animate-spin" />}
                {status === 'error' ? (
                    <div className="flex flex-col items-center gap-2 text-white/70">
                        <ImageOff className="w-12 h-12" />
                        <p className="text-sm">This image could not be loaded.</p>
                    </div>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={image.src}
                        src={image.src}
                        alt={image.alt}
                        draggable={false}
                        onLoad={() => setStatus('ready')}
                        onError={() => setStatus('error')}
                        onDoubleClick={() => (zoom > 1 ? resetView() : setZoom(2.5))}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${status === 'ready' ? 'opacity-100' : 'opacity-0'} ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            transition: dragging ? 'none' : 'transform 150ms ease-out',
                            touchAction: zoom > 1 ? 'none' : 'auto',
                        }}
                    />
                )}

                {many && (
                    <>
                        <button onClick={() => go(-1)} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Previous image">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button onClick={() => go(1)} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Next image">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
