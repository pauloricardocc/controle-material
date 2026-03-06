$listener = [System.Net.HttpListener]::new()
# Para acessar de outros computadores na rede, execute como Admin e troque localhost por +
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Servidor rodando em http://localhost:8080" -ForegroundColor Green
Write-Host "  Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$root = "c:\Projeto Materiais"
$dataDir = Join-Path $root "data"
$dataFile = Join-Path $dataDir "database.json"

# Create data directory if it doesn't exist
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "[INFO] Diretorio de dados criado: $dataDir" -ForegroundColor Cyan
}

# Create empty database file if it doesn't exist
if (-not (Test-Path $dataFile)) {
    $emptyDb = @{
        materials        = @()
        movements        = @()
        requisitions     = @()
        requisitionItems = @()
        auditLog         = @()
        categories       = @()
        units            = @()
        _nextIds         = @{
            materials        = 1
            movements        = 1
            requisitions     = 1
            requisitionItems = 1
            auditLog         = 1
            categories       = 1
            units            = 1
        }
    } | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($dataFile, $emptyDb, [System.Text.Encoding]::UTF8)
    Write-Host "[INFO] Banco de dados criado: $dataFile" -ForegroundColor Cyan
}

$mimeTypes = @{
    ".html"  = "text/html; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".json"  = "application/json"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".svg"   = "image/svg+xml"
    ".ico"   = "image/x-icon"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
}

function Send-JsonResponse($ctx, $json, $statusCode = 200) {
    $ctx.Response.StatusCode = $statusCode
    $ctx.Response.ContentType = "application/json; charset=utf-8"
    $ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $ctx.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $path = $ctx.Request.Url.LocalPath
        $method = $ctx.Request.HttpMethod

        # Handle CORS preflight
        if ($method -eq "OPTIONS") {
            $ctx.Response.StatusCode = 204
            $ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*")
            $ctx.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
            $ctx.Response.Close()
            continue
        }

        # API: GET /api/data — return database
        if ($path -eq "/api/data" -and $method -eq "GET") {
            try {
                $json = [System.IO.File]::ReadAllText($dataFile, [System.Text.Encoding]::UTF8)
                Send-JsonResponse $ctx $json
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 200 GET /api/data" -ForegroundColor Green
            }
            catch {
                $err = @{ error = $_.Exception.Message } | ConvertTo-Json
                Send-JsonResponse $ctx $err 500
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 500 GET /api/data - $($_.Exception.Message)" -ForegroundColor Red
            }
            $ctx.Response.Close()
            continue
        }

        # API: POST /api/data — save database
        if ($path -eq "/api/data" -and $method -eq "POST") {
            try {
                $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, $ctx.Request.ContentEncoding)
                $body = $reader.ReadToEnd()
                $reader.Close()

                # Validate JSON
                $null = $body | ConvertFrom-Json

                [System.IO.File]::WriteAllText($dataFile, $body, [System.Text.Encoding]::UTF8)
                $ok = @{ success = $true } | ConvertTo-Json
                Send-JsonResponse $ctx $ok
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 200 POST /api/data" -ForegroundColor Green
            }
            catch {
                $err = @{ error = $_.Exception.Message } | ConvertTo-Json
                Send-JsonResponse $ctx $err 500
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 500 POST /api/data - $($_.Exception.Message)" -ForegroundColor Red
            }
            $ctx.Response.Close()
            continue
        }

        # Static file serving
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $root ($path.TrimStart("/").Replace("/", "\"))

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $ctx.Response.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 200 $path" -ForegroundColor Green
        }
        else {
            $ctx.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - Arquivo nao encontrado")
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 404 $path" -ForegroundColor Red
        }
        $ctx.Response.Close()
    }
}
finally {
    $listener.Stop()
}
