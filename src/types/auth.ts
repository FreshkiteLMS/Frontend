
export interface User {
    id: string;
    username: string;
    name: string;
    role: 'admin' | 'student';
    email: string;
    hasPurchasedCourses?: boolean;
}

export interface LoginResponse {
    success: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
}

export interface SignupPayload {
    username: string;
    name: string;
    email: string;
    password: string;
    role: 'student';
}
export interface SignupResponse {
    success: boolean;
    message?: string;
    error?: string;
}
