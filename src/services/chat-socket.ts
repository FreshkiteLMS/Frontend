import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

/**
 * Chat realtime namespace manager.
 *
 * Maintains one Socket.IO client per strict-auth namespace ('/chat',
 * '/presence', '/notification') against the API server origin. The REST base
 * URL includes the API path (…/api/v1); sockets connect to the bare origin.
 *
 * Auth: the JWT access token is passed via the handshake `auth.token`. When
 * the server middleware rejects with 'unauthorized', we retry exactly once
 * with a freshly read token (the axios layer may have refreshed it), then
 * give up silently until `reconnectWithFreshToken()` is called.
 */

type ChatNamespace = '/chat' | '/presence' | '/notification';

const sockets: Partial<Record<ChatNamespace, Socket>> = {};
const authRetried: Partial<Record<ChatNamespace, boolean>> = {};

function serverOrigin(): string {
    try {
        const url = new URL(env.API_URL);
        return `${url.protocol}//${url.host}`;
    } catch {
        return 'http://localhost:3000';
    }
}

function currentToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
}

function getNamespaceSocket(nsp: ChatNamespace): Socket {
    let socket = sockets[nsp];
    if (socket) return socket;

    socket = io(`${serverOrigin()}${nsp}`, {
        auth: { token: currentToken() },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        authRetried[nsp] = false;
    });

    socket.on('connect_error', (err: Error) => {
        // Server middleware rejections stop automatic reconnection; retry once
        // with a fresh token in case it was refreshed since the socket was built.
        if (err?.message === 'unauthorized' && !authRetried[nsp]) {
            authRetried[nsp] = true;
            const s = sockets[nsp];
            if (s) {
                (s.auth as { token?: string }).token = currentToken();
                s.connect();
            }
        }
    });

    sockets[nsp] = socket;
    return socket;
}

export function getChatNsp(): Socket {
    return getNamespaceSocket('/chat');
}

export function getPresenceNsp(): Socket {
    return getNamespaceSocket('/presence');
}

export function getNotificationNsp(): Socket {
    return getNamespaceSocket('/notification');
}

/** Tear down every chat namespace socket (call on logout). */
export function disconnectChatSockets(): void {
    (Object.keys(sockets) as ChatNamespace[]).forEach((nsp) => {
        const socket = sockets[nsp];
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }
        delete sockets[nsp];
        delete authRetried[nsp];
    });
}

/** Re-authenticate every live namespace socket after a token refresh. */
export function reconnectWithFreshToken(): void {
    const token = currentToken();
    (Object.keys(sockets) as ChatNamespace[]).forEach((nsp) => {
        const socket = sockets[nsp];
        if (!socket) return;
        (socket.auth as { token?: string }).token = token;
        authRetried[nsp] = false;
        socket.disconnect();
        socket.connect();
    });
}
