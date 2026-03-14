# Robust startup script for Job-Ops orchestrator
# Run from the monorepo root: .\scripts\start.ps1

$ErrorActionPreference = "Continue"

$MonorepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $MonorepoRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 Job-Ops Orchestrator Startup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Function to find an available port
function Find-AvailablePort {
    param (
        [int]$StartPort = 3001,
        [int]$MaxAttempts = 100
    )
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $TestPort = $StartPort + $i
        $Connection = Get-NetTCPConnection -LocalPort $TestPort -ErrorAction SilentlyContinue
        if (-not $Connection) {
            return $TestPort
        }
    }
    
    return -1
}

# Function to update PORT in .env file
function Update-PortInEnv {
    param (
        [int]$NewPort
    )
    
    if (Test-Path ".env") {
        $EnvContent = Get-Content ".env" -Raw
        
        if ($EnvContent -match "PORT=\d+") {
            # Update existing PORT line
            $EnvContent = $EnvContent -replace "PORT=\d+", "PORT=$NewPort"
        } else {
            # Add PORT line after the header
            $EnvContent = $EnvContent -replace "(# =+\r?\n)", "`$1`r`nPORT=$NewPort`r`n"
        }
        
        Set-Content ".env" -Value $EnvContent -NoNewline
        Write-Host "✅ Updated PORT=$NewPort in .env file" -ForegroundColor Green
    }
}

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Run this script from the monorepo root." -ForegroundColor Red
    exit 1
}

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env - please configure it with your credentials." -ForegroundColor Green
    Write-Host ""
}

# Check Docker status
Write-Host "🐳 Checking Docker status..." -ForegroundColor Cyan
try {
    $DockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Docker is not running. Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "⏳ Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # Check again
        docker ps 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker started successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Docker failed to start. Please start Docker Desktop manually and run this script again." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ Docker is running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify Docker status, continuing anyway..." -ForegroundColor Yellow
}
Write-Host ""

# Check Redis status
Write-Host "🔴 Checking Redis status..." -ForegroundColor Cyan
$RedisRunning = docker ps --filter "name=redis" --format "{{.Names}}" 2>$null | Where-Object { $_ -match "redis" }
if ($RedisRunning) {
    Write-Host "✅ Redis container is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  No Redis container found running" -ForegroundColor Yellow
    Write-Host "ℹ️  Make sure your docker-compose includes Redis or start it manually" -ForegroundColor Gray
}
Write-Host ""

# Check and generate RS256 keys for JWT
Write-Host "🔑 Checking JWT RS256 keys..." -ForegroundColor Cyan
$KeysDir = Join-Path $MonorepoRoot "orchestrator\auth-keys"
$PrivateKeyPath = Join-Path $KeysDir "jwt.private.pem"
$PublicKeyPath = Join-Path $KeysDir "jwt.public.pem"

