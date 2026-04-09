# Security Audit Report — Adaptive Learning System

**Date:** 2026-04-09
**Branch:** feat/app-security
**Scan tool:** OWASP ZAP (automated scan on dev environment)
**Stack:** React 18 + Vite 5 · FastAPI · Docker Compose

---

## Overview

An automated security scan using OWASP ZAP was conducted against the development
deployment of the Adaptive Learning System. The scan targeted the Vite dev server
(`http://localhost:5173`) and the FastAPI backend (`http://localhost:8000`).

Eight findings were identified across two layers (frontend and backend). All have
been addressed in branch `feat/app-security`. The table below summarises each
finding, its severity, and its resolution status.

| # | Finding | Layer | Severity | Status |
|---|---------|-------|----------|--------|
| 1 | CSP includes `unsafe-eval` in `script-src` | Frontend | Medium | Fixed ✅ |
| 2 | CSP includes `unsafe-inline` in `script-src` | Frontend + Backend | Medium | Fixed ✅ |
| 3 | Missing `X-Content-Type-Options` header | Both | Medium | Fixed ✅ (commit 2f7527e) |
| 4 | Missing `X-Frame-Options` header | Both | Medium | Fixed ✅ (commit 2f7527e) |
| 5 | Overly permissive `connect-src` | Frontend | Low | Fixed ✅ |
| 6 | Missing `Referrer-Policy` header | Backend | Low | Fixed ✅ |
| 7 | Missing `Permissions-Policy` header | Backend | Low | Fixed ✅ |
| 8 | Subresource Integrity (SRI) not implemented | Backend (Swagger CDN) | Low | Accepted ⚠️ |

---

## Detailed Findings and Resolutions

### Finding 1: CSP includes `unsafe-eval` — FIXED ✅

**Location:** `frontend/vite.config.ts` → `Content-Security-Policy: script-src`

**Risk:** Medium.

`unsafe-eval` permits the browser to execute strings as JavaScript code via `eval()`,
`new Function()`, and `setTimeout(string)`. If an attacker achieves any form of
reflected or stored XSS, `unsafe-eval` dramatically amplifies the impact: any
injected string can be promoted to executable code. This is particularly dangerous
in an authenticated application where a student's session or identity data could
be exfiltrated.

**Root cause:**

`@monaco-editor/react` (Monaco Editor) requires `unsafe-eval` because its language
service workers rely on `eval()`-based dynamic code compilation. This is a documented,
hard architectural constraint of the Monaco worker engine — it cannot be removed
without replacing the editor.

**Resolution:**

Replaced `@monaco-editor/react` with **CodeMirror 6** (`@uiw/react-codemirror`).
CodeMirror 6 was rewritten from scratch with a fundamentally different worker
architecture that does not use `eval()`. It provides equivalent functionality:
Python syntax highlighting, line numbers, bracket matching, and autocompletion.
`unsafe-eval` was removed from `script-src` in `frontend/vite.config.ts`.

**Why CodeMirror over Monaco:**
CodeMirror 6 is actively maintained, widely deployed in security-sensitive
environments (Jupyter, CodeSandbox, Replit), and is a drop-in replacement for
the editor use case in this project. The visual and functional impact on the
student experience is negligible.

**Files changed:** `frontend/package.json`, `frontend/src/components/EditorPanel.tsx`

---

### Finding 2: CSP includes `unsafe-inline` in `script-src` — FIXED ✅

**Location:** `frontend/vite.config.ts`, `backend/app/core/config.py`

**Risk:** Medium.

`unsafe-inline` in `script-src` allows execution of any `<script>` block present
in the HTML document. This effectively disables CSP as an XSS defence: if an
attacker injects a `<script>alert(1)</script>` tag anywhere in the page, the
browser will execute it. Without `unsafe-inline`, injected script tags are blocked
regardless of their content.

**Root cause — Frontend:**

Vite's development server injects the React Fast Refresh (HMR) preamble as an
inline `<script>` block in the served HTML. Without `unsafe-inline`, the browser
blocks this script and the development server fails to initialise. This is a
Vite-specific dev tooling requirement that does not apply to production builds.

**Root cause — Backend:**

The FastAPI Swagger UI (`/docs`) renders inline JavaScript to initialise the UI.
The default FastAPI template includes `unsafe-inline` to accommodate these scripts.

**Resolution — Frontend:**

