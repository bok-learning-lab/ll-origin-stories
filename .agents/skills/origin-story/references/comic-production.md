# A comic folder from scripts to reader

Run from the pack root. First install the package dependencies with `pnpm install --frozen-lockfile`. The API commands still run without extra dependencies; compression and comic packaging use Sharp. Resolve the pack from the physical skill location, three directory levels above the physical `.agents/skills/origin-story/` folder, rather than assuming a shell working directory.

## Production plan

The agent writes the input brief and scripts, then creates a JSON plan. Paths to scripts and photos resolve relative to that plan file. Each Markdown script has `## Visual direction` and exactly four or eight consecutively numbered `## Panel N — …` sections. An `## Editorial notes` section is retained in the script but excluded from image prompts.

A single eight-panel story with separate panels:

```json
{
  "title": "Under a Different Sun",
  "sourceText": "The user's input, plus clearly labeled assumptions and fictional additions.",
  "style": "Expressive ink, warm halftones, red-pencil motifs, restrained lettering.",
  "render": {
    "mode": "panels",
    "provider": "openrouter",
    "model": "google/gemini-3.1-flash-image"
  },
  "characterRender": {
    "provider": "openrouter",
    "model": "google/gemini-3.1-flash-image"
  },
  "characters": [
    {
      "id": "marlon",
      "name": "Marlon",
      "description": "The complete chosen visual design, including period changes if needed.",
      "photos": []
    }
  ],
  "stories": [
    {
      "id": "marlon-origin",
      "title": "Under a Different Sun",
      "script": "marlon.md",
      "characters": ["marlon"]
    }
  ]
}
```

Replace the example description with actual visual decisions before production. The model ID is an example from the existing utility workflow, not a promise of account access. All model selections are explicit. Set `render.mode` to `page` for four panels in each image. A four-panel script produces one reader page; eight produces two. `--mode page` or `--mode panels` on `init` overrides the default mode, except explicitly supplied `pageModes`.

Character definitions produce sheet jobs. Every character listed by a story must have a selected compressed sheet before that story's image jobs can run. For a standalone page without sheets, omit `characters` and the story's cast; for `panels`, at least one character is required. For photo-grounded sheets, set `photos` to one or more paths, for example `"photos": ["photos/marlon-current.jpg", "photos/marlon-earlier.jpg"]`. Inspect the photos first and explain period/age roles in the character description; otherwise conflicting age references may be blended. Each photo is preserved, compressed, and attached to the sheet request as actual image input. Source photos are optional and never requested again after the user says to proceed without them. Photo originals and compressed copies are copied into the comic.

`render` may also contain `aspect`, `resolution`, `size`, `quality`, `format`, `ref-field`, and `params` (a native provider JSON object). Only use options supported by the selected route/model. Character rendering inherits the top-level render options, then `characterRender`, then a character's own `render` object. Story rendering inherits the top-level settings, then its own `render` object. Set a property to `null` to remove an inherited option. CLI options on `generate` override stored choices for that run.

## Multi-story and mixed pages

Add a story for each origin and a separate frame with `"role": "frame"`. The frame's `characters` lists the participating cast. Keep character IDs identical across components so their JPEG sheets are reused. Each story can set its own `render` provider/model/mode. `"pageModes": ["page", "panels"]` makes the first page a single image and the second page four separate images.

Set top-level `readingOrder` when the frame should surround the origins:

```json
["team-frame:1", "marlon-origin:1", "marlon-origin:2", "jonah-origin:1", "jonah-origin:2", "team-frame:2"]
```

That list must include every page exactly once. The origin scripts can be drafted and generated before the frame, while the reader starts with its opening page. Keep each component at four or eight panels; add components for a longer sequence.

## Initialize the output folder

```bash
node utils/comic.mjs init --plan /path/to/plan.json
```

Default output is `~/Downloads/under-a-different-sun/`. The title becomes a filesystem-safe lowercase folder name. Existing folders get `-2`, `-3`, etc. To use another parent directory:

```bash
node utils/comic.mjs init --plan /path/to/plan.json --destination /path/to/destination
```

Every comic includes:

```text
comic-title/
  index.html
  comic.json
  source/                 input brief and original plan
  scripts/                editable story scripts
  prompts/                character, page, and panel prompts
  images/
    references/           source photos and compressed copies
    characters/           original sheets, JPEG references, alternative takes
    stories/              per-story, per-job, per-take image outputs and records
```

The folder and reader exist immediately; ungenerated art appears as labeled empty slots. Generate inside this folder rather than leaving production images in the pack's generic `output/`. If filesystem permissions require approval for Downloads, request that specific write permission or honor a destination the user supplied; do not silently deliver somewhere else.

## Generate or import

List the jobs:

```bash
node utils/comic.mjs status /path/to/comic-title
```

Generate the character sheet first:

```bash
node utils/comic.mjs generate /path/to/comic-title character-marlon
```

The returned original remains in its take folder; the tool also creates `reference.jpg` and records the compression dimensions, quality, and bytes. Inspect both images. Then generate a panel:

```bash
node utils/comic.mjs generate /path/to/comic-title marlon-origin-panel-01
```

For page mode the corresponding job is `marlon-origin-page-01`. The tool attaches the selected JPEGs automatically. Add `--dry-run` to inspect a request without sending it, or `--provider NAME --model MODEL` to choose another compatible model explicitly. Run one job at a time so the agent can inspect results. Repeating a job creates another take and selects its first output; it does not overwrite earlier images. Reference sheets are prerequisites, not generated silently as extra API calls.

Use `import` for images generated by a native tool or an external workflow, or to select a preferred alternative. It copies the image into a fresh take and performs the same sheet compression if appropriate:

```bash
node utils/comic.mjs import /path/to/comic-title character-marlon /path/to/sheet.png
```

If a fal request already exists, resume it through `generate-image.mjs --resume RECEIPT --out NEW_DIRECTORY_INSIDE_COMIC`, then import its result into the intended job. The job lock prevents concurrent manifest writes. A lock left after a killed process should be inspected and removed only after confirming no comic command is still running; this is not permission to resend an uncertain paid request.

## Reader and delivery

The reader rebuilds after each generated/imported image. After manual changes to reading order, prompts, or asset selection, rebuild explicitly:

```bash
node utils/comic.mjs render /path/to/comic-title
```

Open `index.html` locally. Check next/previous, the page selector, mixed single-image/2×2 pages, and the gallery. The gallery includes all images beneath `images/`, including alternatives and character references; the reader uses only the selected image for each job. No remote fonts, JavaScript libraries, API credentials, or fetch requests are needed to view the book. Verify that the folder still works when moved. Deliver the folder plus its `index.html` path, describing any pending artwork accurately.
