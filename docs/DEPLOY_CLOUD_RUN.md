# Mercora Cloud Run evaluator release

This runbook stages Mercora API and web revisions without moving production traffic. It targets project `cascade-511914`, region `asia-south1`, Cloud SQL instance `cascade-511914:asia-south1:cascade-db`, API service `mercora-api`, and web service `mercora-web`. Review the resolved service settings and database target before running any command. Public API and frontend addresses are the stable `run.app` services; tagged revision URLs are only for direct candidate checks.

The evaluator account is intentionally public and read-only. Supply its email and password through your approved secret-management process; this guide does not contain credential values. It can view business records and dashboard analytics. Backend authorization denies business data writes, settings administration, access-request review, and user management. It may run only the scoped Cascade simulations for seeded demo scenarios; these simulate consequences and do not execute the underlying action or modify Mercora records. Provisioning reruns update only this evaluator account's password and active state; they refuse an email already assigned another role. The seed script upserts only deterministic demo records and leaves unrelated records intact. To rotate the demo password, update the public frontend value and Secret Manager version together, rebuild the web image, and run the provisioning job with that same value.

Evaluator secrets created from line-oriented files can contain a terminal CR/LF. Configuration removes only those terminal line endings before provisioning so the stored password matches the value shown in the login form; other spaces are preserved. The diagnostic command below reports this condition as a boolean and never outputs the secret or password hash.

## 1. Build and stage the API

Run in PowerShell from the repository root. Capture the currently serving revision and service configuration first. The image repository is derived from the deployed API image so the build stays in the same Artifact Registry repository.

```powershell
$Project = 'cascade-511914'
$Region = 'asia-south1'
$ApiService = 'mercora-api'
$WebService = 'mercora-web'
$ApiDetails = gcloud run services describe $ApiService --project $Project --region $Region --format=json | ConvertFrom-Json
$ApiTrafficBefore = @($ApiDetails.status.traffic | Where-Object { $_.percent -gt 0 })
$ApiPreviousRevision = $ApiTrafficBefore[0].revisionName
$ApiCurrentImage = $ApiDetails.spec.template.spec.containers[0].image
$ApiImageRepository = $ApiCurrentImage -replace '(@sha256:.*|:[^/:]+)$', ''
$BuildId = Get-Date -Format 'yyyyMMddHHmmss'
$ApiImage = "${ApiImageRepository}:evaluator-$BuildId"
$ApiServiceAccount = $ApiDetails.spec.template.spec.serviceAccountName
$CloudSqlInstances = $ApiDetails.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances'
if (-not $ApiPreviousRevision -or -not $ApiCurrentImage -or -not $ApiServiceAccount -or -not $CloudSqlInstances) { throw 'Could not resolve active API revision, image, service account, or Cloud SQL attachment. Stop and inspect the service configuration.' }

gcloud builds submit . --project $Project --config cloudbuild-api.yaml --substitutions "_IMAGE=$ApiImage"
if ($LASTEXITCODE -ne 0) { throw 'API image build failed.' }

# Keep existing service settings and production traffic; tag the candidate for private/manual smoke checks.
gcloud run deploy $ApiService --project $Project --region $Region --image $ApiImage --no-traffic --tag evaluator-candidate
if ($LASTEXITCODE -ne 0) { throw 'API candidate deployment failed.' }
$ApiAfter = gcloud run services describe $ApiService --project $Project --region $Region --format=json | ConvertFrom-Json
$ApiCandidate = @($ApiAfter.status.traffic | Where-Object { $_.tag -eq 'evaluator-candidate' })[0].url
if (-not $ApiCandidate) { throw 'Candidate API URL was not reported. Do not move traffic.' }
"API stable revision: $ApiPreviousRevision; candidate URL: $ApiCandidate"
```

Cloud Run retains the service's current environment, service account, Cloud SQL attachment, ingress, and network configuration when deploying an image update. Confirm these on the staged revision. If the service depends on a Serverless VPC Access connector, retain that connector and its egress settings on the candidate. Do not add `--allow-unauthenticated` as a shortcut; preserve the existing ingress and application JWT behavior.

## 2. Create the public evaluator password secret

The password is public demo data, not an administrator secret. Store a version so provisioning uses the same value the frontend displays. From PowerShell, `Set-Content` does not echo its input; remove the temporary file after upload.

