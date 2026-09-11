# Text and image generation utilities

Portable text/image API commands and comic production tools for the origin-story skill. Requires **Node 22.12+**. API commands use Node built-ins; comic packaging and JPEG compression use Sharp. Run these examples from the repository root. Absolute script paths also work from another directory.

Install the dependencies (and use `--frozen-lockfile` when reproducing a committed lockfile):

```bash
pnpm install
```

```bash
node utils/generate-text.mjs --help
```

```bash
node utils/generate-image.mjs --help
```

The root `package.json` provides equivalent **pnpm shortcuts**:

```bash
pnpm text --help
```

```bash
pnpm image --help
```

```bash
pnpm test
```

The project pins pnpm 10.7.0. To add an npm-registry package later, run `pnpm add PACKAGE` from the repository root; use `pnpm add -D PACKAGE` for development tools. Keep `package.json` and `pnpm-lock.yaml` together in version control.

## Comics and character sheets

The [comic production reference](../.agents/skills/origin-story/references/comic-production.md) documents the JSON plan: supplied text, four/eight-panel scripts, cast with optional local photos, rendering models, and reading order. Initialize it with:

```bash
node utils/comic.mjs init --plan /path/to/plan.json
```

This creates a new `~/Downloads/comic-title/` folder; `--destination /path/to/parent` chooses another parent. It includes editable scripts/prompts, `images/references/`, `images/characters/`, `images/stories/`, a manifest, and a standalone `index.html` page reader and gallery. Whole-page mode generates four panels per image; separate-panel mode lays out four images per page. Multi-story books can interleave frame pages and origins and mix modes.

```bash
node utils/comic.mjs generate /path/to/comic-title character-example
```

Character photos supplied in the plan become real image inputs to the sheet request. Generated or imported sheets retain their originals and receive compressed JPEG copies (maximum 1,536-pixel longest edge and 512 KiB). Story requests automatically attach the relevant selected sheets; all cast members' sheets must exist first. Choose a model/route that accepts references. HUIT OpenAI generation currently cannot do this; the mapped OpenRouter, compatible fal endpoints, and HUIT Gemini routes can.

```bash
node utils/comic.mjs generate /path/to/comic-title example-origin-panel-01
```

Use `status` to list jobs, `import` to adopt external artwork, `render` to rebuild the viewer, and `--dry-run` on generation to preview the request. Each new take preserves prior images. The equivalent shortcut is `pnpm comic ...`.

For compression outside a comic:

```bash
node utils/compress-image.mjs /path/to/sheet.png /path/to/reference.jpg
```

