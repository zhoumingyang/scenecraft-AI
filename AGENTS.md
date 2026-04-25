# AGENTS.md

This file helps coding agents and human collaborators work safely and efficiently in the `scenecraft-AI` repository.

## Project Summary

Scenecraft AI is an AI-assisted browser-based 3D scene editor built on Next.js. It combines:

- interactive 3D scene editing
- AI image generation and prompt transformation
- low-poly AI 3D sketch planning and optimization
- authentication and database-backed user flows

This is not a simple CRUD app. Changes often affect editor runtime behavior, scene data flow, AI request contracts, or auth boundaries.

## Stack

- `Next.js 16` with App Router
- `React 19`
- `TypeScript`
- `Three.js`
- `Zustand`
- `Drizzle ORM`
- `better-auth`
- `Sass`
- `MUI`

## Main Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run all available checks:

```bash
npm run lint
```

Run type check only:

```bash
npm run lint:types
```

Run ESLint only:

```bash
npm run lint:eslint
```

Database utilities:

```bash
npm run db:generate
npm run db:push
npm run db:studio
```

## Environment Notes

Copy `.env.example` to `.env.local` for local development.

Important variables include:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `SILICONFLOW_API_KEY`
- SMTP settings for email auth flows

Behavior to remember:

- If `DATABASE_URL` is missing in local development, auth falls back to an in-memory adapter.
- In production, missing `DATABASE_URL` should be treated as a blocking issue.
- AI routes depend on provider keys and should fail clearly when keys are missing.

## Repo Map

### `app/`

Next.js App Router entrypoints and API routes.

- `app/home/` contains home page routes
- `app/editor/` contains the protected editor route
- `app/api/auth/` contains auth route handlers
- `app/api/ai/` contains AI API routes for prompt transformation, image generation, and 3D generation

Use this area when changing route-level behavior, request/response handling, or page composition.

### `components/`

React UI components for auth, home, and editor surfaces.

- `components/editor/` contains most editor-facing UI panels and controls
- `components/common/` contains shared UI building blocks

Prefer keeping UI logic here instead of pushing presentation concerns into `render/editor/`.

### `render/editor/`

This is the heart of the browser 3D editor.

The editor runtime is built directly on top of `Three.js`, not a React renderer wrapper.

It includes:

- editor app orchestration
- runtime and rendering environment
- command/event systems
- data models and factories
- bindings between data and Three.js objects
- session logic and AI 3D plan application

Treat this area as high-risk. Small changes can easily break selection, transforms, preview behavior, imported assets, or runtime synchronization.

### `lib/ai/`

AI-related business logic.

Includes:

- prompt transformation
- image generation provider registry and provider implementations
- AI 3D planning pipeline
- OpenRouter-related provider code
- validation, parsing, diagnostics, rules, templates, and workflow code

Keep API contracts, validation, and provider-specific behavior aligned when editing here.

### `lib/server/` and `lib/auth*.ts`

Authentication and server-only helpers.

Be careful with:

- session requirements
- route protection
- email verification/reset flows
- local memory-mode fallback behavior

### `db/`

Database config, Drizzle schema, and migrations.

If schema changes are made:

- update the relevant schema files
- generate migrations if appropriate
- avoid making assumptions that local memory auth mode will persist data

### `stores/`

Zustand state stores for application/editor state.

Keep store shape changes coordinated with the components or editor logic that consume them.

### `docs/`

Project notes and roadmap documents. Read these when a task touches product intent or backend direction.

## Working Style Expectations

### Design before editing

- For each development task, do a small amount of architecture thinking before writing code.
- Prefer splitting work by responsibility, data flow, and change risk rather than appending everything to an existing file.
- When a feature introduces distinct concerns such as UI, state, API handling, parsing, validation, or runtime behavior, separate them into appropriate modules.
- Avoid solving multi-part features by placing all logic in one component, one route file, or one utility file.
- If a file is already large or has mixed responsibilities, prefer extracting focused helpers, subcomponents, hooks, contracts, or service modules.

### Make minimal, coherent changes

- Prefer narrow edits that fit existing architecture.
- Do not rewrite large editor subsystems unless the task truly requires it.
- Preserve current naming and file organization patterns.
- Do not concentrate multiple new features into a single file just because it is the fastest place to patch.

### Respect data contracts

When changing request/response shapes, also inspect:

- API route handlers in `app/api/`
- shared contracts in `lib/api/contracts/`
- frontend client calls in `frontend/api/` and UI consumers
- AI pipeline validation/parsing code in `lib/ai/`

### Keep editor behavior stable

When touching `render/editor/`, think through:

- scene selection state
- transform sync
- entity IDs and bindings
- runtime disposal and cleanup
- preview vs apply flows for AI-generated content

### Keep auth behavior explicit

- Protected routes should continue to guard editor access.
- Do not silently weaken auth checks.
- Preserve clear behavior when config is missing.

## Verification Expectations

After code changes, run the most relevant checks available.

Default minimum:

```bash
npm run lint
```

If a task touches only a narrow area and full verification is not possible, explain:

- what you ran
- what you could not run
- any remaining risk

There is currently no dedicated test script in `package.json`, so do not claim automated tests were run unless you added and ran them yourself.

## Common Task Routing

If the task is about UI layout or editor controls:

- start in `components/`
- inspect `stores/` if state is involved
- inspect `render/editor/` if runtime/editor behavior is involved

If the task is about AI generation:

- inspect `app/api/ai/`
- inspect `lib/ai/`
- inspect `lib/api/contracts/`

If the task is about auth:

- inspect `lib/auth.ts`
- inspect `lib/server/auth/`
- inspect `app/api/auth/`

If the task is about scene/project data:

- inspect `render/editor/models/`
- inspect `render/editor/core/`
- inspect `render/editor/session/`
- inspect `render/editor/bindings/`

## Things To Avoid

- Do not invent commands or workflows that do not exist in the repo.
- Do not describe the Save flow as fully implemented unless you verify it.
- Do not assume database persistence exists in local mode without `DATABASE_URL`.
- Do not mix heavy UI concerns into low-level editor runtime files without a good reason.
- Do not bypass validation for AI request input.

## Good Final Handoff

A strong task handoff should include:

- a short summary of what changed
- the files or subsystems affected
- commands run for verification
- any remaining caveats, especially around env vars, auth, AI providers, or editor runtime behavior
