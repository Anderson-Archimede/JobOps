/**
 * Integrations Page - Third-Party Integrations
 * 
 * Placeholder for integration management
 */

import React from 'react';
import { Plug, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const IntegrationsPage: React.FC = () => {
  const integrations = [
    {
      name: 'Gmail',
      description: 'Auto-track application responses',
      status: 'available',
      setupPath: '/settings',
    },
    {
      name: 'RxResume',
      description: 'CV tailoring and PDF generation',
      status: 'available',
      setupPath: '/settings',
    },
    {
      name: 'LinkedIn',
      description: 'Job scraping and profile sync',
      status: 'coming-soon',
    },
    {
      name: 'Slack',
      description: 'Application status notifications',
      status: 'coming-soon',
    },
    {
      name: 'Notion',
      description: 'Export jobs to Notion database',
      status: 'coming-soon',
    },
    {
      name: 'Zapier',
      description: 'Connect with 5000+ apps',
      status: 'coming-soon',
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Plug className="h-5 w-5 text-[#E94560]" />
            <h1 className="text-lg font-semibold">Integrations</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>
                Manage third-party integrations to extend JobOps functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-start gap-4 rounded-lg border border-border p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {integration.status === 'available' ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{integration.name}</div>
                        {integration.status === 'available' ? (
                          <Badge variant="outline" className="text-xs">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
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
                          className="h-auto p-0 text-[#E94560]"
                          onClick={() => (window.location.href = integration.setupPath)}
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
