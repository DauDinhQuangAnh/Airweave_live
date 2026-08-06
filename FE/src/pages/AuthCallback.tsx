import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { completeOAuthLogin } from '@/hooks/use-auth';

/**
 * Đích redirect sau khi đăng nhập Google.
 * BE trả token qua hash fragment để không lọt vào server log hay header Referer.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      setError(params.get('error') ?? 'Không nhận được thông tin đăng nhập từ Google');
      return;
    }

    // Xoá token khỏi thanh địa chỉ ngay khi đọc xong
    window.history.replaceState(null, '', window.location.pathname);

    completeOAuthLogin({ access_token, refresh_token })
      .then((user) => {
        navigate(user.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Đăng nhập thất bại'));
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <div>
          <p className="font-heading font-bold">Đăng nhập không thành công</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <button
          onClick={() => navigate('/auth', { replace: true })}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Đang hoàn tất đăng nhập…</p>
    </div>
  );
}
