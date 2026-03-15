/**
 * Integrations Page - Third-Party Integrations
 * Connected services (Gmail, RxResume, etc.) – modern card grid.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Plug, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INTEGRATIONS = [
  {
    name: "Gmail",
    description: "Auto-track application responses.",
    status: "available" as const,
    setupPath: "/settings",
  },
  {
    name: "RxResume",
    description: "CV tailoring and PDF generation.",
    status: "available" as const,
    setupPath: "/settings",
  },
  {
    name: "LinkedIn",
    description: "Job scraping and profile sync.",
    status: "coming-soon" as const,
  },
  {
    name: "Slack",
    description: "Application status notifications.",
    status: "coming-soon" as const,
  },
  {
    name: "Notion",
    description: "Export jobs to Notion database.",
    status: "coming-soon" as const,
  },
  {
    name: "Zapier",
    description: "Connect with 5000+ apps.",
    status: "coming-soon" as const,
  },
];

export const IntegrationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col min-h-0 flex-1"
      data-page="integrations"
    >
      {/* Page title – aligned with other DATA pages, no duplicate chrome */}
      <div className="border-b border-border/50 bg-background/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E94560]/10">
            <Plug className="h-4 w-4 text-[#E94560]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Integrations</h1>
            <p className="text-xs text-muted-foreground">
              Connected services and third-party integrations
            </p>
          </div>
        </div>
      </div>

      {/* Content – scrollable inside app layout */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Connected Services</CardTitle>
              <CardDescription>
                Manage third-party integrations to extend JobOps functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-start gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-border hover:bg-muted/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border/50">
                      {integration.status === "available" ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        {integration.status === "available" ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            Available
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                      {integration.setupPath && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[#E94560] hover:text-[#E94560]/90"
                          onClick={() => navigate(integration.setupPath!)}
                        >
                          Configure →
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
