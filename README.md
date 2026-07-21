# Shipping refund prototype

This project exposes a local status boundary only. The historical runtime automated a carrier website, solved CAPTCHAs, decrypted and logged user passwords, interpolated SQL, extracted ZIPs without safe-entry checks, and executed a database job merely by importing a module. Those behaviors have been removed from the supported code path. Carrier, database, and refund-mutation routes now require an admin key and return HTTP 501 without making external calls or changing data.

Run `npm run check` to validate JavaScript syntax. After dependencies are installed in an isolated environment, `npm start` binds to `127.0.0.1` by default. Do not add real secrets or shipment records to this repository.

Completion requires an owner-approved carrier API and terms-of-use review, a documented refund eligibility policy, modern supported dependencies, secure identity and role boundaries, encrypted secret management, parameterized persistence and migrations, safe bounded document handling, retention/audit rules, representative tests, CI, and production deployment ownership.
