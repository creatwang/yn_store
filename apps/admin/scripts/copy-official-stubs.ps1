# 从 @medusajs/dashboard 拷贝 P1 官方实现（仅加 // @ts-nocheck）
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$OfficialRoot = Join-Path $RepoRoot "node_modules\@medusajs\dashboard\src\routes"
$AdminRoutes = Join-Path $RepoRoot "apps\admin\src\routes"

if (-not (Test-Path $OfficialRoot)) {
  Write-Error "Official routes not found: $OfficialRoot"
  exit 1
}

function Copy-OfficialDir([string]$RelDir) {
  $src = Join-Path $OfficialRoot $RelDir
  $dst = Join-Path $AdminRoutes $RelDir
  if (-not (Test-Path $src)) {
    Write-Warning "MISSING official dir: $RelDir"
    return
  }
  if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
  $parent = Split-Path $dst -Parent
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Copy-Item -Recurse -Force $src $dst
  Get-ChildItem $dst -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    if ($_.Name -eq "index.ts") { return }
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and -not $content.StartsWith("// @ts-nocheck")) {
      Set-Content $_.FullName ("// @ts-nocheck`r`n" + $content) -NoNewline
    }
  }
  Write-Host "OK DIR $RelDir"
}

$dirs = @(
  # tax-regions — common + 子路由整目录
  "tax-regions/common",
  "tax-regions/tax-region-tax-override-edit",
  "tax-regions/tax-region-tax-override-create",
  "tax-regions/tax-region-tax-rate-edit",
  "tax-regions/tax-region-tax-rate-create",
  "tax-regions/tax-region-province-detail",
  "tax-regions/tax-region-province-create",
  # shipping-profiles
  "shipping-profiles/shipping-profiles-list/components/shipping-profile-list-table",
  "shipping-profiles/shipping-profile-detail/components/shipping-profile-general-section",
  "shipping-profiles/shipping-profile-create/components/create-shipping-profile-form",
  # shipping-option-types
  "shipping-option-types/shipping-option-type-list/components/shipping-option-type-list-table",
  "shipping-option-types/shipping-option-type-edit/components/edit-shipping-option-type-form",
  "shipping-option-types/shipping-option-type-detail/components/shipping-option-type-general-section",
  "shipping-option-types/shipping-option-type-create/components/create-shipping-option-type-form",
  # reasons
  "return-reasons/return-reason-create/components/return-reason-create-form",
  "refund-reasons/refund-reason-create/components/refund-reason-create-form",
  # product meta
  "product-types/product-type-detail/components/product-type-product-section",
  "product-types/product-type-detail/components/product-type-general-section",
  "product-tags/product-tag-detail/components/product-tag-product-section",
  "product-tags/product-tag-detail/components/product-tag-general-section",
  # product inventory kit
  "products/product-create/components/product-create-inventory-kit-form",
  # translations
  "translations/translation-list/components/translations-completion-section"
)

foreach ($d in $dirs) { Copy-OfficialDir $d }

Write-Host "All stub dirs copied."
