# AGENTS.md

This file helps coding agents and human collaborators work safely and efficiently in the `scenecraft-AI` repository.

## Project Summary

Scenecraft AI is an AI-assisted browser-based 3D scene editor built on Next.js. It combines:

- interactive 3D scene editing
- AI image generation and prompt transformation
- AI PBR texture atlas generation and material application
- AI panorama generation and scene environment application
- low-poly AI 3D sketch planning and optimization
- authentication and database-backed user flows
- authenticated project save/load with persisted scene snapshots
- asset persistence for models, textures, environment images, AI-generated panoramas, thumbnails, and saved AI image resources

This is not a simple CRUD app. Changes often affect editor runtime behavior, scene data flow, AI request contracts, or auth boundaries.

## Stack

- `Next.js 16` with App Router
- `React 19`
- `TypeScript`
- `Three.js`
- `Zustand`
- `Drizzle ORM`
- `better-auth`
- `Vercel Blob`
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
- `BLOB_READ_WRITE_TOKEN`
- `OPENROUTER_API_KEY`
- `SILICONFLOW_API_KEY`
- SMTP settings for email auth flows

Behavior to remember:

- If `DATABASE_URL` is missing in local development, auth falls back to an in-memory adapter.
- In production, missing `DATABASE_URL` should be treated as a blocking issue.
- Project save/load APIs should also be treated as unavailable when `DATABASE_URL` is missing.
- Asset-backed save flows depend on `BLOB_READ_WRITE_TOKEN`; missing Blob config should fail clearly rather than silently degrade.
- AI routes depend on provider keys and should fail clearly when keys are missing.

## Repo Map

### `app/`

Next.js App Router entrypoints and API routes.

- `app/home/` contains home page routes
- `app/editor/` contains the protected editor route
- `app/api/auth/` contains auth route handlers
- `app/api/ai/` contains AI API routes for prompt transformation, image generation, panorama generation, and 3D generation
- `app/api/ai/textures/pbr/` contains the authenticated AI PBR texture atlas generation route
- `app/api/ai/panoramas/` contains the authenticated AI panorama generation route
- `app/api/projects/` contains project list/create/read/update handlers
- `app/api/assets/` contains asset upload preparation handlers
- `app/api/polyhaven/` contains authenticated external asset browsing routes for HDRIs and textures

Use this area when changing route-level behavior, request/response handling, or page composition.

### `components/`

React UI components for auth, home, and editor surfaces.

- `components/editor/` contains most editor-facing UI panels and controls
- `components/editor/aiImageComposer.tsx` contains the AI chat composer shell and coordinates Image, Texture, Panorama, and 3D modes
- `components/editor/aiComposer/` contains AI chat mode controls and mode-specific hooks, including `useAiPbrTextureComposer.ts` and `useAiPanoramaComposer.ts`
- `components/editor/topBar.tsx` is now a thin composition layer for the top bar UI
- `components/editor/topBar/` contains top bar hooks, configuration, and save/load orchestration helpers
- `components/editor/externalAssets/` contains the external asset browser detail panels and browser hook
- `components/common/` contains shared UI building blocks

Prefer keeping UI logic here instead of pushing presentation concerns into `render/editor/`.

### `frontend/`

Browser-side API clients and request helpers.

- `frontend/api/projects.ts` wraps project list/load/save/delete calls
- `frontend/api/assets.ts` wraps prepared asset upload flows
- `frontend/api/ai.ts` wraps AI image / prompt / AI PBR texture / AI panorama / 3D generation requests
- `frontend/api/externalAssets.ts` wraps Poly Haven list/detail/category lookups

Use this area when changing browser request behavior or updating how UI code talks to backend routes.

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
- scene snapshot serialization used by project persistence

Treat this area as high-risk. Small changes can easily break selection, transforms, preview behavior, imported assets, or runtime synchronization.

### `lib/ai/`

AI-related business logic.

Includes:

- prompt transformation
- image generation provider registry and provider implementations
- PBR texture atlas generation prompt helpers
- panorama generation constants and server prompt routing
- AI 3D planning pipeline
- OpenRouter-related provider code
- validation, parsing, diagnostics, rules, templates, and workflow code

Keep API contracts, validation, and provider-specific behavior aligned when editing here.

### `render/editor/materials/`

Editor material helpers live here.

- `render/editor/materials/pbrAtlas.ts` defines the 3x2 PBR atlas layout and creates standard `MeshMaterialPatch` objects
- The AI PBR texture flow must continue to reuse existing `TextureSchema` fields rather than adding a separate atlas material schema

Keep atlas offsets, repeat values, and material texture field names aligned with `MeshAppearanceSection`, project persistence, and `TextureConfigDialog`.

### `lib/ai/panorama/`

AI panorama generation constants live here.

- `lib/ai/panorama/constants.ts` defines the OpenRouter model, provider-supported `21:9` request ratio, fixed `2048x1024` output target, JPEG output metadata, and request tuning values
- The panorama flow should request a provider-supported ultra-wide image, center-crop it to a 2:1 scene environment image, and apply it through the same scene environment path as manual panorama import

Keep these values aligned with `app/api/ai/panoramas/generate/route.ts`, `components/editor/aiComposer/useAiPanoramaComposer.ts`, scene property panel preview behavior, and project asset persistence.

### `lib/externalAssets/`

External asset provider integration and metadata helpers.

Includes:

- provider feature flags
- Poly Haven API integration
- external asset request/response contracts
- persisted `externalSource` metadata used by HDRI and texture references

