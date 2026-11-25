---
name: source-grounded-writing
description: Use when writing or auditing academic sentences, paragraphs, or thesis sections (RRL, RRS, background, methodology justification, discussion) that must cite only real, accessed, verifiable sources; also use when checking whether an existing citation is real and whether its source actually supports the sentence, or when searching for verified sources on a topic
---

# Source-Grounded Writing

## Overview

Every sentence that makes a scholarly claim carries an inline, clickable author–year citation to a source that was **actually accessed and read** before the sentence was written.

The failure being engineered against is **plausible-looking fabricated scholarship** — real author names, real-looking years, invented findings. Fluent text is the symptom, not the goal.

**Governing rule: when fluent writing and evidence accuracy conflict, evidence accuracy wins.** Three genuinely verified sources beat a polished paragraph containing one unsupported claim.

Read `sources/verified-sources.md` before writing. Reuse verified entries; verify anything new.

---

## When to Use

- Chapter 2 (Related Literature / Related System / Concept of the Study / Definition of Terms)
- Background, Significance, or methodology-justification prose needing evidence per sentence
- Any claim a panel or reviewer will check
- **Audit mode:** checking existing text (e.g. `CHAPTER1.md`) or challenging a citation's reality

**When NOT to use:** the study's own design/objectives/scope statements (they are assertions, not literature claims), opinion, README/blog prose, or producing a reference list (Zotero owns that).

---

## Modes

State the mode as the first line of every response.

| Mode | Inferred from | Explicit | Output |
|------|---------------|----------|--------|
| **write** | "write/draft a paragraph or section about X" | `/write` | claim plan → (approval) → prose + evidence table + audit block + gaps |
| **audit** | "check/verify/audit this", "is this citation real?", "does the source support this?" | `/audit` | claim-by-claim verdict table + violations + fixes. **Never edits the file.** |
| **sources** | "find sources for X", "what does the literature say" | `/sources` | verified source table, no prose |

If the request is genuinely ambiguous between write and audit ("improve this paragraph"), ask which mode before working.

---

## The Contract

1. **Claim → source → read → sentence.** Never prose-first with citations fitted afterwards. A reference list written first and matched to claims is prohibited.
2. **Never invent** studies, citations, authors, years, titles, DOIs, URLs, quotations, page numbers, or findings. Never copy a citation from another paper's reference list without opening the original. "It appears in Google Scholar" is not evidence.
3. **Access before citation.** A snippet, database entry, title, author profile, abstract page, or another paper's reference list does **not** establish what a source's findings are.
4. **Never stretch a source.** Association ≠ causation. One dataset, population, or scanner ≠ universal. If the source shows a weaker claim, weaken the sentence.
5. **No claim without support.** If no suitable source can be accessed and verified, **do not write the claim**. Report the gap.
6. **Quality over quantity.** No citation for scholarly appearance; each citation needs a distinct evidentiary role. Citation stuffing is a violation.
7. **One idea per sentence.** No word cap. Several citations per sentence are allowed *only* where each has a distinct role (soft ceiling 3).
8. **Hedge where warranted:** *may, suggests, indicates, is associated with, has been found to*. Preserve the source's stated limitations.
9. **The study's own voice is exempt.** Sentences about NeuroScan itself need no citation; sentences *about prior literature* always do.
10. **Trace every number to its publishing source.** Rates, counts, percentages, sample sizes and dates are verified against the source that reports them — with year and population recorded. A statistic circulating on an advocacy, aggregator, or vendor page is not evidence.
11. **Verify each sibling of an `a`/`b` pair independently.** One real paper never vouches for its partner.

### Per-sentence checklist (before writing)

1. What is the exact claim (one idea)?
2. Which verified source supports exactly that claim?
3. Was the supporting passage actually read — full text, or abstract only?
4. Does the source's own wording support the sentence's *strength*?
5. Does the sentence preserve the source's stated limitations and scope?
6. Is the citation anchor right — author, year, et al. form, link target, suffixes?

