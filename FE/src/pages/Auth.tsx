import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Home, Loader2, Lock, Mail, Wind, Zap, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

type OAuthProvider = 'google' | 'apple';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, onboardingCompleted, signIn, signUp, demoLogin, signInWithGoogle } =
    useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    if (onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (tab === 'login') {
        await signIn(email, password);
        toast.success('Đăng nhập thành công!');
      } else {
        await signUp(email, password, displayName);
        toast.success('Đăng ký thành công. Vui lòng kiểm tra email.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    if (provider !== 'google') {
      toast.info('Hiện chỉ hỗ trợ đăng nhập bằng Google.');
      return;
    }

    setSubmitting(true);
    // Chuyển hướng sang BE → Google → quay lại /auth/callback với token trong hash
    signInWithGoogle();
  };

  const handleDemo = async () => {
    setSubmitting(true);

    try {
      await demoLogin();
      toast.success('Đăng nhập demo thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Không thể đăng nhập demo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-y-auto relative">
      <div className="absolute top-3 left-3 z-30 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-9 gap-1.5 font-heading text-xs bg-background/80 backdrop-blur">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-9 gap-1.5 font-heading text-xs bg-background/80 backdrop-blur">
          <Home className="w-4 h-4" /> Trang chủ
        </Button>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative z-10 text-primary-foreground max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Wind className="w-7 h-7" />
            </div>
            <span className="font-heading text-3xl font-bold tracking-tight">AirWeave</span>
          </div>
          <h1 className="font-heading text-4xl font-extrabold leading-tight mb-4">
            Biến dữ liệu môi trường thành hành động
          </h1>
          <p className="text-lg opacity-80 font-body leading-relaxed">
            Theo dõi chất lượng không khí thời gian thực, nhận gợi ý cá nhân hóa và bảo vệ sức khỏe gia đình bạn mỗi ngày.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center p-6 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-4 justify-center">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Wind className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">AirWeave</span>
          </div>

          <div className="flex rounded-xl bg-muted p-1 mb-5">
            {(['login', 'signup'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                  tab === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {value === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-5">
            <Button type="button" variant="outline" className="w-full font-heading font-semibold gap-2 h-11" onClick={() => handleOAuth('google')} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />} Tiếp tục với Google
            </Button>
            <Button type="button" variant="outline" className="w-full font-heading font-semibold gap-2 h-11 opacity-60" disabled title="Đăng nhập Apple sẽ được bổ sung sau">
              <AppleIcon /> Apple (sắp ra mắt)
            </Button>
            <Button type="button" variant="outline" className="w-full font-heading font-semibold gap-2 h-11 opacity-60" disabled title="Đăng nhập Facebook sẽ được bổ sung sau">
              <span className="text-[#1877F2] font-black text-lg">f</span> Facebook (sắp ra mắt)
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">hoặc</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div className="relative animate-fade-in">
                <Input type="text" placeholder="Tên hiển thị" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-10" />
                <Wind className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            )}

            <div className="relative">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 pr-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" className="w-full font-heading font-semibold" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-body">hoặc</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full font-heading font-semibold gap-2 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            onClick={handleDemo}
            disabled={submitting}
          >
            <Zap className="w-4 h-4 text-primary" />
            Trải nghiệm nhanh (Demo)
          </Button>

          {/* Cổng đăng nhập Quản trị viên / Admin Entry Point */}
          <div className="mt-5 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-950/20 border border-amber-500/30 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-heading font-bold text-amber-400">
              <Shield className="w-4 h-4 text-amber-400 animate-pulse" />
              Bạn là Quản trị viên / Quản lý Trạm IoT?
            </div>
            <p className="text-[11px] text-muted-foreground">
              Truy cập Bảng điều khiển Quản trị IoT Nodes và Quản lý Tổ chức
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs font-heading font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 gap-1.5 shadow-sm"
              onClick={() => {
                setEmail('admin@airweave.vn');
                setPassword('admin');
                toast.info('Đã điền tài khoản Admin (admin/admin)! Bấm Đăng nhập để vào Portal.');
                navigate('/admin');
              }}
            >
              <Shield className="w-3.5 h-3.5" />
              Vào Bảng điều khiển Quản trị (Admin Portal) →
            </Button>
          </div>

          {loading && (
            <p className="text-[11px] text-muted-foreground text-center mt-2 font-body">
              Đang kiểm tra phiên đăng nhập của bạn...
            </p>
          )}
          <p className="text-[11px] text-muted-foreground text-center mt-2 font-body">
            Tự động đăng nhập với tài khoản demo, không cần đăng ký
          </p>

        </div>
      </div>
    </div>
  );
};

export default Auth;
