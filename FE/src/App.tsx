import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GeoPrewarm from "./components/GeoPrewarm";
import { Loader2 } from "lucide-react";

const Landing = lazy(() => import("./pages/Landing.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AppLayout = lazy(() => import("./layouts/AppLayout.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const AirMap = lazy(() => import("./pages/AirMap.tsx"));
const SmartRoute = lazy(() => import("./pages/SmartRoute.tsx"));
const SOS = lazy(() => import("./pages/SOS.tsx"));
const MedicalQR = lazy(() => import("./pages/MedicalQR.tsx"));
const MedicalIDDemo = lazy(() => import("./pages/MedicalIDDemo.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Profile2 = Profile;
const DataTransparency = lazy(() => import("./pages/DataTransparency.tsx"));
const BehaviorInsights = lazy(() => import("./pages/BehaviorInsights.tsx"));
const CivicHotspots = lazy(() => import("./pages/CivicHotspots.tsx"));
const CommunityReport = lazy(() => import("./pages/CommunityReport.tsx"));
const MobilityHandoffPage = lazy(() => import("./pages/MobilityHandoffPage.tsx"));
const GovCameraAPI = lazy(() => import("./pages/GovCameraAPI.tsx"));
const PartnerData = lazy(() => import("./pages/PartnerData.tsx"));
const ExposureHistory = lazy(() => import("./pages/ExposureHistory.tsx"));
const HealthProfile = lazy(() => import("./pages/HealthProfile.tsx"));
const MedicalID = lazy(() => import("./pages/MedicalID.tsx"));
const Premium = lazy(() => import("./pages/Premium.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Dữ liệu cũ được coi là "fresh" trong 2 phút — không re-fetch khi chuyển tab,
       * mount component lần 2, hoặc window focus. Giảm ~60-70% HTTP request thừa.
       * Các query cần realtime hơn sẽ override staleTime = 0 tại chỗ dùng.
       */
      staleTime: 2 * 60 * 1000,      // 2 phút
      gcTime: 10 * 60 * 1000,        // giữ cache 10 phút sau khi không có subscriber
      retry: 2,                       // retry 2 lần khi lỗi network
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // exponential backoff
      refetchOnWindowFocus: false,    // không fetch lại khi focus window
      refetchOnReconnect: true,       // fetch lại khi reconnect mạng
    },
    mutations: {
      retry: 1,
    },
  },
});


const PageFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <div className="text-center">
      <p className="font-heading text-sm font-bold">AirWeave</p>
      <p className="text-xs text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminNodesManager = lazy(() => import("./pages/admin/AdminNodesManager.tsx"));
const AdminOrgsManager = lazy(() => import("./pages/admin/AdminOrgsManager.tsx"));
const OrgDashboard = lazy(() => import("./pages/OrgDashboard.tsx"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GeoPrewarm />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/qr/:token" element={<MedicalQR />} />
              <Route path="/medical-id-demo" element={<MedicalIDDemo />} />
              <Route path="/org-dashboard" element={<OrgDashboard />} />

              {/* IoT Admin Portal */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="nodes" element={<AdminNodesManager />} />
                <Route path="orgs" element={<AdminOrgsManager />} />
              </Route>

              {/* Protected app routes with sidebar */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<AirMap />} />
                <Route path="/smart-route" element={<SmartRoute />} />
                <Route path="/sos" element={<SOS />} />
                <Route path="/air-twin" element={<Navigate to="/sos" replace />} />
                <Route path="/profile" element={<Profile2 />} />
                <Route path="/data-transparency" element={<DataTransparency />} />
                <Route path="/behavior-insights" element={<BehaviorInsights />} />
                <Route path="/civic-hotspots" element={<CivicHotspots />} />
                <Route path="/community-report" element={<CommunityReport />} />
                <Route path="/mobility-handoff" element={<MobilityHandoffPage />} />
                <Route path="/gov-camera-api" element={<GovCameraAPI />} />
                <Route path="/partner-data" element={<PartnerData />} />
                <Route path="/exposure-history" element={<ExposureHistory />} />
                <Route path="/health-profile" element={<HealthProfile />} />
                <Route path="/medical-id" element={<MedicalID />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/overview" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);


export default App;
