# 审计 my-medusa-store-hono 相关 Node 进程与 dev 端口
$root = "my-medusa-store-hono"
$ports = @(7000, 5173, 4321)

Write-Host "=== 端口监听 ==="
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    foreach ($c in $conns) {
      $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" -EA SilentlyContinue).CommandLine
      Write-Host "  :$port -> PID $($c.OwningProcess)"
      Write-Host "    $cmd"
    }
  } else {
    Write-Host "  :$port -> (无监听)"
  }
}

Write-Host "`n=== 命令行含 entry.node / vitest / turbo dev ==="
Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -match $root -and
    ($_.CommandLine -match 'entry\.node|vitest|turbo.*dev|@my-store/server')
  } |
  ForEach-Object {
    Write-Host "  PID $($_.ProcessId) parent=$($_.ParentProcessId)"
    Write-Host "    $($_.CommandLine.Substring(0, [Math]::Min(220, $_.CommandLine.Length)))"
  }

Write-Host "`n=== 命令行含 getDb 无法从进程看；server 相关 tsx 计数 ==="
$tsx = Get-CimInstance Win32_Process -Filter "name='node.exe'" -EA SilentlyContinue |
  Where-Object { $_.CommandLine -match 'entry\.node' }
Write-Host "  entry.node 进程数: $($tsx.Count)"