if (-not (Test-Path $PrivateKeyPath) -or -not (Test-Path $PublicKeyPath)) {
    Write-Host "⚠️  JWT keys not found. Generating RS256 key pair..." -ForegroundColor Yellow
    
    # Create auth-keys directory if it doesn't exist
    if (-not (Test-Path $KeysDir)) {
        New-Item -ItemType Directory -Path $KeysDir -Force | Out-Null
    }
    
    # Run the key generation script
    Push-Location "orchestrator"
    npx tsx scripts/gen-keys.ts
    Pop-Location
    
    if (Test-Path $PrivateKeyPath -and Test-Path $PublicKeyPath) {
        Write-Host "✅ JWT keys generated successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to generate JWT keys" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ JWT keys already exist" -ForegroundColor Green
}
Write-Host ""

# Install dependencies if node_modules doesn't exist or is incomplete
if (-not (Test-Path "node_modules") -or -not (Test-Path "orchestrator\node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Dependencies installation had issues, but continuing..." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Rebuild native modules (ignore errors if module is already in use)
Write-Host "🔧 Rebuilding native modules..." -ForegroundColor Cyan
npm --workspace orchestrator rebuild better-sqlite3 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Native modules rebuilt" -ForegroundColor Green
} else {
    Write-Host "⚠️  Native module rebuild skipped (may already be compiled or not needed)" -ForegroundColor Yellow
}
Write-Host ""

# Build client (always rebuild so UI changes like Settings page are served)
Write-Host "🏗️  Building client bundle..." -ForegroundColor Cyan
npm --workspace orchestrator run build:client
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Client built" -ForegroundColor Green
} else {
    Write-Host "❌ Client build failed. Fix errors above and run again." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
npm --workspace orchestrator run db:migrate
Write-Host "✅ Migrations complete" -ForegroundColor Green
Write-Host ""

# Create uploads directory for CV files
Write-Host "📁 Checking uploads directory..." -ForegroundColor Cyan
$UploadsDir = Join-Path $MonorepoRoot "orchestrator\uploads\cvs"
if (-not (Test-Path $UploadsDir)) {
    New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
    Write-Host "✅ Created uploads/cvs directory" -ForegroundColor Green
} else {
    Write-Host "✅ Uploads directory exists" -ForegroundColor Green
}
Write-Host ""

# Read PORT from .env or use default
$DesiredPort = 3001
if (Test-Path ".env") {
    $EnvContent = Get-Content ".env" -Raw
    if ($EnvContent -match "PORT=(\d+)") {
        $DesiredPort = [int]$Matches[1]
    }
}

# Check if desired port is available
Write-Host "🔍 Checking port availability..." -ForegroundColor Cyan
$PortConnection = Get-NetTCPConnection -LocalPort $DesiredPort -ErrorAction SilentlyContinue

if ($PortConnection) {
    $ProcessId = $PortConnection[0].OwningProcess
    
    # Skip if process is Idle (PID 0) or System (PID 4)
    if ($ProcessId -eq 0 -or $ProcessId -eq 4) {
        Write-Host "⚠️  Port $DesiredPort is in use by system process. Finding alternative port..." -ForegroundColor Yellow
        $AvailablePort = Find-AvailablePort -StartPort ($DesiredPort + 1)
        
        if ($AvailablePort -eq -1) {
            Write-Host "❌ Could not find an available port in range $($DesiredPort+1)-$($DesiredPort+100)" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Found available port: $AvailablePort" -ForegroundColor Green
        Update-PortInEnv -NewPort $AvailablePort
        $DesiredPort = $AvailablePort
        Write-Host ""
    } else {
        # Try to get process name
        $ProcessName = "Unknown"
        try {
            $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
            if ($Process) {
                $ProcessName = $Process.ProcessName
            }
        } catch {}
        
        Write-Host "⚠️  Port $DesiredPort is in use by process: $ProcessName (PID: $ProcessId)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Choose an option:" -ForegroundColor Cyan
        Write-Host "  [1] Kill the process and use port $DesiredPort" -ForegroundColor White
        Write-Host "  [2] Find and use an alternative port automatically" -ForegroundColor White
        Write-Host "  [3] Exit" -ForegroundColor White
        Write-Host ""
        
        $Choice = Read-Host "Enter your choice (1-3)"
        
        switch ($Choice) {
            "1" {
                try {
                    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
                    Write-Host "✅ Killed process $ProcessId ($ProcessName)" -ForegroundColor Green
                    Start-Sleep -Seconds 2
                } catch {
                    Write-Host "❌ Failed to kill process: $_" -ForegroundColor Red
                    Write-Host "Finding alternative port..." -ForegroundColor Yellow
                    $AvailablePort = Find-AvailablePort -StartPort ($DesiredPort + 1)
                    
                    if ($AvailablePort -eq -1) {
                        Write-Host "❌ Could not find an available port" -ForegroundColor Red
                        exit 1
                    }
                    
                    Write-Host "✅ Found available port: $AvailablePort" -ForegroundColor Green
                    Update-PortInEnv -NewPort $AvailablePort
                    $DesiredPort = $AvailablePort
                }
                Write-Host ""
            }
            "2" {
                $AvailablePort = Find-AvailablePort -StartPort ($DesiredPort + 1)
                
                if ($AvailablePort -eq -1) {
                    Write-Host "❌ Could not find an available port in range $($DesiredPort+1)-$($DesiredPort+100)" -ForegroundColor Red
                    exit 1
                }
                
                Write-Host "✅ Found available port: $AvailablePort" -ForegroundColor Green
                Update-PortInEnv -NewPort $AvailablePort
                $DesiredPort = $AvailablePort
                Write-Host ""
            }
            "3" {
                Write-Host "❌ Exiting as requested." -ForegroundColor Red
                exit 0
            }
            default {
                Write-Host "❌ Invalid choice. Exiting." -ForegroundColor Red
                exit 1
            }
        }
    }
} else {
    Write-Host "✅ Port $DesiredPort is available" -ForegroundColor Green
    Write-Host ""
}

# Start server
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting orchestrator server on port $DesiredPort..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Set PORT environment variable for this session
$env:PORT = $DesiredPort

npm --workspace orchestrator run start
