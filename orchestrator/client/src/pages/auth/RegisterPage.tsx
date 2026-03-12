import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, User, Loader2 } from "lucide-react";

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Les mots de passe ne correspondent pas");
    }

    setSubmitting(true);
    try {
      await register({ email, password });
      toast.success("Compte créé avec succès ! Veuillez vous connecter.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Échec de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F3460] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#1A1A2E] p-8 shadow-2xl ring-1 ring-white/10">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E94560] shadow-lg shadow-[#E94560]/20">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">Créer un compte</h2>
          <p className="mt-2 text-sm text-gray-400">
            Rejoignez la révolution de la recherche d'emploi
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                required
                className="block w-full rounded-xl border-0 bg-[#16213E] py-3 pl-10 pr-3 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] sm:text-sm"
                placeholder="email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                className="block w-full rounded-xl border-0 bg-[#16213E] py-3 pl-10 pr-3 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                className="block w-full rounded-xl border-0 bg-[#16213E] py-3 pl-10 pr-3 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#E94560] sm:text-sm"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative flex w-full justify-center rounded-xl bg-[#E94560] px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-[#E94560]/20 hover:bg-[#E94560]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94560] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "S'inscrire"
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-gray-400">
          Déjà un compte ?{" "}
          <Link to="/login" className="font-semibold leading-6 text-[#E94560] hover:text-[#E94560]/80">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
