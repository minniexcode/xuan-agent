# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Xuan-agent (玄枢, "Five Arts AI Agent") is an AI agent for traditional Chinese metaphysics / five-arts (五术) exploration. V1 covers two capabilities: **BaZi (八字)** chart generation + structured interpretation, and **physiognomy (相术)** — observational, culturally-grounded analysis of face/palm images.

The repository is currently **pre-implementation**: `src/` is empty, and all product + architecture decisions live in `docs/prd.md` and `docs/product-architecture.md` (both in Chinese). Those two documents are the single source of truth; treat them as authoritative over any code that appears later.

## Core principle: separate calculation from interpretation

This is the non-negotiable rule behind the whole design:

- Deterministic chart calculation is done by a library (`lunar-typescript`), never by the LLM. The LLM does **not** perform arithmetic or derive 干支/十神 on its own; it only explains, relates, and phrases results built from structured output.
- RAG provides citation-backed evidence from classical texts / terminology to keep output traceable rather than free-form.
- Physiognomy in V1 uses a vision-capable LLM directly; no separate CV model is introduced.

## Decided tech stack (not yet implemented)

- **TypeScript-first**, targeting Node.js (`"type": "module"`, `engines.node >= 20`). No browser runtime in V1.
- A single npm package named `xuan-agent`: CLI command `xuan` + SDK entry `xuan-agent`, sharing one core. **No** monorepo.
- Agent orchestration via **LangGraph.js**; LLM abstraction via **LangChain.js**, with a `ProviderFactory` isolating multiple providers (OpenAI / Anthropic / DeepSeek / generic OpenAI-compatible).
- BaZi calculation via **`lunar-typescript`**, isolated behind the `BaziCalculator` interface.
- RAG, user profiles (local JSON), session state, and config (`.env`) are all **local-first**.
- **Python is not a V1 default dependency.** It is only considered as a fallback adapter behind `BaziCalculator` if `lunar-typescript` fails sample-set validation.

Framework-level choices are **deferred to a not-yet-written technical design doc** (see §5.2 of `product-architecture.md`): CLI framework, HTTP framework, build tool, schema library (Zod/Valibot/TypeBox), test framework, and vector store are all undecided.

## Layered architecture

```
Entry (CLI / SDK / HTTP API adapters)
  → Orchestration (XuanAgent / LangGraphWorkflow / ConversationStateManager)
    → Skill layer (bazi / xiangshu-face / xiangshu-palm / rag-reference / profile-memory / provider-compare)
      → Foundation (BaziCalculator / ProviderFactory / RagEngine / MemoryStore / ProfileStore
                   / PromptManager / SafetyGuard / ConfigManager / Logger)
```

Planned directory layout (detailed to file level in §14 of `product-architecture.md`):

- `src/index.ts` — SDK entry point (the only default public API surface)
- `src/cli/`, `src/api/` — entry layer; must **not** call the chart library, LangChain, RAG, or storage directly — only through SDK / agent core
- `src/agent/`, `src/workflows/` — orchestration layer
- `src/skills/` — skills + `SkillRegistry`
- `src/providers/`, `src/calculators/`, `src/rag/`, `src/memory/`, `src/profiles/`, `src/prompts/`, `src/safety/`, `src/config/`, `src/logging/`, `src/schemas/`, `src/storage/`, `src/errors/`
- `knowledge/seed/` — minimal knowledge-base seed; `examples/`, `tests/`

## Non-negotiable constraints

- **Business layers must not depend on raw `lunar-typescript` objects** — only through `BaziCalculator`.
- **`BaziCalculator` output must be validated against a sample set** (solar/lunar birthdays, 节气 boundary dates, gender-dependent 大运 direction, lunar conversion, uncertain birth hour, etc.).
- **Safety (§8):** `SafetyGuard` must do input checks, prompt-injection defense, output post-processing, and high-risk downgrade. Prohibited output: fortune/misfortune assertions, fatalism labels, medical/legal/investment/marriage advice, identity recognition from images, sensitive-attribute inference, appearance value judgments, fabricated charts or RAG sources.
- **Privacy (§8.3):** by default do not persist birth info / birth location / images / full conversations; logs must be redacted (no full API key, birth info, image content, or unredacted profiles).
- The npm package must not publish user privacy data or local runtime data; internal directories must not be a default public API.

## Common commands

There is no `package.json` yet. These scripts are the contract from §15.2 of `product-architecture.md` and must be implemented:

```bash
npm run typecheck      # tsc --noEmit
npm test               # unit + integration tests
npm run test:fixtures  # BaZi sample-set tests
npm run test:smoke     # CLI / SDK smoke tests
npm run build
npm run pack:dry       # npm pack --dry-run to inspect package contents
```

All must pass before publishing. Target CLI command family: `xuan bazi analyze|ask`, `xuan xiangshu analyze`, `xuan rag search`, `xuan provider list|compare`, `xuan profile view|save|delete`, `xuan config doctor`.

## Other repo contents

- `skills-lock.json` — Claude Code skills lock file (from `mattpocock/skills`). `.agents/` and `.claude/` are gitignored; skills can be reinstalled from this lock file and must not be committed.
- Document order: `docs/prd.md` → `docs/product-architecture.md` → (not yet written) technical design doc.
