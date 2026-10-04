# SkillNex

**Craft Your Resume. Crack Your Interview**

The website, login screens, AI assistant, interview reports, resume downloads, calendar labels, browser title and VS Code task names now use SkillNex.

## Open the project

Open `SkillNex.code-workspace` in VS Code. Its Explorer folder is named SkillNex. The existing `CareerX.code-workspace` also opens this same project for compatibility. The physical `careerx` directory stays in place, so existing server commands and relative database paths continue to work.

Run the existing backend and frontend commands, or select **Terminal → Run Task → SkillNex: run both servers**. Restart the backend to load the updated AI prompts and email/export branding. Reload the frontend to see the logo and new page title.

## Logo files

- `frontend/public/brand/skillnex-original.jpg`: original supplied artwork, unchanged.
- `frontend/public/brand/skillnex-mark.png`: transparent compact emblem extracted with imagegen for navigation, homepage and browser icon.
- The shared `Logo` component in `frontend/src/layouts/AppLayout.tsx` renders the emblem and SkillNex wordmark.
- `frontend/src/career-ui.css` contains the shared brand styling.

## Existing data

Database filenames, Java package names, authentication cookies/JWT issuer, local draft keys and demo credentials retain their original internal identifiers. This is intentional: rebranding must not create an empty database, break current sessions or make saved drafts disappear. No database migration or API key change is needed for this update.
