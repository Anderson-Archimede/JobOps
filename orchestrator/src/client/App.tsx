/**
 * Main App component.
 */

import { X } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "./components/Navbar";
import { ProgressBar } from "./components/ProgressBar";
import { Sidebar } from "./components/Sidebar";
import { BasicAuthPrompt } from "./components/BasicAuthPrompt";
import { OnboardingGate } from "./components/OnboardingGate";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { useDemoInfo } from "./hooks/useDemoInfo";
import { GmailOauthCallbackPage } from "./pages/GmailOauthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { AgentsPage } from "./pages/AgentsPage";
import { PromptStudioPage } from "./pages/PromptStudioPage";
import { AIInsightsPage } from "./pages/AIInsightsPage";
import { DatasetsPage } from "./pages/DatasetsPage";
import { CVManagerPage } from "./pages/CVManagerPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { LogsPage } from "./pages/LogsPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { InProgressBoardPage } from "./pages/InProgressBoardPage";
import { JobPage } from "./pages/JobPage";
import { OrchestratorPage } from "./pages/OrchestratorPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TracerLinksPage } from "./pages/TracerLinksPage";
import { TrackingInboxPage } from "./pages/TrackingInboxPage";
import { VisaSponsorsPage } from "./pages/VisaSponsorsPage";
import { SkillsDNAPage } from "./pages/SkillsDNAPage";
import { InterviewCoachPage } from "./pages/InterviewCoachPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { setupAxiosInterceptors, setAccessToken } from "./utils/axiosInterceptor";

/** Backwards-compatibility redirects: old URL paths -> new URL paths */
const REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/", to: "/dashboard" },
  { from: "/home", to: "/overview" },
  { from: "/ready", to: "/jobs/ready" },
  { from: "/ready/:jobId", to: "/jobs/ready/:jobId" },
  { from: "/discovered", to: "/jobs/discovered" },
  { from: "/discovered/:jobId", to: "/jobs/discovered/:jobId" },
  { from: "/applied", to: "/jobs/applied" },
  { from: "/applied/:jobId", to: "/jobs/applied/:jobId" },
  { from: "/in-progress", to: "/applications/in-progress" },
  { from: "/in-progress/:jobId", to: "/applications/in-progress" },
  { from: "/jobs/in_progress", to: "/applications/in-progress" },
  { from: "/jobs/in_progress/:jobId", to: "/applications/in-progress" },
  { from: "/all", to: "/jobs/all" },
  { from: "/all/:jobId", to: "/jobs/all/:jobId" },
];

const DEMO_WAITLIST_BANNER_DISMISSED_KEY = "jobops.demoWaitlistBannerDismissed";

