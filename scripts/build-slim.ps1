# Build Job-Ops Docker image then minify it with SlimToolkit (slim build).
# Run from the monorepo root: .\scripts\build-slim.ps1
#
# Prerequisites: Docker (SlimToolkit runs via Docker on Windows if slim CLI is not installed)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$TargetImage = "job-ops:full"
$SlimTag = "job-ops:slim"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Job-Ops Slim Build (SlimToolkit)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Use slim CLI if available, otherwise run via Docker (recommandé sur Windows)
$UseDockerSlim = -not (Get-Command slim -ErrorAction SilentlyContinue)
if ($UseDockerSlim) {
    Write-Host "Slim CLI non installé → utilisation de l'image Docker dslim/slim" -ForegroundColor Gray
    Write-Host ""
}

# Step 1: Build full Docker image
Write-Host "[1/2] Building Docker image: $TargetImage ..." -ForegroundColor Green
docker build -t $TargetImage -f Dockerfile .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed." -ForegroundColor Red
    exit 1
}

# Step 2: Minify with SlimToolkit
# HTTP probe hits the same health endpoint as Dockerfile HEALTHCHECK so Slim keeps required files.
Write-Host "[2/2] Minifying image with SlimToolkit -> $SlimTag ..." -ForegroundColor Green
$slimArgs = @(
    "build",
    "--target", $TargetImage,
    "--tag", $SlimTag,
    "--http-probe-cmd", "GET http://localhost:3001/health",
    "--expose", "3001",
    "--continue-after", "probe"
)
if ($UseDockerSlim) {
    # Windows (Docker Desktop) : double slash pour le socket
    $dockerSock = if ($env:OS -eq "Windows_NT") { "//var/run/docker.sock" } else { "/var/run/docker.sock" }
    docker run --rm -v "${dockerSock}:/var/run/docker.sock" dslim/slim $slimArgs
} else {
    & slim $slimArgs
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "slim build failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done. Run the slim image with:" -ForegroundColor Cyan
Write-Host "  docker run --rm -p 3005:3001 $SlimTag" -ForegroundColor White
Write-Host ""
