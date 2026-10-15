# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Xuan-agent（玄枢，"Five Arts AI Agent"）is an AI agent for traditional Chinese metaphysics / five-arts（五术）exploration. V1 implements **BaZi（八字）**: deterministic chart calculation + neutral, citation-backed interpretation, same-chart follow-up (`ask`), local session memory, user profiles, and keyword RAG. V1 is **implemented** (Milestones 1–6). **Physiognomy（相术）** and multi-provider comparison are V2, out of scope.

## Non-negotiable principle: separate calculation from interpretation

- Deterministic chart calculation is done by the `tyme4ts` library, wrapped behind the `BaziCalculator` interface. The LLM **never** derives 干支/十神/大运 — it only explains the structured `BaziChart`.
- RAG provides citation-backed evidence; sources must be real (no fabricated citations).
- Business layers depend only on `BaziCalculator`, never on raw `tyme4ts` objects (ADR-0003).

## Tech stack (implemented)

- TypeScript 5.9, ESM-only (`"type": "module"`), Node ≥ 20. Single npm package `xuan-agent`: CLI `xuan` + SDK `xuan-agent`.
- BaZi: `tyme4ts` (behind `BaziCalculator`). Schema: `zod` v4. CLI: `commander`. Build: `tsup`. Lint/format: `biome` v2. Tests: `vitest`.
- **No LangChain.js / LangGraph.js** — hand-rolled `LlmProvider` + `ProviderFactory` (openai-compatible adapter via `fetch`); V1 flows are linear (ADR-0011).
- Relative imports use the `.js` extension even inside `.ts` files (ESM + `verbatimModuleSyntax`).

## Architecture

```
Entry (src/cli, src/index.ts SDK)
  → Orchestration (src/agent/xuan-agent.ts — XuanAgent, linear flow)
    → Foundation (calculators / providers / rag / conversations / profiles
                  / prompts / safety / config / storage / logging / errors)
```

- `src/index.ts` is the **only public API surface**; internal modules are not part of the SDK contract.
- `src/cli/` reaches core only through `XuanAgent`/SDK — never directly touching the calculator, RAG, or storage.
- `XuanAgent.analyzeBazi`: validate `BirthInput` → calculate `BaziChart` → RAG search (advanced mode only) → build prompt → LLM → `SafetyGuard` audit → save session (unless `temporary: true`).
- `XuanAgent.askFollowup` reuses the frozen `BaziChart` from `ConversationStore` (no re-calculation) and triggers RAG only when the question hits terminology.

## Key invariants & gotchas

- **Regression baseline**: `tests/fixtures/bazi-baseline.json` (21 cases) guards `BaziChart` output. Calculator/library changes must keep it green or update it deliberately.
- **晚子时 = 次日** (23:00 rolls the day). Birth time in 23:00–23:59 must note the school in `limitations` (ADR-0010); never key logic off the ambiguous "早子时/晚子时" words.
- **SafetyGuard**: output must be neutral ("倾向"/"观察角度"), never "必然/注定/大凶"; no medical/legal/investment/marriage-fertility advice, no fatalism labels.
- **Privacy**: sessions are local (user data dir), `temporary: true` skips persistence; profile save/delete require explicit `--confirm` (`PROFILE_PERMISSION_REQUIRED`); logs redact API keys and birth info — never echo `XUAN_API_KEY`.
- **RAG**: keyword search only (no vector in V1); only `copyright_status: usable` entries enter the corpus; empty hit must report "未检索到明确依据", never invent a source.
- **Docs are the source of truth** (Chinese): `docs/prd.md` → `docs/requirements.md` → `docs/product-architecture.md` → `docs/technical-design.md`; rationale in `docs/adr.md`. `GLOSSARY.md` holds canonical vocabulary (avoid its `_Avoid_` words).
- **`docs/tour/`** is the progressive code-reading guide (01 全局 → 02 基础层 → 03 能力层 → 04 编排与入口 → 05 测试与 Review → 06 Vision 接入点 → 07 版本变更). Start at `docs/tour/README.md`. The layer docs always describe the **current** code; version deltas go in `07-版本变更.md`. The review checklist in `05` lists known spec-vs-implementation gaps — check whether they still hold before acting on them.

## Commands

```bash
npm run typecheck      # tsc --noEmit
npm test               # all tests (vitest run)
npx vitest run <file>  # run a single test file
npm run test:fixtures  # BaZi regression baseline only
npm run test:smoke     # CLI / SDK smoke tests
npm run lint           # biome check
npm run format         # biome format --write
npm run build          # tsup (ESM -> dist/)
npm run pack:dry       # npm pack --dry-run (audit package contents)
```

Local CLI (after `npm run build`):

```bash
node dist/cli/main.js bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar
node dist/cli/main.js bazi ask --question "什么是正印？"
node dist/cli/main.js rag search --query "正印"
node dist/cli/main.js profile view|save|delete
node dist/cli/main.js provider list
node dist/cli/main.js session clear
node dist/cli/main.js config doctor
```

## Config

`.env` (gitignored) supplies `XUAN_PROVIDER` / `XUAN_MODEL` / `XUAN_API_KEY` / `XUAN_BASE_URL` / `XUAN_MAX_TOKENS` / `XUAN_KNOWLEDGE_DIR` / `XUAN_DATA_DIR` — see `.env.example`. Never commit or log the key.
