# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Xuan-agent (玄枢, "Five Arts AI Agent") is an AI agent for traditional Chinese metaphysics / five-arts (五术) exploration. V1 covers one capability: **BaZi (八字)** chart generation + structured interpretation. **Physiognomy (相术)** — observational, culturally-grounded analysis of face/palm images — is a V2 extension, out of V1 scope.

The repository is currently **pre-implementation**: `src/` is empty, and all product + architecture decisions live in `docs/` (in Chinese): `prd.md` (product requirements; brief — FR index only), `requirements.md` (detailed functional requirement specs), `product-architecture.md` (architecture), `technical-design.md` (detailed engineering design, contracts, types, workflows, tests, milestones), and `adr.md` (architecture decision records). Together these are the single source of truth; treat them as authoritative over any code that appears later.

## Core principle: separate calculation from interpretation

This is the non-negotiable rule behind the whole design:

- Deterministic chart calculation is done by a library (`tyme4ts`), never by the LLM. The LLM does **not** perform arithmetic or derive 干支/十神 on its own; it only explains, relates, and phrases results built from structured output.
- RAG provides citation-backed evidence from classical texts / terminology to keep output traceable rather than free-form.
- Physiognomy (V2) uses a vision-capable LLM directly; no separate CV model is introduced.

## Decided tech stack (not yet implemented)

- **TypeScript-first**, targeting Node.js (`"type": "module"`, `engines.node >= 20`). No browser runtime in V1.
- A single npm package named `xuan-agent`: CLI command `xuan` + SDK entry `xuan-agent`, sharing one core. **No** monorepo.
- Agent orchestration and LLM abstraction use a lightweight hand-rolled layer — `XuanAgent` (linear flow) + `LlmProvider`/`ProviderFactory` (openai-compatible adapter via `fetch`) — **no LangChain.js / LangGraph.js in V1** (ADR-0011). V1 defaults to a single provider — DeepSeek through the generic OpenAI-compatible adapter (the Anthropic adapter is kept as a skeleton); multi-provider comparison is deferred until after V1.
- BaZi calculation via **`tyme4ts`**, isolated behind the `BaziCalculator` interface.
- RAG, user profiles (local JSON), session state, and config (`.env`) are all **local-first**.
- **Python is not a V1 default dependency.** It is only considered as a fallback adapter behind `BaziCalculator` if `tyme4ts` proves insufficient.

Framework-level choices are **deferred to `docs/technical-design.md`** (see §5.2 of `product-architecture.md`): CLI framework, HTTP framework, build tool, schema library (Zod/Valibot/TypeBox), test framework, and vector store are all undecided.

## Layered architecture

```
Entry (CLI / SDK / HTTP API adapters)
  → Orchestration (XuanAgent / LangGraphWorkflow / ConversationStateManager)
    → Skill layer (bazi / rag-reference / profile / provider-compare; xiangshu-face / xiangshu-palm are V2)
      → Foundation (BaziCalculator / ProviderFactory / RagEngine / ConversationStore / ProfileStore
                   / PromptManager / SafetyGuard / ConfigManager / Logger)
```

Planned directory layout (detailed to file level in §14 of `docs/technical-design.md`):

- `src/index.ts` — SDK entry point (the only default public API surface)
- `src/cli/`, `src/api/` — entry layer; must **not** call the chart library, LangChain, RAG, or storage directly — only through SDK / agent core
- `src/agent/`, `src/workflows/` — orchestration layer
- `src/skills/` — skills + `SkillRegistry`
- `src/providers/`, `src/calculators/`, `src/rag/`, `src/memory/`, `src/profiles/`, `src/prompts/`, `src/safety/`, `src/config/`, `src/logging/`, `src/schemas/`, `src/storage/`, `src/errors/`
- `knowledge/seed/` — minimal knowledge-base seed; `examples/`, `tests/`

## Non-negotiable constraints

- **Business layers must not depend on raw `tyme4ts` objects** — only through `BaziCalculator`.
- **`BaziCalculator` output is covered by a minimal regression baseline** (`tests/fixtures/`) that guards against silent changes; its accuracy was verified by cross-checking three independent implementations against authoritative 节气 times (see §11 of `product-architecture.md`).
- **Safety (§8):** `SafetyGuard` must do input checks, prompt-injection defense, output post-processing, and high-risk downgrade. Prohibited output: fortune/misfortune assertions, fatalism labels, medical/legal/investment/marriage advice, identity recognition from images, sensitive-attribute inference, appearance value judgments, fabricated charts or RAG sources.
- **Privacy (§8.3):** by default do not persist birth info / birth location / images / full conversations; logs must be redacted (no full API key, birth info, image content, or unredacted profiles).
- The npm package must not publish user privacy data or local runtime data; internal directories must not be a default public API.

## Common commands

There is no `package.json` yet. These scripts are the contract from §15.2 of `docs/technical-design.md` and must be implemented:

```bash
npm run typecheck      # tsc --noEmit
npm test               # unit + integration tests
npm run test:fixtures  # BaZi regression baseline
npm run test:smoke     # CLI / SDK smoke tests
npm run build
npm run pack:dry       # npm pack --dry-run to inspect package contents
```

All must pass before publishing. Target CLI command family: `xuan bazi analyze|ask`, `xuan rag search`, `xuan provider list`, `xuan profile view|save|delete`, `xuan config doctor`. (`xuan xiangshu analyze` and `xuan provider compare` are V2 / post-V1.)

## Other repo contents

- `skills-lock.json` — Claude Code skills lock file (from `mattpocock/skills`). `.agents/` and `.claude/` are gitignored; skills can be reinstalled from this lock file and must not be committed.
- `README.md` is the user-facing overview; `LICENSE` is MIT.
- `GLOSSARY.md` is the canonical domain vocabulary (Chinese) — use its terms and avoid its `_Avoid_` words.
- Document order: `docs/prd.md` → `docs/requirements.md` → `docs/product-architecture.md` → `docs/technical-design.md`; decision rationale lives in `docs/adr.md`.
