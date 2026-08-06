import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { authApi, profilesApi, type AuthSession, type AuthUser } from '@/integrations/api';
import { tokenStore, onUnauthorized, ApiError } from '@/lib/api-client';
import { initOneSignal, setOneSignalExternalId } from '@/lib/onesignal';

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function fetchOnboardingStatus(): Promise<boolean> {
  try {
    const profile = await profilesApi.me();
    return profile?.onboarding_completed ?? false;
  } catch {
    return false;
  }
}

function fetchOnboardingStatusSafe(): Promise<boolean> {
  return withTimeout(fetchOnboardingStatus(), 6000, false);
}

async function initPushForUser(userId: string) {
  await initOneSignal();
  setOneSignalExternalId(userId);
}

function toAuthUser(me: Awaited<ReturnType<typeof authApi.me>>): AuthUser {
  return {
    id: me.id,
    email: me.email,
    provider: me.provider,
    display_name: me.profile?.display_name ?? null,
    avatar_url: me.profile?.avatar_url ?? null,
    onboarding_completed: me.profile?.onboarding_completed ?? false,
  };
}

let authState: AuthState = {
  user: null,
  session: null,
  loading: true,
  onboardingCompleted: null,
};

const listeners = new Set<() => void>();
let authInitialized = false;
let onboardingRequest: Promise<boolean> | null = null;

function emitAuthState() {
  listeners.forEach((listener) => listener());
}

function setAuthState(next: AuthState | ((prev: AuthState) => AuthState)) {
  authState = typeof next === 'function' ? next(authState) : next;
  emitAuthState();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return authState;
}

function clearAuthState() {
  setAuthState({ user: null, session: null, loading: false, onboardingCompleted: null });
}

async function syncOnboarding(userId: string) {
  onboardingRequest ??= fetchOnboardingStatusSafe().finally(() => {
    onboardingRequest = null;
  });

  const onboardingCompleted = await onboardingRequest;
  setAuthState((prev) => {
    if (prev.user?.id !== userId) return prev;
    if (prev.onboardingCompleted === onboardingCompleted && prev.loading === false) return prev;
    return { ...prev, onboardingCompleted, loading: false };
  });
}

/** Áp dụng phiên vừa nhận được (đăng nhập, đăng ký, OAuth callback). */
function applySession(session: AuthSession) {
  setAuthState({
    user: session.user,
    session,
    loading: false,
    onboardingCompleted: session.user.onboarding_completed,
  });
  void initPushForUser(session.user.id);
}

/**
 * Khôi phục phiên từ token trong localStorage.
 * Thay cho supabase.auth.getSession() + onAuthStateChange().
 */
function initAuthStore() {
  if (authInitialized) return;
  authInitialized = true;

  onUnauthorized(() => clearAuthState());

  if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
    setAuthState((prev) => ({ ...prev, loading: false }));
    return;
  }

  void (async () => {
    try {
      const user = toAuthUser(await authApi.me());
      setAuthState({
        user,
        session: null,
        loading: false,
        onboardingCompleted: user.onboarding_completed,
      });
      void initPushForUser(user.id);
    } catch (error) {
      // Token hết hạn hoặc bị thu hồi — coi như chưa đăng nhập
      if (error instanceof ApiError && error.status === 401) tokenStore.clear();
      clearAuthState();
    }
  })();
}

export function useAuth() {
  useEffect(() => {
    initAuthStore();
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const signIn = useCallback(async (email: string, password: string) => {
    applySession(await authApi.signIn(email, password));
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    applySession(await authApi.signUp(email, password, displayName));
  }, []);

  const signInWithGoogle = useCallback(() => {
    authApi.signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    clearAuthState();
    window.location.href = '/';
  }, []);

  /** Tài khoản demo — BE tự tạo và reset onboarding để luôn thấy lại phần cá nhân hoá. */
  const demoLogin = useCallback(async () => {
    const session = await authApi.demoLogin();
    setAuthState({
      user: session.user,
      session,
      loading: false,
      onboardingCompleted: false,
    });
    void initPushForUser(session.user.id);
  }, []);

  const refreshOnboarding = useCallback(async () => {
    if (!state.user) return;
    await syncOnboarding(state.user.id);
  }, [state.user]);

  return {
    ...state,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    demoLogin,
    refreshOnboarding,
  };
}

/** Dùng ở trang /auth/callback sau khi Google redirect về. */
export async function completeOAuthLogin(tokens: {
  access_token: string;
  refresh_token: string;
}) {
  tokenStore.set(tokens);
  const user = toAuthUser(await authApi.me());
  setAuthState({
    user,
    session: null,
    loading: false,
    onboardingCompleted: user.onboarding_completed,
  });
  void initPushForUser(user.id);
  return user;
}
