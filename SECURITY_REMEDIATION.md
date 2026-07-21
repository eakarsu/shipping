# Security remediation status

Tracked credential literals, a database decryption key, a long-lived CAPTCHA token, downloaded carrier reports, captured HTML/JSON, tracking-number fixtures, and ZIP archives were removed from the current tree. These values and records remain recoverable from Git history. Credential owners must rotate or revoke every exposed secret, and the repository owner must decide whether to rewrite history under an approved incident and retention procedure. Shipment/customer artifacts require a privacy and retention review.

Runtime configuration is now environment-only through `.env.example`; `.env`, debug output, temporary data, reports, tracking fixtures, and archives are ignored. The local server binds to loopback, limits request bodies, does not expose stack traces, and gates every former update/check/toggle route with a timing-safe admin-key comparison. Mutations are POST-only and disabled until an approved integration replaces the old scraper.

The dependency set is from an obsolete Node/Angular-era stack and has not been installed or run. It must be upgraded and audited in isolation before this project can be considered safe to operate.
