# NeuroScan CHAPTER 2 — Tracked Comments Extract

**Source file:** `NeuroScan-CHAPTER2.docx`  
**Author:** `t12410` (initial `t`)  
**Extracted:** 2026-09-21  
**Total comments:** 13 (IDs 0–12, all `w15:done="0"`)

> This file lists every Word tracked comment (`word/comments.xml`) paired with the **highlighted / anchored text** from `word/document.xml` (`w:commentRangeStart` → `w:commentRangeEnd`). Dates are taken from `w:date` on each `w:comment`.

---

## Summary Table

| # | Date (UTC) | Highlighted text (anchored in document) | Comment summary |
|---|------------|-----------------------------------------|-----------------|
| 0 | 2026-09-17 14:34 | `Deep learning for brain tumor detection and classification` (section heading) | Add distinction: detection vs classification vs segmentation |
| 1 | 2026-09-17 14:35 | `Transfer learning, limited data, and class imbalance` (section heading) | Rename heading to "Transfer Learning and Data Challenges in Brain MRI Classification" |
| 2 | 2026-09-17 14:37 | Long paragraph starting `Explainable artificial intelligence (XAI) techniques are used to address...` (CAM / SHAP / LIME) | Focus XAI literature on CAM/Grad-CAM (actually implemented), de-emphasize SHAP/LIME |
| 3 | 2026-09-17 14:38 | `Privacy, locality, and deployment trade-offs` (section heading) | Rename to "Privacy and Local Deployment of Medical Imaging AI" |
| 4 | 2026-09-17 14:41 | `Synthesis` (section heading) | Add 3 themes before Synthesis: Evaluation Metrics, Data Leakage/Validity, Clinical Decision Support |
| 5 | 2026-09-17 14:43 | `Related System` (section heading) | Need 5–7 comparable systems (currently ~3 + NeuroScan) |
| 6 | 2026-09-17 14:45 | `Web-deployed, explainable diagnosis platform` (Related System sub-heading) | Rename to "Web-Based Brain Tumor Diagnosis Systems" |
| 7 | 2026-09-17 14:46 | `Model-centric frameworks without an end-user application` (Related System sub-heading) | Rename to "Model-Centric Brain Tumor Classification Frameworks" |
| 8 | 2026-09-17 14:46 | `Edge and locally executed deployments` (Related System sub-heading) | Rename to "Edge and Locally Executed Brain Tumor AI Systems" |
| 9 | 2026-09-17 14:47 | Long paragraph starting `A third group prioritizes where the computation happens...` (Abdusalomov 2025 + Dong 2023) | Add 2 themes: Other Comparable Systems + Comparative Analysis |
| 10 | 2026-09-17 14:47 | `NeuroScan` (Related System sub-heading) | Rename to "Positioning of NeuroScan" |
| 11 | 2026-09-17 15:04 | `user context` (inline term in Concept of the Study) | Clarify what "user context" is and how it enters model/workflow |
| 12 | 2026-09-17 15:05 | `Definition of Terms` (section heading) | Only define terms actually used; drop Youden index if unused |

---

## Comment 0

- **ID:** `0` · **Author:** `t12410` · **Date:** `2026-09-17T14:34:00Z`

**Highlighted text in document (`w:commentRangeStart id=0`):**

> Deep learning for brain tumor detection and classification

**Comment text (`word/comments.xml` id 0):**

> Add a short distinction between:
> detection
> classification
> segmentation
> This is important because the Related Systems section includes systems performing different tasks.
> For example:
> Detection asks whether a tumor is present; classification determines the category or type; segmentation identifies the spatial extent of the tumor.
> This would help the reader understand later why NeuroScan deliberately performs binary classification rather than segmentation.

---

## Comment 1

- **ID:** `1` · **Author:** `t12410` · **Date:** `2026-09-17T14:35:00Z`

**Highlighted text:**

> Transfer learning, limited data, and class imbalance

**Comment text:**