```powershell
$EvaluatorEmail = 'evaluator@example.test'
$EvaluatorPassword = '<read-from-approved-secret-store>'
$PasswordFile = Join-Path $env:TEMP 'mercora-evaluator-password.txt'
Set-Content -LiteralPath $PasswordFile -Value $EvaluatorPassword -NoNewline
gcloud secrets describe mercora-evaluator-password --project $Project *> $null
if ($LASTEXITCODE -ne 0) { gcloud secrets create mercora-evaluator-password --project $Project --replication-policy automatic }
gcloud secrets versions add mercora-evaluator-password --project $Project --data-file $PasswordFile
Remove-Item -LiteralPath $PasswordFile -Force
```

The job's service account needs Secret Manager Secret Accessor for the referenced secrets and Cloud SQL Client for the database connection. The job reads `DATABASE_URL` and `SECRET_KEY` from the existing production secret resources; confirm their names and versions match the API service before execution. Do not print secret values or the service's environment in the terminal.

## 3. Provision the evaluator, seed, and verify

Use distinct one-off jobs and the staged API image. These commands execute against the production database, so first verify the target is the intended Mercora `mercora` database. They do not drop tables or truncate data. A successful seed rerun is idempotent.

```powershell
$DatabaseSecret = 'mercora-database-url:latest'
$JwtSecret = 'mercora-secret-key:latest'
$EvaluatorPasswordSecret = 'mercora-evaluator-password:latest'
$JobCommon = @('--project', $Project, '--region', $Region, '--image', $ApiImage,
  '--service-account', $ApiServiceAccount, '--set-cloudsql-instances', $CloudSqlInstances,
  '--set-secrets', "DATABASE_URL=$DatabaseSecret,SECRET_KEY=$JwtSecret")

gcloud run jobs create mercora-provision-evaluator --project $Project --region $Region `
  --image $ApiImage --service-account $ApiServiceAccount --set-cloudsql-instances $CloudSqlInstances `
  --set-secrets "DATABASE_URL=$DatabaseSecret,SECRET_KEY=$JwtSecret,EVALUATOR_PASSWORD=$EvaluatorPasswordSecret" `
  --set-env-vars "EVALUATOR_EMAIL=$EvaluatorEmail" --command python --args=-m,backend.scripts.provision_evaluator
if ($LASTEXITCODE -ne 0) { throw 'Provisioning job configuration failed; do not continue.' }
gcloud run jobs execute mercora-provision-evaluator --project $Project --region $Region --wait
if ($LASTEXITCODE -ne 0) { throw 'Evaluator provisioning job failed.' }

gcloud run jobs create mercora-seed-demo-data --project $Project --region $Region `
  --image $ApiImage --service-account $ApiServiceAccount --set-cloudsql-instances $CloudSqlInstances `
  --set-secrets "DATABASE_URL=$DatabaseSecret,SECRET_KEY=$JwtSecret" `
  --command python --args=-m,backend.scripts.seed_demo_data
if ($LASTEXITCODE -ne 0) { throw 'Seed job configuration failed; do not continue.' }
gcloud run jobs execute mercora-seed-demo-data --project $Project --region $Region --wait
if ($LASTEXITCODE -ne 0) { throw 'Demo seed job failed.' }

gcloud run jobs create mercora-verify-demo-data --project $Project --region $Region `
  --image $ApiImage --service-account $ApiServiceAccount --set-cloudsql-instances $CloudSqlInstances `
  --set-secrets "DATABASE_URL=$DatabaseSecret,SECRET_KEY=$JwtSecret" `
  --command python --args=-m,backend.scripts.verify_demo_data
if ($LASTEXITCODE -ne 0) { throw 'Verification job configuration failed; do not continue.' }
gcloud run jobs execute mercora-verify-demo-data --project $Project --region $Region --wait
if ($LASTEXITCODE -ne 0) { throw 'Demo data verification failed; do not move traffic.' }
```

For job reruns, use `gcloud run jobs update` with the same flags, then execute. The seed and verifier report deterministic demo counts and relationship integrity; inspect their job status/logs for the safe summary only. These scripts do not log credentials or database URLs.

After provisioning, use the read-only diagnostic to compare the account, configured password hash, target fingerprint, and candidate login. It also checks dashboard/analytics reads and permission denials. Create it with the fixed image, same service account, database secret and Cloud SQL attachment as the API:

```powershell
$DiagnosticJob = 'mercora-evaluator-diagnostic'
gcloud run jobs create $DiagnosticJob --project $Project --region $Region `
  --image $ApiImage --service-account $ApiServiceAccount --set-cloudsql-instances $CloudSqlInstances `
  --set-secrets "DATABASE_URL=$DatabaseSecret,SECRET_KEY=$JwtSecret,EVALUATOR_PASSWORD=$EvaluatorPasswordSecret" `
  --set-env-vars "EVALUATOR_EMAIL=$EvaluatorEmail,EVALUATOR_API_URL=$ApiCandidate" `
  --command python --args=-m,backend.scripts.diagnose_evaluator