function AppContent() {
  const location = useLocation();
  const nodeRef = useRef<HTMLDivElement>(null);
  const demoInfo = useDemoInfo();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [demoWaitlistBannerDismissed, setDemoWaitlistBannerDismissed] =
    useState(() => {
      try {
        return localStorage.getItem(DEMO_WAITLIST_BANNER_DISMISSED_KEY) === "1";
      } catch {
        return false;
      }
    });

  // Determine a stable key for transitions to avoid unnecessary unmounts when switching sub-tabs
  const pageKey = React.useMemo(() => {
    const firstSegment = location.pathname.split("/")[1] || "jobs";
    if (firstSegment === "jobs") {
      return "orchestrator";
    }
    return firstSegment;
  }, [location.pathname]);

  return (
    <>
      <ProgressBar />
      <OnboardingGate />
      <BasicAuthPrompt />
      {demoInfo?.demoMode && !demoWaitlistBannerDismissed && (
        <div className="sticky top-0 z-50 w-full border-b border-orange-400/60 bg-orange-500 px-4 py-2 text-xs text-orange-950 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
            <p className="flex-1 text-center font-medium">
              This is a read-only demo. Want JobOps without the Docker setup? ☁️{" "}
              Cloud version coming soon — join the waitlist at{" "}
              <a
                className="font-semibold underline underline-offset-2 hover:text-orange-900"
                href="https://try.jobops.app?utm_source=demo&utm_medium=banner&utm_campaign=waitlist"
                target="_blank"
                rel="noreferrer"
              >
                try.jobops.app
              </a>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full text-orange-950 hover:bg-orange-400/30 hover:text-orange-950"
              onClick={() => {
                setDemoWaitlistBannerDismissed(true);
                try {
                  localStorage.setItem(DEMO_WAITLIST_BANNER_DISMISSED_KEY, "1");
                } catch {
                  // Ignore storage errors in restricted browser contexts.
                }
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss demo waitlist banner</span>
            </Button>
          </div>
        </div>
      )}
      {demoInfo?.demoMode && (
        <div className="w-full border-b border-amber-400/50 bg-amber-500/20 px-4 py-2 text-center text-xs text-amber-100 backdrop-blur">
          Demo mode: integrations are simulated and data resets every{" "}
          {demoInfo.resetCadenceHours} hours.
        </div>
      )}
      <div className="flex h-screen flex-col">
        {/* Navbar */}
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden lg:ml-64">
            <SwitchTransition mode="out-in">
              <CSSTransition
                key={pageKey}
                nodeRef={nodeRef}
                timeout={100}
                classNames="page"
                unmountOnExit
              >
                <div ref={nodeRef} className="h-full overflow-y-auto">
                  <Routes location={location}>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                  {/* Backwards-compatibility redirects */}
                  {REDIRECTS.map(({ from, to }) => (
                    <Route
                      key={from}
                      path={from}
                      element={<Navigate to={to} replace />}
                    />
                  ))}

                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/skills-dna" element={<ProtectedRoute><SkillsDNAPage /></ProtectedRoute>} />
                  <Route path="/overview" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                  <Route path="/jobs/:tab" element={<ProtectedRoute><OrchestratorPage /></ProtectedRoute>} />
                  <Route path="/jobs/:tab/:jobId" element={<ProtectedRoute><OrchestratorPage /></ProtectedRoute>} />
                  <Route
                    path="/applications/in-progress"
                    element={<ProtectedRoute><InProgressBoardPage /></ProtectedRoute>}
                  />
                  <Route path="/tracking-inbox" element={<ProtectedRoute><TrackingInboxPage /></ProtectedRoute>} />

                  {/* INTELLIGENCE Group Routes */}
                  <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
                  <Route path="/prompt-studio" element={<ProtectedRoute><PromptStudioPage /></ProtectedRoute>} />
                  <Route path="/ai-insights" element={<ProtectedRoute><AIInsightsPage /></ProtectedRoute>} />

                  {/* DATA Group Routes */}
                  <Route path="/datasets" element={<ProtectedRoute><DatasetsPage /></ProtectedRoute>} />
                  <Route path="/cv-manager" element={<ProtectedRoute><CVManagerPage /></ProtectedRoute>} />
                  <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />

                  {/* OPS Group Routes */}
                  <Route path="/monitoring" element={<ProtectedRoute><MonitoringPage /></ProtectedRoute>} />
                  <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                  {/* Other Routes */}
                  <Route
                    path="/oauth/gmail/callback"
                    element={<ProtectedRoute><GmailOauthCallbackPage /></ProtectedRoute>}
                  />
                  <Route path="/interview-coach" element={<ProtectedRoute><InterviewCoachPage /></ProtectedRoute>} />
                  <Route path="/job/:id" element={<ProtectedRoute><JobPage /></ProtectedRoute>} />
                  <Route path="/tracer-links" element={<ProtectedRoute><TracerLinksPage /></ProtectedRoute>} />
                  <Route path="/visa-sponsors" element={<ProtectedRoute><VisaSponsorsPage /></ProtectedRoute>} />
                </Routes>
              </div>
            </CSSTransition>
          </SwitchTransition>
        </div>
      </div>
      </div>

      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}

export const App: React.FC = () => {
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
