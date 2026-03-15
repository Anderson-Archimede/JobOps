/**
 * Career Path Page - Interactive D3.js Force-Directed Graph
 * Features: Career progression visualization, gap analysis, scenario planning,
 * AI-powered recommendations, timeline view, skill radar charts.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import {
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Award,
  Building2,
  CheckCircle2,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  ChevronRight,
  Calendar,
  BookOpen,
  GraduationCap,
  Briefcase,
  Star,
  ArrowRight,
  Info,
  Play,
  BarChart3,
  Rocket,
  Brain,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  CareerGraph,
  CareerNode,
  CareerEdge,
  ScenarioDetail,
} from "@shared/types/careerPath";
import { fetchApi } from "@/lib/apiBase";
import { cn } from "@/lib/utils";

interface D3Node extends CareerNode, d3.SimulationNodeDatum {}
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node;
  target: D3Node;
  edge: CareerEdge;
}

const NODE_COLORS = {
  current: "#14b8a6",
  nearTerm: "#3b82f6",
  midTerm: "#8b5cf6",
  aspirational: "#f59e0b",
};

const PRIORITY_COLORS = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function CareerPathPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<CareerGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"graph" | "timeline" | "insights">("graph");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCareerGraph();
  }, []);

  async function fetchCareerGraph() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi("seeker/career-path");
      const data = await res.json();
      if (data.ok) {
        setGraph(data.data);
      } else {
        setError(data.error?.message || "Failed to load career graph");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load career graph");
    } finally {
      setLoading(false);
    }
  }

  async function fetchScenario(fromId: string, toId: string) {
    try {
      setLoadingScenario(true);
      const res = await fetchApi(`seeker/career-path/scenario?from=${fromId}&to=${toId}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedScenario(data.data);
      } else {
        console.error("Failed to load scenario:", data.error);
      }
    } catch (err) {
      console.error("Failed to load scenario:", err);
    } finally {
      setLoadingScenario(false);
    }
  }

  const getNodeColor = useCallback((node: CareerNode) => {
    if (node.isCurrentPosition) return NODE_COLORS.current;
    if (node.isTarget) return NODE_COLORS.aspirational;
    if (node.timeToReach.includes("6-18") || node.timeToReach.includes("6-12") || node.timeToReach.includes("12-18"))
      return NODE_COLORS.nearTerm;
    return NODE_COLORS.midTerm;
  }, []);

  const getNodeRadius = useCallback((node: CareerNode) => {
    if (node.isTarget) return 45;
    if (node.isCurrentPosition) return 40;
    return 32;
  }, []);

  // D3 Force-directed graph
  useEffect(() => {
    if (!graph || !svgRef.current || activeTab !== "graph") return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Gradient definitions
    const defs = svg.append("defs");
    
    // Glow filter for aspirational node
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Animated gradient for edges
    const gradient = defs.append("linearGradient")
      .attr("id", "edgeGradient")
      .attr("gradientUnits", "userSpaceOnUse");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "50%").attr("stop-color", "#8b5cf6").attr("stop-opacity", 0.8);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.3);

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Initial center
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2 - 100, height / 2 - 50).scale(0.9));

    const nodes: D3Node[] = graph.nodes.map((n) => ({ ...n }));
    const links: D3Link[] = graph.edges.map((e) => {
      const source = nodes.find((n) => n.id === e.from)!;
      const target = nodes.find((n) => n.id === e.to)!;
      return { source, target, edge: e };
    }).filter(l => l.source && l.target);

    // Force simulation
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links).id((d) => d.id).distance(180).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-1200))
      .force("center", d3.forceCenter(0, 0))
      .force("collision", d3.forceCollide().radius(70));

    // Links with animated dash
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("g")
      .data(links)
      .join("g")
      .attr("class", "link-group");

    // Link background (thicker, for click area)
    link.append("line")
      .attr("class", "link-bg")
      .attr("stroke", "#1f2937")
      .attr("stroke-width", (d) => 8 + d.edge.probability * 8)
      .attr("stroke-linecap", "round");

    // Main link line
    const linkLine = link.append("line")
      .attr("class", "link-line")
      .attr("stroke", (d) => {
        const prob = d.edge.probability;
        if (prob > 0.7) return "#22c55e";
        if (prob > 0.4) return "#eab308";
        return "#ef4444";
      })
      .attr("stroke-width", (d) => 2 + d.edge.probability * 4)
      .attr("stroke-opacity", 0.7)
      .attr("stroke-dasharray", (d) => d.edge.probability < 0.5 ? "8,4" : "none")
      .style("cursor", "pointer");

    // Click handler for edges
    link.on("click", (event, d) => {
      event.stopPropagation();
      fetchScenario(d.edge.from, d.edge.to);
    });

    // Probability labels on edges
    link.append("text")
      .attr("class", "prob-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#9ca3af")
      .attr("dy", -8)
      .text((d) => `${Math.round(d.edge.probability * 100)}%`);

    // Nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node outer ring (pulse for current)
    node.filter((d) => d.isCurrentPosition)
      .append("circle")
      .attr("r", 50)
      .attr("fill", "none")
      .attr("stroke", NODE_COLORS.current)
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.3)
      .attr("class", "pulse-ring");

    // Node main circle
    node
      .append("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("filter", (d) => d.isTarget ? "url(#glow)" : "none")
      .on("mouseover", function(_, d) {
        setHoveredNode(d.id);
        d3.select(this).transition().duration(200).attr("r", getNodeRadius(d) + 5);
      })
      .on("mouseout", function(_, d) {
        setHoveredNode(null);
        d3.select(this).transition().duration(200).attr("r", getNodeRadius(d));
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        // Find best transition from current to this node
        const currentNode = nodes.find(n => n.isCurrentPosition);
        if (currentNode && currentNode.id !== d.id) {
          fetchScenario(currentNode.id, d.id);
        }
      });

    // Star overlay for aspirational
    node.filter((d) => d.isTarget)
      .append("path")
      .attr("d", d3.symbol().type(d3.symbolStar).size(400)())
      .attr("fill", "#fbbf24")
      .attr("transform", "translate(0, -20)");

    // Icon in center
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", "20px")
      .text((d) => {
        if (d.isCurrentPosition) return "👤";
        if (d.isTarget) return "⭐";
        return "💼";
      });

    // Labels below
    node.append("text")
      .attr("dy", (d) => getNodeRadius(d) + 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#f9fafb")
      .text((d) => d.title.length > 20 ? d.title.slice(0, 18) + "…" : d.title);

    // Level badge
    node.append("text")
      .attr("dy", (d) => getNodeRadius(d) + 32)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#9ca3af")
      .text((d) => `${d.level} • $${(d.avgSalary / 1000).toFixed(0)}k`);

    simulation.on("tick", () => {
      link.select(".link-bg")
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!);

      linkLine
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!);

      link.select(".prob-label")
        .attr("x", (d) => (d.source.x! + d.target.x!) / 2)
        .attr("y", (d) => (d.source.y! + d.target.y!) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Add CSS animation for pulse
    const style = document.createElement("style");
    style.textContent = `
      .pulse-ring {
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { stroke-opacity: 0.3; r: 50; }
        50% { stroke-opacity: 0.6; r: 55; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      simulation.stop();
      style.remove();
    };
  }, [graph, activeTab, getNodeColor, getNodeRadius]);

  // Timeline view data
  const timelineNodes = graph?.nodes
    .filter(n => !n.isCurrentPosition)
    .sort((a, b) => {
      const timeOrder = (t: string) => {
        if (t.includes("current")) return 0;
        if (t.includes("6-12") || t.includes("6-18")) return 1;
        if (t.includes("12-18")) return 2;
        if (t.includes("18-36") || t.includes("2-3")) return 3;
        return 4;
      };
      return timeOrder(a.timeToReach) - timeOrder(b.timeToReach);
    });

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-[#E94560]" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Generating Your Career Map</p>
          <p className="text-sm text-muted-foreground mt-1">
            AI is analyzing your profile and market data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure you have CVs uploaded and Skills DNA configured.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchCareerGraph} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => navigate("/cv-manager")} variant="outline">
            Upload CV
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E94560] to-[#8b5cf6]">
                <Map className="h-5 w-5 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Career Path
                <Badge variant="secondary" className="text-[10px] font-normal">AI-Powered</Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Interactive progression map • {graph?.nodes.length} positions • {graph?.edges.length} transitions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="graph" className="text-xs gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  Graph
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Insights
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={fetchCareerGraph} variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph / Timeline / Insights */}
        <div className="relative flex-1" ref={containerRef}>
          {activeTab === "graph" && (
            <>
              <svg
                ref={svgRef}
                className="h-full w-full"
                style={{ background: "radial-gradient(circle at center, rgba(139,92,246,0.03) 0%, transparent 70%)" }}
              />
              
              {/* Legend */}
              <div className="absolute bottom-4 left-4 rounded-xl border border-border/50 bg-background/95 backdrop-blur p-4 shadow-lg">
                <p className="mb-3 text-xs font-semibold text-foreground flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  Legend
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ background: NODE_COLORS.current }} />
                    <span>Current Position</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ background: NODE_COLORS.nearTerm }} />
                    <span>Near-term (6-18 mo)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ background: NODE_COLORS.midTerm }} />
                    <span>Mid-term (18-36 mo)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ background: NODE_COLORS.aspirational }} />
                    <span>Aspirational (3-5 yrs)</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5 text-[10px] text-muted-foreground">
                  <p>• Click edges for transition details</p>
                  <p>• Drag nodes to rearrange</p>
                  <p>• Scroll to zoom in/out</p>
                </div>
              </div>

              {/* Quick stats */}
              {graph && (
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Salary Growth</p>
                    <p className="text-lg font-bold text-emerald-400">
                      +{Math.round((graph.nodes.find(n => n.isTarget)?.avgSalary || 0) / (graph.nodes.find(n => n.isCurrentPosition)?.avgSalary || 1) * 100 - 100)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Path</p>
                    <p className="text-lg font-bold text-blue-400">
                      {Math.round(Math.max(...graph.edges.map(e => e.probability)) * 100)}%
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "timeline" && timelineNodes && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Current position */}
                {graph?.nodes.find(n => n.isCurrentPosition) && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: NODE_COLORS.current }}>
                        <span className="text-xl">👤</span>
                      </div>
                      <div className="flex-1 w-0.5 bg-gradient-to-b from-teal-500 to-blue-500 mt-2" />
                    </div>
                    <Card className="flex-1 border-teal-500/30 bg-teal-500/5">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{graph.nodes.find(n => n.isCurrentPosition)?.title}</CardTitle>
                          <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Current</Badge>
                        </div>
                        <CardDescription>
                          ${(graph.nodes.find(n => n.isCurrentPosition)?.avgSalary || 0 / 1000).toLocaleString()}/yr
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                )}

                {/* Timeline nodes */}
                {timelineNodes.map((node, idx) => (
                  <div key={node.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center border-2 border-white"
                        style={{ background: getNodeColor(node) }}
                      >
                        {node.isTarget ? "⭐" : "💼"}
                      </div>
                      {idx < timelineNodes.length - 1 && (
                        <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 mt-2" />
                      )}
                    </div>
                    <Card 
                      className={cn(
                        "flex-1 cursor-pointer transition-all hover:border-[#E94560]/50",
                        node.isTarget && "border-amber-500/30 bg-amber-500/5"
                      )}
                      onClick={() => {
                        const currentNode = graph?.nodes.find(n => n.isCurrentPosition);
                        if (currentNode) {
                          fetchScenario(currentNode.id, node.id);
                        }
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{node.title}</CardTitle>
                          <Badge variant="outline" className="text-xs">{node.timeToReach}</Badge>
                        </div>
                        <CardDescription className="flex items-center gap-3">
                          <span>{node.level}</span>
                          <span>•</span>
                          <span className="text-emerald-400">${(node.avgSalary / 1000).toFixed(0)}k/yr</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {node.requiredSkills.slice(0, 4).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{skill}</Badge>
                          ))}
                          {node.requiredSkills.length > 4 && (
                            <Badge variant="secondary" className="text-[10px]">+{node.requiredSkills.length - 4}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "insights" && graph && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2">
                {/* Salary Projection */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Salary Projection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-4 h-32">
                      {graph.nodes.sort((a, b) => a.avgSalary - b.avgSalary).map((node, idx) => (
                        <TooltipProvider key={node.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 flex flex-col items-center gap-2">
                                <div 
                                  className="w-full rounded-t-lg transition-all hover:opacity-80"
                                  style={{
                                    height: `${(node.avgSalary / Math.max(...graph.nodes.map(n => n.avgSalary))) * 100}%`,
                                    background: getNodeColor(node),
                                    minHeight: 20
                                  }}
                                />
                                <span className="text-[10px] text-muted-foreground truncate max-w-full">
                                  {node.title.split(" ")[0]}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{node.title}</p>
                              <p className="text-sm text-muted-foreground">${node.avgSalary.toLocaleString()}/yr</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Skills to Develop */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-purple-400" />
                      Top Skills to Develop
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[...new Set(graph.nodes.flatMap(n => n.requiredSkills))].slice(0, 5).map((skill, idx) => (
                      <div key={skill} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400 font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-sm flex-1">{skill}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {graph.nodes.filter(n => n.requiredSkills.includes(skill)).length} roles
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Transition Probabilities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-400" />
                      Best Transitions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {graph.edges.sort((a, b) => b.probability - a.probability).slice(0, 4).map((edge) => {
                      const fromNode = graph.nodes.find(n => n.id === edge.from);
                      const toNode = graph.nodes.find(n => n.id === edge.to);
                      return (
                        <div 
                          key={`${edge.from}-${edge.to}`}
                          className="rounded-lg border border-border/50 p-3 cursor-pointer hover:border-[#E94560]/50 transition-colors"
                          onClick={() => fetchScenario(edge.from, edge.to)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="truncate max-w-[100px]">{fromNode?.title}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[100px]">{toNode?.title}</span>
                            </div>
                            <Badge 
                              className={cn(
                                "text-[10px]",
                                edge.probability > 0.7 ? "bg-emerald-500/20 text-emerald-400" :
                                edge.probability > 0.4 ? "bg-amber-500/20 text-amber-400" :
                                "bg-red-500/20 text-red-400"
                              )}
                            >
                              {Math.round(edge.probability * 100)}%
                            </Badge>
                          </div>
                          <Progress value={edge.probability * 100} className="h-1" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Scenario Detail Panel */}
        {selectedScenario && (
          <div className="w-[420px] border-l border-border/50 bg-background/95 backdrop-blur overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#E94560] to-[#8b5cf6] flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Transition Plan</h2>
                  <p className="text-[10px] text-muted-foreground">AI-generated roadmap</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedScenario(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loadingScenario ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#E94560]" />
                <p className="text-sm text-muted-foreground">Analyzing transition...</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Transition header */}
                <Card className="border-[#E94560]/30 bg-gradient-to-br from-[#E94560]/5 to-purple-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: getNodeColor(selectedScenario.fromNode) }}>
                        👤
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: getNodeColor(selectedScenario.toNode) }}>
                        💼
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-semibold">{selectedScenario.fromNode.title}</p>
                    <p className="text-sm text-muted-foreground mt-2">To</p>
                    <p className="font-semibold text-[#E94560]">{selectedScenario.toNode.title}</p>
                  </CardContent>
                </Card>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-semibold text-sm">{selectedScenario.estimatedDuration}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <Target className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                      <p className="text-xs text-muted-foreground">Success</p>
                      <p className="font-semibold text-sm">{Math.round(selectedScenario.probability * 100)}%</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                      <DollarSign className="h-4 w-4 mx-auto mb-1 text-amber-400" />
                      <p className="text-xs text-muted-foreground">Salary</p>
                      <p className="font-semibold text-sm">${(selectedScenario.targetSalaryRange.max / 1000).toFixed(0)}k</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gap Skills */}
                <Card className="border-purple-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-400" />
                      Skills to Acquire
                      <Badge variant="secondary" className="text-[10px] ml-auto">
                        {selectedScenario.gapSkills.length} skills
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedScenario.gapSkills.slice(0, 3).map((gap, idx) => (
                      <div key={idx} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{gap.skill}</span>
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                            {gap.requiredLevel}
                          </Badge>
                        </div>
                        {gap.resources.slice(0, 2).map((resource, ridx) => (
                          <div key={ridx} className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                            {resource.type === "course" && <BookOpen className="h-3 w-3" />}
                            {resource.type === "certification" && <Award className="h-3 w-3" />}
                            {resource.type === "project" && <Briefcase className="h-3 w-3" />}
                            <span className="truncate">{resource.title}</span>
                            {resource.estimatedHours && (
                              <span className="text-[10px] shrink-0">~{resource.estimatedHours}h</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Companies */}
                <Card className="border-blue-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-400" />
                      Target Companies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedScenario.typicalCompanies.slice(0, 6).map((company, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline"
                          className={cn(
                            "text-xs",
                            company.hiringFrequency === "high" && "border-emerald-500/50 text-emerald-400"
                          )}
                        >
                          {company.name}
                          {company.hiringFrequency === "high" && <Star className="h-2.5 w-2.5 ml-1 fill-current" />}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Play className="h-4 w-4 text-amber-400" />
                      30-Day Action Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedScenario.concreteActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
                      >
                        <div className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          PRIORITY_COLORS[action.priority]
                        )}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{action.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{action.deadline}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Narrative */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-[#E94560]" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedScenario.transitionNarrative}
                    </p>
                  </CardContent>
                </Card>

                {/* CTA */}
                <Button className="w-full bg-gradient-to-r from-[#E94560] to-[#8b5cf6] hover:opacity-90" size="lg">
                  <Rocket className="mr-2 h-4 w-4" />
                  Start This Journey
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
