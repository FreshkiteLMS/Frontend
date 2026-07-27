"use client";

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration, resolveFileUrl } from '@/lib/chat-utils';

interface AudioPlayerProps {
    src: string;
    durationHint?: number;
}

const SPEEDS = [1, 1.5, 2] as const;

/**
 * Compact inline audio player: play/pause, seek bar, elapsed/total time and a
 * playback-speed toggle. Uses a single <audio> element resolved via
 * resolveFileUrl (handles root-relative local uploads).
 */
export function AudioPlayer({ src, durationHint }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(durationHint && isFinite(durationHint) ? durationHint : 0);
    const [speedIndex, setSpeedIndex] = useState(0);

    const resolvedSrc = resolveFileUrl(src);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => setCurrentTime(audio.currentTime);
        const onLoaded = () => {
            if (isFinite(audio.duration)) setDuration(audio.duration);
        };
        const onEnd = () => {
            setPlaying(false);
            setCurrentTime(0);
        };
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('durationchange', onLoaded);
        audio.addEventListener('ended', onEnd);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('durationchange', onLoaded);
            audio.removeEventListener('ended', onEnd);
        };
    }, []);

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
    };

    const onSeek = (value: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = value;
        setCurrentTime(value);
    };

    const cycleSpeed = () => {
        const next = (speedIndex + 1) % SPEEDS.length;
        setSpeedIndex(next);
        if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
    };

    const progressMax = duration || durationHint || 0;

    return (
        <div className="flex items-center gap-2.5 min-w-[200px] max-w-[280px] w-full">
            <audio ref={audioRef} src={resolvedSrc} preload="metadata" />
            <button
                type="button"
                onClick={toggle}
                className="shrink-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                aria-label={playing ? 'Pause' : 'Play'}
            >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
                <input
                    type="range"
                    min={0}
                    max={progressMax || 1}
                    step={0.1}
                    value={Math.min(currentTime, progressMax || currentTime)}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="w-full h-1.5 accent-blue-600 cursor-pointer"
                    aria-label="Seek"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(progressMax)}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={cycleSpeed}
                className="shrink-0 px-2 py-1 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Playback speed"
            >
                {SPEEDS[speedIndex]}x
            </button>
        </div>
    );
}
