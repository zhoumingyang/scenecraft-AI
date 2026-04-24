# Scenecraft AI

Scenecraft AI is an AI-powered 3D editor for scene creation workflows. It combines interactive 3D scene editing with AI image generation, AI-assisted low-poly 3D sketching, prompt enhancement, and material application in a single workspace, helping users move from an idea to an editable scene draft much faster.

The current version is built with `Next.js`, `React 19`, `Three.js`, `Zustand`, `Drizzle ORM`, and `better-auth`. It already includes a browser-based 3D editor shell, a protected editor workspace, an AI image workflow, and an AI 3D preview-and-optimization pipeline focused on stylized low-poly output.

## What This Project Is

This is not just a text-to-image demo, and it is not a full desktop-grade DCC tool in the browser either. It is a creative tool designed around the following loop:

- Improve prompts with AI
- Generate reference images or textures inside the editor
- Apply generated results directly to mesh materials
- Create previewable, editable low-poly 3D sketches from natural language
- Continue refining the scene with lights, cameras, environment settings, post-processing, and manual editing

## Current Features

### 1. Browser-Based 3D Editor

- Real-time 3D viewport powered by `Three.js`
- Scene tree management with selection, deletion, duplication, locking, visibility toggles, and isolation
- Property panel editing for transforms, materials, lights, and scene settings
- Built-in primitive creation such as `box`, `sphere`, `cylinder`, and `torus`
- Model import support for `gltf/glb`, `fbx`, `obj`, and `vrm`
- Model animation controls including play, pause, stop, step, and playback speed adjustment
- Camera mode switching between bird view and first-person view
- View helpers for grid, transform gizmo, light helpers, and shadows

### 2. Scene and Visual Controls

- Panorama and HDR environment import
- Tone mapping and exposure controls
- Light creation and editing for ambient, hemisphere, directional, point, spot, and rect area lights
- Built-in lighting presets for faster scene setup
- Post-processing controls with entry points for effects such as Bloom, SSR, GTAO, Bokeh, Film, Glitch, and Halftone

### 3. AI Image Workflow

- Supports both text-to-image and reference-image-based generation flows
- Adjustable generation parameters such as `seed`, `image size`, `CFG`, and `inference steps`
- Reference image upload for editing and style continuation workflows
- Prompt enhancement and Chinese-to-English prompt translation
- Generated results can be previewed inside the editor and applied directly to mesh materials

### 4. AI 3D Sketch Generation and Optimization

This is the most distinctive part of the project right now.

Instead of asking an AI system to output an opaque high-resolution 3D mesh directly, Scenecraft AI generates a **validated low-poly construction plan** that the editor can preview and apply as editable geometry. The current workflow includes:

- Generating stylized low-poly 3D sketch previews from natural language
- Supplying structured intent hints such as:
  - subject type
  - detail level
  - style bias
  - pose
  - symmetry
  - required parts
  - parts to avoid
- One-click optimization after preview generation
- Optimization based on preview captures and diagnostics
- Applying the final plan back into the editable scene

The current AI 3D plan supports operations such as:

- Creating primitive geometry: `box`, `sphere`, `cylinder`, `capsule`, `cone`, `torus`, `plane`
- Creating stylized shape, extrude, and tube presets
- Updating node transforms
- Assigning material properties such as color, metalness, roughness, opacity, and emissive settings

This approach makes the result:

- more stable
- easier to validate and debug
- easier to keep editable after generation

## Tech Stack

- App framework: `Next.js 16` + `React 19`
- 3D rendering: `Three.js`, `@react-three/fiber`, `@react-three/drei`
- UI: `MUI` + `Sass`
- State management: `Zustand`
- Authentication: `better-auth`
- Database: `Postgres` + `Drizzle ORM`
- AI integration: provider-based image generation, prompt transformation, and AI 3D planning APIs

## Project Structure

```text
app/                    Next.js App Router pages and API routes
components/             Home, auth, and editor UI components
render/editor/          Editor core: runtime, session, models, commands
lib/ai/                 AI modules for images, 3D planning, prompt transforms, providers
stores/                 Zustand state stores
db/                     Drizzle schema, database setup, migrations
docs/                   Design notes and backend roadmap
public/draco/           GLTF Draco decoder assets
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Recommended minimum variables:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `OPENROUTER_API_KEY`
- `SILICONFLOW_API_KEY` if you want to enable that provider
- `DATABASE_URL` recommended; without it, local auth falls back to in-memory mode
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

For social login support:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### 3. Start development server

```bash
npm run dev
```

Default routes:

- Home: `http://localhost:3000/home`
- Editor: `http://localhost:3000/editor`

## Database Commands

The project already includes `Drizzle` configuration and auth-related schema.

Useful commands:

```bash
npm run db:generate
npm run db:push
npm run db:studio
```

## Current Status

The project already has the core foundation of a usable editor, AI workflows, and authentication, but it is still evolving. A few important boundaries are worth calling out:

- The database integration is currently focused on authentication; the full project save/load backend loop is still planned work
- The top `Save` entry in the editor is still a placeholder, so it should not be described as fully implemented
- The current AI 3D flow is aimed at low-poly sketching and structural previews, not production-grade high-resolution mesh generation
- If `DATABASE_URL` is missing in local development, auth falls back to in-memory mode and will not persist after restart

You can find the backend direction in [docs/backend-roadmap.md](/Users/mingyoungzhou/code/self/scenecraft-AI/docs/backend-roadmap.md).

## Good Fit For

- AI-assisted 3D creation tool prototypes
- Fast concept blocking for games, installations, and digital content
- Low-poly character, prop, and icon sketch generation
- Experiments that connect AI image generation with interactive material editing

## License

Released under the [MIT License](/Users/mingyoungzhou/code/self/scenecraft-AI/LICENSE).
