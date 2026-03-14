import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Eye,
  FileCode,
  FlaskConical,
  Layers,
  Loader2,
  MessageSquare,
  Paintbrush,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Star,
  TestTube,
  Wand2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PageTab = "editor" | "templates" | "test" | "analytics" | "config";

interface PromptTemplate {
  id: string;
  name: string;
  category: "scoring" | "tailoring" | "email" | "chat" | "custom";
  description: string;
  prompt: string;
  variables: string[];
  isBuiltIn: boolean;
  lastModified?: string;
  version: number;
}

interface TestResult {
  id: string;
  templateId: string;
  input: string;
  output: string;
  tokens: number;
  latency: number;
  timestamp: string;
  status: "success" | "error";
}

interface SettingsData {
  model: { value: string; override: string | null };
  modelScorer: { value: string; override: string | null };
  modelTailoring: { value: string; override: string | null };
  modelProjectSelection: { value: string; override: string | null };
  scoringInstructions: { value: string; override: string | null };
  chatStyleTone: { value: string; override: string | null };
  chatStyleFormality: { value: string; override: string | null };
  chatStyleConstraints: { value: string; override: string | null };
  chatStyleDoNotUse: { value: string; override: string | null };
  llmProvider: { value: string | null; override: string | null };
  [key: string]: unknown;
}

const CATEGORIES = [
  { id: "scoring" as const, label: "Scoring", icon: Star, color: "text-amber-400" },
  { id: "tailoring" as const, label: "Tailoring", icon: Paintbrush, color: "text-blue-400" },
  { id: "email" as const, label: "Email", icon: MessageSquare, color: "text-emerald-400" },
  { id: "chat" as const, label: "Chat", icon: Wand2, color: "text-purple-400" },
  { id: "custom" as const, label: "Custom", icon: Code2, color: "text-[#E94560]" },
] as const;

const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: "scoring-default",
    name: "Scoring de compatibilité",
    category: "scoring",
    description: "Évalue la compatibilité d'un poste avec le profil du candidat (0-100)",
    prompt: `You are evaluating a job listing for a candidate. Score how suitable this job is for the candidate on a scale of 0-100.

SCORING CRITERIA:
- Skills match (technologies, frameworks, languages): 0-30 points
- Experience level match: 0-25 points
- Location/remote work alignment: 0-15 points
- Industry/domain fit: 0-15 points
- Career growth potential: 0-15 points

CANDIDATE PROFILE:
{{profile}}

JOB LISTING:
Title: {{title}}
Employer: {{employer}}
Location: {{location}}
Salary: {{salary}}

JOB DESCRIPTION:
{{jobDescription}}

SCORING INSTRUCTIONS:
{{scoringInstructions}}

REQUIRED FORMAT:
{"score": <integer 0-100>, "reason": "<1-2 sentence explanation>"}`,
    variables: ["profile", "title", "employer", "location", "salary", "jobDescription", "scoringInstructions"],
    isBuiltIn: true,
    version: 1,
  },
  {
    id: "tailoring-default",
    name: "Adaptation CV",
    category: "tailoring",
    description: "Génère un résumé, titre et compétences adaptés à l'offre d'emploi",
    prompt: `You are an expert resume writer tailoring a profile for a specific job application.
You must return a JSON object with three fields: "headline", "summary", and "skills".

JOB DESCRIPTION:
{{jobDescription}}

MY PROFILE:
{{profile}}

INSTRUCTIONS:
1. "headline" - Must match the Job Title from the JD exactly
2. "summary" - Mirror the company's requirements, keep it concise and confident
3. "skills" - Swap synonyms to match the JD keywords exactly

WRITING STYLE:
- Tone: {{tone}}
- Formality: {{formality}}
{{constraints}}

OUTPUT FORMAT (JSON):
{"headline": "...", "summary": "...", "skills": [...]}`,
    variables: ["jobDescription", "profile", "tone", "formality", "constraints"],
    isBuiltIn: true,
    version: 1,
  },
  {
    id: "email-cover",
    name: "Lettre de motivation",
    category: "email",
    description: "Rédige une lettre de motivation personnalisée pour une candidature",
    prompt: `Write a concise, professional cover letter for the following job application.

CANDIDATE PROFILE:
{{profile}}

JOB:
Title: {{title}}
Company: {{employer}}

JOB DESCRIPTION:
{{jobDescription}}

STYLE:
- Tone: {{tone}}
- Keep it under 300 words
- Highlight 2-3 most relevant experiences
- Show genuine interest in the company

OUTPUT: The cover letter text only.`,
    variables: ["profile", "title", "employer", "jobDescription", "tone"],
    isBuiltIn: true,
    version: 1,
  },
  {
    id: "chat-response",
    name: "Assistant Ghostwriter",
    category: "chat",
    description: "Prompt système pour le chatbot d'aide à la candidature",
    prompt: `You are an AI assistant helping a job seeker. Answer questions about the job listing, help craft responses, and provide interview preparation tips.

CONTEXT:
Job: {{title}} at {{employer}}
Description: {{jobDescription}}
Candidate Profile: {{profile}}

INSTRUCTIONS:
- Be helpful and specific
- Reference the actual job requirements
- Give actionable advice
- Keep responses concise`,
    variables: ["title", "employer", "jobDescription", "profile"],
    isBuiltIn: true,
    version: 1,
  },
];

