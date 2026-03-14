import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "../test/renderWithQueryClient";
import { AIInsightsPage } from "./AIInsightsPage";

const render = (ui: Parameters<typeof renderWithQueryClient>[0]) =>
  renderWithQueryClient(ui);

const mockDashboardPayload = {
  kpis: {
    activeApplications: { value: 5, previousValue: 3, delta: 66, deltaLabel: "+66% vs semaine dernière", trend: "up" as const },
    avgPSOScore: { value: 72, previousValue: 68, delta: 5, deltaLabel: "+5% vs semaine dernière", trend: "up" as const },
    responseRate: { value: 12, previousValue: 10, delta: 20, deltaLabel: "+20% vs semaine dernière", trend: "up" as const },
    scheduledInterviews: { value: 2, previousValue: 1, delta: 100, deltaLabel: "+100% vs semaine dernière", trend: "up" as const },
    computedAt: new Date().toISOString(),
  },
  marketPulse: {
    skills: [
      { name: "TypeScript", tensionScore: 0.8, trendDelta: 0.05, salaryP50: 55000 },
      { name: "React", tensionScore: 0.7, trendDelta: 0.02, salaryP50: 52000 },
    ],
  },
  momentumScore: 65,
  recentActivity: [
    { type: "applications", description: "5 candidatures actives", timestamp: new Date().toISOString(), icon: "Briefcase" },
  ],
  insightOfDay: "Votre momentum est bon. Ciblez des offres TypeScript cette semaine.",
};

describe("AIInsightsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: mockDashboardPayload }),
    });
  });

  it("renders loading state then content", async () => {
    render(<AIInsightsPage />);
    await waitFor(() => {
      expect(screen.getByText(/AI Insights/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Insight du jour/i)).toBeInTheDocument();
    });
  });

  it("displays insight of the day when data is loaded", async () => {
    render(<AIInsightsPage />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardPayload.insightOfDay)).toBeInTheDocument();
    });
  });

  it("shows error state when API fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: { message: "Unauthorized" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<AIInsightsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Unauthorized|Erreur|Failed/i)).toBeInTheDocument();
    });
  });

  it("Rafraîchir button refetches data", async () => {
    render(<AIInsightsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Insight du jour/i)).toBeInTheDocument();
    });
    const refreshBtn = screen.getByRole("button", { name: /Rafraîchir/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/seeker/dashboard");
    });
  });
});