gcloud run jobs execute $DiagnosticJob --project $Project --region $Region --wait
```

The diagnostic only reads the evaluator record. Its safe report includes role/active booleans, whether the configured password matches, a non-reversible database-target fingerprint, HTTP statuses, aggregate dashboard counts, and write-denial statuses. A passing report has login 200/role `evaluator`, invalid login 401, all reads 200, and all listed write checks 403.

Run a separate smoke job to verify that the evaluator can launch the built-in scenario and a seeded sample-order simulation. The job uses the evaluator password from Secret Manager and reports only HTTP/result statuses. Both routes call Cascade's simulation API and do not execute actions or update Mercora order data.

```powershell
gcloud run jobs create mercora-demo-simulation-check --project $Project --region $Region `
  --image $ApiImage --service-account $ApiServiceAccount `
  --set-secrets 'EVALUATOR_PASSWORD=mercora-evaluator-password:latest' `
  --set-env-vars "EVALUATOR_EMAIL=$EvaluatorEmail,EVALUATOR_API_URL=$ApiCandidateCors" `
  --command python --args=-m,backend.scripts.verify_demo_simulation
gcloud run jobs execute mercora-demo-simulation-check --project $Project --region $Region --wait
```

## 4. Check the staged API before the web build

The following check uses the public evaluator credentials and prints response status codes and aggregate metrics only. It obtains a token in process memory, does not print it, and verifies the evaluator can read metrics while a write is forbidden.

```powershell
$ApiCandidate = (gcloud run services describe $ApiService --project $Project --region $Region --format=json | ConvertFrom-Json).status.traffic | Where-Object { $_.tag -eq 'evaluator-candidate' } | Select-Object -ExpandProperty url -First 1
$Login = Invoke-RestMethod -Method Post -Uri "$ApiCandidate/api/auth/login" -ContentType 'application/json' -Body (@{ email = $EvaluatorEmail; password = $EvaluatorPassword } | ConvertTo-Json)
$Headers = @{ Authorization = "Bearer $($Login.access_token)" }
$Metrics = Invoke-RestMethod -Method Get -Uri "$ApiCandidate/api/metrics?days=30" -Headers $Headers
"Metrics: orders=$($Metrics.sales.order_count), sales=$($Metrics.sales.total_sales), products=$($Metrics.inventory.total_products), low-stock=$($Metrics.inventory.low_stock_items), top-products=$($Metrics.top_products.Count)"
try {
  Invoke-RestMethod -Method Post -Uri "$ApiCandidate/api/products" -Headers $Headers -ContentType 'application/json' -Body (@{ sku='DEMO-LAPTOP-001'; name='Duplicate safety probe'; category='Probe'; price=1; cost=1 } | ConvertTo-Json) | Out-Null
  throw 'Evaluator product write unexpectedly succeeded.'
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw 'Expected evaluator write to be rejected with HTTP 403.' }
  'Evaluator write restriction: HTTP 403 (expected)'
}
```

Also verify the candidate health endpoint, top products, and analytics read endpoints, and sign in via the browser after the web candidate below is ready. A successful login must show nonzero seeded metrics; write/admin endpoints must reject evaluator access. Use the administrator account only for separate checks and never place its password in commands or logs.

## 5. Build and stage the frontend

`NEXT_PUBLIC_API_URL` is embedded in the Next.js bundle at image build time. Changing a Cloud Run runtime environment variable does not change the browser's API target; rebuild the image when it changes.

```powershell
$WebDetails = gcloud run services describe $WebService --project $Project --region $Region --format=json | ConvertFrom-Json
$WebTrafficBefore = @($WebDetails.status.traffic | Where-Object { $_.percent -gt 0 })
$WebPreviousRevision = $WebTrafficBefore[0].revisionName
$WebCurrentImage = $WebDetails.spec.template.spec.containers[0].image
$WebImageRepository = $WebCurrentImage -replace '(@sha256:.*|:[^/:]+)$', ''
$WebImage = "${WebImageRepository}:evaluator-$BuildId"
if (-not $WebPreviousRevision -or -not $WebCurrentImage) { throw 'Could not resolve active web revision/image. Stop and inspect the service configuration.' }
$WebCandidateOrigin = "https://evaluator-candidate---$(([uri]$WebDetails.status.url).Host)"

