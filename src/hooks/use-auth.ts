
import { useAuthContext } from '@/contexts/auth/auth-context';

export function useAuth() {
    return useAuthContext();
}
