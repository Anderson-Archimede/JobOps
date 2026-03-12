import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { LogIn, Mail, Lock, Loader2, Sparkles } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await login(email, password);
      // login helper in context already shows success toast
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Échec de la connexion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F3460] px-4 font-sans selection:bg-[#E94560]/30">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-[#1A1A2E]/80 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden">
        {/* Abstract background glow */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#E94560]/20 blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-[#16213E]/60 blur-[80px]" />

        <div className="text-center relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#E94560] to-[#FF4D6D] shadow-2xl shadow-[#E94560]/40 transform transition-transform hover:scale-105 duration-300">
            <LogIn className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white">Connexion</h2>
          <p className="mt-3 text-base text-gray-400 font-medium">
            Activez votre <span className="text-[#E94560] font-bold">Ironman Suit</span>
          </p>
        </div>

        <form className="mt-10 space-y-6 relative" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-5 w-5 text-gray-500 transition-colors group-focus-within:text-[#E94560]" />
              </div>
              <input
                type="email"
                required
                className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                placeholder="email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-5 w-5 text-gray-500 transition-colors group-focus-within:text-[#E94560]" />
              </div>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password"  className="text-sm font-semibold text-[#E94560] hover:text-[#FF4D6D] transition-colors flex items-center gap-1">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative flex w-full justify-center rounded-2xl bg-gradient-to-r from-[#E94560] to-[#C02425] px-6 py-4 text-base font-bold text-white shadow-2xl shadow-[#E94560]/30 transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94560] disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Se connecter <Sparkles className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        <div className="pt-6 relative">
          <div className="absolute inset-x-0 top-0 flex items-center justify-center">
            <div className="w-full border-t border-white/5" />
          </div>
          <p className="mt-8 text-center text-sm font-medium text-gray-400">
            Nouveau ici ?{" "}
            <Link to="/register" className="font-bold text-[#E94560] hover:text-[#FF4D6D] transition-colors underline-offset-4 hover:underline">
              Rejoindre la Légion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
