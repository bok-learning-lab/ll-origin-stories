---
name: origin-story
description: Turn supplied text into a four- or eight-panel origin comic, optionally interview for more detail, or build a multi-story team formation comic. Generate whole pages or individual panels with reusable character sheets, then deliver a local HTML reader and image gallery.
---

# Origin story

Turn particular experiences into a visible, specific power. Preserve the user's facts while adapting the fictional form. The agent writes and revises; the repository's shared Node utilities prepare the book, generate assets, compress references, and build its local viewer.

## Start with the supplied text

Read the user's input first. Offer one concise opportunity to add the specific missing details that would improve this story: the actual ability, a formative scene, desired tone, appearance, or a photograph. Ask whether they want to add those details, have a longer interview, or proceed with what is available. Do not make them repeat material already supplied. If they already said “just go with what you have,” proceed immediately without another intake question. A long interview is opt-in; read [interview.md](references/interview.md) when needed.

Thin context is not a blocker. Make the best story possible, use restrained fictional staging, and record assumptions separately from facts. Without photos, use a clearly described fictionalized character design rather than claiming an accurate likeness. Do not repeatedly request missing material after the user chooses to proceed.

## Choose the scope and rendering mode

- **Single story:** four or eight panels. Use four unless the user requests eight or the existing brief establishes eight. Read [story-craft.md](references/story-craft.md) for scripts and genre variations.
- **Multi-story sequence:** draft each character's origin, then write a frame story that makes their assembly meaningful. Keep the origins independent, with a shared cast and visual style. Define the reader order explicitly: for example, opening frame page, origin stories, closing frame page. Each component is four or eight panels. Frame pages can use several character sheets together.
- **Whole-page images (`page`):** each generation produces exactly four panels in a 2×2 grid. A four-panel story needs one image; eight panels need two. This fits a model good at page composition and lettering; Marlon reports Nano Banana works well for this. Character sheets are optional for a self-contained page, useful for repeat appearances and multi-page stories.
- **Separate-panel images (`panels`):** first create a character sheet for each recurring character, inspect it, and make a compressed JPEG reference. Then generate one panel at a time with the relevant sheet(s) attached as actual image input. Four images become each reader page. Use a reference-capable image model; prose saying “same person” is not a substitute for the image input. Sheet and panel models may differ.

Honor the user's choice. If none is supplied, choose and state a suitable model/mode from the configured provider options. Do not imply that any model accepts every parameter. A sequence can mix modes by story or page; the reader still shows exactly four panels per page.

## Produce the comic

Read [comic-production.md](references/comic-production.md) for the plan schema and commands, then [image-workflow.md](references/image-workflow.md) for image continuity and model handling. For the four Learning Lab workshop-leader stories, also read [learning-lab-brief.md](references/learning-lab-brief.md).

1. Write the factual brief and exact panel-by-panel captions/dialogue before generating images. Use rectangular narration boxes for the background and explanation a reader needs; do not force everything into terse dialogue. Check the reader-facing text against the brief's central claims, including the original setting, actual abilities, and what changes. Facts mentioned only in art directions are not established for the reader. The user's latest corrections override older briefs and drafts; do not invent a hiring motive or other causal claim to bridge a gap. Save the script and identify whether the agent wrote it or a named text tool generated it. If the user requested text review before images, stop at that stage; a request for a complete comic otherwise authorizes production without repeated approval questions.
2. Create a production plan with title, cast, four/eight-panel components, mode/model choices, and reading order. Initialize a new `{comic-title}` folder in the user's requested destination, or `~/Downloads` by default. Existing folders get a numbered suffix; never overwrite an earlier comic.
3. Generate/import required character sheets. Preserve original images and use the automatically compressed JPEG copies for subsequent API requests. Inspect the JPEG's identity details and legibility. Then generate story images one job at a time, reviewing continuity, reading order, action, and lettering. Use all relevant sheets in team scenes.
4. Update the reader after each accepted image. Finish with `index.html` at the comic root, a gallery of all image assets, and a page reader using a single four-panel image or a properly ordered 2×2 grid of individual panels. Open it locally and check both views before delivery. The complete folder must work after being moved, with relative assets and no server required.

All production artifacts belong in that comic folder: input/context, editable scripts, prompts, reference photos, original and compressed sheets, generation records, alternatives, and selected images. Use `images/references/`, `images/characters/`, and `images/stories/` subfolders. Keys stay in the repository root's local `.env`, never in the comic. Return the folder and `index.html` paths, plus any unfinished assets. Never call a partially generated comic complete.

## Craft

Show a particular ability working; don't label a generic virtue. Do not manufacture trauma, a tidy lesson, or superiority over an entire profession. Preserve doubleness and unresolved tensions when they matter. Fictional stage business is welcome; invented biography must not become a source fact. For the four workshop leaders' series, keep the sincere, playful, slightly ironic register through the final panel.

Keep the skill reusable and production files outside it. The generic `examples/plan.json` and `examples/story.md` can seed a new comic folder. The four workshop leaders in the curated brief are not a complete Learning Lab roster. The API/book workflow depends on the repository's `utils/`, `package.json`, and installed dependencies; copy those with the skill when moving it to another project. No secrets or private participant work belongs in the shared skill.