Any "no"/"unclear" → rewrite, re-source, or drop the sentence.

### Claim types to keep distinct

| Type | Permitted when | Phrasing |
|------|----------------|----------|
| Established finding | Multiple independent studies agree, or a review/meta-analysis states it | "X has been shown to…" |
| Single-study finding | One study, scope stated | "In a single-centre study of N patients, X…" |
| Theoretical proposition | Originating/authoritative source cited | "According to [theory], X is…" |
| Interpretation / synthesis | States the gap the cited sources jointly leave | "Together, these findings suggest…" (still cites them) |
| Assumption / design choice | The study's own reasoning | "This study assumes…" (no citation) |

### Synthesis, not listing

Never a laundry list ("A did X. B did Y. C did Z."). Group by theme, state what the body of work jointly supports, then the divergence or limitation. Multi-source sentences are the preferred synthesis device.

---

## Source Policy

### Recency

- **Hard window: publication year ≥ current year − 5** (≥ 2021 for 2026; advances each year).
- **Foundational-method exception:** a pre-window work may be used only when it *defines a method, metric, architecture, or tool the study actually uses*. Each exception is listed separately and **cleared by the user** before it enters prose, then recorded in the registry with the approval date.
- **Statistics exception:** the body's current published figures win; the cited artifact must be current and dated.

### Allowed tiers

| Tier | Types | Use for |
|------|-------|---------|
| A | Peer-reviewed journals, systematic reviews, meta-analyses | every conceptual/empirical/theoretical claim |
| B | Conference proceedings, academic book chapters (books sparingly) | allowed; venue recorded |
| C | Official documentation and dataset/software records (Kaggle, IEEE DataPort, ONNX Runtime docs, tool docs) | claims about the dataset, tool, or format **only** — never conceptual or clinical claims |
| D | Theses, dissertations, university and institutional repositories | method/implementation evidence; marked non-peer-reviewed |
| E | Authoritative agency/registry statistics (WHO, IARC/GLOBOCAN, national registries, ACS-style bodies) | prevalence, incidence, mortality, burden claims only; marked non-peer-reviewed |
| — | **Prohibited:** Wikipedia and wiki-like sources, news and magazines, personal pages and blogs, SEO content farms, predatory/grey journals, GitHub repos as standalone evidence, AI-generated or unverifiable text | never evidence for a scholarly claim |

**Evidence-type match is mandatory.** A methods survey never supports a clinical diagnostic-accuracy claim; a performance paper never supports an epidemiological one; a dataset record never supports a theoretical claim.

### Priority

Peer-reviewed and authoritative > accessible-but-weak. Open access preferred, but a relevant paywalled scholarly source is not rejected merely for being paywalled if it can be legitimately examined. Recent + well-matched beats older + tangential. When sources conflict, cite both and state the divergence — never silently pick the convenient one.

---

## Access Levels

Record the level for every source; it appears in the evidence table.

| Level | Meaning | What may be claimed |
|-------|---------|---------------------|
| **F** | full text (or the relevant section) read | anything the passage supports |
| **A** | abstract read | only what the abstract itself establishes; sentence must stay narrow |
| **R** | record only — metadata verified (title/authors/year/venue/DOI resolve), content not read | **nothing**. R is a registry state, never a citable state |
| **P** | pending user access — paywalled, no OA version found | nothing until the user supplies the text |
| **X** | rejected | never cited; recorded with the reason |

Levels R/P/X may never appear in delivered prose.

---

## Verification Procedure (per source)

