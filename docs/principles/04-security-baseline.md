# 04 – Security baseline for web applications

The minimum every project meets. It comes from real findings (a "slicer options" feature that allowed command
execution on the server, a key-injection bypass of its own fix, DNS rebinding against a local server, path
traversal in file APIs). Tasks that touch these areas are **high risk** (never auto-merged).

## Input and execution

- **MUST** validate every external input at the boundary: type, length, range, allowed values (allowlist, not
  denylist). One schema per payload, shared by all transports.
- **MUST NOT** pass user-influenced strings to a shell, an interpreter, a template engine, an SQL string or a
  file path without a strict allowlist. Use argument arrays (`spawn(cmd, [args])`), parameterised queries and
  resolved-path checks (`resolved.startsWith(base + sep)`).
- **MUST** treat configuration or options that a user can set as code when they can reach an executable setting
  (post-processing scripts, hooks, plugins, custom commands). Allowlist the keys; reject the rest with the
  allowed list in the error message.
- **Verify the actual mechanism of every control.** A protection that works "because the child process happens to
  close stdin" is an accident, not a control — it disappears with the next refactoring. Remove the dangerous
  capability (strip the key at the single funnel) and pin it with a test.
- A fix for an injection is tested with the **bypass variants** (case, encoding, aliases, nested keys, other
  entry points such as the RPC/MCP transport), not only the reported case.

## Network exposure

- **MUST** a service meant for localhost binds to localhost and checks `Host` and `Origin` headers (DNS
  rebinding, CSRF from other sites). A home-lab service without authentication is documented as such.
- **MUST** state-changing endpoints require authentication as soon as the service is reachable beyond a trusted
  network; sessions use `HttpOnly`, `Secure`, `SameSite` cookies or short-lived tokens.
- Set security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) at one place.
- Rate-limit and size-limit uploads and expensive endpoints; every file import has a maximum size and a type check.

## Secrets and data

- **MUST** no secrets, tokens, or personal data in the repository, logs, error messages or URLs.
  Secrets come from the environment or a secret store. CI tokens are least-privilege (read-only where possible).
- Third-party content (imported files, remote API responses) is untrusted: parse defensively, bound recursion
  and memory, never `eval` or dynamically import it.
- Persisted user data has a documented location, retention and deletion path.

## Dependencies and supply chain

- Lock file committed; automated update PRs (Dependabot/Renovate) grouped by stack; `npm audit`-class scan in CI,
  failing on high severity for production dependencies.
- CI workflows run with read-only `permissions:` by default; pin third-party actions to a major version or sha.
- Dockerfiles: pinned base image, non-root user, no build secrets in layers.

## Resource safety

- Everything that is opened is closed: timers, listeners, workers, streams, GPU/WebGL resources, child processes
  (with timeouts and kill on cancel). Add a test for the cancel path.
- Unbounded input never reaches an unbounded loop or buffer.

## Review checklist (security-relevant tasks)

1. What can an attacker (or a typo) put into each input of this change? Where does it end up?
2. Does any new code path reach a shell, file system, network or executable setting?
3. Is there a second entry point (REST vs. RPC/MCP vs. CLI) that skips the validation?
4. What happens on cancel, timeout, and partial failure? Are resources released?
5. Does the test suite contain the bypass variant, and the failure of the guard itself?
