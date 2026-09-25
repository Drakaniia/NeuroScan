# source-grounded-writing — Source-Grounded Academic Writing & Citation Skill (Specification)

**Status:** Draft v1.1 — written from an 8-round interview on 2026-09-15 and updated the same day with an **executed dry-run audit** of Chapter 1 §Background paragraph 1 (§16.4). No skill file and no registry created yet; no chapter edited.
**Date:** 2026-09-15
**Short name:** `source-grounded-writing`
**Artifacts specified:** `.agent/skills/source-grounded-writing/SKILL.md` (the skill) and `sources/verified-sources.md` (the verified-source registry)

---

## 1. Executive Summary

`source-grounded-writing` is an agent skill for producing academic prose in which **every sentence that makes a scholarly claim carries an inline, clickable author–year citation to a real source whose actual content was accessed and examined first**.

It exists because the NeuroScan thesis chapters (Chapters 2–4 still unwritten; Chapter 1 already drafted with citations) must survive a citation-level defense: no invented references, no fake DOIs, no citing a paper by title or abstract for a claim the paper does not make, no reference list written first and matched after. The failure mode being engineered against is **plausible-looking fabricated scholarship**, and the skill's contract makes that failure visible instead of fluent.

The skill has three modes — **write**, **audit**, and **sources** — inferred from the request with explicit keyword override. It never writes to repo files: it returns text inline in chat, plus an **evidence table** (claim → source → access level → link → what the source actually supports), a **compact audit block**, and an explicit **gap list** for claims that could not be verified.

Its second by-product is a **persistent verified-source registry** (`sources/verified-sources.md`) so a source verified once for Chapter 1 can be reused in Chapter 2 without re-reading, while still being re-checked for link liveness and flagged as already-cited.

The governing rule is the user's own priority statement: **when fluent writing and evidence accuracy conflict, evidence accuracy wins.**

---

## 2. Interview Decision Log

Gathered via 7 structured `ask_questions` rounds on 2026-09-15. **[choice]** = user-selected; *(note)* = user's elaboration or interpretation.

### 2.1 Round 1 — Scope, location, delivery

