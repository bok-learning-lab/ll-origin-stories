# Continue making origin-story comics

Open this repository as the Codex workspace: `/Users/mk/Development/mk-27/apps/ll-origin-stories`. It is the live working home. Do not use the old origin-story skill in `ai-lab-context-pack`: that skill and its Claude discovery link have been removed from the local pack.

## Start a new session with this

> Work in this repository and read AGENTS.md, _context/codex-handoff.md, and .agents/skills/origin-story/SKILL.md. Use the origin-story skill here to make the next comic. Keep exact captions and dialogue separate from art directions, establish the scene in rectangular narration boxes, and use matching compressed character-sheet JPEGs as image inputs. Use the context I provide; if I say “just go with what you have,” proceed without another interview. Preserve existing editions. Generate in a new output/comics/{title}/ folder unless I request another destination. Show me the resulting local index and give me the public URL after any authorized publication.

## Links

- Live collection: https://bok-learning-lab.github.io/ll-origin-stories/
- How this was made: https://bok-learning-lab.github.io/ll-origin-stories/how-this-was-made.html
- Longer rationale: https://bok-learning-lab.github.io/ll-origin-stories/why-origin-stories.html
- Repository: https://github.com/bok-learning-lab/ll-origin-stories
- Skill: https://github.com/bok-learning-lab/ll-origin-stories/blob/main/.agents/skills/origin-story/SKILL.md

Always return useful URLs plainly. Marlon prefers having the links repeated rather than having to find them in an earlier message.

## Where everything lives

`.agents/skills/origin-story/` is the canonical, credential-free skill. `.claude/skills/origin-story` is a relative symlink to that folder. Keep this link intact when moving the repository. The skill includes interviewing, story craft, comic-production instructions, provider guidance, and a curated brief about these workshop participants.

`utils/` contains the image/text API commands, comic initialization/import/rendering, JPEG compression, and tests. `package.json` and `pnpm-lock.yaml` describe the Node/pnpm project. `node_modules/` is installed locally and never tracked. Neither `.env`, `.env.local`, `output/`, nor `dist/` is tracked. Only the blank `.env.example` belongs in Git.

`site/` holds selected presentation art, portable HTML readers, the index, and rendered posts. `site/collection.json` records the current reading order and older short mutant editions. There are twenty-one current eight-panel comics: five immigrant/elsewhere stories, five Golden Age printed re-renderings of those same stories (2026-09-11, generated through the OpenRouter route with google/gemini-3.1-flash-image), five classic exposure stories, five mutant stories, and one ensemble resources parody. The four earlier four-panel mutant origins remain in an expandable archive on the index.

`_context/comic-scripts/` contains exact scripts for all twenty-one current comics; the Golden Age scripts also carry the shared style block in `the-learning-lab-assemble-golden-age/golden-age-style.md`. `_context/why-origin-stories.md` and `_context/how-this-was-made.md` are editable post sources. The repository is public, including its tracked `_context/` files. Never put private participant information or credentials there. Full local production folders for the recent mutant expansions and resources parody are in ignored `output/comics/`; earlier full production runs remain in the original pack and Downloads. All selected likeness sheets needed to continue are already in the site folders.

## Keys and providers

Marlon plans to copy his `.env` into this repository root. Do not assume it has arrived, print its contents, or copy another project's keys. Read `.env.example` for the names: `OPENROUTER_API_KEY`, `FAL_API_KEY`, and one `HUIT_API_KEY` shared across the Harvard services. Fill only the providers being used. The HUIT base URLs are constants in `utils/lib/providers.mjs`: OpenAI `https://apis.huit.harvard.edu/ais-openai-direct/v2`, Gemini `https://apis.huit.harvard.edu/ais-google-gemini`, and Bedrock `https://apis.huit.harvard.edu/ais-bedrock-llm`. There are currently no base-URL environment overrides.

The utilities resolve the credential root from their own physical location, independent of the shell directory and skill-discovery mechanism. `--env-file` and `--project-root` can override it; exported process values override file values. All models are selected explicitly. OpenRouter and compatible fal/Gemini image routes support references; HUIT OpenAI reference editing and Bedrock image generation are not mapped. Verify current provider/model capabilities before a new live API run. Never claim a dry run proves that a model is accessible.

