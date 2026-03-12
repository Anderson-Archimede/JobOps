import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSent(true);
    toast.success("Si un compte existe, un email a été envoyé.");
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F3460] px-4 font-sans selection:bg-[#E94560]/30">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-[#1A1A2E]/80 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden">
        {/* Abstract background glow */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#E94560]/20 blur-[80px]" />
        
        {!sent ? (
          <>
            <div className="text-center relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#E94560] to-[#FF4D6D] shadow-2xl shadow-[#E94560]/40 transform transition-transform hover:scale-105 duration-300">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-white">Mot de passe oublié</h2>
              <p className="mt-3 text-sm text-gray-400 font-medium leading-relaxed">
                Pas de panique ! Entrez votre email et nous vous enverrons un lien de réinitialisation.
              </p>
            </div>

            <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-gray-500 transition-colors group-focus-within:text-[#E94560]" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-2xl border-0 bg-[#16213E] py-4 pl-12 pr-4 text-white ring-1 ring-inset ring-white/10 transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] focus:bg-[#1A1A2E] sm:text-sm shadow-inner"
                  placeholder="votre.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full justify-center rounded-2xl bg-gradient-to-r from-[#E94560] to-[#C02425] px-6 py-4 text-base font-bold text-white shadow-2xl shadow-[#E94560]/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Envoyer le lien <Send className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-8 relative">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Email envoyé !</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Vérifiez votre boîte de réception (et vos spams) pour le lien de récupération.
            </p>
          </div>
        )}

        <div className="pt-6 relative text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