1. **Find the source** and open the full record — never stop at a snippet.
2. **Confirm identity:** authors, year, title, venue, and DOI resolve to the *same* work. Flag author-string artifacts (middle initials, stray prefixes, missing diacritics, concatenations) as Zotero-import defects.
3. **Access the text.** **Mirror-first:** try PMC / DOAJ / institutional repository / publisher-OA / preprint (labelled). Publisher landing pages often block automated retrieval (MDPI 403, SpringerLink 406, Taylor & Francis 403, PubMed cookie wall) and PDFs may be unsupported — treat those as *page unavailable*, never as *source unavailable*.
4. **Read the relevant section:** results/discussion for findings, method for procedures, theory section for propositions. Never infer a finding from a figure caption, a highlights box, or a citation inside the source.
5. **Extract the supporting passage** — a short paraphrase, plus a ≤25-word verbatim anchor where useful.
6. **Test the match:** does the source's own wording support the claim *at the strength written*?
7. **Search for the intended source, not just the linked one.** Independently run one query for a source that *reports the specific claim or number*, regardless of the cited author's name.
8. **Record:** tier, access level, year + window check, link actually read, date verified, exact claims supported, caveats, and where it is used.

### Paywall protocol

Do not write the sentence and do not cite the source. Emit a pause block naming the source (title, authors, year, DOI/URL), why it matters, the exact claim it would support, and what was already tried. Wait for the user to paste the text/PDF, then read it, upgrade to **F**, register it, and continue.

### Link liveness (mandatory before delivery)

Follow every citation link once. It must resolve to **the correct work**. A dead link, a wrong-work redirect, or a search/proxy/shortened URL is repaired (DOI or the read mirror) or the citation is dropped and reported. Reused registry entries get their link re-checked (content not re-read).

---

## Citation Format

The **author–year text is the clickable anchor**, pointing at the version actually read:

```markdown
Digital literacy is increasingly recognized as an important component of effective
technology use ([Smith, 2022](https://doi.org/10.xxxx/yyyy)).
```

- 2 authors: `([Smith & Jones, 2022](LINK))` · 3+: `([Smith et al., 2022](LINK))` (strict APA 7)
- Several in one sentence: `([Smith, 2022](LINK1); [Jones et al., 2024](LINK2))` — distinct roles only
- Quote: `As [Smith (2022, p. 14)](LINK) notes, "…"` — locator required, ≤25 words
- Mid-sentence citation is fine when the cited thing is the subject: `As [Smith (2022)](LINK) argues, …`

**Link target order:** (1) the OA full text actually read (PMC / DOAJ / repository / publisher-OA / labelled preprint); (2) `https://doi.org/<doi>`; (3) stable publisher page only if no DOI exists. Never a search-results or Google Scholar URL, proxy/login link, or shortened URL.

**Placement:** at the end of the claim it supports — never a paragraph-end block covering several sentences. One source never backs several unrelated claims in the same paragraph.

**Suffixes:** keep the suffixes already used in the thesis (`2026a`, `2026b`) consistent across chapters; write plain years in drafts where new ambiguity arises and record the distinguishing detail (title/venue) in the evidence table — Zotero disambiguates.

**No bibliography by default.** Produce one only when explicitly asked (then APA 7, alphabetical, deduped, each ending with its DOI/URL). Zotero is the source of truth.

---

## Registry — `sources/verified-sources.md`

One repo-level file shared by all chapters. Read it first; reuse beats re-verifying.

**Entry schema:**

```
### [id] Author(s), Year
- Title · Venue/type · Tier (A–E) · Year + window check (in-window | foundational exception, approved YYYY-MM-DD)
- DOI/URL read (link re-checked: YYYY-MM-DD) · Access level (F | A | R)
- Date verified · Supports (exact claims) · Does NOT support / caveats (scope, population, single-centre, association-only, preprint, retraction check)
- Verbatim anchor (optional, ≤25 words) · Used in:
```

**Rules:** a source enters as **F** or **A** with its exact claims listed; everything else goes to the Rejected section *with the reason and date* (so a dead link is not re-investigated); on reuse, re-check the link, mark "reused from Ch. N", update `Used in:`, and run a retraction/existence check if the entry is older than 12 months. Reuse of a source is reuse of *evidence*, not a licence to stretch it.

**Seeding / candidates:** the link collections (`RRL_links.md`, `RRS_links.md`, `reference.md`, `for_chapter2.md`, including groupmate-contributed lists) are **unverified candidates**, never sources. Nothing from them is citable until it passes the verification procedure.

