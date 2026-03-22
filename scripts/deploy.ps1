# JobOps Deployment Script
# Usage: .\scripts\deploy.ps1 [render|vercel|all]

param(
    [ValidateSet("render", "vercel", "all")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

# Render deploy hook
$RenderDeployUrl = "https://api.render.com/deploy/srv-d6p9gmpaae7s73bq4vg0?key=_SURjNydIH0"

# Vercel project
$VercelProjectId = "prj_bkVtI7HUhC2NoeOzd5EhqhBEtwiE"
$VercelScope = "archimed-andersons-projects"

function Deploy-Render {
    Write-Host "`n=== Triggering Render deploy ===" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $RenderDeployUrl -Method POST -UseBasicParsing
    if ($response.StatusCode -in 200, 202) {
        Write-Host "Render deploy triggered successfully (HTTP $($response.StatusCode))." -ForegroundColor Green
        Write-Host "Monitor: https://dashboard.render.com" -ForegroundColor Gray
    } else {
        throw "Render deploy failed: $($response.StatusCode)"
    }
}

function Deploy-Vercel {
    Write-Host "`n=== Deploying to Vercel ===" -ForegroundColor Cyan
    Push-Location $PSScriptRoot\..
    try {
        # Requires: vercel link (once) or VERCEL_ORG_ID + VERCEL_PROJECT_ID
        # For CI: set VERCEL_TOKEN from https://vercel.com/account/tokens
        npx vercel deploy --prod --yes
    } finally {
        Pop-Location
    }
}

switch ($Target) {
    "render" { Deploy-Render }
    "vercel" { Deploy-Vercel }
    "all" {
        Deploy-Render
        Deploy-Vercel
    }
}

Write-Host "`nDone." -ForegroundColor Green
