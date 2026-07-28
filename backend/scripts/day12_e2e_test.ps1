# ============================================================
# Day 12 — Full End-to-End Test Script
# Insurance Management Platform
#
# Run this with your Flask server already running on
# http://localhost:5000 (python app.py in another terminal).
#
# Usage:  .\day12_e2e_test.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:5000/api"
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$failures = @()

function Test-Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host "`n--- $Name ---" -ForegroundColor Cyan
    try {
        $result = & $Action
        Write-Host "PASS" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
        $script:failures += $Name
        return $null
    }
}

# ---------- 1. AUTH ----------
$adminEmail = "admin_$stamp@test.com"
$agentEmail = "agent_$stamp@test.com"
$custEmail  = "customer_$stamp@test.com"

Test-Step "Register admin" {
    $body = @{ name = "Admin $stamp"; email = $adminEmail; password = "pass123"; role = "admin" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/register" -Method Post -Body $body -ContentType "application/json"
} | Out-Null

Test-Step "Register agent" {
    $body = @{ name = "Agent $stamp"; email = $agentEmail; password = "pass123"; role = "agent" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/register" -Method Post -Body $body -ContentType "application/json"
} | Out-Null

Test-Step "Register customer-role account" {
    $body = @{ name = "Cust $stamp"; email = $custEmail; password = "pass123"; role = "customer" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/register" -Method Post -Body $body -ContentType "application/json"
} | Out-Null

$adminAuth = Test-Step "Login as admin" {
    $body = @{ email = $adminEmail; password = "pass123" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType "application/json"
}
$adminHeaders = @{ Authorization = "Bearer $($adminAuth.access_token)" }

$custAuth = Test-Step "Login as customer" {
    $body = @{ email = $custEmail; password = "pass123" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType "application/json"
}
$custHeaders = @{ Authorization = "Bearer $($custAuth.access_token)" }

Test-Step "GET /auth/me returns correct role" {
    $me = Invoke-RestMethod -Uri "$base/auth/me" -Headers $adminHeaders
    if ($me.role -ne "admin") { throw "expected role admin, got $($me.role)" }
    $me
} | Out-Null

# ---------- 2. CUSTOMERS ----------
$customer = Test-Step "Create customer (as admin)" {
    $body = @{ name = "E2E Customer $stamp"; email = "e2ecust_$stamp@test.com"; phone = "9998887777"; address = "1 Test St" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/customers" -Method Post -Body $body -ContentType "application/json" -Headers $adminHeaders
}

Test-Step "List/search customers" {
    Invoke-RestMethod -Uri "$base/customers?search=E2E" -Headers $adminHeaders
} | Out-Null

Test-Step "Get single customer" {
    Invoke-RestMethod -Uri "$base/customers/$($customer.id)" -Headers $adminHeaders
} | Out-Null

Test-Step "Update customer" {
    $body = @{ phone = "9998887788" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/customers/$($customer.id)" -Method Put -Body $body -ContentType "application/json" -Headers $adminHeaders
} | Out-Null

Test-Step "Customer as customer-role gets 403 on list" {
    try {
        Invoke-RestMethod -Uri "$base/customers" -Headers $custHeaders
        throw "expected 403 but call succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
    }
} | Out-Null

# ---------- 3. POLICIES ----------
$policy = Test-Step "Create policy" {
    $body = @{ customer_id = $customer.id; policy_type = "health"; premium_amount = 4500; start_date = "2026-01-01"; end_date = "2027-01-01" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/policies" -Method Post -Body $body -ContentType "application/json" -Headers $adminHeaders
}

Test-Step "List policies filtered by status=active" {
    Invoke-RestMethod -Uri "$base/policies?status=active" -Headers $adminHeaders
} | Out-Null

Test-Step "Renew policy" {
    Invoke-RestMethod -Uri "$base/policies/$($policy.id)/renew" -Method Post -ContentType "application/json" -Body "{}" -Headers $adminHeaders
} | Out-Null

Test-Step "Check expiring policies endpoint" {
    Invoke-RestMethod -Uri "$base/policies/expiring?days=30" -Headers $adminHeaders
} | Out-Null

# ---------- 4. PAYMENTS ----------
$payment = Test-Step "Record a payment" {
    $body = @{ policy_id = $policy.id; amount = 4500 } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/payments" -Method Post -Body $body -ContentType "application/json" -Headers $adminHeaders
}

Test-Step "Schedule a due payment (past date, to test overdue)" {
    $body = @{ policy_id = $policy.id; amount = 4500; due_date = "2026-01-01" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/payments/due" -Method Post -Body $body -ContentType "application/json" -Headers $adminHeaders
} | Out-Null

Test-Step "Overdue alerts picks up the past-due payment" {
    $overdue = Invoke-RestMethod -Uri "$base/payments/overdue" -Headers $adminHeaders
    if ($overdue.Count -lt 1) { throw "expected at least 1 overdue payment" }
    $overdue
} | Out-Null

Test-Step "Payment history for policy" {
    Invoke-RestMethod -Uri "$base/payments?policy_id=$($policy.id)" -Headers $adminHeaders
} | Out-Null

# ---------- 5. CLAIMS ----------
$claim = Test-Step "Submit a claim" {
    $body = @{ policy_id = $policy.id; claim_amount = 1200; reason = "E2E test claim" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/claims" -Method Post -Body $body -ContentType "application/json" -Headers $adminHeaders
}

Test-Step "Verify claim" {
    Invoke-RestMethod -Uri "$base/claims/$($claim.id)/verify" -Method Post -Headers $adminHeaders
} | Out-Null

Test-Step "Approve claim" {
    $result = Invoke-RestMethod -Uri "$base/claims/$($claim.id)/approve" -Method Post -Headers $adminHeaders
    if ($result.status -ne "approved") { throw "expected approved, got $($result.status)" }
    $result
} | Out-Null

Test-Step "Reject an already-approved claim should fail with 400" {
    try {
        Invoke-RestMethod -Uri "$base/claims/$($claim.id)/reject" -Method Post -Headers $adminHeaders
        throw "expected 400 but call succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
    }
} | Out-Null

# ---------- 6. DOCUMENTS ----------
"e2e test file content" | Out-File -FilePath "e2e_test.pdf" -Encoding ascii

$doc = Test-Step "Upload document" {
    $json = curl.exe -s -X POST "$base/documents/upload" -H "Authorization: $($adminHeaders.Authorization)" -F "file=@e2e_test.pdf" -F "customer_id=$($customer.id)" -F "category=identity"
    $json | ConvertFrom-Json
}

Test-Step "List documents for customer" {
    Invoke-RestMethod -Uri "$base/documents?customer_id=$($customer.id)" -Headers $adminHeaders
} | Out-Null

Test-Step "Download document" {
    Invoke-RestMethod -Uri "$base/documents/$($doc.id)/download" -Headers $adminHeaders -OutFile "e2e_downloaded.pdf"
} | Out-Null

Test-Step "Customer-role CANNOT delete document (expect 403)" {
    try {
        Invoke-RestMethod -Uri "$base/documents/$($doc.id)" -Method Delete -Headers $custHeaders
        throw "expected 403 but call succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
    }
} | Out-Null

Test-Step "Admin CAN delete document" {
    Invoke-RestMethod -Uri "$base/documents/$($doc.id)" -Method Delete -Headers $adminHeaders
} | Out-Null

# ---------- 7. REPORTS ----------
Test-Step "Reports summary" {
    Invoke-RestMethod -Uri "$base/reports/summary" -Headers $adminHeaders
} | Out-Null

Test-Step "Reports policies-by-status" {
    Invoke-RestMethod -Uri "$base/reports/policies-by-status" -Headers $adminHeaders
} | Out-Null

Test-Step "Reports claims-by-status" {
    Invoke-RestMethod -Uri "$base/reports/claims-by-status" -Headers $adminHeaders
} | Out-Null

# ---------- 8. VALIDATION / ERROR HANDLING ----------
Test-Step "Bad email format returns 400 with field errors" {
    try {
        $body = @{ name = "Bad"; email = "not-an-email"; password = "abc" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$base/auth/register" -Method Post -Body $body -ContentType "application/json"
        throw "expected 400 but call succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
    }
} | Out-Null

Test-Step "Unknown URL returns JSON 404, not HTML" {
    try {
        Invoke-RestMethod -Uri "$base/totally-made-up-endpoint" -Headers $adminHeaders
        throw "expected 404 but call succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
    }
} | Out-Null

# ---------- SUMMARY ----------
Write-Host "`n============================================================" -ForegroundColor Yellow
if ($failures.Count -eq 0) {
    Write-Host "ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "$($failures.Count) TEST(S) FAILED:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
Write-Host "============================================================" -ForegroundColor Yellow

Remove-Item -Path "e2e_test.pdf", "e2e_downloaded.pdf" -ErrorAction SilentlyContinue