> I suggest to change the heading slightly:
> Instead of:
> Transfer learning, limited data, and class imbalance
> I prefer:
> Transfer Learning and Data Challenges in Brain MRI Classification
> Then discuss:
> limited datasets;
> class imbalance;
> data augmentation;
> transfer learning;
> overfitting;
> data leakage.
> That would give the section a broader and more coherent theme.

---

## Comment 2

- **ID:** `2` · **Author:** `t12410` · **Date:** `2026-09-17T14:37:00Z`

**Highlighted text (full paragraph):**

> Explainable artificial intelligence (XAI) techniques are used to address this problem. Gradient-weighted class activation mapping generates a heatmap highlighting the regions of an input image that contribute most to a class prediction (Nazir et al., 2024), and studies that combine such visualizations with SHAP and LIME report that the resulting explanations clarify which image regions drive the output (Iftikhar et al., 2025; Nazir et al., 2024). A ResNet50 model paired with class activation mapping reached 98.52% testing accuracy while providing visual explanations of the areas the network focused on (Mohamed Musthafa et al., 2024). Across the reviewed works, class activation mapping has been found to highlight tumor-relevant regions and thereby support the visual validation of a prediction (Kantu et al., 2025; Aksoy et al., 2025).

**Comment text:**

> I would make one important correction in emphasis.
> You currently discuss SHAP, LIME, and CAM together.
> If NeuroScan actually uses Class Activation Mapping (CAM), the literature should focus primarily on CAM/Grad-CAM-type visual explanation techniques.
> Don't give equal emphasis to XAI techniques that are not implemented.

---

## Comment 3

- **ID:** `3` · **Author:** `t12410` · **Date:** `2026-09-17T14:38:00Z`

**Highlighted text:**

> Privacy, locality, and deployment trade-offs

**Comment text:**

> Rename it to:
> Privacy and Local Deployment of Medical Imaging AI
> That makes the relevance immediately obvious.

---

## Comment 4

- **ID:** `4` · **Author:** `t12410` · **Date:** `2026-09-17T14:41:00Z`

**Highlighted text:**

> Synthesis

**Comment text:**

> Before Synthesis Sections, add the following themes:
> ADD 1: Evaluation of Medical AI Classification
> This is the most important missing theme.
> The Definition of Terms contains:
> accuracy;
> precision;
> recall;
> specificity;
> F1;
> ROC-AUC;
> Youden index;
> confusion matrix.
> But the Related Literature does not really develop why these metrics are appropriate.
> I would add:
> Evaluation Metrics for Medical Image Classification
> Discuss:
> confusion matrix;
> accuracy;
> precision;
> recall/sensitivity;
> specificity;
> F1-score;
> ROC-AUC;
> possibly PPV/NPV if applicable.
> Most importantly:
> Why accuracy alone is insufficient in medical classification.
> You already have a good source for this: Hicks et al. (2022).
> This section would also prepare the reader for Chapter 3.
> ADD 2: Data Leakage and Evaluation Validity
> You already mention this inside the deep-learning section.
> But because this is a medical AI project, I would consider making it a small subsection under evaluation:
> Dataset Partitioning and Evaluation Validity
> Discuss:
> patient-level separation where applicable;
> training/validation/test split;
> avoiding augmented copies in test data;
> data leakage;
> held-out test set;
> cross-validation.
> ADD 3: Clinical Decision Support vs. Diagnosis
> This is important because of the title and system claims.
> You currently do address this very well in their conceptual framework. You explicitly position NeuroScan as an assistive triage aid rather than a diagnostic device, with clinician review required.
> I would bring some of that thinking into Related Literature.
> Suggested heading:
> Computer-Aided Screening and Clinical Decision Support
> Discuss:
> CAD;
> screening;
> decision support;
> human oversight;
> difference between model prediction and clinical diagnosis.
> This would prevent the Chapter 2 from sounding as if the CNN itself "diagnoses brain tumors."

---

## Comment 5

- **ID:** `5` · **Author:** `t12410` · **Date:** `2026-09-17T14:43:00Z`

**Highlighted text:**

> Related System

**Comment text:**

