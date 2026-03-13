import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Star,
  Copy,
  Trash2,
  Download,
  History,
  CheckSquare,
  Square,
  AlertCircle,
  Plus,
  Search,
  X,
  Eye,
  Sparkles,
  Target,
  ChevronRight,
  Clock,
  Briefcase,
  Check,
} from "lucide-react";
import type { CV, CVVersion, CVStatsResponse } from "@shared/types/cv";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function CVManagerPage() {
  const navigate = useNavigate();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [stats, setStats] = useState<CVStatsResponse | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [versions, setVersions] = useState<CVVersion[]>([]);
  const [selectedCVs, setSelectedCVs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);

  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "7days" | "30days" | "90days">("all");

  const fetchCVs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (activeFilter === "active") params.append("active", "true");
      const response = await fetch(`/api/cvs?${params.toString()}`);
      if (!response.ok) throw new Error("Échec du chargement");
      setCvs(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, activeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch("/api/cvs/stats");
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  const fetchVersions = useCallback(async (cvId: string) => {
    try {
      const r = await fetch(`/api/cvs/${cvId}/versions`);
      if (r.ok) setVersions(await r.json());
    } catch {}
  }, []);

  useEffect(() => { fetchCVs(); fetchStats(); }, [fetchCVs, fetchStats]);

  const handleUpload = async (file: File, name: string, role: string) => {
    try {
      setIsUploading(true);
      setError("");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);
      if (role) fd.append("role", role);
      const r = await fetch("/api/cvs", { method: "POST", body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Upload échoué"); }
      await fetchCVs(); await fetchStats();
      setShowUploadModal(false);
      toast.success("CV uploadé avec succès");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetActive = async (cvId: string) => {
    try {
      const r = await fetch(`/api/cvs/${cvId}/set-active`, { method: "POST" });
      if (!r.ok) throw new Error("Échec");
      await fetchCVs(); await fetchStats();
      toast.success("CV défini comme actif");
    } catch (err: any) { setError(err.message); }
  };

  const handleDuplicate = async (cvId: string, newName: string, newRole?: string) => {
    try {
      const r = await fetch(`/api/cvs/${cvId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName, newRole }),
      });
      if (!r.ok) throw new Error("Échec");
      await fetchCVs(); await fetchStats();
      toast.success("CV dupliqué");
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (cvId: string) => {
    if (!confirm("Supprimer ce CV ?")) return;
    try {
      const r = await fetch(`/api/cvs/${cvId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Échec");
      await fetchCVs(); await fetchStats();
      if (selectedCV?.id === cvId) { setSelectedCV(null); setShowModal(false); }
      toast.success("CV supprimé");
    } catch (err: any) { setError(err.message); }
  };

  const handleBulkDelete = async () => {
    if (selectedCVs.size === 0) return;
    if (!confirm(`Supprimer ${selectedCVs.size} CV(s) ?`)) return;
    try {
      const r = await fetch("/api/cvs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedCVs) }),
      });
      if (!r.ok) throw new Error("Échec");
      await fetchCVs(); await fetchStats();
      setSelectedCVs(new Set());
      toast.success(`${selectedCVs.size} CV(s) supprimés`);
    } catch (err: any) { setError(err.message); }
  };

  const handleBulkExport = async () => {
    if (selectedCVs.size === 0) return;
    try {
      const r = await fetch("/api/cvs/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedCVs) }),
      });
      if (!r.ok) throw new Error("Échec export");
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cvs-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) { setError(err.message); }
  };

  const handleExtractSkills = async () => {
    setExtracting(true);
    try {
      const r = await fetch("/api/seeker/skills-dna/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error("Extraction échouée");
      const json = await r.json();
      const count = json?.data?.skills?.length ?? 0;
      toast.success(`${count} compétences extraites ! Voir Skills DNA`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedCV) return;
    try {
      const r = await fetch(`/api/cvs/${selectedCV.id}/restore/${versionId}`, { method: "POST" });
      if (!r.ok) throw new Error("Échec");
      await fetchCVs(); await fetchStats();
      if (selectedCV) {
        await fetchVersions(selectedCV.id);
        const cvR = await fetch(`/api/cvs/${selectedCV.id}`);
        if (cvR.ok) setSelectedCV(await cvR.json());
      }
      toast.success("Version restaurée");
    } catch (err: any) { setError(err.message); }
  };

  const toggleCVSelection = (cvId: string) => {
    const s = new Set(selectedCVs);
    s.has(cvId) ? s.delete(cvId) : s.add(cvId);
    setSelectedCVs(s);
  };

  const toggleSelectAll = () => {
    if (selectedCVs.size === filteredCVs.length) {
      setSelectedCVs(new Set());
    } else {
      setSelectedCVs(new Set(filteredCVs.map((cv) => cv.id)));
    }
  };

  const openDetailModal = async (cv: CV) => {
    setSelectedCV(cv);
    setShowModal(true);
    await fetchVersions(cv.id);
  };

  const filteredCVs = cvs.filter((cv) => {
    if (activeFilter === "active" && !cv.isActive) return false;
    if (activeFilter === "inactive" && cv.isActive) return false;
    if (roleFilter && cv.role !== roleFilter) return false;
    if (searchQuery && !cv.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (dateFilter !== "all") {
      const d = new Date(cv.updatedAt);
      const days = { "7days": 7, "30days": 30, "90days": 90 }[dateFilter];
      if (days && d < new Date(Date.now() - days * 86400000)) return false;
    }
    return true;
  });

  const uniqueRoles = Array.from(new Set(cvs.map((cv) => cv.role).filter(Boolean)));
  const visibleActiveCount = filteredCVs.filter((cv) => cv.isActive).length;
  const extractionReadyCount = filteredCVs.filter((cv) => cv.fileUrl || cv.resumeData).length;
  const versionedCount = filteredCVs.filter((cv) => cv.version > 1).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <div className="mx-auto max-w-7xl p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 shadow-sm ring-1 ring-blue-500/30">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">CV Manager</h1>
              <p className="text-xs text-muted-foreground">
                Bibliothèque de CVs · Versioning · Extraction IA
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExtractSkills}
              disabled={extracting || cvs.length === 0}
              className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 transition-all hover:bg-teal-500/20 disabled:opacity-50"
            >
              {extracting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {extracting ? "Extraction…" : "Extraire Skills DNA"}
            </button>
            <button
              onClick={() => navigate("/skills-dna")}
              className="flex items-center gap-1 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted/30 hover:text-foreground"
            >
              <Target className="h-4 w-4" />
              Skills DNA
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter un CV
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total CVs", value: stats.totalCVs, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/15" },
              { label: "CV actif", value: stats.activeCV ? 1 : 0, icon: Star, color: "text-emerald-400", bg: "bg-emerald-500/15" },
              { label: "Rôles", value: stats.byRole.length, icon: Briefcase, color: "text-violet-400", bg: "bg-violet-500/15" },
              { label: "Récents (7j)", value: stats.recentUploads, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/15" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Robustness / quick actions strip ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/25 via-card to-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <p className="text-sm font-semibold text-foreground">Centre de contrôle CV</p>
                </div>
                <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                  Sélection multiple, activation du CV principal, export ZIP, restauration de versions
                  et extraction sécurisée vers Skills DNA à partir de PDF ou JSON RxResume.
                </p>
              </div>
              <div className="grid min-w-[220px] grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <p className="text-lg font-bold text-blue-400">{filteredCVs.length}</p>
                  <p className="text-[11px] text-muted-foreground">Visibles</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <p className="text-lg font-bold text-emerald-400">{extractionReadyCount}</p>
                  <p className="text-[11px] text-muted-foreground">Extractibles</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <p className="text-lg font-bold text-violet-400">{versionedCount}</p>
                  <p className="text-[11px] text-muted-foreground">Versionnés</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Actions rapides</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleSelectAll}
                disabled={filteredCVs.length === 0}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                {selectedCVs.size === filteredCVs.length && filteredCVs.length > 0
                  ? "Tout désélectionner"
                  : "Tout sélectionner"}
              </button>
              <button
                onClick={() => setSelectedCVs(new Set())}
                disabled={selectedCVs.size === 0}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleBulkExport}
                disabled={selectedCVs.size === 0}
                className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
              >
                Export sélection
              </button>
              <button
                onClick={handleExtractSkills}
                disabled={extracting || extractionReadyCount === 0}
                className="rounded-lg bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/20 disabled:opacity-50"
              >
                Lancer extraction IA
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                {visibleActiveCount} CV actif
              </span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1">
                PDF / JSON supportés
              </span>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1">
                Historique des versions
              </span>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-card/80 py-2 pl-10 pr-8 text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {[
            { value: roleFilter, setter: setRoleFilter, options: [{ v: "", l: "Tous les rôles" }, ...uniqueRoles.map((r) => ({ v: r!, l: r! }))] },
            { value: activeFilter, setter: setActiveFilter as (v: string) => void, options: [{ v: "all", l: "Tous" }, { v: "active", l: "Actifs" }, { v: "inactive", l: "Inactifs" }] },
            { value: dateFilter, setter: setDateFilter as (v: string) => void, options: [{ v: "all", l: "Tout" }, { v: "7days", l: "7 jours" }, { v: "30days", l: "30 jours" }, { v: "90days", l: "90 jours" }] },
          ].map((f, i) => (
            <select
              key={i}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {f.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}

          {selectedCVs.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                {selectedCVs.size} sélectionné(s)
              </span>
              <button onClick={handleBulkExport} className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20">
                <Download className="h-3.5 w-3.5" /> Export ZIP
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-xs underline">Fermer</button>
          </div>
        )}

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border/40 bg-card/60 p-4">
                <div className="mb-3 h-36 rounded-lg bg-muted/30" />
                <div className="mb-2 h-4 w-3/4 rounded bg-muted/30" />
                <div className="h-3 w-1/2 rounded bg-muted/30" />
              </div>
            ))}
          </div>
        ) : filteredCVs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <FileText className="mb-4 h-14 w-14 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Aucun CV trouvé</p>
            <p className="mt-1 text-xs text-muted-foreground">Uploadez votre premier CV pour commencer</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Ajouter un CV
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCVs.map((cv) => (
              <CVCard
                key={cv.id}
                cv={cv}
                isSelected={selectedCVs.has(cv.id)}
                onSelect={() => toggleCVSelection(cv.id)}
                onSetActive={() => handleSetActive(cv.id)}
                onDuplicate={handleDuplicate}
                onDelete={() => handleDelete(cv.id)}
                onView={() => openDetailModal(cv)}
              />
            ))}
          </div>
        )}

        {showUploadModal && (
          <UploadModal onClose={() => setShowUploadModal(false)} onUpload={handleUpload} isUploading={isUploading} />
        )}
        {showModal && selectedCV && (
          <DetailModal
            cv={selectedCV}
            versions={versions}
            onClose={() => { setShowModal(false); setSelectedCV(null); setVersions([]); }}
            onDelete={() => handleDelete(selectedCV.id)}
            onRestore={handleRestoreVersion}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CV Card
   ═══════════════════════════════════════════════════════ */

interface CVCardProps {
  cv: CV;
  isSelected: boolean;
  onSelect: () => void;
  onSetActive: () => void;
  onDuplicate: (cvId: string, newName: string, newRole?: string) => void;
  onDelete: () => void;
  onView: () => void;
}

function CVCard({ cv, isSelected, onSelect, onSetActive, onDuplicate, onDelete, onView }: CVCardProps) {
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const hasPreview = Boolean(cv.fileUrl);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all hover:shadow-md ${
        cv.isActive
          ? "border-emerald-500/50 shadow-emerald-500/5"
          : isSelected
          ? "border-blue-500/50"
          : "border-border/60 hover:border-border"
      } bg-card`}
    >
      {/* Checkbox */}
      <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="absolute left-3 top-3 z-10">
        {isSelected ? (
          <CheckSquare className="h-5 w-5 text-blue-500" />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </button>

      {/* Active badge */}
      {cv.isActive && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 ring-1 ring-emerald-500/30">
          <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-400">Actif</span>
        </div>
      )}

      {/* Cover — click to open detail modal */}
      <button
        type="button"
        onClick={onView}
        className="relative block h-40 w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-all hover:brightness-110 focus:outline-none"
      >
        {hasPreview ? (
          <iframe
            src={`${cv.fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="pointer-events-none h-[300%] w-[300%] origin-top-left scale-[0.333] border-0"
            title={cv.name}
            tabIndex={-1}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_50%)]" />
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FileText className="h-10 w-10 text-blue-400/50" />
              <span className="text-xs text-slate-400">Aucun aperçu</span>
            </div>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300 backdrop-blur-sm">
            {hasPreview ? "PDF" : "CV"}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-white/70">
            <Eye className="h-3 w-3" /> Ouvrir
          </span>
        </div>
      </button>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate font-semibold text-foreground">{cv.name}</h3>
        {cv.role && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{cv.role}</p>
        )}
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="rounded bg-muted/30 px-1.5 py-0.5">v{cv.version}</span>
          <span>{formatDate(cv.updatedAt)}</span>
        </div>
        {cv.usageCount > 0 && (
          <p className="mt-1 text-[11px] text-blue-400">
            Utilisé dans {cv.usageCount} candidature{cv.usageCount > 1 ? "s" : ""}
          </p>
        )}

        {/* 3 action buttons only */}
        <div className="mt-3 flex items-center gap-1.5">
          {!cv.isActive ? (
            <button onClick={onSetActive} className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20">
              <Star className="h-3.5 w-3.5" /> Activer
            </button>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" /> CV principal
            </span>
          )}
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => { const n = prompt(`Dupliquer "${cv.name}" en :`, `${cv.name} (copie)`); if (n) onDuplicate(cv.id, n, cv.role || undefined); }}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground" title="Dupliquer"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400" title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Upload Modal
   ═══════════════════════════════════════════════════════ */

interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File, name: string, role: string) => Promise<void>;
  isUploading: boolean;
}

