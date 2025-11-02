🔒 CRITICAL: Remove committed secrets and implement security hardening

**Summary**
This PR removes accidentally committed .env files, implements basic repository hardening, and adds documentation and CI secret scanning to prevent repeat exposures.

**Changes**
- Add .env to .gitignore
- Add .env.example with placeholders
- Add .github/workflows/secret-scan.yml (TruffleHog / secret scanner)
- Add PR-DESCRIPTION.md, SECURITY-REMOVAL-REPORT.md, HANDOFF.md, 	asks.json

**Acceptance criteria**
- .env removed from working tree and not tracked
- Secret-scan workflow runs clean on PR
- New instructions for rotating keys are in SECURITY-REMOVAL-REPORT.md
- CI (lint + tests) green before merge

**Risk / Notes**
- Keys exposed in previous commits still need rotation (do not merge until rotated)
- History purge (BFG / git-filter-repo) may be required after acceptance; coordinate with team for rewrites