Added `vite-plugin-csp-guard@2.2.0` to the build pipeline. The plugin intercepts
Vite's HTML transformation step, computes a SHA-256 hash of every inline script
(including the React Fast Refresh preamble), and injects those hashes into the
`script-src` directive. The browser accepts a script if and only if its computed
hash matches one of the declared values — without needing `unsafe-inline`.

Result: `script-src 'self' 'sha256-...' 'sha256-...'` — no `unsafe-inline`.

**Resolution — Backend:**

Removed `'unsafe-inline'` from `script-src` in `backend/app/core/config.py`. The
remaining CDN source (`https://cdn.jsdelivr.net`) is sufficient for Swagger UI to
load its script bundle. Inline script blocks in Swagger UI are blocked by this
policy, which is acceptable: the Swagger UI endpoint should be disabled in
production (see Finding 8).

**Note on `style-src`:**

`'unsafe-inline'` is retained in `style-src` on both layers. CSS-in-JS libraries,
Tailwind utility classes, and inline style attributes require this directive.
Removing it from `style-src` would require nonce injection incompatible with
Tailwind's JIT compilation mode. This is an accepted trade-off: `style-src
unsafe-inline` cannot be exploited to execute JavaScript and carries significantly
lower risk than the equivalent `script-src` directive.

**Files changed:** `frontend/package.json`, `frontend/vite.config.ts`,
`backend/app/core/config.py`

---

### Finding 3: Missing `X-Content-Type-Options` header — FIXED ✅ (commit 2f7527e)

**Location:** Backend middleware, frontend Vite headers

**Risk:** Low–Medium.

Without this header, browsers may perform MIME-type sniffing: if a server returns
a resource with `Content-Type: text/plain` but the content looks like JavaScript,
the browser may execute it as a script. This enables MIME-confusion attacks where
an attacker controls file upload content but not the served `Content-Type`.

**Resolution:**

`X-Content-Type-Options: nosniff` added to both:
- `SecurityHeadersMiddleware` in `backend/app/core/security.py` (applied to all API responses)
- `server.headers` in `frontend/vite.config.ts`

---

### Finding 4: Missing `X-Frame-Options` header — FIXED ✅ (commit 2f7527e)

**Location:** Backend middleware, frontend Vite headers

**Risk:** Medium.

Without this header, the application can be embedded in an `<iframe>` on a
third-party website. An attacker can overlay invisible UI elements over the frame,
tricking the user into performing unintended actions (clickjacking). For an
authenticated LMS this could mean unintended submissions or profile changes.

**Resolution:**

`X-Frame-Options: DENY` added to both layers. The CSP `frame-ancestors 'none'`
directive provides equivalent modern protection and is included in the CSP policy
on both layers. Both defences are present for maximum compatibility.

---

### Finding 5: Overly permissive `connect-src` — FIXED ✅

**Location:** `frontend/vite.config.ts` → `Content-Security-Policy: connect-src`

**Risk:** Low.

The original CSP contained `connect-src http: https:`, permitting the page to
send `fetch` and `XMLHttpRequest` requests to any HTTP or HTTPS host on the
internet. In the presence of an XSS vulnerability, this would allow an attacker
to exfiltrate session data, user answers, or skill scores to an arbitrary
external server.

**Resolution:**

`connect-src` narrowed to:
```
connect-src 'self' ws://localhost:5173 wss://localhost:5173 http://localhost:8000
```

This permits only:
- Same-origin requests (`'self'`)
- Vite HMR WebSocket connections (required for hot module replacement in dev)
- Backend API calls (`http://localhost:8000`)

All outbound requests to external origins are now blocked by policy.

**Files changed:** `frontend/vite.config.ts`

---

### Finding 6: Missing `Referrer-Policy` header — FIXED ✅

**Location:** `backend/app/core/security.py`

**Risk:** Low.

Without a `Referrer-Policy`, the browser sends the full URL of the current page
as the `Referer` header on outbound navigation and resource requests. In an LMS
context, internal routes such as `/courses/1/modules/3/lessons/2/exercises/7`
could reveal the student's progress path to third-party analytics or CDN endpoints.

**Resolution:**

Added `Referrer-Policy: strict-origin-when-cross-origin` to `SecurityHeadersMiddleware`.
This sends only the origin (no path) on cross-origin requests, and the full URL
on same-origin requests.

**Files changed:** `backend/app/core/security.py`

---

### Finding 7: Missing `Permissions-Policy` header — FIXED ✅

**Location:** `backend/app/core/security.py`

**Risk:** Low.

Without a `Permissions-Policy`, the application does not explicitly restrict access
to sensitive browser APIs (camera, microphone, geolocation). In the event of a
successful XSS, malicious code could invoke these APIs to surveil the user.

