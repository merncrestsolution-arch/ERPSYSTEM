Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "$PSScriptRoot\..\public\logo.png").Path
$resDir  = "$PSScriptRoot\app\src\main\res"

function Save-Png {
    param([string]$SourceFile, [string]$OutFile, [int]$Size)
    $src = [System.Drawing.Image]::FromFile($SourceFile)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $Size, $Size)
    $g.Dispose()
    $dir = Split-Path $OutFile -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $src.Dispose()
    Write-Output "wrote $OutFile ($Size x $Size)"
}

# Re-encode the web favicon source itself to a real PNG (it is currently JPEG-in-png)
$tmp = "$PSScriptRoot\_logo_tmp.png"
Save-Png -SourceFile $srcPath -OutFile $tmp -Size 1024
Copy-Item $tmp $srcPath -Force

# Launcher icon densities
$densities = @{ "mipmap-ldpi" = 36; "mipmap-mdpi" = 48; "mipmap-hdpi" = 72; "mipmap-xhdpi" = 96; "mipmap-xxhdpi" = 144; "mipmap-xxxhdpi" = 192 }
foreach ($d in $densities.Keys) {
    $sz = $densities[$d]
    Save-Png -SourceFile $srcPath -OutFile "$resDir\$d\ic_launcher.png" -Size $sz
    Save-Png -SourceFile $srcPath -OutFile "$resDir\$d\ic_launcher_round.png" -Size $sz
}

# Adaptive icon foreground (full-bleed source)
Save-Png -SourceFile $srcPath -OutFile "$resDir\drawable-nodpi\erp_logo.png" -Size 432

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Output "DONE"
