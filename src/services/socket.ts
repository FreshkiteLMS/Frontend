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
            // The server authorizes notification rooms from this token (read
            // fresh on every reconnect), never from a client-supplied id.
            auth: (cb) => cb({ token: currentToken() }),
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });
    }
    return socket;
}

function currentToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
}

/** Join the appropriate realtime room for the current user. */
export function joinUserRoom(opts: { userId?: string; role?: string }) {
    const s = getSocket();
    const join = () => {
        // The token proves who is asking; the server rejects any other room.
        const token = currentToken();
        if (opts.role === 'admin') {
            s.emit('join_admin_room', { token });
        } else if (opts.userId) {
            s.emit('join_student_room', { studentId: opts.userId, token });
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