> You need MORE actual systems.
> At present, the Related Systems section essentially revolves around:
> Aksoy et al.
> model-centric frameworks;
> Abdusalomov et al.;
> Dong et al.;
> NeuroScan.
> That is useful, but I would ideally require around 5–7 genuinely comparable systems/studies, depending on the availability of strong literature.

---

## Comment 6

- **ID:** `6` · **Author:** `t12410` · **Date:** `2026-09-17T14:45:00Z`

**Highlighted text:**

> Web-deployed, explainable diagnosis platform

**Comment text:**

> Rename it to:
> Web-Based Brain Tumor Diagnosis Systems

---

## Comment 7

- **ID:** `7` · **Author:** `t12410` · **Date:** `2026-09-17T14:46:00Z`

**Highlighted text:**

> Model-centric frameworks without an end-user application

**Comment text:**

> Rename it to:
> Model-Centric Brain Tumor Classification Frameworks

---

## Comment 8

- **ID:** `8` · **Author:** `t12410` · **Date:** `2026-09-17T14:46:00Z`

**Highlighted text:**

> Edge and locally executed deployments

**Comment text:**

> Rename it to:
> Edge and Locally Executed Brain Tumor AI Systems

---

## Comment 9

- **ID:** `9` · **Author:** `t12410` · **Date:** `2026-09-17T14:47:00Z`

**Highlighted text (full paragraph):**

> A third group prioritizes where the computation happens. A lightweight RetinaNet variant with a MobileNet backbone was designed for medical edge devices and evaluated on BraTS, reaching an average precision of 32.1 with confidence scores reported above 81%, motivated by the absence of specialized radiological expertise in remote settings (Abdusalomov et al., 2025). A browser-based, locally executed deployment for medical imaging AI described the trade-offs of this design space in detail: cloud inference requires transferring sensitive patient information, while bespoke desktop software requires administrative and security approval and per-device configuration, and the proposed alternative ran locally without transferring or persisting data at the cost of roughly 80 seconds and 1.5 GB of memory per volumetric case on machines that typically lack graphics processing units (Dong et al., 2023). That characterization is directly relevant to NeuroScan, which accepts the installation and configuration burden of desktop software in exchange for keeping scans on the workstation.

**Comment text:**

> Add another 2 themes and name it as:
> Add 1: Other Comparable Brain MRI Classification Systems
> Add 2: Comparative Analysis of Related Systems

---

## Comment 10

- **ID:** `10` · **Author:** `t12410` · **Date:** `2026-09-17T14:47:00Z`

**Highlighted text:**

> NeuroScan

**Comment text:**

> Rename it to:
> Positioning of NeuroScan

---

## Comment 11

- **ID:** `11` · **Author:** `t12410` · **Date:** `2026-09-17T15:04:00Z`

**Highlighted text:**

> user context

**Comment text:**

> What exactly is "user context" and how does it enter the model or workflow?

---

## Comment 12

- **ID:** `12` · **Author:** `t12410` · **Date:** `2026-09-17T15:05:00Z`

**Highlighted text:**

> Definition of Terms

**Comment text:**

> Terms such as:
> accuracy;
> precision;
> recall;
> specificity;
> F1;
> ROC-AUC;
> Youden index
> may be appropriate if these are actually used in the study's evaluation.
> If Youden index will not actually be used, remove it.
> Likewise, don't define technologies merely because they appear somewhere in the literature. Define terms that are:
> central to the study;
> technically important;
> operationally specific.

---

## Appendix — Raw extraction notes

- `word/comments.xml` contains 13 `w:comment` elements (IDs 0–12).
- `word/commentsExtended.xml` and `word/commentsIds.xml` mark all comments as `w15:done="0"` (unresolved) with durable IDs; `word/people.xml` resolves author `t12410` via provider `AD`.
- Highlight mapping was obtained by walking `word/document.xml` `w:body` in document order and collecting `w:t` text between paired `w:commentRangeStart`/`w:commentRangeEnd` for each ID. Inline markup (runs, hyperlinks) was collapsed with whitespace normalized.
- Original whitespace and line breaks inside comments preserved above as separate lines.