**Resolution:**

Added `Permissions-Policy: geolocation=(), microphone=(), camera=()` to
`SecurityHeadersMiddleware`. This explicitly disables all three APIs for this
origin, eliminating them as a potential XSS escalation vector.

**Files changed:** `backend/app/core/security.py`

---

### Finding 8: Subresource Integrity (SRI) not implemented — ACCEPTED RISK ⚠️

**Location:** FastAPI Swagger UI (`/docs`, `/redoc`)

**Risk:** Low.

FastAPI's built-in Swagger UI loads JavaScript and CSS bundles from
`https://cdn.jsdelivr.net` without `integrity` attributes. If the CDN were
compromised or the specific version tampered with, malicious scripts could be
served to anyone accessing the documentation endpoint.

**Decision: Accepted for development; mitigated in production.**

In production, the Swagger UI endpoints must be disabled entirely:

```python
app = FastAPI(docs_url=None, redoc_url=None)
```

Disabling the docs endpoint eliminates all CDN dependencies, making SRI
unnecessary. The frontend loads no external scripts; all assets are bundled by
Vite and served from the same origin.

Implementing SRI for the Swagger UI would require overriding FastAPI's internal
HTML generation template and manually pinning CDN resource hashes — a maintenance
burden with no benefit if the endpoint is disabled in production.

---

## Final Security Header State

### Backend — all API responses (`/health`, `/courses`, `/submit`, etc.)

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com; font-src 'self' data: https://cdn.jsdelivr.net; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

### Frontend — Vite dev server (`localhost:5173`)

| Header | Value |
|--------|-------|
| `Content-Security-Policy` (via meta tag, generated by `vite-plugin-csp-guard`) | `default-src 'self'; script-src 'self' 'sha256-...' ...; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://localhost:5173 wss://localhost:5173 http://localhost:8000; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |

---

## Test Coverage

Security header behaviour is verified by automated tests in
`backend/tests/test_api.py`:

| Test | Assertion |
|------|-----------|
| `test_security_headers_present_on_api_response` | CSP, X-Frame-Options, X-Content-Type-Options present on all responses |
| `test_security_headers_present_on_docs_response` | Same headers present on `/docs` |
| `test_csp_script_src_has_no_unsafe_directives` | `script-src` contains neither `unsafe-inline` nor `unsafe-eval` |
| `test_referrer_policy_header_present` | `Referrer-Policy: strict-origin-when-cross-origin` present |
| `test_permissions_policy_header_present` | `Permissions-Policy` with geolocation, microphone, camera disabled |

Run: `cd backend && python3 -m pytest tests/test_api.py -v`

---

## Academic Justification

Web application security headers constitute a defence-in-depth layer that operates
independently of application business logic. The vulnerabilities identified in this
audit are characteristic of modern single-page application (SPA) architectures and
arise from the inherent tension between developer-experience tooling and production
security requirements.

The `unsafe-inline` and `unsafe-eval` directives in Content Security Policy are
commonly present in development configurations because build tools such as Vite
rely on inline script injection for Hot Module Replacement and runtime compilation
features. In a development environment, these directives represent an acceptable
operational trade-off: the attack surface is limited to the local network, no
production data is processed, and the productivity benefit is substantial. However,
their uncritical promotion into production configurations would materially weaken
CSP, reducing a cryptographically enforced script execution policy to a
configuration artefact with little protective value.

The approach adopted in this project demonstrates that these directives are not
inherent requirements of React-based SPAs, but rather artefacts of specific library
choices and unexamined defaults. By replacing Monaco Editor with CodeMirror 6 —
which eliminates the `unsafe-eval` hard dependency — and by integrating
`vite-plugin-csp-guard` to perform build-time SHA-256 hash generation for
Vite-injected inline scripts, the project achieves a strict Content Security Policy
without sacrificing developer tooling or student-facing functionality.

This approach aligns with OWASP's recommended strategy for CSP deployment (OWASP
CSP Cheat Sheet, 2024): prefer hash-based or nonce-based policies over blanket
keyword allowances such as `unsafe-inline` and `unsafe-eval`, since hashes provide
cryptographic assurance that only the developer's own scripts execute, even in the
presence of HTML injection vulnerabilities. The additional headers (`Referrer-Policy`,
`Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`) implement the
principle of least privilege at the browser API level, restricting the application
to only the capabilities it requires and limiting the blast radius of any future
vulnerability discovery.
