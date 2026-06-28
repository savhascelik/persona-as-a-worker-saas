# Persona-as-a-Worker Workspace Rules & Behavioral Constraints

This document defines critical instructions, behavioral constraints, and workflows for Antigravity or any other AI coding agents working on this codebase.

## 🚀 1. Project Mission & Non-Simulation Constraints (Gerçek Dünya Entegrasyonu)
* **Real-World Executions Only:** This platform is built for real-world automated agentic workflows solving real-world problems. **Never write simulation files, mock responses, or fake results.**
* **Zero Simulation Propagation:** If an endpoint scanner, API call, or database query fails due to security or connection issues, the platform must transparently raise and render actual soft-destructive error messages (`Execution Failed: ...` or similar diagnostics). Do not substitute mockup placeholders.
* **Strict Tool Check:** Always evaluate persona skill compatibility directly against the target company's active scanned `discoveredTools` in the connected platform's MCP API. If tools are missing, declare the skill incompatible.

---

## 🌿 2. Git & v0.dev Branch Synchronization Workflow (v0 Senkronizasyon Akışı)
To prevent code conflicts and keep v0.dev designs perfectly aligned with yerel (local) development on the `main` branch, always perform the following merge workflow when updating local changes to GitHub:

1. **Commit & Push on `main`:**
   * Stage modifications and new files (excluding temporary files like `db.json` and `scratch/`).
   * Commit the changes and push to remote `main`:
     ```bash
     git add .
     git commit -m "feat: your commit message"
     git push origin main
     ```
2. **Merge `main` into v0 branch (`v0/savhascelik-2582-d4eecd42`):**
   * Switch to the local v0 branch:
     ```bash
     git checkout v0/savhascelik-2582-d4eecd42
     ```
   * Pull the latest changes from the remote v0 branch to stay fully senkronize:
     ```bash
     git pull origin v0/savhascelik-2582-d4eecd42
     ```
   * Merge `main` into the v0 branch:
     ```bash
     git merge main --no-edit
     ```
   * Push the updated v0 branch back to remote:
     ```bash
     git push origin v0/savhascelik-2582-d4eecd42
     ```
3. **Return to `main`:**
   * Switch back to the local `main` branch to continue ongoing development safely:
     ```bash
     git checkout main
     ```

---

## 📦 3. Git Ignores
* Do not commit local mock cache databases like `db.json` or scratch workspaces under `scratch/`. These are automatically ignored via `.gitignore` to keep git logs clean.