---

## Output Templates

### Write mode — longer than a paragraph (gated)

**Stage 1 — claim plan (await approval):**

```
Mode: write · Task: Chapter 2.1, first subsection · Claims: 9 · Verified: 7 · Unverifiable: 2

| # | Claim (one line) | Claim type | Source (author, year) | Access | Link | Registry |
|---|------------------|-----------|-----------------------|--------|------|----------|
```

Then: what happens to the unverifiable claims (omit / narrow / search further) and any foundational-exception requests awaiting clearance.

**Stage 2 — after approval:** prose, then the evidence table, then the audit block.

### Standard deliverable skeleton

```
Mode: <write|audit|sources> · <one-line task>

<prose with inline hyperlinked citations>

---
### Evidence table
| Sentence | Claim type | Source | Access | Link | What the source actually supports | Registry |

### Citation audit
<the block below>

### Gaps / limitations
- <claim> — omitted: no accessible source supports it (searched: …, DBs: …)
- <source> — abstract-level: claim limited to what the abstract states
```

### Audit mode

| Sentence as written | Claim type | Citation | Source real? | Accessed? | Supports the sentence? | Verdict | Fix |
|---|---|---|---|---|---|---|---|

Verdicts: `verified` · `strength mismatch (rewrite)` · `wrong source (re-map)` · `source not findable (replace)` · `access-limited (verify or narrow)` · `prohibited source` · `no citation where one is required`. Audits **never edit the file**; offer corrected sentences in chat.

### Sources mode

Verified table only: source, tier, access level, exact claims it can support, link, date verified, and what it does *not* support.

---

## Gap Protocol

When a claim cannot be supported, state it plainly:

> "I could not verify a scholarly source that directly supports this claim, so I have omitted it."

Then report: what was searched (queries, databases), what was found and why rejected (strength, abstract-only, out of window, prohibited), and the options (provide access, narrow the claim, accept omission). Never fill a gap with general knowledge, a plausible-sounding citation, or a `[citation needed]` placeholder — the unsupported claim is not written.

---

## Workflow

1. **Understand** the request; state the mode.
2. **Map the claim space** — break it into one-line claims; classify each; flag the study's own assertions (uncited).
3. **Consult the registry** — reuse verified entries; note prior chapter use.
4. **Search widely** for uncovered claims: 4–6 differently-worded queries across ≥3 scholarly databases (Google Scholar, IEEE Xplore, ScienceDirect, ACM DL, SpringerLink, Wiley, Taylor & Francis, SAGE, JSTOR, Emerald, Oxford Academic, Cambridge Core, DOAJ, PubMed, publisher OA, repositories, proceedings), plus dataset/tool records for technical claims.
5. **Access** — mirror-first.
6. **Read** the relevant section; set the access level.
7. **Determine exactly what it supports**; record the passage and claims in the registry.
8. **Draft** only what the passage supports, hedged, limitations preserved.
9. **Cite** every scholarly claim with a hyperlinked author–year.
10. **Re-check links**, then **run the audit block**; fix every "no" before delivering.
11. **Report gaps**; update the registry.

**Pre-draft gate:** steps 1–7 produce the claim plan. Prose is written only after the user approves it and clears any foundational exceptions or supplies paused sources. Single sentences and short paragraphs may skip the gate.

---

## Audit Block (mandatory in every deliverable)

```
### Citation audit
- Scholarly claims: N · Sentences carrying citations: N · Uncited claims: 0
- Every scholarly claim cited? yes
- Every cited source accessed and examined? yes (F: n, A: n)
- Every source genuinely supports its sentence? yes
- All sources real and verifiable? yes
- All links resolve to the correct work? yes
- Any information beyond the sources? no
- Founder exceptions used: <source + approval date, or none>
```

If any answer is "no", revise before delivering and say what changed.

**Red flags — STOP and fix:**