export const PromptStudioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>("editor");
  const [templates, setTemplates] = useState<PromptTemplate[]>(BUILT_IN_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(BUILT_IN_TEMPLATES[0].id);
  const [editedPrompt, setEditedPrompt] = useState(BUILT_IN_TEMPLATES[0].prompt);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [testInput, setTestInput] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showVariables, setShowVariables] = useState(true);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? templates[0],
    [templates, selectedTemplateId],
  );

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch {
      toast.error("Impossible de charger les paramètres");
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const selectTemplate = useCallback(
    (id: string) => {
      if (hasChanges) {
        const ok = window.confirm("Vous avez des modifications non sauvegardées. Continuer ?");
        if (!ok) return;
      }
      setSelectedTemplateId(id);
      const tpl = templates.find((t) => t.id === id);
      if (tpl) {
        setEditedPrompt(tpl.prompt);
        setHasChanges(false);
      }
    },
    [templates, hasChanges],
  );

  const handlePromptChange = (value: string) => {
    setEditedPrompt(value);
    setHasChanges(value !== selectedTemplate.prompt);
  };

  const handleSave = useCallback(async () => {
    if (selectedTemplate.id === "scoring-default" && settings) {
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scoringInstructions: editedPrompt }),
        });
        toast.success("Instructions de scoring sauvegardées");
      } catch {
        toast.error("Erreur lors de la sauvegarde");
        return;
      }
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedTemplateId
          ? { ...t, prompt: editedPrompt, lastModified: new Date().toISOString(), version: t.version + 1 }
          : t,
      ),
    );
    setHasChanges(false);
    toast.success("Prompt sauvegardé");
  }, [selectedTemplate, editedPrompt, selectedTemplateId, settings]);

  const handleReset = useCallback(() => {
    const built = BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (built) {
      setEditedPrompt(built.prompt);
      setHasChanges(true);
      toast.info("Prompt réinitialisé à la version d'origine");
    }
  }, [selectedTemplateId]);

  const handleRunTest = useCallback(async () => {
    setIsRunningTest(true);
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    const latency = Date.now() - startTime;

    const mockOutput =
      selectedTemplate.category === "scoring"
        ? '{"score": 78, "reason": "Strong match on TypeScript and React skills. Experience level aligns well with mid-senior requirement."}'
        : selectedTemplate.category === "tailoring"
          ? '{"headline": "Senior Fullstack Developer", "summary": "Experienced developer with 5+ years in React and Node.js...", "skills": [{"name": "Frontend", "keywords": ["React", "TypeScript", "Next.js"]}]}'
          : "Bonjour,\n\nJe me permets de vous écrire au sujet du poste de développeur...";

    const result: TestResult = {
      id: `test-${Date.now()}`,
      templateId: selectedTemplateId,
      input: testInput || "(Données d'exemple)",
      output: mockOutput,
      tokens: Math.floor(200 + Math.random() * 800),
      latency,
      timestamp: new Date().toISOString(),
      status: "success",
    };
    setTestResults((prev) => [result, ...prev]);
    setIsRunningTest(false);
    toast.success(`Test terminé en ${latency}ms`);
  }, [selectedTemplate, selectedTemplateId, testInput]);

  const handleSaveSettings = useCallback(
    async (key: string, value: string) => {
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        await fetchSettings();
        toast.success("Paramètre sauvegardé");
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    },
    [fetchSettings],
  );

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (templateFilter !== "all") {
      list = list.filter((t) => t.category === templateFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, templateFilter, searchQuery]);

  const analyticsData = useMemo(() => {
    const totalTests = testResults.length;
    const successful = testResults.filter((r) => r.status === "success").length;
    const avgLatency =
      totalTests > 0
        ? Math.round(testResults.reduce((s, r) => s + r.latency, 0) / totalTests)
        : 0;
    const avgTokens =
      totalTests > 0
        ? Math.round(testResults.reduce((s, r) => s + r.tokens, 0) / totalTests)
        : 0;
    return { totalTests, successful, avgLatency, avgTokens };
  }, [testResults]);

  if (isLoadingSettings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#E94560]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E94560]/20 to-purple-500/10 border border-[#E94560]/20">
              <FileCode className="h-5 w-5 text-[#E94560]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Prompt Studio</h1>
              <p className="text-xs text-muted-foreground">
                Concevez, testez et optimisez vos prompts IA
              </p>
            </div>
            <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20">
              BETA
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                Non sauvegardé
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              <Save className="h-3 w-3" />
              Sauvegarder
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-[#E94560] hover:bg-[#D63B54] text-white"
              onClick={() => setActiveTab("test")}
            >
              <Play className="h-3 w-3" />
              Tester
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6 mt-4">
          {[
            { label: "Templates", value: templates.length, icon: Layers, color: "text-[#E94560]" },
            { label: "Built-in", value: templates.filter((t) => t.isBuiltIn).length, icon: BookOpen, color: "text-blue-400" },
            { label: "Tests", value: analyticsData.totalTests, icon: FlaskConical, color: "text-emerald-400" },
            { label: "Moy. latence", value: `${analyticsData.avgLatency}ms`, icon: Clock, color: "text-amber-400" },
            { label: "Moy. tokens", value: analyticsData.avgTokens, icon: Zap, color: "text-purple-400" },
            {
              label: "Modèle",
              value: settings?.model?.value
                ? settings.model.value.split("/").pop()?.substring(0, 16) ?? "—"
                : "—",
              icon: Sparkles,
              color: "text-cyan-400",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-center gap-2">
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              <div>
                <div className="text-sm font-bold tabular-nums">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
            {(
              [
                { id: "editor", label: "Éditeur", icon: Code2 },
                { id: "templates", label: "Templates", icon: Layers },
                { id: "test", label: "Test Lab", icon: FlaskConical },
                { id: "analytics", label: "Analytiques", icon: BarChart3 },
                { id: "config", label: "Configuration", icon: Settings2 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-[#E94560]/10 text-[#E94560] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ═══ EDITOR TAB ═══ */}
        {activeTab === "editor" && (
          <div className="flex h-full">
            {/* Sidebar - template list */}
            <div className="w-64 shrink-0 border-r border-border/50 bg-card/20 overflow-y-auto">
              <div className="p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 w-full rounded-md border border-border/40 bg-background pl-7 pr-2 text-[11px] placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  />
                </div>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger className="h-7 text-[11px] border-border/40 bg-background text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-2 pb-2 space-y-0.5">
                {filteredTemplates.map((tpl) => {
                  const cat = CATEGORIES.find((c) => c.id === tpl.category);
                  const CatIcon = cat?.icon ?? Code2;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => selectTemplate(tpl.id)}
                      className={cn(
                        "w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-all",
                        selectedTemplateId === tpl.id
                          ? "bg-[#E94560]/10 border border-[#E94560]/20"
                          : "hover:bg-muted/40 border border-transparent",
                      )}
                    >
                      <CatIcon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cat?.color)} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{tpl.name}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          {tpl.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-border/30 px-4 py-2 bg-muted/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{selectedTemplate.name}</span>
                  <Badge className="text-[9px] bg-muted/30 text-muted-foreground border border-border/50">
                    v{selectedTemplate.version}
                  </Badge>
                  {selectedTemplate.isBuiltIn && (
                    <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Built-in
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(editedPrompt);
                      toast.success("Prompt copié");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-3 w-3" />
                    Aperçu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => setShowVariables(!showVariables)}
                  >
                    <ChevronDown className={cn("h-3 w-3 transition-transform", !showVariables && "-rotate-90")} />
                    Variables
                  </Button>
                </div>
              </div>

              {/* Variables bar */}
              {showVariables && selectedTemplate.variables.length > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/20 bg-muted/5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground mr-1">Variables :</span>
                  {selectedTemplate.variables.map((v) => (
                    <Badge
                      key={v}
                      className="text-[9px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${v}}}`);
                        toast.success(`{{${v}}} copié`);
                      }}
                    >
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div className="flex-1 p-4">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="h-full w-full resize-none rounded-xl border border-border/40 bg-black/20 p-4 font-mono text-xs text-foreground/90 leading-relaxed placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E94560]/30 focus-visible:border-[#E94560]/30"
                  placeholder="Écrivez votre prompt ici..."
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ TEMPLATES TAB ═══ */}
        {activeTab === "templates" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#E94560]/80" />
                Bibliothèque de templates
              </h2>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-[#E94560] hover:bg-[#D63B54] text-white"
                onClick={() => {
                  const newTemplate: PromptTemplate = {
                    id: `custom-${Date.now()}`,
                    name: "Nouveau template",
                    category: "custom",
                    description: "Template personnalisé",
                    prompt: "Votre prompt ici...",
                    variables: [],
                    isBuiltIn: false,
                    lastModified: new Date().toISOString(),
                    version: 1,
                  };
                  setTemplates((prev) => [...prev, newTemplate]);
                  setSelectedTemplateId(newTemplate.id);
                  setEditedPrompt(newTemplate.prompt);
                  setActiveTab("editor");
                  toast.success("Template créé");
                }}
              >
                <Plus className="h-3 w-3" />
                Nouveau template
              </Button>
            </div>

            <div className="grid gap-4">
              {CATEGORIES.map((cat) => {
                const catTemplates = templates.filter((t) => t.category === cat.id);
                if (catTemplates.length === 0) return null;
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <CatIcon className={cn("h-3.5 w-3.5", cat.color)} />
                      {cat.label}
                      <span className="text-[10px] font-normal">({catTemplates.length})</span>
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {catTemplates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="group rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border/70 transition-all p-4 space-y-3 cursor-pointer"
                          onClick={() => {
                            selectTemplate(tpl.id);
                            setActiveTab("editor");
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-medium">{tpl.name}</h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                {tpl.description}
                              </p>
                            </div>
                            {tpl.isBuiltIn && (
                              <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                Intégré
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {tpl.variables.slice(0, 4).map((v) => (
                              <span key={v} className="text-[9px] font-mono text-purple-400/70 bg-purple-500/5 px-1.5 py-0.5 rounded">
                                {v}
                              </span>
                            ))}
                            {tpl.variables.length > 4 && (
                              <span className="text-[9px] text-muted-foreground">+{tpl.variables.length - 4}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>v{tpl.version}</span>
                            <span>{tpl.prompt.length} caractères</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TEST LAB TAB ═══ */}
        {activeTab === "test" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-emerald-400" />
                Test Lab
              </h2>
              <div className="flex items-center gap-2">
                <Select value={selectedTemplateId} onValueChange={selectTemplate}>
                  <SelectTrigger className="h-8 w-[200px] text-xs bg-background text-foreground border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground border-border">
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Input */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Données d'entrée
                </h3>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="h-48 w-full resize-none rounded-xl border border-border/40 bg-black/20 p-4 font-mono text-xs text-foreground/90 placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/30"
                  placeholder={`Collez ici un exemple de description de poste pour tester le prompt "${selectedTemplate.name}"...`}
                />
                <Button
                  onClick={handleRunTest}
                  disabled={isRunningTest}
                  className="w-full h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isRunningTest ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Exécution en cours...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      Lancer le test
                    </>
                  )}
                </Button>
              </div>

              {/* Output */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Résultat
                </h3>
                {testResults.length === 0 ? (
                  <div className="h-48 rounded-xl border border-dashed border-border/40 flex flex-col items-center justify-center text-muted-foreground">
                    <TestTube className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-xs">Lancez un test pour voir les résultats</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testResults.slice(0, 3).map((result) => (
                      <div
                        key={result.id}
                        className={cn(
                          "rounded-xl border p-4 space-y-2",
                          result.status === "success"
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-red-500/20 bg-red-500/5",
                        )}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-2">
                            {result.status === "success" ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-red-400" />
                            )}
                            <span className="text-muted-foreground">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="tabular-nums">{result.latency}ms</span>
                            <span className="tabular-nums">{result.tokens} tokens</span>
                          </div>
                        </div>
                        <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                          {result.output}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === "analytics" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#E94560]/80" />
              Analytiques des prompts
            </h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Tests effectués",
                  value: analyticsData.totalTests,
                  gradient: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
                  icon: FlaskConical,
                  iconColor: "text-blue-400",
                },
                {
                  label: "Taux de succès",
                  value:
                    analyticsData.totalTests > 0
                      ? `${((analyticsData.successful / analyticsData.totalTests) * 100).toFixed(0)}%`
                      : "—",
                  gradient: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
                  icon: Check,
                  iconColor: "text-emerald-400",
                },
                {
                  label: "Latence moy.",
                  value: `${analyticsData.avgLatency}ms`,
                  gradient: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
                  icon: Clock,
                  iconColor: "text-amber-400",
                },
                {
                  label: "Tokens moy.",
                  value: analyticsData.avgTokens,
                  gradient: "from-purple-500/20 to-purple-600/5 border-purple-500/20",
                  icon: Zap,
                  iconColor: "text-purple-400",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={cn("rounded-xl border bg-gradient-to-br p-4 space-y-2", card.gradient)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {card.label}
                    </span>
                    <card.icon className={cn("h-4 w-4", card.iconColor)} />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                </div>
              ))}
            </div>

            {/* Per-template stats */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Utilisation par template</h3>
              <div className="space-y-3">
                {templates.map((tpl) => {
                  const tplTests = testResults.filter((r) => r.templateId === tpl.id);
                  const count = tplTests.length;
                  const maxTests = Math.max(...templates.map((t) => testResults.filter((r) => r.templateId === t.id).length), 1);
                  const pct = (count / maxTests) * 100;
                  const cat = CATEGORIES.find((c) => c.id === tpl.category);

                  return (
                    <div key={tpl.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", cat?.color ? cat.color.replace("text-", "bg-") : "bg-gray-400")} />
                          <span className="font-medium">{tpl.name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">{count} tests</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#E94560] transition-all duration-500"
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test history */}
            {testResults.length > 0 && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Heure</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Template</th>
                        <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Statut</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Latence</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.map((result) => {
                        const tpl = templates.find((t) => t.id === result.templateId);
                        return (
                          <tr key={result.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2 text-muted-foreground tabular-nums">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-3 py-2 font-medium">{tpl?.name ?? "—"}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                className={cn(
                                  "text-[9px] border",
                                  result.status === "success"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20",
                                )}
                              >
                                {result.status === "success" ? "Succès" : "Erreur"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{result.latency}ms</td>
                            <td className="px-4 py-2 text-right tabular-nums">{result.tokens}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {testResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BarChart3 className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">Aucune donnée</p>
                <p className="text-xs mt-1">Lancez des tests pour voir les analytiques</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ CONFIG TAB ═══ */}
        {activeTab === "config" && (
          <div className="p-6 space-y-6 max-w-3xl">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#E94560]/80" />
              Configuration IA
            </h2>

            {/* Model settings */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Modèles LLM
              </h3>

              {[
                { key: "model", label: "Modèle principal", desc: "Modèle par défaut pour toutes les tâches IA" },
                { key: "modelScorer", label: "Modèle Scoring", desc: "Spécifique à l'évaluation des offres" },
                { key: "modelTailoring", label: "Modèle Tailoring", desc: "Spécifique à l'adaptation des CV" },
                { key: "modelProjectSelection", label: "Modèle Projects", desc: "Spécifique à la sélection de projets" },
              ].map((item) => {
                const settingValue =
                  (settings as Record<string, { value: string; override: string | null }> | null)?.[item.key];
                return (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">{item.label}</Label>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      {settingValue?.override && (
                        <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Personnalisé
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={settingValue?.value ?? ""}
                        className="h-8 flex-1 rounded-lg border border-border/50 bg-background px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                        onBlur={(e) => {
                          if (e.target.value !== (settingValue?.value ?? "")) {
                            handleSaveSettings(item.key, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Writing style */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-blue-400" />
                Style d'écriture
              </h3>

              {[
                { key: "chatStyleTone", label: "Ton", desc: "Ex: professional, casual, friendly" },
                { key: "chatStyleFormality", label: "Formalité", desc: "Ex: low, medium, high" },
                {
                  key: "chatStyleConstraints",
                  label: "Contraintes",
                  desc: "Instructions supplémentaires pour le style d'écriture",
                  multiline: true,
                },
                {
                  key: "chatStyleDoNotUse",
                  label: "Termes à éviter",
                  desc: "Mots ou expressions à ne pas utiliser",
                  multiline: true,
                },
              ].map((item) => {
                const settingValue =
                  (settings as Record<string, { value: string; override: string | null }> | null)?.[item.key];
                return (
                  <div key={item.key} className="space-y-1.5">
                    <Label className="text-xs font-medium">{item.label}</Label>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    {item.multiline ? (
                      <textarea
                        defaultValue={settingValue?.value ?? ""}
                        rows={3}
                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                        onBlur={(e) => {
                          if (e.target.value !== (settingValue?.value ?? "")) {
                            handleSaveSettings(item.key, e.target.value);
                          }
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        defaultValue={settingValue?.value ?? ""}
                        className="h-8 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                        onBlur={(e) => {
                          if (e.target.value !== (settingValue?.value ?? "")) {
                            handleSaveSettings(item.key, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scoring instructions */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                Instructions de scoring personnalisées
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Ces instructions sont ajoutées au prompt de scoring pour personnaliser l'évaluation.
              </p>
              <textarea
                defaultValue={settings?.scoringInstructions?.value ?? ""}
                rows={5}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-mono text-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                onBlur={(e) => {
                  if (e.target.value !== (settings?.scoringInstructions?.value ?? "")) {
                    handleSaveSettings("scoringInstructions", e.target.value);
                  }
                }}
              />
            </div>

            {/* Provider info */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                Fournisseur LLM
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Provider</span>
                  <div className="font-medium">{settings?.llmProvider?.value ?? "openrouter"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Modèle actif</span>
                  <div className="font-medium font-mono">{settings?.model?.value ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Aperçu — {selectedTemplate.name}
            </DialogTitle>
            <DialogDescription>Prévisualisation du prompt avec les variables mises en évidence</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-xl bg-black/30 border border-border/30 p-4 font-mono text-xs leading-relaxed">
            {editedPrompt.split(/({{[^}]+}})/).map((part, i) =>
              part.startsWith("{{") && part.endsWith("}}") ? (
                <span key={i} className="bg-purple-500/20 text-purple-400 px-1 rounded">
                  {part}
                </span>
              ) : (
                <span key={i} className="text-foreground/80 whitespace-pre-wrap">
                  {part}
                </span>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
