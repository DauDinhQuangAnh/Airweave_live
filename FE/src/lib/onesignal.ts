// Push notification là tính năng opt-in: chỉ chạy khi bạn cung cấp OneSignal
// App ID của riêng mình qua VITE_ONESIGNAL_APP_ID (App ID phải khớp domain đã
// đăng ký trong dashboard OneSignal). Bỏ trống => bỏ qua, không lỗi console.
const ONESIGNAL_APP_ID = (import.meta.env.VITE_ONESIGNAL_APP_ID as string) || '';

let initialized = false;
let initStarted = false;

export async function initOneSignal() {
  if (initialized || initStarted || typeof window === 'undefined') return;
  if (!ONESIGNAL_APP_ID) return; // chưa cấu hình push -> bỏ qua êm
  initStarted = true;
  
  try {
    // Load OneSignal SDK dynamically
    if (!(window as any).OneSignalDeferred) {
      (window as any).OneSignalDeferred = [];
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      });
      initialized = true;
    });
  } catch (err) {
    initStarted = false;
    console.error('OneSignal init error:', err);
  }
}

export function setOneSignalExternalId(userId: string) {
  if (typeof window === 'undefined') return;
  (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
    try {
      await OneSignal.login(userId);
    } catch (err) {
      console.error('OneSignal setExternalId error:', err);
    }
  });
}

export function addOneSignalTag(key: string, value: string) {
  if (typeof window === 'undefined') return;
  (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
    try {
      await OneSignal.User.addTag(key, value);
    } catch (err) {
      console.error('OneSignal addTag error:', err);
    }
  });
}
