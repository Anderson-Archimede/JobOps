import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, User, Loader2, Rocket } from "lucide-react";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Les mots de passe ne correspondent pas");
    }

    setSubmitting(true);
    try {
      await register(email, password, firstName, lastName);
      // register helper shows success toast
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Échec de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F3460] px-4 py-20 font-sans selection:bg-[#E94560]/30">
      <div className="w-full max-w-lg space-y-8 rounded-[40px] bg-[#1A1A2E]/80 p-12 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-2xl ring-1 ring-white/10 relative overflow-hidden">
        {/* Dynamic background elements */}
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-[#E94560]/15 blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-[#16213E]/50 blur-[100px]" />

        <div className="text-center relative">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-tr from-[#E94560] to-[#FF4D6D] shadow-2xl shadow-[#E94560]/40 transform transition-transform hover:rotate-3 duration-500">
            <UserPlus className="h-12 w-12 text-white" />
          </div>
          <h2 className="mt-10 text-4xl font-extrabold tracking-tight text-white leading-tight">Rejoignez l'aventure</h2>
          <p className="mt-4 text-lg text-gray-400 font-medium">
            Créez votre profil de <span className="text-[#E94560] font-bold italic">Super-Candidat</span>
          </p>
        </div>

        <form className="mt-12 space-y-7 relative" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group relative">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <User className="h-5 w-5 text-gray-500 group-focus-within:text-[#E94560] transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="group relative">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <User className="h-5 w-5 text-gray-500 group-focus-within:text-[#E94560] transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-[#E94560] transition-colors" />
            </div>
            <input
              type="email"
              required
              className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
              placeholder="votre.email@univers.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#E94560] transition-colors" />
              </div>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#E94560] transition-colors" />
              </div>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                placeholder="Confirmation"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative flex w-full justify-center rounded-[20px] bg-gradient-to-r from-[#E94560] to-[#C02425] px-6 py-5 text-lg font-bold text-white shadow-2xl shadow-[#E94560]/30 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <span className="flex items-center gap-3">
                Lancer ma carrière <Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </span>
            )}
          </button>
        </form>

        <div className="pt-8 relative text-center">
          <div className="absolute inset-x-0 top-0 flex items-center justify-center">
            <div className="w-full border-t border-white/5" />
          </div>
          <p className="mt-8 text-sm font-medium text-gray-400">
            Déjà membre de l'équipe ?{" "}
            <Link to="/login" className="font-bold text-[#E94560] hover:text-[#FF4D6D] transition-colors underline-offset-8 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
