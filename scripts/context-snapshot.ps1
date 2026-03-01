param(
  [string]$OutputPath = "docs/context-snapshot.md"
)

$ErrorActionPreference = "Stop"

function Invoke-Safe {
  param(
    [scriptblock]$Script,
    [string]$Fallback = "n/a"
  )
  try {
    $result = & $Script 2>$null
    if ($null -eq $result) {
      return $Fallback
    }
    $text = ($result -join "`n").Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
      return $Fallback
    }
    return $text
  } catch {
    return $Fallback
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
$branch = Invoke-Safe { git rev-parse --abbrev-ref HEAD }
$commit = Invoke-Safe { git rev-parse --short HEAD }

$frontendPkg = $null
if (Test-Path "package.json") {
  $frontendPkg = Get-Content "package.json" -Raw | ConvertFrom-Json
}

$backendPkg = $null
if (Test-Path "server/package.json") {
  $backendPkg = Get-Content "server/package.json" -Raw | ConvertFrom-Json
}

$frontendScripts = @()
if ($frontendPkg -ne $null -and $frontendPkg.scripts -ne $null) {
  $frontendScripts = $frontendPkg.scripts.PSObject.Properties |
    Sort-Object Name |
    ForEach-Object { "- ``$($_.Name)``: ``$($_.Value)``" }
}

$backendScripts = @()
if ($backendPkg -ne $null -and $backendPkg.scripts -ne $null) {
  $backendScripts = $backendPkg.scripts.PSObject.Properties |
    Sort-Object Name |
    ForEach-Object { "- ``$($_.Name)``: ``$($_.Value)``" }
}

$pagePaths = @()
if (Test-Path "pages.json") {
  $pagesJson = Get-Content "pages.json" -Raw | ConvertFrom-Json
  if ($pagesJson.pages -ne $null) {
    $pagePaths = $pagesJson.pages | ForEach-Object { "- ``$($_.path)``" }
  }
}

$routeFiles = @()
if (Test-Path "server/src/routes") {
  $routeFiles = Get-ChildItem "server/src/routes" -Filter "*.js" |
    Sort-Object Name |
    ForEach-Object { "- ``$($_.BaseName)``" }
}

$envKeys = @()
if (Test-Path "server/.env.example") {
  $envKeys = Get-Content "server/.env.example" |
    ForEach-Object {
      $line = $_.Trim()
      if ($line -match '^[A-Z0-9_]+=' ) {
        "- ``$($line.Split('=')[0])``"
      }
    } |
    Where-Object { $_ -ne $null }
}

$apiBaseRefs = @()
$rgExists = (Get-Command rg -ErrorAction SilentlyContinue) -ne $null
if ($rgExists) {
  $apiBaseRefs = Invoke-Safe {
    rg -n "API_BASE_URL = 'http://localhost:3000'" pages utils -g "!utils/api.uts"
  } ""
  if (-not [string]::IsNullOrWhiteSpace($apiBaseRefs)) {
    $apiBaseRefs = $apiBaseRefs -split "`n" | ForEach-Object { "- ``$($_.Trim())``" }
  } else {
    $apiBaseRefs = @()
  }
}

if (-not $rgExists -or $apiBaseRefs.Count -eq 0) {
  $fallbackRefs = Select-String -Path "pages/**/*.uvue","utils/**/*.uts" -Pattern "API_BASE_URL = 'http://localhost:3000'" -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -notmatch '[\\/]utils[\\/]api\.uts$' }
  if ($fallbackRefs) {
    $apiBaseRefs = $fallbackRefs | ForEach-Object { "- ``$($_.Path):$($_.LineNumber)``" }
  }
}

if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $outputFile = $OutputPath
} else {
  $outputFile = Join-Path $repoRoot $OutputPath
}

$outputDir = Split-Path $outputFile -Parent
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$lines = @()
$lines += "# Context Snapshot"
$lines += ""
$lines += "- Generated at: $timestamp"
$lines += "- Repo root: ``$repoRoot``"
$lines += "- Git branch: ``$branch``"
$lines += "- Git commit: ``$commit``"
$lines += ""
$lines += "## Stack"
$lines += ""
$lines += "- Frontend: ``uni-app x`` + ``Vue 3`` + ``UTS``"
$lines += "- Backend: ``Express`` + ``MySQL``"
$lines += ""
$lines += "## Frontend Scripts"
$lines += ""
if ($frontendScripts.Count -gt 0) {
  $lines += $frontendScripts
} else {
  $lines += "- n/a"
}
$lines += ""
$lines += "## Backend Scripts"
$lines += ""
if ($backendScripts.Count -gt 0) {
  $lines += $backendScripts
} else {
  $lines += "- n/a"
}
$lines += ""
$lines += "## Pages"
$lines += ""
if ($pagePaths.Count -gt 0) {
  $lines += $pagePaths
} else {
  $lines += "- n/a"
}
$lines += ""
$lines += "## Backend Route Modules"
$lines += ""
if ($routeFiles.Count -gt 0) {
  $lines += $routeFiles
} else {
  $lines += "- n/a"
}
$lines += ""
$lines += "## Env Keys From ``server/.env.example``"
$lines += ""
if ($envKeys.Count -gt 0) {
  $lines += $envKeys
} else {
  $lines += "- n/a"
}
$lines += ""
$lines += "## API Base URL Hardcoded References"
$lines += ""
if ($apiBaseRefs.Count -gt 0) {
  $lines += $apiBaseRefs
} else {
  $lines += "- none found"
}
$lines += ""
$lines += "## Notes"
$lines += ""
$lines += "- Use this snapshot for quick orientation."
$lines += "- Treat ``PROJECT_BRIEF.md`` + ``docs/CURRENT_STATE.md`` as source of truth."

Set-Content -Path $outputFile -Value $lines -Encoding UTF8
Write-Output "Snapshot written: $outputFile"
