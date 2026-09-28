#!/usr/bin/env bash
# Fails if tracked (or staged) files contain likely secrets or forbidden files.
# Runs without network; complements (does not replace) a hosted secret scanner.
set -uo pipefail
cd "$(dirname "$0")/.."
files=$(git ls-files --cached --others --exclude-standard)
fail=0
bad_paths=$(printf '%s\n' "$files" | grep -E '(^|/)(\.env(\.[a-z]+)?|\.demo-credentials\.local\.json|.*\.pem|.*\.key|id_rsa)$' | grep -v '^\.env\.example$' || true)
if [ -n "$bad_paths" ]; then echo "Forbidden files tracked:"; echo "$bad_paths"; fail=1; fi
for d in node_modules .next test-results playwright-report; do
  if printf '%s\n' "$files" | grep -q "^$d/"; then echo "Build/output directory tracked: $d/"; fail=1; fi
done
patterns='(sk_live_[0-9a-zA-Z]{10,}|sb_secret_[0-9A-Za-z_-]{10,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|ghp_[0-9A-Za-z]{30,}|postgres(ql)?://[^:@/ ]+:[^@/ ]{12,}@)'
hits=$(printf '%s\n' "$files" | grep -vE '\.(png|jpg|jpeg|webp|avif|woff2|ico|gif)$|^pnpm-lock\.yaml$|^scripts/secret-scan\.sh$' | xargs -r grep -InE "$patterns" 2>/dev/null || true)
if [ -n "$hits" ]; then echo "Possible secrets:"; echo "$hits"; fail=1; fi
# Service-role JWTs (role claim service_role) outside the local-stack key generator.
jwt_hits=$(printf '%s\n' "$files" | grep -vE '\.(png|jpg|jpeg|webp|avif|woff2)$' | xargs -r grep -IlE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' 2>/dev/null || true)
if [ -n "$jwt_hits" ]; then echo "JWT-looking strings in:"; echo "$jwt_hits"; fail=1; fi
[ $fail = 0 ] && echo "secret scan: clean ($(printf '%s\n' "$files" | wc -l) files)"
exit $fail
