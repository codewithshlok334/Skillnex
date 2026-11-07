# Aptitude Arena and learning achievements

The separate `/app/aptitude` workspace contains 500 single-answer MCQs: 195 quantitative aptitude, 162 reasoning and 143 verbal questions across 45 topics. The bank is checked into `backend/src/main/resources/aptitude/questions.json` and seeded into PostgreSQL once; it does not require AI calls to serve questions or grade answers.

## Content and provenance

480 questions are original practice exercises, including numeric variants, vocabulary, grammar, paragraph ordering and reading comprehension. 20 are compact paraphrases of GATE 2024 General Aptitude questions, checked against official papers and final answer keys. Each sourced question stores its paper, year, question number and both official links. Option order is shuffled, so letters can differ from the official key. Difficulty is SkillNex's practice rating.

Official sources are linked through [GATE's download archive](https://gate2026.iitg.ac.in/download.html). No question is labelled as an exact Microsoft, Meta or other company interview question without verified evidence. Official company preparation guides are linked in the question-bank information panel. Questions are not a complete GATE syllabus or a reproduction of a particular company's hiring test.

Regenerate the deterministic bank with `python scripts/aptitude/build_bank.py`. The generator checks the count, unique question identities, four distinct options and valid answer indices. Already seeded questions are not silently overwritten; publish future content corrections through an explicit versioned update.

## Practice and mock tests

- Practice has no timer. “Check my answer” returns the server-graded answer and an explanation immediately. A correctly answered question earns a persistent star.
- Mock setup allows 1–100 questions and 1–180 minutes, with one timer for the entire test. Mixed-subject mocks distribute questions across subjects.
- Saved answers, review flags and the server deadline survive refresh. Revisions prevent stale tabs from silently replacing saved answers.
- Solutions and answer-key links are omitted from active mock responses. Checking one of the same questions in practice is blocked until that user's mock ends.
- The server scores at submission or expiry: +1 correct, zero wrong or unanswered. No negative marking. A completed report includes every question, the chosen option, correct option, explanation and topic breakdown.
- Progress includes 30-day answered attempts, recent mock scores and weak topics (below 70% after at least three attempts). Skipped mock questions do not inflate answer accuracy.

## Profile stickers

Five custom SVG stickers appear under **Achievements / My Stickers**. Earned badges are coloured and locked badges are grayscale. Unlocks are server-authoritative, account-specific and permanent, using the existing `badges` and `user_badges` tables. Existing accepted CodeLab history is also evaluated at startup.

| Sticker | CodeLab route | Aptitude mock route |
|---|---|---|
| First Finish | 1 distinct fully accepted problem | Finish with 10+ answered questions |
| Sharp Thinker | 5 distinct Medium/Hard problems | At least 70%, 20+ questions |
| High Scorer | 10 distinct problems | At least 85%, 20+ questions |
| Perfect Round | 5 problems accepted on their first judged submission | 100%, 20+ questions |
| Hard Mode Hero | 1 Hard problem | At least 85%, 20+ questions, all Hard |

CodeLab sample runs and runner infrastructure failures do not count as judged submissions for the first-submit milestone. These milestones measure successful practice, not proof of optimal time complexity or contest rank.

An earned sticker triggers an in-app notification and a 5.5-second celebration with small confetti. The popup can be dismissed, respects reduced-motion preferences and deduplicates previously shown awards per user/device. Awards remain saved even if browser storage is unavailable or cleared.

## CodeLab-only SkillCoins and streaks

Each distinct problem's first fully accepted **Submit** earns **one SkillCoin**. Runs, wrong answers and re-submissions do not add coins. Coins are an achievement total derived from persisted accepted submissions, not a payment balance. Existing solved questions count as well. Aptitude practice and mocks never award SkillCoins.

The current and longest streak use consecutive days with a new solved problem, in the viewer's time zone. Multiple solves on one day count as one streak day. A streak ending yesterday remains current until today ends; a missed day resets the current streak. The existing green activity calendar and monthly totals retain their first-solve counting behavior.

## Password policy

New signup and user-requested password resets require at least 9 characters, an ASCII capital letter, a digit and a non-whitespace special symbol. Passwords are not silently truncated; the existing BCrypt encoder's 72-byte limit is validated. The form shows a compact checklist and a short popup for invalid new passwords. The API enforces the same rules.

Existing password hashes are not changed or migrated. Login does not apply the new composition rules, so existing users keep their current passwords and account IDs. Google sign-in setup is deferred and its current configuration is unchanged.

## Deployment

Flyway V11 adds the aptitude question, attempt and mock tables. V12 adds stored mock-award results and the five badge definitions. Both are additive; existing user tables and records are retained. Deploy through the existing single-site Docker build and existing Neon database. Frontend and API remain on the current Render URL.

Validation covers grading, question privacy, owner isolation, retries, expiry, revisions, minimum award thresholds, duplicate grants, CodeLab coin idempotency, streak boundaries and legacy password login. Browser checks cover practice, mocks, profile stickers, password messaging and responsive layouts.
