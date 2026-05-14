# Audit Apply Note — AIAutomateroutingmedical

Source: `_AUDIT/reports/batch_00.md` § 32.

## Audit findings vs. reality
The audit lists 9 AI endpoints but the codebase actually has many more in `routes/aiFeatures.js`:
- `traffic-adjust` already implements travel-time / traffic-aware optimization.
- `skill-match` already implements nurse skill matching.
- `outcome-predict` already implements patient outcome prediction.

Only "AI no-show prediction" from the audit gap list was genuinely missing.

## Original audit recommendations

### Missing AI counterparts
- AI travel time optimization (already present as `/traffic-adjust`)
- AI no-show prediction (IMPLEMENTED)
- AI patient outcome prediction (already present as `/outcome-predict`)
- AI nurse skill matching (already present as `/skill-match`)

### Missing non-AI features
- EHR integration
- Mobile app for nurses
- Telemedicine video
- Caregiver feedback collection

## Implemented in this pass (MECHANICAL)

| # | Item | File | Endpoint |
|---|------|------|----------|
| 1 | AI no-show prediction | `backend/routes/aiFeatures.js` | `POST /api/ai-features/no-show-predict` |

Uses existing `callAI` / `parseAIJson` helpers (ES-module style). Computes patient baseline no-show rate from history table and asks AI to refine to a probability with intervention recommendations. ESM `node --check` passes.

## Backlog (not implemented)

| Item | Tag | Why deferred |
|------|-----|---------------|
| EHR integrations (Epic, Cerner, HL7) | NEEDS-CREDS | Vendor partnerships & PHI handling |
| Nurse mobile app | NEEDS-PRODUCT-DECISION | Native/RN/PWA decision needed |
| Telemedicine video | NEEDS-CREDS | Video provider (Twilio Video, Vonage) |
| Caregiver feedback collection | TOO-RISKY | New entity model + UI |
| Real-time vital streaming | TOO-RISKY | Stream / IoT infra |

## Apply pass 3 (frontend)

- **Status:** FE already wired — no changes.
- **Stack:** Vite + React.
- **Verification:** `App.jsx` registers a dedicated page per AI endpoint (`AIRouteOptimizer`, `AIOrderProcessor`, `AIVisitNotes`, `AIScheduler`, `AIRiskAssessment`, `AIChat`, `AILogs`, `AITrafficAdjust`, `AIAcuityAlert`, `AIMedicationCheck`, `AISkillMatch`, `AIOutcomePredict`, `AIFamilyPortal`, `AIShiftSwap`, `AIPreauth`, `AINoShowPredict`). `api.js` adds JWT Bearer from `localStorage.getItem('token')`.
- **No FE changes made** (idempotence rule).

## Apply pass 4 (mechanical backlog)

**SKIPPED** — no MECHANICAL items in backlog. All deferred entries are tagged NEEDS-CREDS (EHR Epic/Cerner/HL7, telemedicine video, real-time vital streaming), NEEDS-PRODUCT-DECISION (nurse mobile app), or TOO-RISKY (caregiver feedback collection). Pass 2 already implemented the only AI gap (`/no-show-predict`); pass 3 verified FE coverage. No changes.
