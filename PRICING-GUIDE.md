# Water Billing Project — Practical Pricing Guide (PHP)

A pricing reference for quoting this custom desktop billing system to clients in the Philippines.

---

## What You're Selling

This is not a simple website. It is a **custom desktop billing system** with:

| Area | What's Included |
|------|-----------------|
| **Core billing** | Multi-step generator, auto statement numbers, consumption/charge calculations, customer autocomplete |
| **Records & reporting** | Billing history, dashboard stats |
| **Documents** | PDF export + thermal receipt layout |
| **Backend** | Rust + SQLite, transactions, WAL mode, daily auto-backup, USB export |
| **Security/admin** | User roles, password hashing, audit logs |
| **Stack** | Tauri v2 + React 19 + TypeScript + Tailwind |

**Scope estimate:** ~3,000 lines of project code across 5 modules. Rebuilding from scratch is typically **160–220 hours** for one competent developer (planning, build, testing, install, basic training).

This puts the project in **mid-tier custom software**, not a ₱20k template job.

---

## Recommended Rates (Philippine Peso)

### Hourly Rate

| Your Level | Local Client (barangay / coop / small LGU) | Private Org / Metro Manila |
|------------|--------------------------------------------|----------------------------|
| Junior–mid | **₱400 – ₱700/hr** | **₱600 – ₱900/hr** |
| Mid (can deliver this stack solo) | **₱700 – ₱1,200/hr** | **₱1,000 – ₱1,800/hr** |
| Senior / specialist (React + Rust/Tauri) | **₱1,200 – ₱1,800/hr** | **₱1,800 – ₱2,500/hr** |

**Sweet spot for this project:** **₱800 – ₱1,200/hr** if you are mid-level and the client is local.

Tauri + Rust is uncommon in the PH market — that justifies the upper half of the range, not junior web-dev rates.

---

### Fixed Project Price

Use hours × rate, then round up for risk and value:

| Scenario | Suggested Fixed Price |
|----------|------------------------|
| **Full build from scratch** (what this repo represents) | **₱150,000 – ₱250,000** |
| **Provincial barangay / small water association** (tight budget) | **₱100,000 – ₱150,000** (minimum you should accept) |
| **Metro Manila private utility / cooperative** | **₱200,000 – ₱350,000** |
| **Already built — license + install only** | **₱40,000 – ₱80,000** one-time |
| **Monthly support** (updates, backup help, minor fixes) | **₱3,000 – ₱8,000/month** |

**Recommended single quote:** **₱180,000** fixed — defensible for the scope, still reasonable for a local water billing client.

---

## How to Structure the Quote

Do not sell "coding hours." Sell a package:

1. **Discovery & setup** — billing rules, receipt format, tapstand fields
2. **Development & testing** — all 5 modules
3. **Installation** — 1 PC + backup setup
4. **Training** — 1–2 sessions for admin/clerk
5. **Warranty** — 30–60 days bug fixes included

### Example Breakdown (Client-Facing)

| Item | Amount |
|------|--------|
| System development | ₱140,000 |
| Installation & data setup | ₱15,000 |
| Training (half day) | ₱10,000 |
| 60-day support | ₱15,000 |
| **Total** | **₱180,000** |

---

## What to Adjust Up or Down

### Charge More If

- They want custom receipt branding, multiple water rates, payment tracking, or Excel import
- They need multiple PCs / network sync
- They expect ongoing feature requests
- You are also handling hardware (thermal printer setup)

### Charge Less Only If

- It is a repeat client or referral pipeline
- Scope is clearly cut (e.g. billing generator only, no audit/users)
- They pay **50% upfront** and you keep rights to reuse the codebase

### Floor Price

**Do not go below ₱80,000** for the full system — at that point you are underpricing specialized desktop work.

---

## Quick Reference

| Question | Answer |
|----------|--------|
| **Hourly rate to demand** | **₱800 – ₱1,200/hr** (local client, mid-level) |
| **Fixed price to demand** | **₱150,000 – ₱220,000** |
| **Best single number to lead with** | **₱180,000** all-in |

---

## Client-Ready Quote Template

> **Project:** Custom Water Billing Desktop System  
> **Total Investment:** ₱180,000 (VAT-exclusive, if applicable)  
>  
> **Includes:**
> - Billing statement generator with PDF and thermal receipt export
> - Billing records archive and dashboard statistics
> - User management with role-based access and audit logs
> - Local database with automatic daily backup
> - Installation on one (1) workstation
> - Admin and clerk training (half day)
> - 60-day warranty for bug fixes
>  
> **Payment terms:** 50% upon contract signing, 50% upon delivery and acceptance  
>  
> **Optional add-ons:**
> - Monthly maintenance: ₱5,000/month
> - Additional workstation install: ₱5,000 each
> - Custom feature development: quoted separately at ₱900/hr

---

*Last updated: June 2026*
