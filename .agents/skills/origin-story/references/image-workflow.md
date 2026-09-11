# Image production modes and continuity

The agent handles the story and visual decisions. The [comic production tool](comic-production.md) handles the book folder, prompts, dependencies, compressed reference sheets, and local HTML reader. Its API calls use the pack's [shared generation utilities](../../../../utils/README.md).

## Model and mode

Choose `page` for a model that follows panel layout, reading order, and lettering well. Marlon specifically identifies Nano Banana as promising for four-panel pages; this is a starting preference, not a guarantee for every scene or model version. Generate one 2×2 four-panel image at a time. Eight panels are two pages, not one crowded eight-panel image.

Choose `panels` when separate shots provide better control. Define the cast, make character sheets first, and attach the relevant compressed sheet(s) to every panel generation. Use a reference-capable route: OpenRouter Images, compatible fal editing endpoints, or native HUIT Gemini images. The current HUIT OpenAI utility only maps text-to-image generation, so it cannot implement the sheet-conditioned panel workflow. It can generate an initial sheet without references; another provider/model may then consume its compressed JPEG.

The plan can set separate models for sheets and story images, per-character/per-story overrides, and `pageModes` for mixed page construction. If more than one model is involved, keep a common visual style and inspect the transition. Do not silently switch provider after a failure. A model's compatibility and account access must be established for the chosen parameters; the toolkit does not automatically benchmark or discover a best model.

## Character sheets

Give each recurring character one canonical description: face, proportions, hair, clothing, distinctive details, and props. Include period variants only when the story needs them. Explain which source photo depicts which period. Without photos, adopt a fictionalized design and keep it consistent; don't block a “just go with what you have” request.

Separate likeness from rendering style. Photos establish identity; they need not make the sheet photorealistic. For dramatic idealized comic designs, explicitly request simplified expressive facial shapes, bold ink masses, graphic shadows, and heroic silhouettes while preserving the person's identifying features. Distinguish that option from a portrait-faithful illustration. If the character ages, produce matching age-specific sheets with an unmistakable visual difference (for example dark versus speckled-gray beard), then assign those variants to the appropriate panels/pages. Keep the same costume design across ages unless the story changes it.

The sheet should show clear full-body front/three-quarter/profile views plus a few expressions on a neutral background. Generate or import it, inspect it, then let `comic import` or `comic generate` create the JPEG reference. The original stays in the take folder. Compression uses Sharp: orientation correction, a white background for transparency, no cropping or enlargement, a maximum 1536-pixel edge, and a target ceiling of 512 KiB. It starts at JPEG quality 82 and reduces quality/dimensions if needed. Inspect the compressed version as well as the original.

The comic tool automatically attaches the selected JPEG reference for each character named in the story's cast, with identity labels in the prompt. A frame scene can receive several sheets. The cast should include every recurring person who must stay recognizable. The final frame uses the same selected sheets as the origins, not newly invented designs.

## Inspect and finish

After each generation, check identity, period/age, props, palette, geography, composition, the intended action, exact lettering, and attribution of speech. A whole-page image must contain exactly four panels in the right order. A separate-panel job must contain exactly one panel. Regenerate only what failed; the tool keeps previous takes in the gallery. All images from a multi-image response are retained, with the first selected initially; import a preferred alternative to select it explicitly.

The reader never crops panel artwork to fill its grid. Use compatible dimensions across separate panels for an even page, and inspect letter legibility at reading size. Page mode preserves the model's composed page as a single image. `index.html` embeds the reader logic and uses relative asset paths, so it opens directly from disk and moves with the folder. The gallery includes source photos, original sheets, compressed references, variants, and final art.

Requests, usage, and output images stay within the comic folder. API keys are loaded from the pack root's `.env` using `OPENROUTER_API_KEY`, `FAL_API_KEY`, and `HUIT_API_KEY`; `--env-file` overrides that file. If a fal wait fails, resume using the saved `fal-request.json` via the image utility into a new folder within the comic, then import the chosen image into the intended job. Do not resubmit merely because waiting was interrupted.

Sharp's [resize](https://sharp.pixelplumbing.com/api-resize/) and [JPEG output](https://sharp.pixelplumbing.com/api-output/#jpeg) documentation informed the compression helper. Provider sources and capability boundaries are in [utils/README.md](../../../../utils/README.md).