The existing artwork used the host's native image-generation tool. Astra/agents wrote the exact captions and dialogue before that tool rendered the pages. The provider adapters passed offline tests but these finished comics do not constitute live API validation. A fresh Codex environment may use its native image tool if available, or the authorized API route; record which was actually used. Do not silently switch providers after a failure.

## Practical commands

Run from the repository root. Install the pinned dependencies:

```bash
pnpm install --frozen-lockfile
```

Initialize the generic example locally; it needs no key and makes a fresh output folder:

```bash
node utils/comic.mjs init --plan examples/plan.json --destination output/comics
```

Use the exact new folder printed by initialization; a repeated title gets a numeric suffix. List its job IDs:

```bash
node utils/comic.mjs status output/comics/the-mapmaker
```

Preview a request without an API call (the model ID is an example, not a guaranteed current entitlement):

```bash
node utils/comic.mjs generate output/comics/the-mapmaker mapmaker-page-01 --provider openrouter --model google/gemini-3.1-flash-image --dry-run
```

For a real story, write a new plan and exact four- or eight-panel script using the schema in `.agents/skills/origin-story/references/comic-production.md`. Initialize it, generate/import the character sheets first, then the story pages or individual panels. A whole-page job contains exactly four panels; an eight-panel story needs two page images. `comic import` preserves the image and automatically makes a bounded JPEG when the job is a character sheet:

```bash
node utils/comic.mjs import /path/to/new-comic JOB_ID /path/to/generated-image.png
```

Never substitute a prompt saying “same person” for attaching the selected sheet. Reuse the matching edition's JPEG; default cap is 1536px longest edge and 512KiB. Inspect likeness, lettering, speaker attribution, page order, and both reader views when the environment permits it. Preserve earlier takes rather than overwriting.

## Sharing a finished comic

The publishing helper copies only selected images and sanitized manifests into a fresh presentation folder:

```bash
node scripts/present-comic.mjs output/comics/NEW-COMIC
```

It does not automatically add a card or change reading order. Update `site/index.html`, `site/collection.json`, and previous/next comic links deliberately. Keep the appropriate exact story script in `_context/comic-scripts/`. Do not copy raw reference photographs or production requests into the public presentation.

`scripts/` belongs at the repository root, next to `package.json`, not inside `site/`. The build renders the two editorial Markdown posts and copies the presentation into `dist/`; it does not generate images or call an AI API:

```bash
pnpm build
```

```bash
pnpm check:site
```

For utility or skill-path changes, also run `pnpm test`. Pushes to `main` automatically publish `dist/` through GitHub Pages. A commit/push is therefore also a publication: ensure the requested changes are ready to share. Author this repo as Process Black (`193248099+process-black@users.noreply.github.com`). Push the submodule first, then record the new pointer in `mk-27` if working from the workbook.

## Creative continuity

These four people are some of the people who led some of the many origin-story AI-generation workshops during the week, not the entire Learning Lab roster. Marlon designed the activity for TDM 155AI, developed its rationale and cultural-history questions with Claude during Friday's commute, and then built and ran the skill with Astra.

Marlon's central ability is writing-teacher pattern recognition across unfamiliar academic projects; do not revive the rejected video-hiring story. Jonah continues to span Expos and Bok. Jordan is from Georgia, not Atlanta; the artist island is a mythic place described through comparisons to Hawaii and rural Georgia, with horses. Madeleine's folklore, botanical catalogs, and symbolic structures support imaginative academic systems. The Lab is inside the Bok Center. The resources parody's extravagant wealth is fictional, including Jonah's two-jobs/twice-the-money joke.

The latest preferred mutant length is eight panels. The resources parody is also eight panels and should stay funny, with character-specific excess and an actual punchline. Match the explanatory mechanism to the edition: elsewhere makes old abilities newly remarkable; exposure creates powers; mutation is innate; the resources version buys/builds the capacity. Keep scene-setting narration and exact scripts central to the process.