Keep this area aligned with `app/api/polyhaven/`, `frontend/api/externalAssets.ts`, and the project persistence schema.

### `lib/project/`

Project persistence schema and validation live here.

Use this area when changing:

- project save request validation
- project AI library schema
- project metadata and thumbnail rules

### `lib/server/` and `lib/auth*.ts`

Authentication and server-only helpers.

Be careful with:

- session requirements
- route protection
- email verification/reset flows
- local memory-mode fallback behavior
- project ownership checks
- asset upload token generation
- database availability checks for save/load

### `db/`

Database config, Drizzle schema, and migrations.

If schema changes are made:

- update the relevant schema files
- generate migrations if appropriate
- ensure `projects` / `assets` remain aligned with the runtime JSON shape
- avoid making assumptions that local memory auth mode will persist data
- remember that save/load work requires the schema to actually exist in the target database; `npm run db:push` may be necessary during local setup

### `stores/`

Zustand state stores for application/editor state.

Keep store shape changes coordinated with the components or editor logic that consume them.

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

### Organize shared constants by domain

- When constants, literal option sets, or enum-like value groups are shared across files, prefer a nearby `constants/` directory scoped to that domain.
- Do not collect unrelated constants into one repo-wide catch-all file.
- Keep single-component tuning values local unless they are reused, part of a contract, or define a domain-level option set.
- When a schema, contract, and runtime all depend on the same literal values, define the source values once in the relevant domain `constants/` module and reuse them from there.

### Respect data contracts

When changing request/response shapes, also inspect:

- API route handlers in `app/api/`
- shared contracts in `lib/api/contracts/`
- frontend client calls in `frontend/api/` and UI consumers
- AI pipeline validation/parsing code in `lib/ai/`
- project validation in `lib/project/`

### Keep editor behavior stable

When touching `render/editor/`, think through:

- scene selection state
- transform sync
- entity IDs and bindings
- runtime disposal and cleanup
- preview vs apply flows for AI-generated content
- whether imported asset URLs are temporary `blob:` URLs or persisted asset URLs
- whether `EditorProjectJSON` serialization still round-trips persisted project metadata and thumbnails

### Keep auth behavior explicit

- Protected routes should continue to guard editor access.
- Do not silently weaken auth checks.
- Preserve clear behavior when config is missing.
- Project and asset APIs must continue to enforce per-user ownership boundaries.

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

If the task is about AI-generated PBR textures:

- inspect `app/api/ai/textures/pbr/`
- inspect `lib/ai/pbr-texture/`
- inspect `render/editor/materials/pbrAtlas.ts`
- inspect `components/editor/aiComposer/useAiPbrTextureComposer.ts`
- inspect `components/editor/aiImageComposer.tsx`
- inspect `components/editor/propertyPanelSections/meshAppearanceSection.tsx`
- inspect `components/editor/propertyPanel.tsx`
- inspect `components/editor/projectAiLibraryDialog.tsx`
- preserve the single-atlas, six-`TextureSchema` design unless the task explicitly asks for a schema migration

If the task is about AI-generated panoramas:

- inspect `app/api/ai/panoramas/`
- inspect `lib/ai/panorama/`
- inspect `components/editor/aiComposer/useAiPanoramaComposer.ts`
- inspect `components/editor/aiImageComposer.tsx`
- inspect `components/editor/propertyPanelSections/sceneSettingsSection.tsx`
- inspect `render/editor/app.ts` for `importPanorama`
- inspect `components/editor/topBar/` for the manual panorama import flow
- keep the generated output as a `2048x1024` JPEG applied to scene `envConfig.panoUrl`
- register generated panorama files as `environment_image` assets with target path `env:pano` so project save can persist them

If the task is about project save/load or asset persistence:

- inspect `app/api/projects/`
- inspect `app/api/assets/`
- inspect `lib/project/`
- inspect `lib/server/projects/`
- inspect `lib/server/assets/`
- inspect `components/editor/topBar.tsx`
- inspect `components/editor/topBar/`
- inspect `stores/editorStore.ts`

If the task is about external HDRIs, texture libraries, or Poly Haven integration:

- inspect `app/api/polyhaven/`
- inspect `frontend/api/externalAssets.ts`
- inspect `lib/externalAssets/`
- inspect `components/editor/externalAssets/`
- inspect `components/editor/topBar/` for HDRI import flow
- inspect `components/editor/propertyPanel.tsx` for texture import flow

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
- Do not assume database persistence exists in local mode without `DATABASE_URL`.
- Do not assume project persistence exists in a target database until `projects` and `assets` tables are present.
- Do not assume binary asset persistence works without `BLOB_READ_WRITE_TOKEN`.
- Do not mix heavy UI concerns into low-level editor runtime files without a good reason.
- Do not bypass validation for AI request input.
- Do not store temporary `blob:` URLs in persisted save payloads if the task is meant to preserve assets across reloads.
- Do not replace the AI PBR atlas flow with six independent texture files unless the task explicitly asks for that migration.
- Do not turn AI panorama output into a separate scene schema; it should continue to use the existing scene environment panorama fields and asset persistence path.
- Do not strip persisted `externalSource` metadata from HDRI or texture references if the task touches external asset flows.

## Good Final Handoff

A strong task handoff should include:

- a short summary of what changed
- the files or subsystems affected
- commands run for verification
- any remaining caveats, especially around env vars, auth, AI providers, editor runtime behavior, database schema state, or Blob storage setup
