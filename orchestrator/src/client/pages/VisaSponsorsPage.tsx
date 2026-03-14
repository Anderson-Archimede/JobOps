import { formatCountryLabel } from "@shared/location-support.js";
import type {
  VisaSponsor,
  VisaSponsorSearchResult,
  VisaSponsorStatusResponse,
} from "@shared/types.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryErrorToast } from "@/client/hooks/useQueryErrorToast";
import { queryKeys } from "@/client/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDateTime } from "@/lib/utils";
import * as api from "../api";
import {
  DetailPanel,
  EmptyState,
  ListItem,
  ListPanel,
  ScoreMeter,
  SplitLayout,
} from "../components";

const getScoreTokens = (score: number) => {
  if (score >= 90)
    return {
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  if (score >= 70)
    return { badge: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  if (score >= 50)
    return { badge: "border-orange-500/30 bg-orange-500/10 text-orange-200" };
  return { badge: "border-rose-500/30 bg-rose-500/10 text-rose-200" };
};

const ALL_SOURCES_VALUE = "__all_sources__";

const getSearchScopeLabel = (countryLabel: string) =>
  countryLabel === "All sources" ? "all sources" : `the ${countryLabel} source`;

const getResultKey = (
  result: Pick<VisaSponsorSearchResult, "providerId" | "sponsor">,
) => `${result.providerId}::${result.sponsor.organisationName}`;

function exportResultsToCsv(
  results: VisaSponsorSearchResult[],
  query: string,
): void {
  const headers = [
    "Organisation",
    "Country",
    "Town/City",
    "County",
    "Score",
    "Source",
  ];
  const rows = results.map((r) => [
    r.sponsor.organisationName ?? "",
    formatCountryLabel(r.countryKey),
    r.sponsor.townCity ?? "",
    r.sponsor.county ?? "",
    String(r.score),
    r.providerId,
  ]);
  const csv =
    headers.join(",") +
    "\n" +
    rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `visa-sponsors-${query.replace(/\s+/g, "-").slice(0, 30)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const VisaSponsorsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(
    null,
  );
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );

  const statusQuery = useQuery<VisaSponsorStatusResponse>({
    queryKey: queryKeys.visaSponsors.status(),
    queryFn: api.getVisaSponsorStatus,
  });
  const status = statusQuery.data ?? null;
  useQueryErrorToast(statusQuery.error, "Failed to fetch status");
  const statusProviders = status?.providers ?? [];
  const providerOptions = statusProviders.map((provider) => ({
    value: provider.countryKey,
    label: formatCountryLabel(provider.countryKey),
    providerId: provider.providerId,
  }));
  const selectedCountryLabel =
    providerOptions.find((option) => option.value === selectedCountry)?.label ??
    "All sources";
  const searchScopeLabel = getSearchScopeLabel(selectedCountryLabel);
  const activeProviders = selectedCountry
    ? statusProviders.filter(
        (provider) => provider.countryKey === selectedCountry,
      )
    : statusProviders;
  const totalSponsors = activeProviders.reduce(
    (sum, provider) => sum + provider.totalSponsors,
    0,
  );
  const latestUpdatedAt = activeProviders.reduce<string | null>(
    (latest, provider) => {
      if (!provider.lastUpdated) return latest;
      if (!latest) return provider.lastUpdated;
      return new Date(provider.lastUpdated) > new Date(latest)
        ? provider.lastUpdated
        : latest;
    },
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchQueryResult = useQuery({
    queryKey: queryKeys.visaSponsors.search(
      debouncedSearchQuery.trim(),
      100,
      20,
      selectedCountry ?? undefined,
    ),
    queryFn: () =>
      api.searchVisaSponsors({
        query: debouncedSearchQuery.trim(),
        limit: 100,
        minScore: 20,
        country: selectedCountry ?? undefined,
      }),
    enabled: Boolean(debouncedSearchQuery.trim()),
  });
  useQueryErrorToast(searchQueryResult.error, "Search failed");

  const results = useMemo<VisaSponsorSearchResult[]>(() => {
    if (!debouncedSearchQuery.trim()) return [];
    return searchQueryResult.data?.results ?? [];
  }, [debouncedSearchQuery, searchQueryResult.data]);

  const selectedResult = useMemo(
    () => results.find((r) => getResultKey(r) === selectedResultKey) ?? null,
    [results, selectedResultKey],
  );
  const selectedOrg = selectedResult?.sponsor.organisationName ?? null;

  const orgDetailsQuery = useQuery<VisaSponsor[]>({
    queryKey: queryKeys.visaSponsors.organization(
      selectedOrg ?? "",
      selectedResult?.providerId,
    ),
    queryFn: () =>
      selectedOrg
        ? api.getVisaSponsorOrganization(
            selectedOrg,
            selectedResult?.providerId,
          )
        : Promise.resolve([]),
    enabled: Boolean(selectedOrg),
  });
  const orgDetails = orgDetailsQuery.data ?? [];
  useQueryErrorToast(orgDetailsQuery.error, "Failed to fetch details");

  useEffect(() => {
    if (results.length === 0) {
      setSelectedResultKey(null);
      return;
    }
    if (
      !selectedResultKey ||
      !results.some((r) => getResultKey(r) === selectedResultKey)
    ) {
      setSelectedResultKey(getResultKey(results[0]));
    }
  }, [results, selectedResultKey]);

  useEffect(() => {
    if (!selectedResultKey) setIsDetailDrawerOpen(false);
  }, [selectedResultKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop && isDetailDrawerOpen) setIsDetailDrawerOpen(false);
  }, [isDesktop, isDetailDrawerOpen]);

  const updateListMutation = useMutation({
    mutationFn: api.updateVisaSponsorList,
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.visaSponsors.status(), result.status);
      if (debouncedSearchQuery.trim()) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.visaSponsors.search(
            debouncedSearchQuery.trim(),
            100,
            20,
            selectedCountry ?? undefined,
          ),
        });
      }
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Update failed");
    },
  });

  const handleUpdate = useCallback(async () => {
    await updateListMutation.mutateAsync();
  }, [updateListMutation]);

  const handleUpdateProvider = useCallback(
    async (providerId: string) => {
      try {
        const result = await api.updateVisaSponsorProvider(providerId);
        queryClient.setQueryData(queryKeys.visaSponsors.status(), result.status);
        toast.success(result.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Provider update failed",
        );
      }
    },
    [queryClient],
  );

  const handleSelectOrg = (resultKey: string) => {
    setSelectedResultKey(resultKey);
    if (!isDesktop) setIsDetailDrawerOpen(true);
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value === ALL_SOURCES_VALUE ? null : value);
    setSelectedResultKey(null);
    setIsDetailDrawerOpen(false);
  };

  const handleExportCsv = () => {
    if (results.length === 0) {
      toast.error("No results to export");
      return;
    }
    exportResultsToCsv(results, searchQuery.trim());
    toast.success(`Exported ${results.length} sponsors to CSV`);
  };

  const isUpdateInProgress =
    updateListMutation.isPending ||
    statusProviders.some((provider) => provider.isUpdating);
  const isLoadingStatus = statusQuery.isLoading;
  const isSearching = searchQueryResult.isFetching;
  const isLoadingDetails = orgDetailsQuery.isLoading;

  const detailPanelContent = !selectedResult ? (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
      <div className="rounded-full p-3 bg-muted/30">
        <Building2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-base font-semibold">Select a company</div>
      <p className="text-sm text-muted-foreground">
        Pick a company from the results to see details here.
      </p>
    </div>
  ) : isLoadingDetails ? (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="h-6 w-6 animate-spin text-[#E94560]" />
    </div>
  ) : (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Licensed Sponsor
          </span>
          {selectedResult && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                getScoreTokens(selectedResult.score).badge,
              )}
            >
              {selectedResult.score}% Match
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-foreground">{selectedOrg}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Source: {formatCountryLabel(selectedResult.countryKey)}
        </p>
      </div>

      {orgDetails.length > 0 &&
        (orgDetails[0].townCity || orgDetails[0].county) && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Location
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {[orgDetails[0].townCity, orgDetails[0].county]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
        )}

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Licensed Routes ({orgDetails.length})
        </div>
        <div className="space-y-2">
          {orgDetails.map((entry) => (
            <div
              key={`${entry.route}-${entry.typeRating}`}
              className="rounded-lg border border-border/60 bg-muted/20 p-3"
            >
              <Badge variant="secondary" className="text-xs mb-1">
                {entry.route}
              </Badge>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Type & Rating:
                </span>{" "}
                {entry.typeRating}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
        <div className="font-medium text-sky-200 mb-1">
          What does this mean?
        </div>
        <p className="text-xs text-sky-300/80">
          This organisation appears in the selected sponsor source and may be
          able to sponsor workers on the routes listed above. Always verify the
          latest source entry before relying on it.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Modern header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Visa Sponsors
              </h1>
              <p className="text-xs text-muted-foreground">
                Search sponsor data across available sources
              </p>
            </div>
            {isUpdateInProgress && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Updating...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground mr-2">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {totalSponsors.toLocaleString()} sponsors
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(latestUpdatedAt) || "Never"}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleUpdate}
              disabled={isUpdateInProgress}
            >
              {isUpdateInProgress ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Update all
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="search" className="mt-4 flex flex-col flex-1 min-h-0">
          <TabsList className="h-9 w-full justify-start rounded-lg bg-muted/30 p-1 flex-wrap gap-1 shrink-0">
            <TabsTrigger
              value="search"
              className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Search
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Statistics
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
            >
              <Database className="mr-1.5 h-3.5 w-3.5" />
              Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="search"
            className="mt-4 flex-1 overflow-y-auto min-h-0 data-[state=inactive]:hidden"
          >
            <main className="container mx-auto max-w-7xl space-y-4 px-4 py-6 pb-12">
              {/* Search section */}
              <section className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="sponsor-search"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Company name
                      </label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="sponsor-search"
                          placeholder="Search for a company..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-10 h-10"
                          autoFocus
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter a company name to check if they&apos;re a licensed
                        visa sponsor in {searchScopeLabel}.
                      </p>
                    </div>
                    <label
                      htmlFor="sponsor-source"
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Source
                    </label>
                    <Select
                      value={selectedCountry ?? ALL_SOURCES_VALUE}
                      onValueChange={handleCountryChange}
                    >
                      <SelectTrigger
                        id="sponsor-source"
                        aria-label="Select sponsor source"
                      >
                        <SelectValue placeholder="All sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_SOURCES_VALUE}>
                          All sources
                        </SelectItem>
                        {providerOptions.map((option) => (
                          <SelectItem
                            key={option.providerId}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {results.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={handleExportCsv}
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Export CSV ({results.length})
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <SplitLayout>
                <ListPanel
                  footer={
                    results.length > 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {results.length} result{results.length !== 1 ? "s" : ""}
                        {isSearching && (
                          <span className="ml-2">
                            <Loader2 className="inline h-3 w-3 animate-spin" />
                          </span>
                        )}
                      </div>
                    ) : null
                  }
                >
                  {!isLoadingStatus && status && totalSponsors === 0 && (
                    <EmptyState
                      icon={AlertCircle}
                      title="No sponsor data available"
                      description="The visa sponsor list hasn't been downloaded yet."
                      action={
                        <Button
                          size="sm"
                          onClick={handleUpdate}
                          disabled={isUpdateInProgress}
                        >
                          {isUpdateInProgress ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download List
                            </>
                          )}
                        </Button>
                      }
                    />
                  )}

                  {status && totalSponsors > 0 && !searchQuery && (
                    <EmptyState
                      icon={Search}
                      title="Search for a company"
                      description={`Enter a company name above to search ${searchScopeLabel}.`}
                    />
                  )}

                  {searchQuery && !isSearching && results.length === 0 && (
                    <EmptyState
                      icon={AlertCircle}
                      title="No matches found"
                      description={`No sponsors match "${searchQuery}". Try a different spelling.`}
                    />
                  )}

                  {results.length > 0 &&
                    results.map((result) => (
                      <ListItem
                        key={getResultKey(result)}
                        selected={selectedResultKey === getResultKey(result)}
                        onClick={() =>
                          handleSelectOrg(getResultKey(result))
                        }
                        className="gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                              {result.sponsor.organisationName}
                            </span>
                          </div>
                          {(result.sponsor.townCity || result.sponsor.county) && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {[
                                formatCountryLabel(result.countryKey),
                                result.sponsor.townCity,
                                result.sponsor.county,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}
                          {!result.sponsor.townCity &&
                            !result.sponsor.county &&
                            result.countryKey && (
                              <div className="text-xs text-muted-foreground">
                                {formatCountryLabel(result.countryKey)}
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ScoreMeter score={result.score} />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </ListItem>
                    ))}
                </ListPanel>

                <DetailPanel className="hidden lg:block">
                  {detailPanelContent}
                </DetailPanel>
              </SplitLayout>
            </main>
          </TabsContent>

          <TabsContent
            value="statistics"
            className="mt-4 flex-1 overflow-y-auto min-h-0 data-[state=inactive]:hidden"
          >
            <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6 pb-12">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Total sponsors
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {totalSponsors.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
                      <Clock className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Last updated
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatDateTime(latestUpdatedAt) || "Never"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-gradient-to-br from-violet-500/10 to-purple-500/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
                      <Database className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Active sources
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {statusProviders.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                <h3 className="text-sm font-semibold mb-4">
                  Sponsors by source
                </h3>
                <div className="space-y-3">
                  {statusProviders.map((provider) => (
                    <div
                      key={provider.providerId}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCountryLabel(provider.countryKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {provider.totalSponsors.toLocaleString()} sponsors
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(provider.lastUpdated) || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {statusProviders.length === 0 && !isLoadingStatus && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No sources configured. Download the sponsor list first.
                    </p>
                  )}
                </div>
              </div>
            </main>
          </TabsContent>

          <TabsContent
            value="sources"
            className="mt-4 flex-1 overflow-y-auto min-h-0 data-[state=inactive]:hidden"
          >
            <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6 pb-12">
              <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                <h3 className="text-sm font-semibold mb-2">
                  Manage data sources
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Update individual sponsor lists or refresh all sources at once.
                </p>
                <div className="space-y-3">
                  {statusProviders.map((provider) => (
                    <div
                      key={provider.providerId}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                          <Database className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {formatCountryLabel(provider.countryKey)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {provider.totalSponsors.toLocaleString()} sponsors
                            {provider.lastUpdated &&
                              ` · Updated ${formatDateTime(provider.lastUpdated)}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleUpdateProvider(provider.providerId)}
                        disabled={provider.isUpdating || isUpdateInProgress}
                      >
                        {provider.isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {provider.isUpdating ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  ))}
                  {statusProviders.length === 0 && !isLoadingStatus && (
                    <EmptyState
                      icon={AlertCircle}
                      title="No sources available"
                      description="Download the sponsor list to get started."
                      action={
                        <Button
                          size="sm"
                          onClick={handleUpdate}
                          disabled={isUpdateInProgress}
                        >
                          {isUpdateInProgress ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download List
                            </>
                          )}
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            </main>
          </TabsContent>
        </Tabs>
      </div>

      <Drawer open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <div className="flex items-center justify-between px-4 pt-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sponsor details
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                Close
              </Button>
            </DrawerClose>
          </div>
          <div className="max-h-[calc(90vh-3.5rem)] overflow-y-auto px-4 pb-6 pt-3">
            {detailPanelContent}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