- a paragraph ending with one citation covering several sentences
- the same DOI backing several unrelated claims
- a citation that was never opened, or cited at level R/P
- an unhedged causal or universal claim
- a statistic whose publishing source was not located
- an `a`/`b` sibling that was not verified independently
- a wikilike/agency/GitHub source used for a conceptual claim (tier or evidence-type violation)
- a pre-window source present without recorded approval
- jargon never defined

---

## Failure Handling

| Situation | Response |
|-----------|----------|
| No source found after the budget (4–6 queries, ≥3 databases, ≥3 candidates opened) | Omit the claim; report the gap with the search trail |
| Only abstracts accessible | Narrowest claim the abstract supports; level **A** in the ledger; never imply knowledge of the paper body |
| Paywalled, no OA anywhere | Pause and request the text/PDF; no sentence, no citation until then |
| Sources conflict | Cite both; state the divergence |
| Source supports a weaker claim | Rewrite to the source's strength |
| Link list mis-describes a source (wrong year/authors/DOI) | Correct metadata from the source itself; record the correction; never propagate the error |
| Source out of the 5-year window | Re-check for a recent source that covers the claim, or submit a foundational-method exception for clearance |
| Retracted source / expression of concern | Exclude; record under Rejected; re-source the claim |
| User asks for a claim the literature does not support | Say so; show what the literature does support; offer a narrower defensible version |
| Web tools unavailable (offline) | Do not write scholarly claims from memory. Use only registry entries already at level F/A, labelled as such; otherwise produce only the study's own uncited assertions |
| "Just make it sound academic" / "fill this citation gap" | Refuse to invent; offer the honest shorter version or the gap report |

---

## Relationship to the Root `SKILL.md` (`research-paragraph`)

This skill governs academic writing; the root skill remains for other tasks.

| Root rule | Status here |
|-----------|-------------|
| ≤25 words per sentence | **Overridden** — one *idea* per sentence is kept |
| One citation per sentence, always last | **Overridden** — multiple citations allowed with distinct roles; mid-sentence allowed |
| Every sentence needs a citation | **Relaxed** — uncited sentences are fine if they make no scholarly claim |
| Plain language; jargon defined once | **Inherited** (domain terms allowed after one definition) |
| Source must actually contain the claim | **Inherited and strengthened** — content must be accessed and read |
| Mandatory APA list at the end | **Overridden** — no bibliography unless requested |
| `[citation needed]` fallback | **Overridden** — replaced by the gap protocol |
| Red-flag list / "do not ship" discipline | **Inherited** |

---

## Chapter 2 Rules (`CHAPTER2_guide.md`)

- **2.1 Related Literature** — topical outline, explicit storyline; every statement of fact, trend, equation or finding cited (APA in-text); recent journal articles preferred; books sparingly; no Wikipedia.
- **2.2 Related System** — comparable systems described with their reported results, datasets and limitations; claims about them cited; NeuroScan described without citation.
- **2.3 Concept of the Study** — the framework *description* only (the diagram is the user's); each construct grounded in a cited source.
- **2.4 Definition of Terms** — constitutive definitions sourced; operational ones labelled as the study's own.
- Table captions, List of Tables/Figures, and the final APA reference list are the user's job.

---

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "The title/abstract matches, that's enough" | Title and abstract are not the source's findings; open it or narrow the claim to the abstract |
| "The author is real, so the paper is real" | Real author names are exactly how fabricated citations pass review — locate the work |
| "It's a well-known statistic" | Then a source publishes it — find that source and cite it |
| "One citation covers the paragraph" | Counts must match: one claim, one verified source |
| "Related enough" | It must contain the claim, not merely the topic |
| "Shorter is better, I'll drop a citation" | Accuracy beats fluency; drop the *claim*, not the citation |
| "I read the abstract, so I know the paper" | You know the abstract; the claim must stay inside it |
| "Zotero will fix the format" | Zotero fixes formatting, never authenticity |
| "The panel won't check" | Assume they will: that is the entire point of this skill |