The equivalent shortcut is `pnpm compress-image ...`. Originals are preserved; existing destinations are rejected. This uses [Sharp resizing](https://sharp.pixelplumbing.com/api-resize/) and [JPEG encoding](https://sharp.pixelplumbing.com/api-output/#jpeg).

## Keys and paths

The shipped gallery was rendered with native image generation. These CLI routes are separate integrations; model IDs below are illustrative and do not guarantee current availability, live validation, or access for your account.


The key template is [../.env.example](../.env.example). Copy it once, then fill in the providers you use with your local editor:

```bash
cp -n .env.example .env
```

| Provider argument | Key variable | Text | Images |
| --- | --- | --- | --- |
| `openrouter` | `OPENROUTER_API_KEY` | Chat completions | Dedicated Images API, including references |
| `fal` | `FAL_API_KEY` | `fal-ai/any-llm` | Queue endpoint specified by `--model`, including references on compatible endpoints |
| `huit-openai` | `HUIT_API_KEY` | Chat completions | Image generation; reference editing is not mapped |
| `huit-gemini` | `HUIT_API_KEY` | Native Gemini content generation | Native Gemini image models, including references |
| `huit-bedrock` | `HUIT_API_KEY` | Converse; special native Invoke route for Fable 5 | Not mapped; Bedrock image schemas differ by model |

The utilities locate the repository by their own physical file location (`utils/lib/` → repository root), not the current working directory or a Git command. This works in a checkout, a copied repository without Git, or a symlink to its utilities. A `.agents`/`.claude` skill simply calls the repository's utilities by path. The credential owner is therefore explicit and independent of how the skill was discovered.

Credential-file selection: `--env-file` → exported `AI_LAB_ENV_FILE` → `.env` in `--project-root` or exported `AI_LAB_CONTEXT_PACK_ROOT` → `.env` at the utilities' physical repository root. Existing process environment variables override file values. Override variables must be exported or passed as flags; the helper does not recursively load another `.env` mentioned inside the first. Only the selected file is loaded; no searching through sibling projects for keys. HUIT URLs are hardcoded constants in `utils/lib/providers.mjs`; setting a similarly named environment variable does not change them.

The hardcoded HUIT base URLs are:

| Route | Base URL | Key header |
| --- | --- | --- |
| `huit-openai` | `https://apis.huit.harvard.edu/ais-openai-direct/v2` | `api-key` |
| `huit-gemini` | `https://apis.huit.harvard.edu/ais-google-gemini` | `api-key` |
| `huit-bedrock` | `https://apis.huit.harvard.edu/ais-bedrock-llm` | `x-api-key` |

Each header receives the same `HUIT_API_KEY`. These URLs are documented constants, not `.env` settings.

Prompt files, reference files, params files, and explicit `--out` paths are relative to the caller's current directory. Default output is relative to the repository root (or its explicit override). Neither script prints API keys. `.gitignore` excludes `.env` and `output/`; copying this repository for distribution must exclude them too. These utilities have no direct OpenAI key requirement: its OpenAI access here is via HUIT or OpenRouter.

## Text

Start with a request preview; it makes no API call and needs no key:

```bash
node utils/generate-text.mjs openrouter "Write a two-sentence origin story for a red pencil." --model openai/gpt-5-mini --dry-run
```

Run it by removing `--dry-run`:

```bash
node utils/generate-text.mjs openrouter "Write a two-sentence origin story for a red pencil." --model openai/gpt-5-mini
```

fal uses its Any LLM endpoint. Here `--model` names the language model inside that endpoint:

```bash
node utils/generate-text.mjs fal "Write a two-sentence origin story for a red pencil." --model google/gemini-2.5-flash-lite
```

HUIT examples:

```bash
node utils/generate-text.mjs huit-gemini "Reply with HELLO." --model gemini-3.5-flash
```

```bash
node utils/generate-text.mjs huit-openai "Reply with HELLO." --model gpt-5-mini
```

```bash
node utils/generate-text.mjs huit-bedrock "Reply with HELLO." --model us.anthropic.claude-sonnet-4-6
```

For substantial prompts, use `--input prompt.md`; `--input -` reads stdin. `--system-file instructions.md` keeps the standing text instruction separate. `--max-tokens` and `--temperature` are optional, since model support differs. `--params-file settings.json` supplies additional native provider parameters. Prompt/model fields remain controlled by the command; other parameter objects merge at the top level, with documented convenience flags overriding the corresponding fields. These are single-turn, non-streaming commands.

## Images

The OpenRouter command sends the supplied art direction directly. Put the complete prompt in the prompt file; no hidden standing art directive is prepended.

```bash
node utils/generate-image.mjs openrouter "A red pencil astronaut, comic-book inks." --model black-forest-labs/flux.2-klein-4b
```

fal's image `--model` is an endpoint ID. Settings are endpoint-specific; this example has a documented simple prompt input:

```bash
node utils/generate-image.mjs fal "A red pencil astronaut, comic-book inks." --model fal-ai/flux/dev
```

HUIT examples:

```bash
node utils/generate-image.mjs huit-openai "A red pencil astronaut, comic-book inks." --model gpt-image-2 --size 1024x1536
```

```bash
node utils/generate-image.mjs huit-gemini "A red pencil astronaut, comic-book inks." --model gemini-3.1-flash-image --aspect 2:3
```

For a local reference photo (replace the illustrative filename with a real file):

```bash
node utils/generate-image.mjs fal --input prompt.md --model fal-ai/nano-banana/edit --ref /path/to/reference.jpg
```

Repeat `--ref` for multiple images. For fal this maps to `image_urls` by default; `--ref-field image_url` supports endpoints taking a single reference. Choose an endpoint whose schema accepts that field; the utility does not infer or silently switch to an editing model. Local references are sent as base64 data URIs (native inline parts for Gemini), and their paths are recorded locally.

`--aspect`, `--resolution`, `--size`, `--quality`, `--format`, and `--n` are optional; do not assume every model accepts them. The CLI rejects convenience flags without a mapping for the selected provider. For fal FLUX, for example, use `--params-file` with a native `image_size` object instead of assuming every fal model accepts `aspect_ratio`. Provider documentation or OpenRouter's `/api/v1/images/models` capabilities supply the allowed values. No fallback to another provider occurs if an account or model rejects a request.

## Outputs and fal recovery

Each invocation reserves a **new** output directory before sending anything. Default: `output/text/UNIQUE-RUN/` or `output/image/UNIQUE-RUN/`. `--out DIRECTORY` chooses a new folder; an existing directory is an error. Outputs include `request.json` (prompt, parameters, reference paths), `response.json` (provider result and usage, with bulk image bytes omitted), `text.md` when text was returned, and numbered images with extensions detected from their bytes. Responses may include both text and images. SVG outputs are saved as files, never executed by the utility.

fal submissions additionally save `fal-request.json` immediately. The command polls until completion, up to `--timeout` milliseconds (default ten minutes). On interruption or a polling failure, use that receipt to retrieve the same job into a new output directory:

```bash
node utils/generate-image.mjs --resume output/image/PRIOR-RUN/fal-request.json
```

Use the text command for a text receipt. Resume performs status/result GETs, never another generation POST. If submission timed out before a receipt arrived, check fal's request history before resubmitting. The CLI itself never automatically resubmits generation requests; fal's queue has its own service-side retry behavior. CDN image downloads receive no API authorization headers.

## Verification and sources

Run offline behavioral checks:

```bash
node --test utils/test/*.test.mjs
```

Checks cover provider payloads, auth, keys and paths, image extraction, output preservation, fal resume, four/eight-panel books, mixed page layouts, photo-to-sheet inputs, JPEG compression, multiple character references, and portable viewer assets. They do not prove current account/model availability or visual output quality. The example model IDs are explicit examples, not claims that every key can use them. HUIT gateway routes and model-specific special handling are implemented in `lib/providers.mjs`; availability remains account-specific. The fifteen included comics used the agent host’s native image-generation tool, not these API adapters, so their images do not establish live API validation.

Official docs consulted 2026-09-11: [OpenRouter images](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), [OpenRouter chat](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion), [fal queue](https://fal.ai/docs/documentation/model-apis/inference/queue), [fal Any LLM](https://fal.ai/models/fal-ai/any-llm/api), [fal FLUX](https://fal.ai/models/fal-ai/flux/dev/api), [fal Nano Banana edit](https://fal.ai/models/fal-ai/nano-banana/edit/api), [HUIT OpenAI](https://portal.apis.huit.harvard.edu/docs/ais-openai-direct/1/overview), [Gemini images](https://ai.google.dev/gemini-api/docs/image-generation).
