import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

/**
 * Realtime socket singleton.
 *
 * The REST base URL includes the API path (…/api/v1); Socket.IO connects to the
 * server origin, so we strip the path. One shared connection is reused across
 * the app; callers join their role/identity room and subscribe to events.
 */
let socket: Socket | null = null;

function serverOrigin(): string {
    try {
        const url = new URL(env.API_URL);
        return `${url.protocol}//${url.host}`;
    } catch {
        return 'http://localhost:3000';
    }
}

export function getSocket(): Socket {
    if (!socket) {
        socket = io(serverOrigin(), {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });
    }
    return socket;
}

/** Join the appropriate realtime room for the current user. */
export function joinUserRoom(opts: { userId?: string; role?: string }) {
    const s = getSocket();
    const join = () => {
        if (opts.role === 'admin') {
            s.emit('join_admin_room');
        } else if (opts.userId) {
            s.emit('join_student_room', { studentId: opts.userId });
        }
    };
    if (s.connected) join();
    s.on('connect', join); // re-join automatically after reconnects
}

export function disconnectSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}
