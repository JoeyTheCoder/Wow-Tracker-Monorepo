$ErrorActionPreference = 'Stop'

$companionRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $companionRoot '..')).Path
$project = Join-Path $companionRoot 'DungeonTrackerCompanion\DungeonTrackerCompanion.csproj'
$addonSource = Join-Path $repoRoot 'wow-addon\DungeonTracker'
$publishDirectory = Join-Path $companionRoot 'publish\win-x64'
$releaseDirectory = Join-Path $companionRoot 'release'
$stagingDirectory = Join-Path $releaseDirectory 'staging'
$archive = Join-Path $releaseDirectory 'SapphirixPartyPlannerCompanion-win-x64.zip'

if (-not (Test-Path $addonSource)) {
    throw "Addon source folder not found: $addonSource"
}

New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
if (Test-Path $stagingDirectory) {
    Remove-Item -Recurse -Force $stagingDirectory
}
New-Item -ItemType Directory -Force -Path $stagingDirectory | Out-Null

& dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $publishDirectory
if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Get-ChildItem -Path $publishDirectory -File |
    Where-Object { $_.Extension -ne '.pdb' } |
    Copy-Item -Destination $stagingDirectory -Force
$releaseAddon = Join-Path $stagingDirectory 'Addon\DungeonTracker'
New-Item -ItemType Directory -Force -Path $releaseAddon | Out-Null
Copy-Item (Join-Path $addonSource '*') $releaseAddon -Recurse -Force
Copy-Item (Join-Path $companionRoot 'README.md') (Join-Path $stagingDirectory 'README.md') -Force

if (Test-Path $archive) {
    Remove-Item -Force $archive
}
Compress-Archive -Path (Join-Path $stagingDirectory '*') -DestinationPath $archive -CompressionLevel Optimal
Write-Host "Release package created: $archive"