| # | Question | Decision |
|---|----------|----------|
| 1 | What can the skill do? | **[choice] Write new text + audit/rewrite existing text** — one skill covers new drafting *and* verifying/repairing existing prose (e.g. Chapter 1's citations). *(A third "sources-only" mode was later confirmed in Round 7 #28.)* |
| 2 | Where does the skill live? | **[choice] `.agent/skills/source-grounded-writing/SKILL.md`** — fits the currently-empty `.agent/skills/` directory, mirrors the frontmatter format of the existing root `SKILL.md`. |
| 3 | Where does finished text go? | **[choice] Inline in chat only; the user pastes it.** The skill must not edit `CHAPTER*.md` unless explicitly asked in a separate request. |
| 4 | Relation to the existing root `SKILL.md` (`research-paragraph`) | **[choice] The new skill governs academic writing; the old skill's rules are explicitly catalogued as inherited or overridden** (§4) so the two can never silently conflict mid-task. |

### 2.2 Round 2 — Evidence trail, memory, naming

| # | Question | Decision |
|---|----------|----------|
| 5 | Evidence back-matter per task | **[choice] Inline evidence table in chat, per task.** Claim → source → access level (full text / abstract only) → link → what the source actually supports. Nothing written to disk. *(Rejected: a persistent audit file, and a table+prose hybrid.)* |
| 6 | Reuse of verified sources | **[choice] Yes — maintain a persistent verified-source registry** so later paragraphs reuse already-verified sources instead of re-fetching. |
| 7 | Existing unverified link dumps | **[choice] Treat as a candidate queue to verify.** `RRL_links.md`, `RRS_links.md`, `reference.md`, and `for_chapter2.md` (including the groupmate collections by Ybanez / Palmares / Digal / Cantiver) are fetched one by one: verified entries get metadata + access level recorded; the rest are marked unverified or dead. |
| 8 | Abstract-only access visibility | **[choice] Access level lives in the ledger; prose stays clean.** No inline `[abstract-only]` tags in the sentences themselves. |
| 9 | Naming | **[choice] `source-grounded-writing`** → skill dir `.agent/skills/source-grounded-writing/`, spec file `source-grounded-writing-spec.md`. |

### 2.3 Round 3 — Citation mechanics

| # | Question | Decision |
|---|----------|----------|
| 10 | Link target | **[choice] Link to the version actually read, preferring open access, then DOI.** OA full text (PMC / DOAJ / institutional repository / arXiv) when that is the version read; otherwise `https://doi.org/...`; publisher landing page only when no DOI exists. |
| 11 | Hyperlink anchor | **[choice] The author–year text is clickable** — e.g. `([Smith, 2022](https://doi.org/...))` — matching the user's request example and the root skill's convention. |
| 12 | Multi-author abbreviation | **[choice] Strict APA 7th:** 1 author `(Smith, 2022)`; 2 authors `(Smith & Jones, 2022)`; 3+ `(Smith et al., 2022)`. Chosen for clean Zotero compatibility. |
| 13 | Sentence rules vs. the old ≤25-word / one-citation contract | **[choice] No word cap; multiple citations per sentence allowed when each has a distinct evidentiary role** (soft ceiling ~3). The one-idea discipline is kept; the word cap and the single-citation rule are dropped for academic prose. |
| 14 | Same author + same year | **[choice] Plain years in the draft; Zotero disambiguates.** *(note: Chapter 1 currently uses `2026a` / `2026b`; the skill must recognise an existing suffix and reuse it rather than contradict it — see §6.5.)* |

### 2.4 Round 4 — Source policy

| # | Question | Decision |
|---|----------|----------|
| 15 | Recency | **[choice — Round 4] Hard rule: nothing older than 5 years** → **[refined Round 5 #19] rolling 5-year window (2021+ as of today) with a narrow, user-cleared "foundational method" exception.** |
| 16 | Allowed source types | **[choice, multi-select] Peer-reviewed journals / systematic reviews / meta-analyses**; **conference proceedings + academic book chapters**; **official documentation & dataset/software records** (Kaggle / IEEE DataPort records, ONNX Runtime docs); **theses, dissertations, university & institutional repositories**. *(note: government/institution reports were initially not selected, then explicitly allowed for statistics in Round 6 #24; GitHub repos and blog posts were not selected as standalone evidence.)* |
| 17 | Quotation policy | **[choice] Short quotes allowed with a locator:** verbatim up to ~25 words, in quotation marks, with a page/section locator plus the link; anything longer must be paraphrased. |
| 18 | Search budget before declaring "cannot verify" | **[choice] Moderate:** roughly 4–6 differently-worded queries across at least 3 scholarly databases, with at least 3 candidate sources actually opened, before a claim is declared unsupported. |

### 2.5 Round 5 — Recency conflict, access failure, audit

| # | Question | Decision |
|---|----------|----------|
| 19 | The CAM/Grad-CAM problem (Zhou et al. 2016 and Selvaraju 2017 fall outside the 5-year window but define NeuroScan's heatmap method) | **[choice] Rolling window (2021+) with a narrow "foundational method" exception, each exception cleared by the user.** Older works are allowed only when they define a method or tool actually used, and every candidate is listed for separate approval. |
| 20 | Paywalled source with no OA version anywhere | **[choice] Ask the user to paste the accessible text/PDF, then continue.** The write/audit run pauses with an explicit list of exactly which sources it needs; the citation then becomes full-text verified. |
| 21 | Final citation audit | **[choice] Compact audit block at the end of every deliverable** — yes/no per audit question plus sentence-count vs. citation-count, so a failed audit is visible rather than hidden. |
| 22 | Link liveness | **[choice] Check that every citation link resolves before finalizing.** A dead link, or one redirecting to the wrong source, is fixed or the citation is dropped and reported. |

### 2.6 Round 6 — Repo integration

| # | Question | Decision |
|---|----------|----------|
| 23 | Retro-audit of Chapter 1 | **[choice] Audit Chapter 1 and report; do not edit it.** Claim-by-claim report flagging citations that cannot be verified or whose source does not support the sentence. *(The separate "also audit the root SKILL.md example DOIs" option was declined.)* |
| 24 | Statistics sources (GLOBOCAN/IARC, ACS, national registries) | **[choice] Allow authoritative agency/registry statistics for prevalence and burden claims only**, tagged as non-peer-reviewed in the ledger. |
| 25 | Chapter 2 structure rules from `CHAPTER2_guide.md` | **[choice] Enforce citation rules plus Chapter 2 structure, prose only** — topical outline, storyline, no Wikipedia, books sparingly, APA in-text. Tables, figures, List of Tables/Figures, and the Definition of Terms table stay the user's job. |
| 26 | First proving ground | **[choice] Chapter 2 in full — 2.1 Related Literature, 2.2 Related System, 2.3 Concept of the Study (framework description), 2.4 Definition of Terms.** |

### 2.7 Round 7 — Reuse semantics, gate, modes, tooling

| # | Question | Decision |
|---|----------|----------|
| 27 | Cross-chapter reuse of a registry source | **[choice] Reuse as-is, but re-check the link and note where else it was used.** No re-reading is required; the ledger records that the source was already cited in an earlier chapter so the same evidence is not double-counted. *(note: "this is very important especially in Chapter 2 — may use the resources in Chapter 1 and include [them] in Chapter 2.")* |
| 28 | Pre-draft gate | **[choice] Yes — sources first, then draft.** For anything longer than a paragraph, the skill returns the claim list with matched, verified sources and waits for approval before writing sentences. |
| 29 | Mode selection | **[choice] Infer from the request, with explicit mode keywords as override**, and always state which mode is running. |
| 30 | Tooling beyond the skill | **[choice] Spec both as optional later milestones:** a deterministic checker script and a Zotero-ready RIS/BibTeX export block on request. |

### 2.8 Round 8 — Registry location

| # | Question | Decision |
|---|----------|----------|
| 31 | Registry scope | **[choice] One repo-level registry file shared by all chapters** → `sources/verified-sources.md`. |

---

## 3. Scope

### 3.1 In scope (v1 of the skill)

- A `SKILL.md` at `.agent/skills/source-grounded-writing/SKILL.md` with YAML frontmatter (`name`, `description`) matching the existing root skill's format.
- Three operating modes (write / audit / sources) with the contract, workflow, output templates, audit checklist, and failure protocol all fully specified in the skill body.
- The verified-source registry file and its entry schema.
- Seeding the registry by verifying (or marking dead) the entries in `RRL_links.md`, `RRS_links.md`, `reference.md`, `for_chapter2.md`.
- A Chapter 1 audit report (read-only).
- Chapter 2 (2.1–2.4) as the first full drafting target.

### 3.2 Out of scope (skill v1)

- Automatic editing of any `CHAPTER*.md`, `Readme.md`, or spec file.
- Building the reference list / bibliography (Zotero owns that; a list is produced only on explicit request).
- Table captions, List of Tables/Figures generation, and the Definition of Terms table formatting.
- The checker script and RIS/BibTeX exporter (specified as later milestones, §13).
- Any claim about statistics, datasets, or models not carried by a verified source.

---

## 4. Relationship to the Existing Root `SKILL.md`

The root `SKILL.md` (`research-paragraph`) remains in place. For academic writing, the new skill governs, and this table is reproduced inside the new skill so the two can never contradict each other silently.

| Root rule | Status under `source-grounded-writing` | Why |
|-----------|----------------------------------------|-----|
| ≤25 words per sentence | **Overridden** | Scholarly claims frequently need a qualifier, a scope, and a mechanism; the cap forced distortion. One *idea* per sentence is retained. |
| One citation per sentence, always at the end | **Overridden** | Citations may sit mid-sentence or at the end, and several may appear where each has a distinct evidentiary role. Minimum one citation per scholarly claim still holds. |
| Every sentence must have a citation | **Overridden (relaxed)** | A sentence that makes no factual/theoretical/empirical/interpretive claim (a roadmap sentence, a transition, the study's own aim) needs no citation. Sentences *about the literature* always do. |
| Plain language; jargon defined once | **Inherited** | Kept, plus one relaxation: standard domain terms (CNN, MRI, CAM, ONNX-AUC) may be used after a single definition. |
| "Match, not random" — the source must actually contain the claim | **Inherited and strengthened** | Strengthened from "title/abstract must contain the claim" to "the source's actual content must be accessed and read before it is cited." |
| Mandatory APA 7th list at the end | **Overridden by default** | The user manages citations in Zotero; no bibliography unless explicitly requested. In-text format stays APA 7th. |
| `[citation needed]` placeholder as an acceptable fallback | **Overridden** | Replaced by the explicit gap protocol (§11.3): the unsupported claim is not written; the gap is reported. |
| Red-flag list (same DOI for 3 claims, citation added without opening the source, etc.) | **Inherited** | Reused verbatim as fast failure detectors inside the audit block. |

---

## 5. Modes & Invocation

| Mode | Trigger (inferred) | Explicit keyword | Output |
|------|--------------------|------------------|--------|
| **write** | "write a paragraph/section about X", "draft Chapter 2.1" | `/write` | Claim plan → (approval) → prose + evidence table + audit block + gaps |
| **audit** | "check/verify/audit this text", "are these citations real?", "does this source support this sentence?" | `/audit` | Claim-by-claim verdict table + violation list + audit block. **Never rewrites** existing text unless the user asks for a rewrite in a separate request. |
| **sources** | "find sources for X", "what does the literature say about X" | `/sources` | Verified source table only, no prose. |

The skill **states the mode it is running in** as its first line of output. If the request is ambiguous between write and audit (e.g. "improve this paragraph"), the skill asks which mode before doing work.

---

## 6. The Contract

### 6.1 Non-negotiable rules

1. **Claim → source before sentence.** The exact claim is identified, a source that directly supports it is found, the relevant portion is read, and only then is the sentence written. Never prose-first, citations-after.
2. **No fabricated scholarship, ever.** No invented studies, citations, authors, years, titles, DOIs, URLs, quotations, page numbers, or findings. No citation copied from another paper's reference list without opening the original. No "it appears in Google Scholar, therefore it is citable."
3. **Access before citation.** A search-result snippet, database record, title, author profile, abstract-only page, or another paper's reference list is *not* sufficient evidence for a claim about the source's findings.
4. **Never stretch a source.** If a source shows an association between X and Y, it may not be cited for "X causes Y". If it reports one dataset, one population, or one scanner, the sentence may not universalise it.
5. **No claim without support.** If no suitable source can be accessed and verified, the claim is **not written**. The gap is reported instead (§11.3).
6. **Citation quality over quantity.** No citation is added "for scholarly appearance"; each must carry a distinct evidentiary role. Citation stuffing is a violation, not a style choice.
7. **Evidence accuracy beats fluency.** A three-source paragraph that is honest beats a polished paragraph with one unsupported claim.
8. **No claim about what a source does not say.** Hedging is mandatory where the evidence is partial: *may, suggests, indicates, is associated with, has been found to*. Correlation is never rendered as causation. One study's result is never rendered as universal truth.
9. **The user's own study is exempt.** Sentences describing NeuroScan's design, objectives, or scope are the study's own assertions and need no citation; sentences *about prior literature* always do.

### 6.2 Per-sentence checklist (internal, before a sentence is written)

1. What is the exact claim (one idea)?
2. Which verified source supports exactly that claim?
3. Was the supporting passage actually read (full text), or is only the abstract available?
4. Does the source's own wording support the sentence's strength (association ≠ causation; one setting ≠ universal)?
5. Does the sentence preserve the source's stated limitations?
6. Is the citation anchor correct — author, year, et al. form, link target?

If any answer is "no" or "unclear", the sentence is rewritten, re-sourced, or dropped.

### 6.3 Claim-type distinctions the skill must preserve

Every sentence is written so a reader can tell which of these it is, and the evidence table records it:

| Claim type | Permitted when | Typical phrasing |
|------------|----------------|------------------|
| Established finding | Multiple independent studies agree, or a review/meta-analysis states it | "X has been shown to…", "Studies consistently report…" |
| Single-study finding | One study (with its scope stated) | "In a single-centre study of N patients, X…", "One study found…" |
| Theoretical proposition | The originating/authoritative source is cited | "According to [theory], X is…" |
| Interpretation / synthesis | The gap that the multiple cited sources jointly leave is stated as the study's reading | "Together, these findings suggest…" (still cites the sources) |
| Assumption / design choice | The study's own reasoning | "This study assumes…" (no citation required) |

### 6.4 Synthesis, not listing

Consecutive sentences must not be a laundry list of studies ("A did X. B did Y. C did Z."). The skill writes a **storyline**: group by theme, state what the body of work jointly supports, then note the divergence or limitation. Multi-source sentences are the preferred device for synthesis, with each citation carrying a distinct role.

### 6.5 Author-year edge cases

- Existing suffixes in Chapter 1 (`2026a`, `2026b`) are reused rather than re-assigned, so the same work keeps the same letter across chapters.
- When the skill introduces two works by the same author in the same year, it writes plain years in the draft and records in the evidence table which entry is which (title/journal), leaving disambiguation to Zotero.
- `n.d.` is only used when the source genuinely carries no date, and is flagged in the ledger.
- Corporate/institutional authors use the organisation name; if an abbreviation is standard (`WHO`, `IARC`), it is defined at first use.

---

## 7. Source Policy

### 7.1 Recency

- **Default hard window: publication year ≥ 2021** (rolling five years, evaluated against the current year at the time of writing; the window advances with the calendar).
- **Foundational-method exception:** a pre-2021 work may be used only when it *defines a method, metric, architecture, or tool that the study actually uses* (e.g. Class Activation Mapping, Grad-CAM, ONNX Runtime, a specific CNN backbone). Each exception is **listed separately and cleared by the user before it enters the prose** — never bundled silently into an otherwise-recent paragraph.
- **Statistics exception:** for prevalence/burden sentences, a body's *current* published statistics take precedence even if the body itself is long-lived; the cited artifact (report/webpage/paper) must still be currently published and dated.

### 7.2 Allowed source tiers

| Tier | Types | Notes |
|------|-------|-------|
| A — primary | Peer-reviewed journal articles, systematic reviews, meta-analyses | Preferred for every conceptual, empirical, and theoretical claim. |
| B — strong | Conference proceedings, academic book chapters | Allowed; venue recorded in the ledger. Books used sparingly per `CHAPTER2_guide.md`. |
| C — technical | Official documentation and dataset/software records (Kaggle, IEEE DataPort, ONNX Runtime docs, tool docs) | Allowed **only** for claims about the dataset, tool, or file format itself — never for conceptual/clinical claims. |
| D — institutional | Theses, dissertations, university and institutional repositories | Allowed for method/implementation evidence; marked non-peer-reviewed in the ledger. |
| E — statistics | Authoritative agency/registry publications (WHO, IARC/GLOBOCAN, national cancer registries, ACS-style bodies) | Allowed **only** for prevalence, incidence, mortality, and burden claims, and only where the body itself publishes the number. Tagged non-peer-reviewed in the ledger. |
| — prohibited | Wikipedia and wiki-like sources; news articles and magazines; personal pages and blogs; SEO content farms; predatory/grey journals; GitHub repositories as standalone evidence; AI-generated or unverifiable text | Never used as evidence for a scholarly claim, even when the claim is true or widely known. |

### 7.3 Priority rules

1. Peer-reviewed and authoritative sources outrank accessible-but-weak ones.
2. Open access is preferred, **but** a highly relevant paywalled scholarly source is not rejected merely for being paywalled if it can be legitimately verified and examined (per the paywall protocol, §8.3).
3. A recent, well-matched source beats an older, tangential one.
4. When two sources conflict, both are cited and the conflict is stated explicitly; the skill never silently picks the convenient one.

---

## 8. Access, Verification & Link Integrity

### 8.1 Access levels (recorded in the evidence table and the registry)

| Level | Meaning | What may be claimed |
|-------|---------|---------------------|
| **F — full text read** | The full text (or the fully relevant section) was fetched and read | Any claim the passage supports. |
| **A — abstract only** | Only the abstract was accessible (or the OA record carries only an abstract) | Only what the abstract itself establishes; the sentence must be narrow and the level shown in the ledger. |
| **P — pending user access** | Paywalled with no OA version anywhere | Nothing yet. The skill pauses and asks the user for the text/PDF (§8.3). |
| **X — rejected** | Source could not be verified, was found to be mis-described, or is prohibited | Never cited. Recorded with the reason. |

A claim may never be written at level **P** or **X**, and a level-**A** source may never be cited for a detail that only appears in the paper body.

### 8.2 Verification procedure per source

1. Locate the source (search, then open the full record — never stop at a snippet).
2. Confirm **it is real and it is what it claims to be**: authors, year, title, venue, DOI resolve to the same work.
3. Access the text: OA full text first (PMC, DOAJ, publisher OA, institutional repository, arXiv/ preprint clearly labelled as preprint).
4. Read the relevant section — results/discussion for findings, method for procedures, theory section for propositions.
5. Extract the **exact passage** that supports the claim and record it in the registry (a short paraphrase plus, where useful, a ≤25-word verbatim snippet).
6. Record: access level, link actually read, date verified, and the specific claims this source is allowed to support.
7. Never infer a finding from a figure caption, a citation inside the source, or a "highlights" box.

### 8.3 Paywall protocol

When the needed source has no accessible version:

1. Do **not** write the sentence and do **not** cite the source.
2. Report a **pause block**: source title, authors, year, DOI/URL, why it matters, which exact claim it would support, and what has already been tried (OA search, repositories, preprints, author copies).
3. Wait for the user to paste the text/PDF (institutional access, library copy).
4. On receipt: read it, upgrade to access level **F**, record it in the registry, and continue the original task.

The skill never treats "the abstract mentions this" as full-text evidence.

### 8.4 Link liveness (mandatory before delivery)

- Every citation link in the delivered text is followed once and must resolve to **the correct work**.
- A link that 404s, dead-ends, redirects to a paywall landing page other than the read version, or resolves to a *different* article is repaired (switch to the DOI, the repository copy, or a stable publisher page) or the citation is dropped and listed under gaps.
- Reused registry entries get their link re-checked (the content is not re-read) — per decision #27.

---

## 9. Claim-to-Sentence Matching Procedure

For each sentence, in order:

1. **State the claim in one line** (this line becomes the left column of the evidence table and the item in the pre-draft claim plan).
2. **Classify the claim** (established finding / single-study finding / theoretical proposition / interpretation / statistic / tool-or-dataset fact) — this determines the permitted source tier (§7.2).
3. **Map to a verified registry entry** first; only search fresh if the registry has no match.
4. **Read the passage** supporting that claim (§8.2).
5. **Test the match:** does the source's own wording support the claim at the strength written? If the sentence asserts more (causal, universal, predictive), weaken the sentence to match the source.
6. **Write the sentence** using only what the passage supports, with appropriate hedging.
7. **Attach the citation** — author–year text hyperlinked to the version read (§10).
8. **Record the row** in the evidence table.

**Worked examples of the mapping rule (from the user's own instruction):**

| Bad | Why | Fix |
|-----|-----|-----|
| "Queues are slow [Ke et al. 2026]." where Ke is about attention + SVM | Source does not contain the claim | Re-map to a source that actually reports screening-queue delay |
| Citing a paper on X–Y association for "X causes Y" | Strength mismatch | "X is associated with Y" or find a causal-evidence source |
| One study's single-centre accuracy quoted as "CNN models achieve 99%" | Universalised | "In one study, X achieved … on its own held-out set" |
| Reference list written first, claims fitted afterwards | Prohibited workflow | Claims first, sources matched, list (if any) derived last |

---

## 10. Citation Format & Linking

### 10.1 Canonical in-text form

The **author–year text is the clickable anchor**, and the link points at the version actually read:

```markdown
Digital literacy is increasingly recognized as an important component of effective
technology use ([Smith, 2022](https://doi.org/10.xxxx/yyyy)).
```

- Two authors: `([Smith & Jones, 2022](LINK))`
- Three or more: `([Smith et al., 2022](LINK))`
- Multiple sources in one sentence: `([Smith, 2022](LINK1); [Jones et al., 2024](LINK2))` — only when each carries a distinct evidentiary role.
- Quote form: `As [Smith (2022, p. 14)](LINK) notes, "…"` — locator required, ≤25 words.

### 10.2 Link target order (the version read)

1. Open-access full text actually read: PMC / DOAJ / institutional repository / author copy / publisher OA / arXiv (labelled if a preprint).
2. `https://doi.org/<doi>` when no OA version was read.
3. Stable publisher landing page only when no DOI exists.
4. Never a search-results URL, a Google Scholar link, a proxy/institution-login link, a shortened URL, or a link the skill did not itself resolve.

### 10.3 Placement

- Mid-sentence citation is allowed when the cited thing is an explicit subject ("As [Smith (2022)](LINK) argues, …").
- Otherwise the citation sits at the end of the claim it supports — **not** in a paragraph-end block covering several sentences.
- One source may not be reused for multiple unrelated claims in the same paragraph (inherited root-skill red flag).

### 10.4 No bibliography by default

No reference list, no "References" section, and no APA list is produced **unless the user explicitly asks**. Zotero is the single source of truth for the final reference list. When the user does ask, APA 7th alphabetical, deduped, each entry ending with its DOI/URL.

### 10.5 Zotero-friendly metadata in the evidence table

Each row carries enough for a clean Zotero entry: authors (as they appear in the source), year, title, venue, DOI/URL, access level. This is metadata for import — not a formatted bibliography.

---

## 11. Output Templates

### 11.1 Write mode (anything longer than a paragraph — gated)

**Stage 1 — Claim plan (await approval):**

```
Mode: write · Task: Chapter 2.1, first subsection · Claims: 9 · Sources verified: 7 · Unverifiable: 2

| # | Claim (one line) | Claim type | Source (author, year) | Access | Link | Registry? |
|---|------------------|-----------|-----------------------|--------|------|-----------|
| 1 | … | established finding | Smith et al. 2023 | F | https://doi.org/… | new |
| 8 | … | single-study | — | — | — | cannot verify after 6 queries |
```

Then: what the skill will do about the unverifiable claims (omit, narrow, or search further), and any foundational-exception requests awaiting clearance.

**Stage 2 — Draft (after approval):** the prose, followed by the evidence table and the audit block.

### 11.2 Write mode (single sentence or short paragraph — no gate)

Prose first, then evidence table, then audit block, then gaps. Same shape, smaller.

### 11.3 Gap reporting (mandatory whenever anything was dropped)

Verbatim-style statement for each gap:

> "I could not verify a scholarly source that directly supports this claim, so I have omitted it."

Plus: what was searched (query terms, databases touched), what was found and why it was rejected (wrong strength, abstract-only, out of window, prohibited type), and the options (provide access, narrow the claim, accept omission).

### 11.4 Standard deliverable skeleton

```
Mode: <write|audit|sources> · <one-line task>

<prose, inline hyperlinked citations>

---
### Evidence table
| Sentence | Claim type | Source | Access | Link | What the source actually supports | Registry |
|---|---|---|---|---|---|---|

### Citation audit
- Statements of fact/claims in this deliverable: N · Sentences carrying citations: N · Uncited claims: 0
- Every scholarly claim cited? yes
- Every cited source accessed and examined? yes (F: 7, A: 1)
- Every source genuinely supports its sentence? yes
- All sources real and verifiable? yes
- All links resolve to the correct work? yes
- Any information beyond the sources? no
- Founder exceptions used: Zhou et al. 2016 (approved 2026-09-15, CAM method)

### Gaps / limitations
- <claim> — omitted: no accessible source supports it (searched: …, DBs: …)
- <source X> — cited at abstract level: claim limited to what the abstract states
```

### 11.5 Audit mode output

A claim-by-claim verdict table plus an explicit violation list:

| Sentence as written | Claim type | Citation | Source real? | Accessed? | Supports the sentence? | Verdict | Fix |
|---|---|---|---|---|---|---|---|

Verdicts: `verified` · `strength mismatch (rewrite)` · `wrong source (re-map)` · `source not findable (remove/replace)` · `access-limited (narrow claim)` · `prohibited source` · `no citation where one is required`. Audit mode **never edits the file**; it reports and offers a corrected rewrite in chat.

### 11.6 Sources mode output

Verified source table only (no prose): source, tier, access level, exact claims it can support, link, date verified, and a short note on what it does *not* support.

---

## 12. Workflow

1. **Understand the request** — topic, specific claim(s), target section, length, and mode (state it).
2. **Map the claim space** — break the request into individual one-line claims; classify each (§6.3); note which are the study's own assertions (uncited).
3. **Consult the registry** — reuse verified entries where the claim matches; note where a registry source was already cited (e.g. Chapter 1 → Chapter 2).
4. **Search broadly** for the un-covered claims — differently-worded queries across ≥3 scholarly databases (Google Scholar, IEEE Xplore, ScienceDirect, ACM DL, SpringerLink, Wiley, Taylor & Francis, SAGE, JSTOR, Emerald, Oxford Academic, Cambridge Core, DOAJ, PubMed, publisher OA sites, institutional repositories, conference proceedings), plus dataset/tool records where the claim is technical.
5. **Access** the source; use OA versions first.
6. **Read** the relevant section; classify access level (F/A).
7. **Determine exactly what it supports**; record the passage.
8. **Draft** only what the passage supports, with hedging and preserved limitations.
9. **Cite every scholarly claim**, author–year hyperlinked to the version read.
10. **Re-check links**, then **run the audit block**; if any answer is "no", revise before delivering.
11. **Report gaps explicitly** and update the registry.

**Pre-draft gate:** steps 1–7 produce the claim plan; the user approves stages 8–11 only after clearing any foundational exceptions and providing access to any paused sources.

---

## 13. The Verified-Source Registry

### 13.1 Location & scope

- **One file: `sources/verified-sources.md`**, repo-level, shared across all chapters.
- Purpose: a source verified once (fully read, claim mapped) is reusable later without re-reading — especially Chapter 1 → Chapter 2.
- The registry is **evidence metadata, not a bibliography**: no APA formatting, no ordering by style rules.

### 13.2 Entry schema

```markdown
### [short-id] Author(s), Year
- **Title:** …
- **Venue / type:** Journal · Review · Conference · Chapter · Thesis · Dataset record · Agency statistics
- **Tier:** A | B | C | D | E
- **Year:** 2023  (window check: in-window | foundational exception — approved YYYY-MM-DD)
- **DOI / URL read:** https://…   (link re-checked: YYYY-MM-DD)
- **Access level:** F (full text read) | A (abstract only)
- **Date verified:** 2026-09-15
- **Supports (exact claims):** 1. … 2. …
- **Does NOT support / caveats:** (scope limits, population, single-centre, association-only, preprint status, retraction check)
- **Verbatim anchor (optional, ≤25 words):** "…" (p. / section)
- **Used in:** Chapter 1 §Background, Chapter 2 §2.1 (2026-09-15)
```

### 13.3 Rules

- A source enters the registry **only** at access level **F** or **A**, with the exact claims listed. Everything else is recorded under a "Rejected / unverified" section with the reason.
- Rejected entries stay visible (so the same dead link is not re-investigated): URL, reason, date.
- **Cross-chapter reuse:** cited as-is, link re-checked, `Used in:` updated; the skill reports "reused from Chapter 1" in the evidence table. The same evidence is not counted twice as independent support.
- Retraction check: for any registry entry older than 12 months at time of reuse, the skill does a quick existence/retraction check before reuse.
- The registry is the **only** persistent state the skill maintains.

### 13.4 Seeding pass (first run of the skill)

1. Read `RRL_links.md`, `RRS_links.md`, `reference.md`, `for_chapter2.md` (all link collections, including groupmate lists).
2. Normalise to unique targets (dataset mirrors and OA/DOI pairs are the same publication).
3. Fetch and classify each: real? accessible? which tier? which claims could it support? in window?
4. Write the registry: verified entries with claims; unverifiable/dead entries under Rejected with reasons.
5. Report a summary table: verified / abstract-only / dead / out-of-window / prohibited.
6. **Never trust a list entry as evidence** until it passes this pass. Note explicitly that `for_chapter2.md` entries are contributed by groupmates (Ybanez, Palmares, Digal, Cantiver) and count as *unverified candidates*, not as sources.

### 13.5 Candidate queue for future tasks

Sources found but not yet read (or read but not used) are recorded in a **Candidates** section: URL, why it looked relevant, what claim it might support, status. This is the queue a later task pulls from.

---

## 14. Failure Handling

| Situation | Response |
|-----------|----------|
| No source found after the moderate budget (4–6 queries, ≥3 databases, ≥3 candidates opened) | Omit the claim; report the gap with the search trail (§11.3). |
| Only abstracts accessible | Write the narrowest claim the abstract supports; access level **A** in the ledger; sentence must not imply knowledge of the paper body. |
| Paywalled, no OA anywhere | Pause; request the text/PDF (§8.3). No sentence, no citation until then. |
| Sources conflict | Cite both; state the divergence; never silently choose. |
| Source supports a weaker version of the claim | Rewrite the sentence to the source's strength (association, not causation; one setting, not all). |
| Source is real but mis-described in a link list (e.g. wrong year, wrong authors, wrong DOI) | Correct the metadata from the source itself; record the correction; never propagate the wrong year into the citation. |
| Source is out of the 5-year window | Two options only: a re-check that a recent source covers the claim, or a **foundational-method exception** submitted to the user for clearance. |
| Source is retracted or has an expression of concern | Excluded; recorded under Rejected; claim re-sourced. |
| User asks for a claim the literature does not support | State plainly that no verified source supports it, show what the literature does support, and offer a narrower, defensible version. |
| The environment cannot access the web at all (offline) | Do not write scholarly claims from memory. Report: no sources can be verified in this state; produce only the study's own (uncited) assertions, or proceed from the registry's existing verified entries and label them as such. |
| User asks to "just make it sound academic" or to fill a citation gap | Refuse to invent; offer the honest shorter version, or the gap report. |

---

## 15. Audit Checklist (run before every delivery)

Mandatory block (§11.4):

1. Does every scholarly claim have a citation?
2. Have I actually accessed and examined every cited source? (access-level counts shown)
3. Does each cited source genuinely support the sentence where it appears?
4. Are the sources real and verifiable? (existence + identity confirmed)
5. Are the links correct? (each follows to the right work)
6. Did I avoid adding information not supported by the sources? (no scope inflation, no causation upgrade, no universalisation)
7. Did I avoid reusing one source for several unrelated claims, and one citation block for several sentences?

Plus the local red-flag scan inherited from the root skill:

- paragraph ends with one citation covering several sentences
- the same DOI used for different/unrelated claims
- a citation present that was never opened
- jargon never defined
- an unhedged causal or universal claim
- a wikilike/agency source used for a conceptual claim (tier violation)
- a foundational-exception source present without recorded approval
- a statistic without a dated body-level source

If any answer is "no" or any red flag fires: revise before delivering, and say what changed.

---

## 16. Chapter & Repo Integration

### 16.1 Chapter 2 structure (from `CHAPTER2_guide.md`)

The skill enforces, for prose it writes:

- **2.1 Related Literature** — topical outline, explicit storyline, every statement of fact / main idea / trend / equation / finding cited in APA in-text form; recent journal articles preferred; books sparingly; no Wikipedia.
- **2.2 Related System** — comparable systems described with their reported results, datasets, and limitations; claims about the systems carry citations; the study's own system is described without citation.
- **2.3 Concept of the Study** — the skill writes only the framework's *description* (the diagram itself is the user's); every construct in the description is grounded in a cited source.
- **2.4 Definition of Terms** — definitions must be sourced (constitutive) or operational (own study, uncited and labelled as such); the table formatting stays the user's.

Out of the skill's hands: table captions and numbering, List of Tables/Figures, and final APA reference list.

### 16.2 Chapter 1 retro-audit (read-only, first audit task)

- Sweep every citation in `CHAPTER1.md` (Kim et al. 2025; Anand et al. 2026a/2026b; Missaoui et al. 2025; Co et al. 2025; Orduña & P Lubaton-Sacro 2022; Ullah et al. 2023; Iftikhar et al. 2025; Kapkiç & Sağıroğlu 2023; Akter et al. 2024; Irmak 2021; Deepak & Ameer 2021; Tiwari et al. 2022; Xie et al. 2022; Reddy et al. 2026).
- For each: does the source exist as cited (real authors/year/venue, DOI resolves)? does it support that specific sentence at the written strength? is it in-window? is the link correct?
- Output: the audit verdict table (§11.5) + a written summary of systemic patterns + recommended rewrites in chat.
- **No edits to `CHAPTER1.md`.** Any repair is a separate, explicitly requested task.
- Every source that passes is added to the registry (benefiting Chapter 2); every failure is recorded under Rejected with the reason.

### 16.3 Cross-chapter reuse (Chapter 1 → Chapter 2)

Per decision #27: registry entries reused in Chapter 2 are not re-read; the link is re-checked; the evidence table marks them "reused from Chapter 1 §…"; the registry's `Used in:` field is updated. Reuse must still satisfy the claim-strength test for the *new* sentence — reuse of a source is reuse of evidence, not a licence to stretch it.

---

### 16.4 Worked dry-run — Chapter 1 §Background, paragraph 1 (executed 2026-09-15)

**Purpose.** Prove that audit mode separates a *real* citation from a *plausible-looking* one, on the highest-stakes paragraph of the thesis, and record what the exercise changes in the skill. Run in audit mode: report only, **no edits to `CHAPTER1.md`**.

**Audited text (verbatim, `CHAPTER1.md` → Background of the Study → paragraph 1):**

> Brain and central nervous system (CNS) cancers caused 321,624 new cases and 248,403 deaths worldwide in 2022 (Kim et al., 2025). Malignant brain tumors have an overall five-year survival rate of only 35.6% (Anand et al., 2026a). Magnetic resonance imaging (MRI) is widely used to evaluate brain tumors because it provides detailed images without ionizing radiation (Missaoui et al., 2025). However, conventional MRI may not reliably distinguish brain tumors from non-neoplastic lesions or differentiate some tumor types (Co et al., 2025). In a Philippine General Hospital study, 196 pediatric brain tumor patients had a median prediagnostic symptomatic interval of 80.5 days (Orduña & P Lubaton-Sacro, 2022). Longer diagnostic intervals were associated with multiple physician consultations and delays between neuroimaging requests and their facilitation (Orduña & P Lubaton-Sacro, 2022).

Six sentences, five unique sources (Orduña & Lubaton-Sacro carries two sentences).

**Method.** One audit pass: state the claim → locate the cited source → fetch and read it → test whether the *accessible* text supports the claim *at the written strength* → record access level and verdict. Budget actually spent: ~10 queries plus 6 fetches, across general scholarly search, PubMed, PMC, MDPI, SpringerLink, Taylor & Francis, Elsevier/ScienceDirect and Cureus.

**Environment constraint discovered (feeds §8.4 and §10.2).** Publisher landing pages refused automated retrieval — MDPI `403`, SpringerLink `406`, Taylor & Francis `403`, PubMed demanded cookies — and PDF endpoints are unsupported by the fetch tool (“Unsupported content type: application/pdf”). **Every source that could be verified was verified through an open-access mirror**, in practice PMC. Design consequence: the §10.2 rule “link to the version actually read” will *usually* resolve to a PMC/DOAJ/repository link, and any audit whose only route is a publisher landing page must fall back to a mirror (or report access-limited, as §8.1 prescribes).

**Verdict table:**

| # | Claim as written | Citation as written | Source located | Access | Does it support the sentence? | Verdict | Suggested fix |
|---|------------------|--------------------|---------------|--------|------------------------------|---------|---------------|
| S1 | 321,624 new cases / 248,403 deaths worldwide, 2022 | (Kim et al., 2025) | Kim et al. 2025, *Global burden of brain and central nervous system cancer in 185 countries and projections up to 2050*, systematic analysis of GLOBOCAN 2022 | **A** (indexed abstract; publisher record blocked) | Yes — both figures appear in the source’s own results | **verified** (access-level A is sufficient because the claim *is* the reported statistic) | Wording: “**caused** 321,624 new cases” renders incidence as causation → “accounted for an estimated 321,624 new cases…” |
| S2 | Malignant brain tumors have an overall five-year survival rate of **35.6%** | **(Anand et al., 2026a)** | **No** — exhaustive search found no Anand (any year) source reporting 35.6% | — | — | **FAIL — source not findable** | The figure is a circulating CBTRUS/ABTA statistic. Replace with the peer-reviewed source that actually reports it: **Price et al. 2025, CBTRUS Statistical Report, *Neuro-Oncology* 27(Suppl 4)** → “five-year relative survival rate following diagnosis of a malignant brain or other CNS tumor was **34.8%**”. Update the number, not just the citation. |
| S3 | MRI is widely used for brain tumors because it gives detailed images without ionizing radiation | (Missaoui et al., 2025) | Missaoui, Hechkel, Saadaoui, Helali & Leo 2025, *Advanced Deep Learning and Machine Learning Techniques for MRI Brain Tumor Analysis: A Review*, *Sensors* 25(9):2746 | **F** (full text, PMC mirror) | Yes, in substance — the source states MRI is “the preferred imaging modality” due to “superior contrast resolution and **safety** compared to other imaging methods” | **verified** (minor rewrite) | Keep the claim, tighten it to the source’s own basis: “…because of its superior soft-tissue contrast and its safety compared with other imaging methods”. Caveat recorded: this review repeats the older 2020 burden figures (308,102 cases / 251,329 deaths); S1’s 2022 figures take precedence. |
| S4 | Conventional MRI may not reliably distinguish brain tumors from non-neoplastic lesions or differentiate some tumor types | **(Co et al., 2025)** | The linked record (`S0010482524015920`, *Computers in Biology and Medicine* 185:109507) is **“A review of convolutional neural network based methods…” by C. Chen et al., 2025** — not “Co”, and not about MRI differential diagnosis | — | No | **FAIL — two defects: (a) mis-identified author, (b) wrong evidence type** | Re-point to sources that actually address tumour mimics: Giraldo et al. 2023, *Differential Diagnosis of Tumor-like Brain Lesions* (PMC10468256); Grand et al. 2023, *Tumor or not a tumor: Pitfalls and differential diagnosis…* (Elsevier record S0035378723008937 — venue to be confirmed at registration, not asserted here); or the Philippine tertiary-hospital study of MRS/perfusion versus mimics (*Cureus* 2025, venue-tier caution). |
| S5 | In a Philippine General Hospital study, **196** pediatric brain tumor patients had a median PSI of **80.5 days** | (Orduña & P Lubaton-Sacro, 2022) | Orduña & Lubaton-Sacro 2022, *Factors associated with delayed diagnosis among Filipino pediatric brain tumor patients: a retrospective review*, *CNS Oncology* 11(3) (also as the LINC-16 abstract, *Neuro-Oncology* 24(Suppl 1)) | **A→F-partial** (abstract confirms n and PGH; conference abstract read in full via PMC) | Yes — “Results: 196 patients were included”, PGH 2015–2019, “median overall PSI was 80.5 days” | **verified, with a citation-format defect** | Citation string carries a reference-manager artifact: `(Orduña & P Lubaton-Sacro, 2022)` → APA 7 in-text form is `(Orduña & Lubaton-Sacro, 2022)`. |
| S6 | Longer intervals were associated with **multiple physician consultations** **and delays between neuroimaging requests and their facilitation** | (Orduña & Lubaton-Sacro, 2022) | same source | **A→F-partial** (full text not retrievable: Taylor & Francis 403, journal PDF unsupported) | **Partly** — “more physicians consulted prior to subspecialist referral (p=0.001)” is verified; the neuroimaging-request-to-facilitation delay is **not** in the accessible text, which instead reports symptom→first consult 22 days and first consult→subspecialist referral 23.5 days | **strength/coverage mismatch — needs full text or rewording** | Either read the full text of *CNS Oncology* 11(3) (user access) or split the sentence: keep the verified clause, and restate the second as the documented interval, “with a median of 23.5 days between first consultation and subspecialist referral”. |

**Score (sentences):** 4 of 6 sentences hold up — S1, S3 and S5 verified, S6 supported in part — and **2 fail**: S2 (source not findable) and S4 (source mis-identified *and* wrong evidence type). **Unique sources: 3 of 5 survive** (Kim et al. 2025; Missaoui et al. 2025; Orduña & Lubaton-Sacro 2022); 1 is unverifiable as cited (Anand et al. 2026a) and 1 points at the wrong paper (Co et al. 2025).

**Defect anatomy — how the two failures were possible:**

| Failure | Likely origin | Why nothing caught it | Skill rule that prevents it |
|---------|---------------|----------------------|-----------------------------|
| **S2** — 35.6% survival against an unverifiable “Anand et al., 2026a” | 35.6% is a widely circulated CBTRUS/advocacy-page figure; the sibling citation “Anand et al., 2026b” most plausibly points at the one verifiable 2026 Anand work (Vatsala Anand et al., *Sci Rep* 16:4709 — the only Anand 2026 paper located), so a real sibling lent credibility to its unverifiable partner | Nobody asked whether a source *reporting that number* existed; the author name matched a real author, and the a/b suffix pattern looked like careful citation practice | §9 step 5 (claim–source match) plus the two new rules below — **trace numbers to their publishing source** and **verify each sibling of an a/b pair independently** |
| **S4** — “Co et al., 2025” for an MRI differential-diagnosis claim | The linked record is Chen et al. 2025, a CNN-methods survey. The repo's own `reference.md` annotation for that link already read “A review of CNN based methods for medical image classification (149 papers)” — the mismatch was visible in the curated list itself | Link lists were treated as trusted sources of truth, and once a citation existed the sentence was written around it rather than the other way round | §13.4 (link lists are *candidates*, never evidence), §7.2 (tier/type match), §6.1 rule 6 (no citation for appearance) |

Both failing entries also appear in `reference.md` / `for_chapter2.md`, so the same two defects would have propagated straight into Chapter 2 had the RRL been drafted from those lists — the strongest available argument for running the §13.4 seeding pass **before** any Chapter 2 prose is written.

**Corrections offered in chat (not applied to the file):**

- **S1** — “Brain and central nervous system (CNS) cancers **accounted for an estimated** 321,624 new cases and 248,403 deaths worldwide in 2022 ([Kim et al., 2025](https://pubmed.ncbi.nlm.nih.gov/40720078/)).” *(removes the incidence-as-causation verb; citation unchanged)*
- **S2** — “Malignant brain tumors have a five-year relative survival rate of about 35%, and glioblastoma has the lowest survival among them ([Price et al., 2025](https://academic.oup.com/neuro-oncology/article/27/Supplement_4/iv1/8285946)).” *(replaces an unverifiable citation with the source that actually reports the statistic; the figure also corrects 35.6% → 34.8%)*
- **S3** — “…because of its superior soft-tissue contrast and its safety compared with other imaging methods ([Missaoui et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12074157/)).” *(tightens the causal clause to the source's own basis)*
- **S4** — “Conventional MRI may not reliably separate brain tumors from non-neoplastic lesions that mimic them, which can complicate diagnosis ([Giraldo et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10468256/)).”
- **S5** — unchanged content; citation string corrected to `(Orduña & Lubaton-Sacro, 2022)`.
- **S6** — “Longer intervals were significantly associated with more physician consultations before subspecialist referral ([Orduña & Lubaton-Sacro, 2022](https://pubmed.ncbi.nlm.nih.gov/35678529/)).” *(drops the unverified neuroimaging-delay clause unless the full text is obtained)*

**Registry consequences of this dry-run:**

| Entry | Status | Claims it may support / notes |
|-------|--------|------------------------------|
| Kim et al. 2025 | verified (**A**) | the 2022 burden statistic only; level F pending a mirror copy |
| Missaoui et al. 2025 | verified (**F**) | MRI as preferred modality (contrast + safety); caveat recorded: its burden figures are the superseded 2020 set |
| Orduña & Lubaton-Sacro 2022 | verified (**A**, partial F pending) | PSI 80.5 days, n = 196, PGH 2015–2019, association with more physician consultations; **does not** support delays between neuroimaging requests and their facilitation |
| Anand et al. 2026 (Vatsala Anand et al., *Sci Rep* 16:4709) | verified (**F**) | CNN/transfer-learning performance claims only — explicitly **not** evidence for survival statistics; resolves the a/b puzzle for Chapter 2 |
| Anand et al. 2026a (survival) | **Rejected** | no such source found; replaced by Price et al. 2025 |
| Chen et al. 2025 (*Comput. Biol. Med.* 185:109507) | **Rejected for the S4 claim** | genuinely real and usable for CNN-method-survey claims; never for clinical differential-diagnosis claims |
| Price et al. 2025 (CBTRUS, *Neuro-Oncology*) | verified (**A**) | the malignant-CNS-tumour survival statistic (34.8%) |
| Giraldo et al. 2023 | verified (**A**) | candidate replacement for S4 (tumour mimics / non-neoplastic differential diagnosis) |

**Amendments this dry-run makes to the skill:**

1. **New audit sub-step — search for the *intended* source, not just the linked one.** For every citation, run one query for a source that *reports the specific claim or number*, independently of the cited author's name.
2. **New hard rule — numbers must be traced to their publishing source.** Every statistic (rate, count, percentage, sample size) is verified against the source that publishes it, with population and year recorded. A number circulating on advocacy or aggregator pages is not evidence.
3. **New hard rule — sibling-suffix check.** When `2026a`/`2026b`-style pairs exist, each sibling is located independently; one real paper never vouches for its partner.
4. **New check — author-string artifacts.** Middle initials, stray prefixes, missing diacritics and concatenated names in in-text strings are flagged as Zotero-import defects (the `P Lubaton-Sacro` case).
5. **Mirror-first fetching (§8.4, §10.2).** Try PMC / DOAJ / repository / preprint mirrors before publisher landing pages; treat `403`/`406` as “publisher page unavailable”, never as “source unavailable”.
6. **Evidence-type matching tightened (§7.2).** A methods survey may not support a clinical diagnostic-accuracy claim; a performance paper may not support an epidemiological one.
7. **The §13.4 seeding pass becomes a precondition** for Chapter 2 drafting, since both failures originate in the unverified link lists.

**Honest limits of this dry-run (what a full audit would still do):**

- Kim et al. 2025's journal and volume were not confirmed (PubMed's cookie wall); title, authors, year and figures were confirmed through an author-affiliated repository record and the indexed abstract. A full pass reaches level **F** via a mirror.
- “Anand et al. 2026a” was declared unfindable after roughly one targeted query plus a general survival-statistic search, less than the §18 budget (4–6 differently worded queries, ≥3 databases, ≥3 candidates opened). A full audit exhausts that budget and also searches the thesis's own reference materials before writing “cannot verify”.
- S6's second clause is **access-limited, not disproven** — the full text may contain the neuroimaging-delay analysis; the conference abstract reports the component intervals (22 days, 23.5 days) but not that comparison.
- Only 1 of 4 Background paragraphs was audited; the remaining paragraphs, the Objectives/Significance/Scope text, and every earlier-workflow citation still need the same pass.

**Worked-example status: executed once, audit mode only — no text in `CHAPTER1.md` was modified.**

---

## 17. Acceptance Criteria (skill v1 complete)

1. `.agent/skills/source-grounded-writing/SKILL.md` exists with valid frontmatter (`name: source-grounded-writing`, a description that triggers on academic writing / citation-verification requests) and contains: the contract, modes, source policy, access levels, claim-matching procedure, citation format, output templates, workflow with pre-draft gate, gap protocol, audit block, failure table, and the root-skill inheritance table.
2. A dry-run write task produces: mode line, prose with hyperlinked author–year citations, evidence table, audit block with counts, and an explicit gap list.
3. A dry-run audit task on a Chapter 1 paragraph produces a claim-by-claim verdict table with no edits to the file.
4. A sources-only task returns verified sources and no prose.
5. `sources/verified-sources.md` exists, seeded from the four link-list files, with verified entries carrying claims + access level, and rejected entries carrying reasons.
6. Every link in a delivered artifact was resolved at least once during that task.
7. Zero fabricated citations, DOIs, quotes, or page numbers in any delivered artifact — including under pressure ("just cite something").
8. Behaviour is correct when the literature genuinely does not support a request: the claim is omitted and the gap reported, not padded.

---

## 18. Risks & Mitigations

1. **Fabrication under fluency pressure** — the core risk. Mitigation: claim-plan gate, access-level labels, link resolution, evidence table, audit block; a claim that cannot be shown in the table cannot appear in the prose.
2. **Over-strictness makes writing slow or impossible** — the hard 2021+ window plus tier limits could leave a claim unsupported. Mitigation: foundational-exception channel, tier E for statistics, the paywall pause-and-ask path, and the registry so repeated work is cheap.
3. **Abstract-only evidence quietly becoming "read the paper"** — mitigation: access level printed in every deliverable, and abstract-only sentences must stay narrow.
4. **Registry rot** (dead links, retractions, stale preprints) — mitigation: link re-check on every reuse, retraction/existence check after 12 months.
5. **Cross-chapter double counting** — the same evidence reused in Chapter 2 could read as independent corroboration. Mitigation: "reused from Chapter 1" labelling; synthesis sentences must not present reused sources as new independent support.
6. **Chapter 1 citations may fail audit** — some citations came from an earlier workflow and from link lists, and the root skill's examples reuse similar names. Mitigation: the read-only Chapter 1 audit is the first audit task, and its failures become either registry-rejected entries or Chapter 2 rewrite targets. *(Confirmed by execution 2026-09-15: 2 of the 5 unique sources in Background paragraph 1 fail the audit — §16.4.)*
7. **Datasets/tools treated as conceptual evidence** — mitigation: tier C is restricted to dataset/tool/format claims only.
8. **Groupmate link files treated as trusted** — mitigation: the seeding pass marks them as unverified candidates; nothing from them is citable until it passes §8.2.
9. **Zotero mismatch** (skill drafts `2026` where Zotero emits `2026a`) — mitigation: reuse existing suffixes; keep titles/venues in the evidence table so disambiguation is possible; the final list is Zotero's.
10. **Paywall deadlock stalls a chapter** — mitigation: the pause block lists every needed source at once, so the user can fetch them in a single pass.

---

## 19. Assumptions (flag if wrong)

1. The five-year window is evaluated as "publication year ≥ current year − 5", i.e. **≥ 2021 for 2026**, and it advances each year (2027 → ≥ 2022).
2. The skill runs in an environment with web search and URL-fetch tools available; when they are unavailable, the offline rule (§14) applies.
3. "Read" means the relevant section of the full text, not necessarily every page.
4. The skill writes in English, in the register of the existing `CHAPTER1.md`.
5. The user handles Word/docx conversion; the skill emits Markdown with embedded links (which paste into Word as live hyperlinks).
6. Chapter 2's sections follow the fixed guide: 2.1 Related Literature, 2.2 Related System, 2.3 Concept of the Study, 2.4 Definition of Terms.
7. The registry may live under a new `sources/` directory (the repo currently has no such directory).
8. The existing root `SKILL.md` stays in the repo untouched.
9. Approval of a foundational exception is recorded in the registry entry (date + "approved by user") and repeated in the audit block.
10. No bibliography is produced unless explicitly requested (Zotero is the source of truth).

---

## 20. Open Items

1. Confirm the **exact** foundational-exception list before Chapter 2 drafting (expected: Class Activation Mapping origin, Grad-CAM origin, possibly the ONNX/ONNX Runtime and Tauri citations if any are older than 2021).
2. Decide, at first audit, whether any Chapter 1 citation that fails verification gets a Chapter 2 replacement or a Chapter 1 correction task — the audit only reports.
3. Confirm whether the four link-list files should eventually be rewritten in place (currently: verified entries go to the registry only; the originals are left untouched).
4. Whether to check the root `SKILL.md`'s example DOIs (declined in the interview; can be revisited).
5. Whether tier-C dataset records should count toward a chapter's source count for the Philippines' thesis-review expectations.
6. Whether reused Chapter-1 sources need a "previously cited" footnote for the panel, or plain reuse is enough.

---

## 21. Later Milestones (specified, not built)

- **M-A — Deterministic checker script.** Validates a delivered artifact: sentence count vs. cited-sentence count, citations missing a link target, links that do not resolve, the same DOI used across unrelated claims, unapproved pre-2021 sources, and uncited sentences containing claim-signalling verbs.
- **M-B — Zotero export block.** On request only: an RIS/BibTeX block for the verified sources used in the current deliverable, so the user can import them into Zotero in one step without the skill maintaining a bibliography.
- **M-C — Registry maintenance pass.** Periodic re-check of every registry link + retraction scan, reporting changes rather than editing prose.

---

*Specification v1.1 (2026-09-15) — produced from an 8-round structured interview, then exercised once against Chapter 1 paragraph 1 in audit mode (§16.4). The dry-run found two real citation failures and amended the skill's audit procedure accordingly. No skill file, registry, or chapter text has been written or edited yet; Chapter 2 remains empty.*