# Use exact local and production origins; do not retain wildcard CORS. Include the tagged web candidate for browser smoke checks.
$ApiServiceDetails = gcloud run services describe $ApiService --project $Project --region $Region --format=json | ConvertFrom-Json
$CorsOrigins = @('http://localhost:3000','http://127.0.0.1:3000','http://localhost:3001','http://127.0.0.1:3001','https://mercora-web-gp5ciyqy6a-el.a.run.app','https://cascade-web-gp5ciyqy6a-el.a.run.app',$WebCandidateOrigin)
$CorsValue = $CorsOrigins -join ','
gcloud run deploy $ApiService --project $Project --region $Region --image $ApiImage --no-traffic --tag evaluator-candidate-cors --update-env-vars "^~^CORS_ORIGINS=$CorsValue"
if ($LASTEXITCODE -ne 0) { throw 'Could not stage the CORS-enabled API candidate.' }
$ApiAfterCors = gcloud run services describe $ApiService --project $Project --region $Region --format=json | ConvertFrom-Json
$ApiCandidateCors = @($ApiAfterCors.status.traffic | Where-Object { $_.tag -eq 'evaluator-candidate-cors' })[0].url
if (-not $ApiCandidateCors) { throw 'CORS-enabled API candidate URL was not reported.' }

$StableApiUrl = 'https://mercora-api-gp5ciyqy6a-el.a.run.app'
gcloud builds submit . --project $Project --config cloudbuild-web.yaml --substitutions "_IMAGE=$WebImage,_API_URL=$StableApiUrl,_EVALUATOR_EMAIL=$EvaluatorEmail,_EVALUATOR_PASSWORD=$EvaluatorPassword"
if ($LASTEXITCODE -ne 0) { throw 'Frontend image build failed.' }
gcloud run deploy $WebService --project $Project --region $Region --image $WebImage --no-traffic --tag evaluator-candidate
if ($LASTEXITCODE -ne 0) { throw 'Frontend candidate deployment failed.' }
$WebAfter = gcloud run services describe $WebService --project $Project --region $Region --format=json | ConvertFrom-Json
$WebCandidate = @($WebAfter.status.traffic | Where-Object { $_.tag -eq 'evaluator-candidate' })[0].url
if (-not $WebCandidate) { throw 'Candidate web URL was not reported. Do not move traffic.' }
"Web stable revision: $WebPreviousRevision; candidate URL: $WebCandidate"
```

The evaluator credential values are intentionally public and are displayed in the login bundle. Do not substitute or include administrator credentials, JWT secrets, database URLs, or private data in build arguments.

## 6. Verify, then promote manually

At the tagged web URL, confirm the public credentials are visible and autofill correctly, evaluator login works, the dashboard displays seeded sales/orders/products/low-stock figures, analytics and top products load, and admin-only controls are unavailable. Verify server-side restriction with the API check above. An API failure must show an unavailable state instead of treating the figures as actual zeros. Do not promote either candidate if any check fails.

Only after verification and an explicit release decision, send all traffic to the tested candidate revisions:

```powershell
gcloud run services update-traffic $ApiService --project $Project --region $Region --to-revisions "$($ApiAfterCors.status.traffic | Where-Object { $_.tag -eq 'evaluator-candidate-cors' } | Select-Object -ExpandProperty revisionName -First 1)=100"
gcloud run services update-traffic $WebService --project $Project --region $Region --to-revisions "$($WebAfter.status.traffic | Where-Object { $_.tag -eq 'evaluator-candidate' } | Select-Object -ExpandProperty revisionName -First 1)=100"
```

## Rollback

Before promotion, production remains on the original traffic revisions; leave the candidates tagged at zero percent or remove them after review. If a promoted revision fails, restore the captured prior revisions:

```powershell
gcloud run services update-traffic $ApiService --project $Project --region $Region --to-revisions "$ApiPreviousRevision=100"
gcloud run services update-traffic $WebService --project $Project --region $Region --to-revisions "$WebPreviousRevision=100"
```

Demo data already written is additive/upserted and does not need destructive rollback. Fix the issue and stage a new candidate. Do not delete or reset production user or commerce data as part of rollback.
