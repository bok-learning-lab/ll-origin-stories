# ll-origin-stories

This is the working home for the comic collection, reusable origin-story skill, and workshop rationale. The four depicted people are a selection of people who led some of the many origin-story AI-generation workshops this week, not the whole Learning Lab roster.

Use `.agents/skills/origin-story/SKILL.md` for new comics; `.claude/skills/origin-story` links to it. Generation tools are in `utils/`, with credentials in the gitignored root `.env`. Never read keys into chat or put them in artwork, prompts, the site, or Git. The single HUIT key is `HUIT_API_KEY`; fal uses `FAL_API_KEY`.

`site/` is the selected public presentation. `pnpm build` renders `_context/why-origin-stories.md` into the site and copies only `site/` into `dist/`. Publish only `dist/`, never the repository root. The essay is a working draft in Marlon’s first-person perspective for revision. Private editorial context stays under `_context/` except the deliberately rendered essay.

New full production runs belong in ignored `output/` or the user’s requested folder. Preserve sources, exact captions and prompts, old takes, and selected artwork. Write and check lettering before image generation. Match edition-specific character sheets and use compressed JPEG references. Current sequence: immigrant/elsewhere, 1960s exposure, 1970s–1990s mutant, and the comic resources parody. Distinguish fictional wealth/powers from biography.

Marlon’s writing-teacher pattern recognition is central; never invent a video-hiring motive. Jonah retains Expos and Bok ties. Jordan’s mythical artist island combines sea/mountains with farms and horses, compared to Hawaii and rural Georgia; she is not from Atlanta. Keep each person’s distinct contribution without making Marlon the hero with helpers.

Keep Markdown paragraphs unwrapped. Check `pnpm test`, `pnpm build`, and `pnpm check:site` for relevant changes. Remote repo is bok-learning-lab/ll-origin-stories, branch main, authored as Process Black. The parent workbook is mk-27, where this repo is the apps/ll-origin-stories submodule.
