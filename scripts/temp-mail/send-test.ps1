param(
  [Parameter(Mandatory = $true)]
  [string]$SiteUrl,

  [Parameter(Mandatory = $true)]
  [string]$InboxAddress,

  [Parameter(Mandatory = $true)]
  [string]$InboundSecret,

  [string]$FromAddress = "tester@example.com",
  [string]$Subject = "Tes Temp Mail Putri",
  [string]$BodyText = "Halo Putri, ini email uji coba temp mail.",
  [string]$BodyHtml = "<p>Halo Putri, ini <strong>email uji coba</strong> temp mail.</p>"
)

$timestamp = Get-Date -Format "ddd, dd MMM yyyy HH:mm:ss zzz"
$messageId = "<temp-mail-test-$([guid]::NewGuid())@local>"
$boundary = "putri-boundary-$([guid]::NewGuid().ToString('N'))"
$normalizedSiteUrl = $SiteUrl.TrimEnd('/')
$endpoint = "$normalizedSiteUrl/api/temp-mail/inbound"

$mime = @"
From: $FromAddress
To: $InboxAddress
Subject: $Subject
Date: $timestamp
Message-ID: $messageId
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary=""$boundary""

--$boundary
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 8bit

$BodyText

--$boundary
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 8bit

$BodyHtml

--$boundary--
"@

$headers = @{
  "content-type" = "message/rfc822"
  "x-inbound-secret" = $InboundSecret
}

Write-Host "Mengirim email uji ke $InboxAddress melalui $endpoint ..."
$response = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $mime
$response | ConvertTo-Json -Depth 6
