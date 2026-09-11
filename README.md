# Learning Lab Origin Stories

Sixteen current comics explore four frames: immigrant origins, technological accidents, innate mutant difference, and an extravagant money-and-equipment parody. The first three each have four eight-panel origins plus an eight-panel team story; the fourth is one eight-panel ensemble parody. Earlier short mutant versions remain available. Marlon, Jordan, Madeleine and Jonah are some of the people who led some of the many origin-story AI-generation workshops this week; this is not a complete roster of the Learning Lab. The [presentation](site/index.html) contains the selected stories and character sheets; its local readers work without an internet connection.

The reusable [origin-story skill](.agents/skills/origin-story/SKILL.md) turns supplied context into four- or eight-panel comics. It can offer a short follow-up or a longer interview, proceed immediately when asked to use what it has, write scene-setting captions before rendering, generate whole four-panel pages or individual panels, and assemble several origins into a team story. Character sheets can use supplied photos and are compressed to JPEG before reuse. A new comic folder includes an editable script, prompts, images, and a standalone page reader/gallery.

## Set up the tools

Use Node 22.12 or newer and pnpm 10.7.0, as recorded in [package.json](package.json). Run these commands from the repository root:

```bash
pnpm install
```

```bash
cp -n .env.example .env
```

Open `.env` in your local editor and fill only the providers you use: `OPENROUTER_API_KEY`, `FAL_API_KEY`, or `HUIT_API_KEY`. One HUIT key serves all three Harvard gateways. Their base URLs are constants in [utils/lib/providers.mjs](utils/lib/providers.mjs), not environment switches. The populated `.env` and local outputs are gitignored.

The utilities find the repository root from their own physical location: `utils/lib/` is two directories below it. They read that root's `.env` even when called from another working directory or through a symlink. No Git checkout or special agent-provided root variable is required. Pass `--env-file /path/to/.env` or `--project-root /path/to/project` to override it. Existing process environment values take precedence. The historical exported overrides `AI_LAB_ENV_FILE` and `AI_LAB_CONTEXT_PACK_ROOT` are also supported.

## Try the included example

The [example plan](examples/plan.json) and [four-panel script](examples/story.md) use an entirely fictional maker and no photos. Initializing the folder is local and needs no API key:

```bash
node utils/comic.mjs init --plan examples/plan.json --destination output
```

```bash
node utils/comic.mjs status output/the-mapmaker
```

Open the printed folder's `index.html` to see the page reader with its pending artwork. If that folder already exists, initialization chooses a numbered suffix; use the newly printed path in later commands. Omitting `--destination` places a new title folder in `~/Downloads`.

To preview an API request without sending it:

```bash
node utils/comic.mjs generate output/the-mapmaker mapmaker-page-01 --provider openrouter --model google/gemini-3.1-flash-image --dry-run
```

Model IDs throughout this repository are examples, not guarantees of current availability or access on your account. A real API call requires a compatible model, provider account and key; image-reference support and parameters differ by model. Remove `--dry-run` only when you want to submit that request.

An agent environment with a built-in image-generation tool can use that tool for the pictures and import the resulting local file into the same workflow:

```bash
node utils/comic.mjs import output/the-mapmaker mapmaker-page-01 /path/to/generated-page.png
```

This built-in route is available only when the agent host supplies it; the repository does not bundle or emulate that service. It is an alternative to the provider CLI routes, and it does not use this repository's API keys. The included comics used native image generation, so they do not establish that the OpenRouter, fal or HUIT API adapters have been tested with live accounts.

The commands also have pnpm shortcuts: `pnpm comic`, `pnpm image`, `pnpm text`, and `pnpm compress-image`. The [utility guide](utils/README.md) explains provider routes, image inputs, output records, compression, and fal recovery.

## Use the agent skill

The canonical skill lives at `.agents/skills/origin-story/`; `.claude/skills/origin-story` is a relative symlink to it. In an agent that discovers repository skills, ask it to use `origin-story` with your supplied text, desired four/eight-panel scope, style, output location, and optional photos. You can say “just go with what you have” to skip an interview. Read [SKILL.md](.agents/skills/origin-story/SKILL.md) directly if your agent needs an explicit path.

Keep the skill, `utils/`, and package files together when copying the workflow into another project. The generic example is sufficient to start; the curated [workshop brief](.agents/skills/origin-story/references/learning-lab-brief.md) is optional context for these four people. Private source handoffs, source photos, credentials and generation scratch files are not required by the reusable skill.

## Check the implementation

```bash
pnpm test
```

The offline tests cover request construction, environment discovery, output preservation, fal receipt recovery, character-reference handling, JPEG compression and comic packaging. They do not measure live provider access or the artistic quality of generated images. Sharp handles images and Marked renders the essay; the text/image API commands themselves use Node built-ins.

## Presentation and editorial work

Open `index.html` or [site/index.html](site/index.html) locally. The four people featured are a selection of this week’s workshop leaders, not the full Learning Lab roster. The index introduces four historical/interpretive frames. Read the [working essay](site/why-origin-stories.html); edit its source in [_context/why-origin-stories.md](_context/why-origin-stories.md).

```bash
pnpm build
```

```bash
pnpm check:site
```

The build copies only the presentation to `dist/`; keys, utilities and skill instructions are not deployed as website files. GitHub Pages publishes it automatically on pushes to `main`, and the workflow can also be run manually. The repository is public, so all tracked source—including `_context/` editorial drafts—is visible on GitHub. Populated credentials, source photographs and full production runs remain local and gitignored.

Live site: https://bok-learning-lab.github.io/ll-origin-stories/

The [process post](site/how-this-was-made.html) follows the activity from TDM 155AI through this week’s workshops, Friday’s Claude conversation, and skill-building and generation with Astra. Its source is [_context/how-this-was-made.md](_context/how-this-was-made.md).