function UploadModal({ onClose, onUpload, isUploading }: UploadModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type === "application/json")) {
      setFile(f);
      if (!name) setName(f.name.replace(/\.(pdf|json)$/i, ""));
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!name) setName(f.name.replace(/\.(pdf|json)$/i, "")); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;
    await onUpload(file, name, role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Ajouter un CV</h2>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging ? "border-blue-500 bg-blue-500/5" : "border-border/60 hover:border-border"
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.json" onChange={handleFileSelect} className="hidden" />
            <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            {file ? (
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Glissez-déposez votre CV ici ou cliquez pour parcourir</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF ou JSON (RxResume) · Max 10 Mo</p>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nom du CV <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex : CV Data Analyst 2026"
              className="w-full rounded-lg border border-border/60 bg-muted/20 px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Rôle cible</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex : Data Analyst"
              className="w-full rounded-lg border border-border/60 bg-muted/20 px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isUploading} className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted/40 disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" disabled={!file || !name || isUploading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50">
              {isUploading ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Upload…</>
              ) : (
                <><Upload className="h-4 w-4" /> Uploader</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Detail Modal with PDF preview
   ═══════════════════════════════════════════════════════ */

interface DetailModalProps {
  cv: CV;
  versions: CVVersion[];
  onClose: () => void;
  onDelete: () => void;
  onRestore?: (versionId: string) => void;
}

function DetailModal({ cv, versions, onClose, onDelete, onRestore }: DetailModalProps) {
  const [tab, setTab] = useState<"preview" | "versions">("preview");
  const fmt = (d: Date) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{cv.name}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {cv.role && <span>{cv.role}</span>}
              <span className="rounded bg-muted/30 px-1.5 py-0.5">v{cv.version}</span>
              {cv.isActive && (
                <span className="flex items-center gap-0.5 text-emerald-400">
                  <Star className="h-3 w-3 fill-emerald-500" /> Actif
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border px-6">
          {(["preview", "versions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? "text-blue-400" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "preview" ? "Aperçu" : `Historique (${versions.length})`}
              {tab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t bg-blue-500" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "preview" ? (
            <div>
              {cv.fileUrl ? (
                <iframe src={cv.fileUrl} className="h-[550px] w-full rounded-lg bg-white" title="CV Preview" />
              ) : (
                <div className="flex h-[400px] flex-col items-center justify-center rounded-lg bg-muted/20">
                  <FileText className="mb-3 h-14 w-14 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Pas d'aperçu PDF disponible</p>
                  {cv.resumeData && <p className="mt-1 text-xs text-muted-foreground">Données JSON RxResume disponibles</p>}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Créé le", value: fmt(cv.createdAt) },
                  { label: "Mis à jour", value: fmt(cv.updatedAt) },
                  { label: "Candidatures", value: `${cv.usageCount}` },
                  { label: "Version", value: `v${cv.version}` },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border/50 bg-muted/15 p-3">
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Aucun historique de version</p>
                </div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="rounded-lg border border-border/50 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-foreground">Version {v.version}</h4>
                          {v.version === cv.version && (
                            <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-blue-500/20">Actuelle</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{fmt(v.createdAt)}</p>
                        {v.changesSummary && <p className="mt-1 text-xs text-foreground/80">{v.changesSummary}</p>}
                      </div>
                      <div className="flex gap-2">
                        {v.version !== cv.version && onRestore && (
                          <button onClick={() => { if (confirm(`Restaurer la version ${v.version} ?`)) onRestore(v.id); }} className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20">
                            <History className="h-3 w-3" /> Restaurer
                          </button>
                        )}
                        {v.fileUrl && (
                          <a href={v.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-muted/30 px-2.5 py-1 text-xs text-foreground hover:bg-muted/50">
                            <Download className="h-3 w-3" /> Télécharger
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button onClick={onDelete} className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20">
            <Trash2 className="h-4 w-4" /> Supprimer
          </button>
          <button onClick={onClose} className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted/30">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
