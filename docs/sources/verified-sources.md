# Verified Source Registry

Governed by `.agent/skills/source-grounded-writing/SKILL.md` (repo root `SKILL.md`). One registry shared by all chapters.
Levels: **F** full/relevant section read · **A** abstract only · **R** record only (never citable) · **P** pending user access · **X** rejected.
Recency window for this pass: publication year ≥ 2021.

---

## 2.1 Related Literature — verified entries

### [rrl-01] Bouhafra & El Bahi, 2024
- Deep Learning Approaches for Brain Tumor Detection and Classification Using MRI Images (2020 to 2024): A Systematic Review · Journal of Digital Imaging 38(3):1403–1433 · Tier A · 2024 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12092918/ (read 2026-09-15) · Access **F**
- Supports: MRI is the most effective modality (superior contrast vs. CT, no ionizing radiation); WHO 2021 CNS classification distinguishes >200 tumor types by location and histopathology; small-lesion differentiation is difficult; growing MRI demand + limited radiologist supply motivates CAD; CAD credited with reduced workload and reduced human-error risk; systematic review of 60 articles (2020–Jan 2024) covering transfer learning, autoencoders, transformers, attention, GAN
- Does NOT support: any specific accuracy figure for a named model (review-level only); brain-tumor incidence/mortality statistics · Caveats: review window ends January 2024
- Used in: Ch. 1 §Background (**2026-09-22: MRI as the effective, radiation-free modality — re-anchored from rrl-18 to keep one source per claim**); Ch. 2 §2.1 intro, §2.1.1, §2.1.2, §2.3.1, §2.4

### [rrl-02] Iftikhar et al., 2025
- Explainable CNN for brain tumor detection and classification through XAI based key features identification · Brain Informatics 12(1):10 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12044100/ (read 2026-09-15) · Access **F** · reuse of a Chapter 1 source (link re-checked 2026-09-15)
- Supports: complex DL models are difficult to interpret; models may rely on irrelevant features or normal soft tissues instead of tumor areas, undermining reliability; XAI covers Grad-CAM, SHAP, LIME; increasing architectural complexity raises computational cost and impedes real-time clinical implementation; own result 99% on seen data, 95% unseen
- Does NOT support: claims that XAI improves clinician trust or patient outcomes (not measured) · Caveats: own experimental setup only
- Used in: Ch. 1 §Background; Ch. 2 §2.1.5, §2.3.3, §2.4

### [rrl-03] Rasa et al., 2024
- Brain tumor classification using fine-tuned transfer learning models on MRI images · Digital Health 10 · Tier A · 2024 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11459499/ (read 2026-09-15) · Access **F**
- Supports: transfer learning gives better accuracy even with few training samples; six fine-tuned architectures (VGG16, ResNet50, MobileNetV2, DenseNet201, EfficientNetB3, InceptionV3); augmentation used to enlarge data and reduce overfitting; 100% train+test accuracy on smaller datasets without cross-validation; 99.96% with cross-validation; 96.34–98.20% on larger datasets; small computation time
- Does NOT support: any clinical or diagnostic claim · Caveats: two public datasets; "100%" figure is the study's own small-dataset result
- Used in: Ch. 2 §2.1.2, §2.1.3, §2.2.2, §2.3.1, §2.3.2, §2.4

### [rrl-04] Khan et al., 2025
- Transfer learning for accurate brain tumor classification in MRI: a step forward in medical diagnostics · Discover Oncology 16:1040 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12149374/ (read 2026-09-15; **full text re-read 2026-09-15** — abstract, introduction, literature review) · Access **F**
- Full-text confirmations: the 4,517 scans decompose as glioma 1,129 + meningioma 1,134 + pituitary 1,138 + normal 1,116; "three pre-trained architectures" confirmed as AlexNet, MobileNetV2 and GoogleNet; GoogleNet 99.2% restated in the abstract. The paper does **not** state whether 99.2% is test or validation accuracy, which is why the Chapter 1 sentence says only "reached 99.2% accuracy"
- Supports: TL comparison of AlexNet, MobileNetV2, GoogleNet; dataset of 4,517 MRI scans (glioma 1,129 / meningioma 1,134 / pituitary 1,138 / normal 1,116); class imbalance addressed through data augmentation; lightweight architectures included for model efficiency; GoogleNet best at 99.2%
- Does NOT support: claims about deployment, runtime, or offline operation (not measured) · Caveats: single public dataset
- Used in: Ch. 1 §Background (4,517-image transfer-learning comparison at 99.2%); Ch. 2 §2.1.3, §2.4

### [rrl-05] Kantu et al., 2025
- Integrating MobileNetV3 and SqueezeNet for Multi-class Brain Tumor Classification · Journal of Imaging Informatics in Medicine 39(2):1274–1288 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/ (read 2026-09-15; **full text re-read 2026-09-15** — abstract, introduction, related work, dataset and preprocessing) · Access **F**
- Full-text confirmations: the 7,023-image set is the Kaggle Brain Tumor Classification dataset (glioma 1,621 / meningioma 1,645 / no tumor 2,000 / pituitary 1,757) split 4,522 train / 1,186 validation / 1,311 test under a fixed random seed (46); **99.31% is stated in the source as test accuracy** for MobileNetV3 at 3.47M parameters; Grad-CAM is the study's explainability method; the authors state they kept validation and test sets augmentation-free specifically to avoid the data leakage they report in prior work
- Supports: MRI is the gold standard for brain tumor diagnosis (non-invasive, high soft-tissue contrast); manual reading is time-consuming and subject to inter-observer variability; VGG-16/ResNet-50/InceptionV3 are computationally intensive and less practical in low-resource or real-time environments; dataset of 7,023 images with a 65/17/18 train/val/test split; MobileNetV3 reached 99.31% test accuracy with 3.47M parameters; Grad-CAM used for explainability, highlighting tumor-relevant regions; prior work has introduced data leakage through augmented test sets and unstandardized splits
- Does NOT support: per-class results or confusion-matrix details (not read) · Caveats: single internal split; abstract-level for numbers
- Used in: Ch. 1 §Background (99.31% test accuracy at 3.47M parameters); Ch. 2 §2.1.1, §2.1.2, §2.1.4, §2.1.5, §2.1.7, §2.3.1, §2.3.2

### [rrl-06] Abdusalomov et al., 2025
- Accessible AI Diagnostics and Lightweight Brain Tumor Detection on Medical Edge Devices · Bioengineering 12(1):62 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11759171/ (read 2026-09-15) · Access **F**
- Supports: RetinaNet variant with MobileNet backbone + depthwise separable convolutions for medical edge devices; BraTS dataset; average precision 32.1 (APS 14.3, APL 49.7); confidence scores above 81%; motivation is the absence of specialized radiological expertise and infrastructure in remote/resource-limited settings
- Does NOT support: classification accuracy claims (task is detection/localization); low-resource-country prevalence statistics · Caveats: object detection on volumetric data, not binary image classification — not comparable to classification accuracies
- Used in: Ch. 2 §2.1.1, §2.1.4, §2.1.7, §2.2.3, §2.3.1

### [rrl-07] Mohamed Musthafa et al., 2024
- Enhancing brain tumor detection in MRI images through explainable AI using Grad-CAM with ResNet 50 · BMC Medical Imaging 24:107 · Tier A · 2024 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11088067/ (read 2026-09-15) · Access **F**
- Supports: ResNet50 + Grad-CAM; testing accuracy 98.52% with precision and recall above 98%; existing DL methodologies often act as black boxes; MRI interpretation is largely reliant on radiologist expertise and time-consuming
- Does NOT support: clinical-utility or deployment claims · Caveats: augmented public dataset, single protocol
- Used in: Ch. 2 §2.1.5

### [rrl-08] Nazir et al., 2024
- Utilizing customized CNN for brain tumor prediction with explainable AI · Heliyon 10(20):e38997 · Tier A · 2024 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11497403/ (read 2026-09-15) · Access **F**
- Supports: customized CNN with SHAP, LIME, Grad-CAM; BR35H dataset of 3,060 brain MRI images; training accuracy 100%, validation 98.67%, precision/recall/F1 98.50%; Grad-CAM generates a heatmap highlighting the regions contributing most to a class prediction; traditional DL models lack transparency, causing skepticism among medical experts; generalizability tested on further datasets
- Does NOT support: claims that explanations change clinician decisions · Caveats: validation accuracy, not held-out test accuracy, for the headline figure
- Verbatim anchor: Grad-CAM "generates a heatmap that highlights the regions of an input image that contribute the most to a specific class prediction"
- Used in: Ch. 2 §2.1.5, §2.1.7, §2.2.2, §2.3.1, §2.3.2, §2.4

### [rrl-09] Aksoy et al., 2025
- A Web-Deployed, Explainable AI System for Comprehensive Brain Tumor Diagnosis · Neurology International 17(8):121 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12388561/ (read 2026-09-15; MDPI landing page returns 403 to automated retrieval — read via PMC mirror) · Access **F**
- Supports: web-based 2D classification + 3D segmentation platform; fine-tuned MobileNetV2 98.09% classification accuracy (glioma/meningioma/pituitary/normal); SegResNet Dice ~68–70% on BraTS with synthetic no-tumor data; MLP meta-classifier 100% detection accuracy; XRAI saliency maps for 2D and Gaussian overlays for 3D, reported consistent with pathological features; MRI most common imaging technique for diagnosis (soft-tissue contrast); even experienced radiologists may find scan interpretation difficult and untimely; mainstream DL models remain black boxes
- Does NOT support: multi-centre or prospective clinical validation; runtime/hardware requirements of the web platform; **class activation mapping** · Caveats: no reported external validation; segmentation quality well below classification quality
- **Ch. 2 correction (2026-09-22):** the explainability route is **XRAI saliency maps (2D) and Gaussian overlays (3D)**, not class activation mapping. Chapter 2 previously cited this source for "class activation mapping … highlight tumor-relevant regions"; that clause was re-anchored to rrl-05 (Grad-CAM) and rrl-07 (CAM with ResNet50). Aksoy now carries saliency/overlay explainability only.
- Used in: Ch. 2 §2.1.1, §2.1.2, §2.1.3, §2.1.6, §2.1.11, §2.2.1, §2.2.5 (Table 2-1), §2.2.6, §2.4

### [rrl-10] Abbas et al., 2025
- Explainable AI in Clinical Decision Support Systems: A Meta-Analysis of Methods, Applications, and Usability Challenges · Healthcare 13(17):2154 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12427955/ (read 2026-09-15) · Access **F**
- Supports: meta-analysis of 62 peer-reviewed studies (2018–2025) on XAI in clinical decision support; lack of transparency/interpretability is a critical barrier to AI adoption in healthcare; physicians reluctant to rely on opaque recommendations; model-agnostic visualization techniques (e.g., Grad-CAM) and attention mechanisms dominate imaging tasks; identified gaps: user-friendly evaluation, methodological transparency, ethics; absence of research evaluating explanation fidelity, clinician trust, or usability in real-world settings; recommends longitudinal clinical validation and participatory design
- Does NOT support: any specific model accuracy figure · Caveats: review/meta-analysis of heterogeneous studies
- Used in: Ch. 2 §2.1.5, §2.1.7, §2.2.2, §2.3.3

### [rrl-11] Dong et al., 2023
- Characterizing browser-based medical imaging AI with serverless edge computing: towards addressing clinical data security constraints · Proc. SPIE 12469:1246907 (conference proceedings) · Tier B · 2023 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10099365/ (read 2026-09-15) · Access **F**
- Supports: cloud deployment of DL algorithms raises PHI privacy concerns plus security and regulatory (HIPAA) barriers to network transfer; bespoke desktop software typically requires business/security agreements before filesystem access and per-device customization, described as costly at scale; clinic workstations usually lack GPUs; browser-based local (serverless-edge) inference does not copy data off the workstation nor persist it across sessions; demonstrated 3D CNN on 256×256×256 CT volumes at ~80 s mean runtime (Firefox/Chrome/Edge; 210 s Safari) and ~1.5 GB memory
- Does NOT support: brain MRI or tumor claims (demonstrated on lung CT segmentation) · Caveats: conference paper; single demonstrated pipeline
- Used in: Ch. 1 §Background (from 2026-09-15, the privacy sentence's cloud clause); Ch. 2 §2.1.6, §2.2.3, §2.2.4, §2.3.2, §2.4

### [rrl-12] Frija et al., 2021
- How to improve access to medical imaging in low- and middle-income countries? · EClinicalMedicine 38:101034 · Tier A (peer-reviewed journal) · 2021 in-window (boundary year)
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8318869/ (read 2026-09-15) · Access **F**
- Supports: fewer than 1 CT scanner per million inhabitants in LMICs vs. almost 40 per million in high-income countries, with a wider gap for MRI; 1.9 vs. 97.9 radiologists per million inhabitants in low- vs. high-income countries; paper highlights the need to better exploit IT and AI for imaging in the LMIC setting
- Does NOT support: Philippine-specific figures; brain-tumor-specific burden data · Caveats: policy analysis, not a prevalence study; 2021 boundary year
- Used in: Ch. 2 §2.1.1, §2.3.1

### [rrl-13] Anand et al., 2026
- Multi-class classification of brain tumors using optimized CNN and transfer learning techniques · Scientific Reports 16:4709 · Tier A · 2026 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12868662/ (read 2026-09-15; nature.com returns 406 to automated retrieval — read via PMC mirror; **full text re-read 2026-09-15** — abstract, introduction, literature survey, related-work table) · Access **F**
- Full-text confirmation: the 98.5% is the study's **overall** accuracy for the four-class CNN; per-class accuracy is 0.98 (no tumor), 0.96 (pituitary), 0.89 (meningioma), 0.86 (glioma), so the Figure must never be read as per-class. Chapter 1's sentence was tightened on 2026-09-15 to say "an overall accuracy of 98.5% on a four-class task"
- Supports: proposed 4-convolution-block CNN reached 98.5% accuracy across glioma/meningioma/no-tumor/pituitary, above ResNet50 at 93.2%; per-class accuracy 0.98 (no tumor), 0.96 (pituitary), 0.89 (meningioma), 0.86 (glioma); WHO 2021 CNS tumor classification grades I–IV; brain tumors disrupt normal brain function; **brain tumors are abnormal growths arising from unregulated cell proliferation in the brain or CNS, disrupt normal brain function, and can be life-threatening** (abstract "abnormal cell growths … disrupt normal brain function and can be life-threatening"; introduction "the unregulated proliferation of cells results in the development of brain tumors") — added 2026-09-22 for the Chapter 1 opening sentence
- Does NOT support: brain-tumor survival statistics · Caveats: single public dataset; **candidate match for the existing `Anand et al., 2026b` suffix used in Chapter 1 — needs confirmation against Chapter 1's intended reference before reuse**
- **Added 2026-09-22 (Chapter 1 bridge sentence):** the introduction's opening line — "Clinical diagnosis is a vital component of modern healthcare, particularly for disorders like brain cancer, which is among the deadliest in the world" (read 2026-09-22, PMC 200) · supports only the bridge claim (clinical diagnosis matters, brain cancer is among the deadliest); it does **not** supply incidence, mortality, or survival figures
- Used in: Ch. 1 §Background (98.5% overall, four-class CNN; **2026-09-22: bridge sentence between the hook and the burden statistics**); Ch. 2 §2.1.1, §2.1.2, §2.1.3, §2.1.11, §2.2.3, §2.2.5 (Table 2-1)
- Link re-checked 2026-09-22 (PMC 200)

### [rrl-14] Vamsidhar et al., 2025
- Hybrid model integration with explainable AI for brain tumor diagnosis: a unified approach to MRI analysis and prediction · Scientific Reports 15:20542 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12216004/ (read 2026-09-15; nature.com returns 406 to automated retrieval — read via PMC mirror; **full text re-read 2026-09-15** — abstract, introduction, related work) · Access **F** (the results section itself was still not retrieved; the 99.67% figure rests on the abstract, where the authors state it directly)
- Full-text confirmations: the introduction describes the approach exactly as Chapter 1 states it — "Parallel Model Integration of two deep learning models, ResNet101, and Xception" — with LIME "used to generate visual rationales for the model's predictions"; the task is stated as brain tumor **detection** (binary), matching the "for tumor detection" wording; stated future work is extension to multi-class classification
- Supports: parallel integration of ResNet101 and Xception explained with LIME reached 99.67% accuracy for tumor detection; a vision transformer + random forest + CLAHE pipeline reached 98.17%; stated future work is extension to multi-class classification and improved generalization
- Does NOT support: claims about a deployed end-user application (the prototype description was not verified — snippet-only evidence rejected) · Caveats: abstract-level for the headline accuracy; binary detection only
- Used in: Ch. 1 §Background (discriminative-feature learning and the 99.67% parallel ResNet101+Xception result); Ch. 2 §2.2.2, §2.3.2, §2.4

---

## 2.3 / 2.4 — verified entries added for the framework and the definition of terms

### [rrl-15] Hicks et al., 2022
- On evaluation metrics for medical applications of artificial intelligence · Scientific Reports 12:5979 · Tier A · 2022 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8993826/ (read 2026-09-15) · Access **F**
- Supports: model development is split into training, validation, and test phases, with final metrics calculated on a test set set aside after training and tuning; the confusion-matrix entries (TP, TN, FP, FN) are the quantities from which binary-classification metrics are computed; definitions and formulas for accuracy (ratio of correctly classified samples to all samples, misleading when class proportions differ), recall/sensitivity/TPR, specificity, precision with PPV/NPV, and F1 (harmonic mean of precision and recall, penalizing extreme values of either and not symmetric between classes); no single metric captures all desirable properties, which is why several are typically reported; thresholds tuned on imbalanced data should be checked for class bias
- Does NOT support: AUROC or AUPRC (the authors explicitly exclude them as they cannot be derived from the confusion matrix) · Caveats: written around binary classification in gastroenterology, though the authors state the guidance applies to any clinical field
- Used in: Ch. 2 §2.1.7 (F1 definition), §2.4 (F1 score)

### [rrl-16] Shreffler & Huecker, 2023
- Diagnostic Testing Accuracy: Sensitivity, Specificity, Predictive Values and Likelihood Ratios · StatPearls [Internet], StatPearls Publishing (NCBI Bookshelf) · Tier B (clinical reference book chapter) · last updated 2023-03-06, in-window
- https://www.ncbi.nlm.nih.gov/books/NBK557491/ (read 2026-09-15) · Access **F**
- Supports: sensitivity is the proportion of true positive tests out of all patients with a condition; specificity is the percentage of true negatives out of all subjects who do not have the condition; the two are inversely related and should be considered together; PPV, NPV, and likelihood ratios as further measures of test accuracy
- Does NOT support: machine-learning-specific metric definitions (Hicks covers those) · Caveats: a clinical reference resource rather than a peer-reviewed study; a living document, version-stamped on the page
- Used in: Ch. 2 §2.4

### [rrl-17] Çorbacıoğlu & Aksel, 2023
- Receiver operating characteristic curve analysis in diagnostic accuracy studies: A guide to interpreting the area under the curve value · Turkish Journal of Emergency Medicine 23(4):195–198 · Tier A · 2023 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10664195/ (read 2026-09-15) · Access **F**
- Supports: ROC analysis applies when the index test yields continuous outputs; the AUC is a summary metric of the ROC curve reflecting the test's ability to distinguish diseased from non-diseased individuals, ranging from 0.5 (no better than chance) to 1.0 (perfect discrimination), with values above 0.80 generally considered clinically useful; the 95% confidence interval must be considered when interpreting an AUC; the Youden index identifies the optimal cutoff value, which is the value maximizing sensitivity and specificity
- Does NOT support: brain-tumor-specific accuracy expectations · Caveats: search snippets sometimes drop the second author (Aksel) — author string corrected from the article itself
- Used in: Ch. 2 §2.4

### [tool-01] ONNX, n.d. — official project documentation
- Open Neural Network Exchange (ONNX) · official project site · Tier C (official documentation — tool claims only) · **no publication date carried by the source: cited as n.d. and flagged per the skill's n.d. rule**
- https://onnx.ai/ (read 2026-09-15) · Access **F**
- Supports: ONNX is an open format for representing machine learning models, defining a common set of operators and a common file format that lets developers use models with a variety of frameworks, tools, runtimes, and compilers
- Does NOT support: any conceptual, clinical, or performance claim; nothing about model accuracy or medical suitability · Caveats: Tier C — citable only for what the format is, never for a scholarly claim
- Used in: Ch. 2 §2.4

### [tool-02] ONNX Runtime, n.d. — official documentation (held, not yet cited)
- ONNX Runtime documentation · official project site · Tier C · no publication date (n.d.)
- https://onnxruntime.ai/docs/ (read 2026-09-15) · Access **F**
- Supports: ONNX Runtime is a cross-platform machine-learning model accelerator usable with models from PyTorch, TensorFlow/Keras, and other frameworks; the documented pattern is to train in Python and deploy into a C#/C++/Java application; the model developer is responsible for validating accuracy, performance, and suitability
- Does NOT support: medical or clinical claims of any kind · Caveats: Tier C; held for Chapter 3 system design, not used in Chapter 2 prose
- Used in: — (reserved for Ch. 3)

---

## Reused from Chapter 1 — newly verified during the Ch. 2 reuse pass (2026-09-15)

Chapter 1 predates this registry, so none of its citations were reusable under the skill until verified. Two are now verified and are reused in Chapter 2 prose. Links re-checked 2026-09-15.

### [rrl-18] Missaoui et al., 2025 — **reused from Ch. 1**
- Advanced Deep Learning and Machine Learning Techniques for MRI Brain Tumor Analysis: A Review · Sensors 25(9):2746 · Tier A · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12074157/ (read 2026-09-15; MDPI landing page returns 403 to automated retrieval — read via PMC) · Access **F** · link re-checked 2026-09-15
- Supports: "Because of its superior contrast resolution and anatomic detail without ionizing radiation, magnetic resonance imaging (MRI) is a favored modality among the several imaging techniques used to confirm brain tumors"; the abstract states MRI is highlighted as the preferred imaging modality for brain tumors on account of superior contrast resolution and safety compared with other methods; systematic analysis of 107 studies (2018–2024) using ML, DL, and hybrid models across publicly available datasets (BraTS, TCIA, Figshare); challenges addressed across detection, segmentation, classification, and survival prediction
- **Added 2026-09-22 (Chapter 1 hook):** the introduction opens with the brain's complexity — "The brain is the most complex organ in the human body and plays an important part in daily living"; "The majority of bodily functions are handled by it, including decision making, organizing, integrating, analyzing, and sending signals to the other body parts" (read 2026-09-22, PMC 200) · supports the Chapter 1 opening hook only, paraphrased — do not reproduce the source's sentence structure
- Does NOT support: any single named accuracy figure for NeuroScan's task; brain-tumor incidence/mortality statistics not drawn from this source · Caveats: review-level; MRI-versus-CT superiority is stated comparatively, not measured in a head-to-head trial here
- Chapter 1 claim checked: "MRI is widely used to evaluate brain tumors because it provides detailed images without ionizing radiation" — **supported**, but the **anchor moved** on 2026-09-22 to rrl-01 (Bouhafra & El Bahi, 2024) so that this review carries one claim in §Background (the opening hook) instead of two unrelated ones (skill rule: one source never backs several unrelated claims in the same paragraph)
- Used in: Ch. 1 §Background (**2026-09-22: opening hook — the brain as the body's most complex organ; the former MRI anchor now sits on rrl-01**); Ch. 2 §2.1.1

### [rrl-19] Co et al., 2025 — **reused from Ch. 1**
- Utility of Magnetic Resonance Spectroscopy and Perfusion Imaging in Differentiating Brain Tumors From Mimics in a Tertiary Hospital in the Philippines · Cureus 17(3):e81258 · Tier A (PubMed-indexed peer-reviewed journal; note the journal's mixed reputation among some panels) · 2025 in-window
- https://www.cureus.com/articles/350114-utility-of-magnetic-resonance-spectroscopy-and-perfusion-imaging-in-differentiating-brain-tumors-from-mimics-in-a-tertiary-hospital-in-the-philippines (read 2026-09-15; abstract + metadata) · also mirrored at PMC12033976 (**full text read 2026-09-15** — abstract, introduction, materials and methods, results) · Access **F** · link re-checked 2026-09-15
- Full-text confirmations: retrospective cross-sectional study of **37 patients (28 male, 9 female, aged 19–78)** at St. Luke's Medical Center, Quezon City, imaging performed 2015–2023; the introduction states there are "a lot of instances where a reliable differentiation of neoplastic from non-neoplastic brain lesions or of high- from low-grade tumors is difficult with conventional MRI, which often leads to misdiagnosis"; the conclusion states that MRS and MRP "complement conventional MRI in distinguishing neoplastic from non-neoplastic lesions"; analysis was descriptive, without a comparison group
- Author string verified from the indexed record: Co APC, Imperial MAL, Dantes AT, Pilotin R, De Roxas-Bernardino R, Opinaldo PV, Batara JMF — 7 authors, so `(Co et al., 2025)` is correct APA 7 for the Chapter 1 suffix
- Supports: a wide range of non-neoplastic brain lesions can mimic tumors on MRI, creating diagnostic challenges; although MRI is the gold standard for evaluating brain lesions, differentiating neoplastic from non-neoplastic lesions, and high- from low-grade tumors, can be difficult and can lead to unnecessary biopsies; MRS and MRP complement conventional MRI in distinguishing neoplastic from non-neoplastic lesions; single-centre retrospective cross-sectional study of 37 patients (28 male, 9 female, aged 19–78) in a tertiary hospital in the Philippines
- Does NOT support: generalizing the 37-patient single-centre result to all settings; any CNN or machine-learning claim (the paper concerns spectroscopy and perfusion, not deep learning) · Caveats: **single-centre retrospective study of 37 patients — scope must be stated whenever its figures are used**; descriptive statistics only, no comparison group; the body is no longer a gap (full text read via PMC12033976)
- Chapter 1 claim checked: "conventional MRI may not reliably distinguish brain tumors from non-neoplastic lesions or differentiate some tumor types" — **supported** (the source's own phrasing is "conventional MRI falls short" / "can be difficult")
- Used in: Ch. 1 §Background; Ch. 2 §2.1.1

---

## Chapter 1 audit pass (2026-09-15) — newly verified, reusable in Ch. 2–4

### [rrl-20] Kim et al., 2025 — **reused-eligible**
- Global burden of brain and central nervous system cancer in 185 countries, and projections up to 2050: a population-based systematic analysis of GLOBOCAN 2022 · Journal of Neuro-Oncology 175(2):673–685 · Tier A · published 2025-11, in-window
- Link used in prose: https://doi.org/10.1007/s11060-025-05164-0 — following it returns **406 Not Acceptable** to automated retrieval (bot block, not a dead link or wrong-work redirect; recorded 2026-09-15 so it is not re-investigated). Version actually read: https://khu.elsevierpure.com/en/publications/global-burden-of-brain-and-central-nervous-system-cancer-in-185-c-2/ (200, full abstract + metadata) · Access **F** (abstract-level) · link re-checked 2026-09-15 · **full-text routes exhausted 2026-09-15**: the Springer DOI returns 406 and Europe PMC holds only the MEDLINE record (`source: MED`, 40720078, with no PMC deposit), so no open-access full text exists for this work. Its abstract is the fullest retrievable text, and both figures used in Chapter 1 are the abstract's own
- 15 authors (Kim S, Son Y, Oh J, Kim S, Jang W, Lee S, Smith L, Pizzol D, Lee J, Lee H, Nehs CJ, Nehs MA, Jung J, Kang J, Yon DK) → `(Kim et al., 2025)` correct
- Supports: in 2022 the global estimated ASIR of brain and CNS cancers was 3.5 per 100,000 with **321,624 new cases**; **248,403 deaths** with an ASMR of 2.6 per 100,000; pediatric (0–14) brain/CNS cancers ranked second globally for both incidence and mortality; mortality-to-incidence ratios 47.7% (0–14) and 77.8% (≥15); projections to 2050
- Does NOT support: five-year survival rates; any treatment or imaging claim · Caveats: GLOBOCAN-based estimates, not a registry cohort; adult/pediatric split matters
- Chapter 1 claim checked: "321,624 new cases and 248,403 deaths worldwide in 2022" — **supported exactly**
- Used in: Ch. 1 §Background

### [rrl-21] Orduña & Lubaton-Sacro, 2022 — **reused-eligible (author string must be corrected)**
- Factors associated with delayed diagnosis among Filipino pediatric brain tumor patients: a retrospective review · CNS Oncology 11(3), doi 10.2217/cns-2022-0009 · Tier A · 2022 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9280403/ (indexed record read 2026-09-15; tandfonline.com page not retrieved; **full text read 2026-09-15 via PMC** — abstract, introduction, materials and methods, results) · Access **F** · link re-checked 2026-09-15
- Full-text confirmations: "The median interval from onset of symptoms to diagnosis … was **80.5 days** (range 0 to 1815, IQR 31 to 199)" across 196 patients, study period January 2015–December 2019 with PSI computed from first symptom onset to diagnosis by neuroimaging; the results confirm significantly longer PSI with "more physician consults prior to subspecialist referral" and "longer interval from neuroimaging request to facilitation"; the sentence Chapter 1 anchors to this source paraphrases the source's own abstract conclusion, "better neuroimaging access may lead to earlier diagnosis"; the byline reads "Patricia C Orduña" and "Cheryl Anne P Lubaton-Sacro", confirming **P is a middle initial** and validating the corrected author string
- Authors: Orduña PC (Patricia C) and P Lubaton-Sacro CA (Cheryl Anne) — **exactly two authors**
- Supports: retrospective review of Philippine General Hospital pediatric brain tumor patients 2015–2019; **196 patients**; **median prediagnostic symptomatic interval (PSI) 80.5 days**; longer PSI significantly associated with older age, supratentorial and low-grade tumors, **more physician consults prior to subspecialist referral, and longer interval from neuroimaging request to facilitation**, plus seizures, poor school performance, behavioral changes, and secondary amenorrhea
- Does NOT support: any claim about adults, or about imaging AI · Caveats: **single-centre retrospective review of 196 pediatric patients, 2015–2019 — scope must be stated whenever used**
- Zotero defect (**corrected in Chapter 1 on 2026-09-15**): Chapter 1 previously wrote `(Orduña & P Lubaton-Sacro, 2022)`. The indexed author string is "Orduña PC, P Lubaton-Sacro CA", i.e. a stray middle-initial artifact, now confirmed against the PMC full-text byline. Correct APA 7 for two authors: **`(Orduña & Lubaton-Sacro, 2022)`**
- Used in: Ch. 1 §Background

### [rrl-22] Kapkiç & Sağıroğlu, 2023 — **reused-eligible**
- Privacy Issues in Magnetic Resonance Images · International Journal of Information Security Science 12(1):21–31, doi 10.55859/ijiss.1212964 · Tier A (peer-reviewed, but a low-visibility DergiPark-hosted journal — venue recorded) · 2023 in-window
- https://dergipark.org.tr/en/pub/ijiss/article/1212964 (read 2026-09-15; **re-read 2026-09-15 — full verbatim abstract captured**) · Access **F** (abstract-level for the body: DergiPark serves this article as a PDF, which automated retrieval cannot extract, so the body text is unreachable) · link re-checked 2026-09-15 — this is entry 8 of `RRL_links.md`
- Supports: privacy in MRI "plays an important role due to violations occurring in scanning, storing, transferring, analyzing, and sharing"; the paper reviews privacy concerns in MRI and especially brain MRI across datasets, models, platforms, violations and solutions; despite rules, regulations, policies and laws, and despite techniques (anonymization, differential privacy, federated learning, pseudonymization, synthetic data generation), the privacy-utility dilemma persists and privacy-preserving techniques are continually required
- Does NOT support: any accuracy or model-performance claim; and — decisive for Chapter 1 — **the abstract does not itself use "cloud" or "external server"**. Its exact claim is that violations occur "in scanning, storing, transferring, analyzing, and sharing" of MRI images. Chapter 1's sentence was **narrowed on 2026-09-15** to that wording, and the cloud/network-transfer half was re-anchored to Dong et al. (2023), which states that claim directly · Caveats: a review, not an empirical study; body text not retrievable
- Chapter 1 claim checked: privacy risk in MRI handling — **supported for scanning/storing/transferring/analyzing/sharing (the abstract's own list)**, marked `scope narrowed`; the former "external servers / cloud-based analysis" wording was **not** supported by the retrievable text and was moved to Dong et al. (2023) on 2026-09-15
- Used in: Ch. 1 §Background

### [rrl-23] Xie et al., 2022 — **reused-eligible**
- Convolutional Neural Network Techniques for Brain Tumor Classification (from 2015 to 2022): Review, Challenges, and Future Perspectives · Diagnostics 12(8):1850 · Tier A · 2022 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9406354/ (read 2026-09-15; MDPI landing page 403 to automated retrieval — read via PMC; **full text re-read 2026-09-15** — abstract and introduction) · Access **F** · link re-checked 2026-09-15
- Full-text findings (the review's own headline results, now used in Chapter 1): **83 studies** reviewed (2015–2022); "accuracies of 91.63–100% in differentiating meningiomas, gliomas, and pituitary tumors (26 articles) and of 60.0–99.46% in distinguishing low-grade from high-grade gliomas (13 articles)"; "it is not evident that any specific methodological choice greatly outperforms the alternatives, especially given the inconsistencies in the reporting of validation methods, performance metrics, and training data"; and "**Few studies have focused on clinical usability**"
- 8 authors (Xie Y, Zaccagna F, Rundo L, Testa C, Agati R, Lodi R, Manners DN, Tonon C) → `(Xie et al., 2022)` correct
- Supports: a systematic review of studies using CNN architectures to classify brain tumors from MR images; CNNs are "a widely used deep learning approach that has frequently been applied to the problem of brain tumor diagnosis"; such techniques "still face some critical challenges in moving towards clinic application"
- Does NOT support: any single study's accuracy figure (the reported ranges are across studies, not one result) · Caveats: review-level; the "few studies have focused on clinical usability" finding is scoped to the CNN brain-tumor classification literature, not to deployed systems generally
- Chapter 1 claim checked: the sentence was **rewritten on 2026-09-15** to the review's actual finding (83 studies; 91.63–100% accuracy range for the meningioma/glioma/pituitary task) — **supported verbatim**; the usability finding is now also cited in the gap paragraph, matching the source's own conclusion
- Used in: Ch. 1 §Background; Ch. 2 §2.1.3, §2.1.8, §2.1.11, §2.2.5

### [rrl-24] Irmak, 2021 — real paper, **wrong role in Chapter 1**
- Multi-Classification of Brain Tumor MRI Images Using Deep Convolutional Neural Network with Fully Optimized Framework · Iranian Journal of Science and Technology, Transactions of Electrical Engineering 45(3):1015–1036, doi 10.1007/s40998-021-00426-9 · Tier A · 2021 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8061452/ (read 2026-09-15) · Access **F**
- Supports: three custom CNN models with all hyper-parameters tuned by grid search — detection 99.33%; five-class (normal/glioma/meningioma/pituitary/metastatic) 92.66%; three-grade 98.14%; compared against AlexNet, InceptionV3, ResNet-50, VGG-16, GoogleNet; "Satisfactory classification results are obtained using large and publicly available clinical datasets"
- Does NOT support: **transfer learning as a method** (the paper builds custom CNNs with grid search, not fine-tuned pre-trained backbones) and does **not** support any claim that the approach is suited to *limited* datasets — it states its results come from *large* public datasets
- Chapter 1 verdicts: the transfer-learning sentence is `wrong source (re-map)`; the glioma/meningioma/pituitary sentence is `strength mismatch` (task matches, attributed method does not)
- Replacement guidance: transfer-learning claims are already carried in Ch. 2 by Rasa et al. (2024) and Khan et al. (2025)
- **Ch. 2 use (2026-09-22):** §2.1.4 (dataset-size/validation-protocol contrast against Rasa) and §2.2.3 (custom-CNN system example). Used only for what it reports — custom CNNs with grid-search tuning, large public datasets, 99.33% detection / 92.66% five-class / 98.14% three-grade. The Chapter 1 transfer-learning defect is **not** propagated, and this entry must not be cited for limited-data or transfer-learning claims.
- Used in: Ch. 1 §Background (flagged for repair); Ch. 2 §2.1.4, §2.2.3, §2.2.5 (Table 2-1)

---

### [rrl-25] Deepak & Ameer, 2021 — **P (pending user access)**
- Automated Categorization of Brain Tumor from MRI Using CNN features and SVM · Journal of Ambient Intelligence and Humanized Computing 12 (2021) · Tier A · 2021 in-window (boundary year)
- No accessible full text located: SpringerLink returns 406 to automated retrieval; no OA mirror opened. Identity and the 95.82% / three-tumor-type detail are corroborated by an independent indexed source (PMC11522397) and by the article text surfaced on a document-sharing site, **neither of which is acceptable evidence under the skill** (another paper's reference list and a scrape do not establish a source's findings).
- Note also: a *different* Deepak & Ameer paper exists — "Brain tumor classification using deep CNN features via transfer learning", Computers in Biology and Medicine 111:103345 (**2019**), PubMed 31279167. That one is **pre-window** and is not a method this study uses, so it cannot be used under a foundational exception. The Chapter 1 claim ("CNN features in conjunction with SVM ... 95.82% ... three different types") matches the **2021** paper, so the year is probably right and the 2019 paper is a separate work.
- Action: supply the 2021 PDF/text, then upgrade to F and the claim becomes reusable.
- Used in: Ch. 1 §Background (pending)

---

## Chapter 1 sources checked but NOT reusable (reported for the Ch. 1 audit)

### [ch1-x1] Ullah et al., 2023 — real paper, but the attributed claims look wrong
- "An Intelligent Hybrid Approach for Brain Tumor Detection" · Pakistan Journal of Engineering and Technology 6(1):42–50 · by S. Ullah, M. Ahmad, S. Anwar, M. I. Khattak · publication year 2023 (in-window)
- Journal page https://journals.uol.edu.pk/pakjet/article/view/2318 returned **403** to automated retrieval (2026-09-15); no OA mirror opened. Identity confirmed only from independent citing records (the paper is cited by Nazir et al., 2024 and by later work), so this is a **record-level (R)** identification — never citable in this state.
- **The problem is not the source's reality but the claim attached to it in Chapter 1.** Chapter 1 attributes to Ullah et al. (2023): (a) that high predictive performance is not the only consideration when selecting a model; (b) a four-way trade-off among accuracy, computational efficiency, deployment requirements, and interpretability; and (c) constraints on complex or cloud-dependent technologies **in the Philippine context**. Neither (b) nor (c) is plausible for a Pakistan Journal of Engineering and Technology paper titled and scoped as a hybrid *detection* approach, and neither could be confirmed because the text is inaccessible.
- Action: Chapter 1's three sentences citing Ullah et al. (2023) are flagged `access-limited (verify or narrow)` / suspected `wrong source (re-map)`. Do not reuse in Chapter 2 — §2.1.4 and §2.1.7 already carry the efficiency-versus-deployment trade-off from Kantu et al. (2025) and Abdusalomov et al. (2025), which are verified. User should supply the paper's PDF or identify the intended source.

### [ch1-x1b] Tiwari et al., 2022 — **RETRACTED**
- CNN Based Multiclass Brain Tumor Detection Using Medical Imaging · Computational Intelligence and Neuroscience 2022:1830010, doi 10.1155/2022/1830010, PMC9239800
- The PMC record carries the notice: "This article has been retracted. See Comput Intell Neurosci. 2025 Dec 17;2025:9791270."
- Verdict: **prohibited** — a retracted source is excluded, recorded here so it is not re-investigated, and the Chapter 1 sentence it supports must be re-sourced. The claim ("studies have also reported strong classification performance using CNN-based methods") is already carried by Bouhafra & El Bahi (2024), Anand et al. (2026), Kantu et al. (2025) and Rasa et al. (2024).
- Year note: 2022 is in-window, but retrievability is irrelevant once retracted.
- Used in: Ch. 1 §Background (must be removed)

### [ch1-x2] Reddy et al., 2026 — not located
- Chapter 1 attributes to it the study's central gap claim: that existing work focuses on the classification model itself and remains limited in integrating the model into a standalone application presenting interpretable screening results to end users.
- Searched across four differently-worded queries (2026-09-15); no paper by a Reddy et al. (2026) matching that claim was located. Not found ≠ fabricated, but it cannot be cited or reused in this state.
- Action: supply the DOI/title, or re-anchor the sentence to a verified source. **§2.2.2 and §2.1.7 already carry this same gap from Abbas et al. (2025) and Aksoy et al. (2025)**, which are verified and stronger.

### [ch1-x3] Akter et al., 2024 — not located
- Chapter 1 uses it twice: for "CNN models can be very accurate, but we still need to consider several factors together" and for the study's own gap statement ("addressing this gap requires a lightweight, offline screening application"). Searched 2026-09-15; no matching Akter et al. (2024) located.
- **Zotero-defect suspicion:** Nazir et al. (2024), *Utilizing customized CNN for brain tumor prediction with explainable AI*, has **Afsana Akter** as its second author, and Chapter 1 cites Nazir's exact topic immediately adjacent to this entry. This looks like an author-string artifact in the imported library rather than a distinct work. User should check the Zotero record.
- Second consequence: the gap sentence is the study's **own** argument, which the skill exempts from citation entirely (rule 9). Attributing it to any source is a category error, not just a sourcing problem.

### Chapter 1 sources not yet examined in this pass
- Anand et al. (2026a) — the 35.6% five-year survival figure. **Not located**: searches surfaced braintumor.org (34.8%, undated advocacy page — prohibited tier) and Miller et al. (2021, ACS/Cancer *CA Cancer J Clin*, 36% for malignant tumors). No Anand et al. work reporting 35.6% was found. Surviving-rate statistics require the **publishing body** (ACS / CBTRUS / SEER, Tier E) cited directly, with year and population recorded — a review that repeats the number is not the publishing source.
- Anand et al. (2026b) — the a/b suffix pairing is unresolved. Candidate verified in the registry as rrl-13 (Scientific Reports 16:4709, 98.5% four-class CNN), but whether it is the intended 2026b could not be confirmed without entering Chapter 1's Zotero library.
- Orduña et al. (2022) — **now verified** (see rrl-21).
- No Chapter 1 source remains both unexamined and reusable; every distinct source in Chapter 1 has now been searched at least once.

---

## Chapter 1 repair pass (2026-09-15)

### [rrl-26] CBTRUS, 2025 — survival statistic, publishing body
- CBTRUS Fact Sheet 2025 · Central Brain Tumor Registry of the United States (registry body) · **Tier E** (authoritative agency/registry statistics — prevalence, incidence, mortality, burden only) · facts dated October 2025, incidence data 2018–2022, survival data 2004–2021 → in-window
- https://cbtrus.org/cbtrus-fact-sheet/ (read 2026-09-15) · Access **F**
- Primary artifact behind the fact sheet: Price M, Ballard C, Benedetti J, Kruchko C, Barnholtz-Sloan JS, Ostrom QT. CBTRUS Statistical Report: Primary Brain and Other Central Nervous System Tumors Diagnosed in the United States in 2018–2022. *Neuro Oncol.* 2025. doi 10.1093/neuonc/noaf194 (academic.oup.com returns 403 to automated retrieval; the registry's own fact sheet carries the figure and cites this report as its source 1)
- Supports: **the five-year relative survival rate in the US following diagnosis of a primary malignant brain or other CNS tumor was 34.8%**; the corresponding rate for a non-malignant brain/CNS tumor was 91.7%; median observed survival lowest for glioblastoma (8 months)
- Does NOT support: any worldwide survival figure — the 34.8% is explicitly a **US** figure; do not universalise it · Caveats: registry statistic, non-peer-reviewed in the ledger's terms; US population only; survival data 2004–2021
- Replaces: the previous `(Anand et al., 2026a)` citation for "five-year survival rate of only 35.6%". **35.6% was not located in any Anand et al. work** and is close to the CBTRUS **2024** report's 35.7% — the earlier sentence appears to have carried a superseded figure from that edition. Per the skill's statistics exception the body's **current** published figure wins → 34.8%.
- Used in: Ch. 1 §Background

### Chapter 1 repair log
| Citation | Action taken | Replacement source |
|---|---|---|
| Anand et al., 2026a (35.6% survival) | re-anchored to the publishing body | CBTRUS, 2025 (34.8%, Tier E) |
| Tiwari et al., 2022 (retracted) | **citation removed** | Kantu et al., 2025 (lightweight accuracy) |
| Irmak, 2021 ×2 (transfer learning) | re-mapped | Rasa et al., 2024 (transfer learning); Khan et al., 2025 (glioma/meningioma/pituitary) |
| Ullah et al., 2023 ×3 (trade-off, Philippine context) | re-mapped | Kantu et al., 2025 + Iftikhar et al., 2025 + Abbas et al., 2025 (trade-off); Frija et al., 2021 + Orduña & Lubaton-Sacro, 2022 (resource constraints) |
| Akter et al., 2024 ×2 | 1 instance merged away; the study's own argument is now **uncited** (rule 9) | — |
| Reddy et al., 2026 (gap claim) | citation removed, claim re-anchored | Abbas et al., 2025 (usability gap) + Aksoy et al., 2025 (the one user-facing system) |
| Deepak & Ameer, 2021 | **citation removed pending access** (level P) | Vamsidhar et al., 2025 (pre-trained integration, 99.67%) |
| Orduña & P Lubaton-Sacro, 2022 ×2 | author string corrected | `(Orduña & Lubaton-Sacro, 2022)` |
| all citations in §Background | converted to clickable author–year anchors per the citation format | — |

**Suffix resolution (2026-09-15):** the `2026b` suffix was orphaned by the repair — its `2026a` partner was the discredited survival citation, which CBTRUS now carries — so an `a`/`b` pair with no `a` can no longer be justified. Chapter 1 §Background now cites the work as a plain `(Anand et al., 2026)` pointing at rrl-13 (Sci Rep 16:4709, PMC12868662), matching its plain-year use in Chapter 2. The sentence was also split: the performance claim sits on Anand et al. (2026) and the discriminative-feature-learning mechanism on Vamsidhar et al. (2025), which states it explicitly. **Zotero must be updated to match** (drop the `2026b` suffix, or the library will disagree with both chapters).

**Status of Chapter 1 after repair:** all 16 distinct sources cited in §Background are now clickable anchors; 0 plain citations remain; 0 citations at registry level R or P; 0 retracted sources.

**Still open (one item):** Chapter 1's Specific Objectives say **Score-CAM** while the NeuroScan spec (D1) specifies gradient-free **CAM**. This is a naming decision, not a sourcing defect.

---

## Chapter 1 full-text verification pass (2026-09-15)

The Chapter 1 audit found nine sources validated only against their abstracts. Each was reopened and pushed to its results/materials section where retrievable. Outcome: **seven raised to full text, one proven permanently abstract-only, one provably unreachable — and one sentence downgraded.**

| Source | Before | After | What the fuller text changed |
|---|---|---|---|
| Kantu et al., 2025 | A | **F** | 7,023-image Kaggle set, 4,522/1,186/1,311 split, and 99.31% confirmed as **test** accuracy — no sentence change |
| Khan et al., 2025 | F (record) | **F** (full text) | 4,517 = 1,129+1,134+1,138+1,116; three models named; split type not stated — no change |
| Anand et al., 2026 | F (abstract) | **F** (full text) | 98.5% is **overall** accuracy (per-class 0.86–0.98) → sentence tightened to "overall accuracy" |
| Vamsidhar et al., 2025 | A | **F** (abstract + introduction) | framework and LIME use confirmed verbatim; results section still unretrieved — no change |
| Co et al., 2025 | F (abstract) | **F** (full text, PMC12033976) | methods/results/conclusion read; 37 patients, 2015–2023, descriptive statistics — no change |
| Orduña & Lubaton-Sacro, 2022 | F (abstract) | **F** (full text) | results table confirms 80.5 days; the anchored sentence is the source's own conclusion verbatim; byline confirms **P is a middle initial** — no change beyond the new anchor |
| Xie et al., 2022 | F (abstract) | **F** (full text) | **83 studies; 91.63–100% for meningioma/glioma/pituitary; "Few studies have focused on clinical usability"** → sentence **rewritten**, and the usability finding added to the gap paragraph |
| Kim et al., 2025 | F (abstract) | **F (abstract-only, permanent)** | no OA full text exists — Springer 406 and no PMC deposit — so the abstract is the ceiling |
| Kapkiç & Sağıroğlu, 2023 | F (abstract) | **F (abstract-only)** | the journal publishes PDF only; the abstract's list is "scanning, storing, transferring, analyzing, and sharing" with **no "cloud" or "external server"** → sentence **narrowed** |

**Downgrade applied — the one substantive change a fuller text forced.** The privacy sentence in §Background previously claimed, on Kapkiç & Sağıroğlu (2023), that "transmitting them to external servers for cloud-based analysis may present a security and privacy risk." The retrievable abstract of that source does not mention cloud or external servers. The sentence now reads: violations "have been documented in the scanning, storing, transferring, analyzing, and sharing of such images" (Kapkiç & Sağıroğlu, 2023 — the source's own list), followed by a separate clause that cloud analysis "requires that information to cross a network, which raises privacy concerns together with security and regulatory barriers" (Dong et al., 2023 — rrl-11, Tier B, verified, and already used in Ch. 2 §2.1.6/§2.2.3). Net effect: one source added to Chapter 1 §Background, no new verification burden, no claim left unsourced.

**Three audit corrections applied (2026-09-15):**
1. **CBTRUS survival figure — US scope restored:** "Malignant brain tumors **in the United States** carry a five-year relative survival rate of only 34.8%" (the source's figure covers a primary *malignant brain or other CNS* tumor in the US).
2. **Xie sentence — rewritten** to the review's actual finding (83 studies; 91.63–100% accuracy range) instead of a generic "widely applied" claim.
3. **Interpretation sentence — anchored:** "These results emphasize the significance of improving prompt and accurate brain tumor evaluation in the Philippine setting" now carries Orduña & Lubaton-Sacro (2022), the source whose conclusion it paraphrases.

**Result:** no sentence in Chapter 1 now rests on wording its source does not carry. Two sources remain abstract-level, and in both cases the limitation is structural — paywall and PDF-only respectively — rather than unresolved.

---

## Foundational-method exceptions — REQUESTED, awaiting user clearance

Neither source is used anywhere in the delivered prose. Per the skill, a pre-2021 work may enter prose only if it defines a method the study actually uses and the user clears it.

### [fx-01] Zhou et al., 2016 — Class Activation Mapping (CAM)
- "Learning Deep Features for Discriminative Localization" (CVPR 2016). Defines the gradient-free CAM mechanism that NeuroScan's Rust heatmap path implements (GAP → Linear head; class weights from the exported head weight matrix). Identity confirmed by record only so far — full verification deferred until clearance.

### [fx-02] Selvaraju et al., 2017 — Grad-CAM
- "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization" (ICCV 2017). The most-cited method in the reviewed brain-MRI XAI literature (Grad-CAM used as a technique name throughout the verified 2024–2025 studies above). Needed if §2.1.5 must name the origin of the method rather than cite its applied uses.

---

## Rejected / not usable this pass

- `https://www.mdpi.com/2035-8377/17/8/121` — MDPI blocks automated retrieval (403). Not a rejection of the source: resolved via PMC12388561 (see rrl-09).
- `https://www.nature.com/articles/s41598-026-51236-0` and `.../s41598-025-06455-2` — publisher returns 406 to automated retrieval. 06455-2 resolved via PMC12216004; 51236-0 (M-Net IoT brain tumor system) not read — **not cited**.
- `https://www.frontiersin.org/.../fmed.2025.1636059/full` and `.../fmed.2025.1664673/full` — JavaScript-rendered pages return no body text to automated retrieval; no mirror opened in budget. **Not cited** (CerevianNet, lightweight CNN with limited data).
- GitHub repositories (`Varun0818/edge-ml-medical-diagnosis`, `HoshiBatista/MedVision-AI-Platform`, `dvamsidhar2002/Brain-Tumor-Classification-using-Gradio`) — prohibited as standalone evidence for scholarly claims; not cited.
- `pubmed.ncbi.nlm.nih.gov` direct fetches — cookie wall; metadata was obtained via the Europe PMC REST API instead (used only for identity/link resolution, never as content evidence).

## Candidate queue — still unverified (from `RRL_links.md`, `RRS_links.md`, `for_chapter2.md`, `reference.md`)

Not yet opened or verified; nothing here is citable: Bouhafra-adjacent link-list entrants not reached in budget, Palmares/Digal/Cantiver collections, Kaggle dataset records for Br35H and the Brain Tumor MRI dataset (Tier C — dataset claims only), and the remaining `RRL_links.md` / `RRS_links.md` / `reference.md` URLs.

## Chapter 2 revision pass (2026-09-22) — responses to the reviewer's 13 tracked comments

### New entries verified in this pass

### [rrl-27] Chen et al., 2024
- Impact of human and artificial intelligence collaboration on workload reduction in medical image interpretation · npj Digital Medicine 7:349 · Tier A · 2024 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11608314/ (read 2026-09-22) · Access **F**
- Supports: meta-analysis of 36 studies (85 in the systematic review) of human–artificial intelligence collaboration in image interpretation; pooled reading-time reduction 27.20% (95% CI 18.22–36.18) and reading-quantity reduction 58.48%; a model used as pre-screening reduced reading quantity by 61.72% (47.92–75.52) versus 44.47% (40.68–48.26) as a second reader; the realistic roles of a model are concurrent aid, second reader, or pre-screening filter, with the clinician remaining the decision-maker; deploying AI in isolation from human oversight raises ethical and legal concerns; accuracy findings are often presented as evidence of efficiency, which the authors call inaccurate and misleading
- Does NOT support: any brain-tumor-specific result; any product claim; any claim that explanations improve clinician trust or outcomes (not measured) · Caveats: significant heterogeneity (I² > 99%) and uneven study quality; modalities dominated by X-ray and CT; corpus 2019–2023
- Used in: Ch. 2 §2.1.7, §2.1.9, §2.1.11

### [rrl-28] Ahmmed et al., 2026
- BTdiagAI: A Web-Deployed Hybrid Framework for Brain Tumor Classification Using Optimized MRI Preprocessing and Deep Learning Fusion · Healthcare Technology Letters 13(1):e70053 · Tier A · 2026 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12876050/ (read 2026-09-22) · Access **F** (abstract and introduction)
- Supports: a publicly accessible web platform that accepts uploaded brain MRI scans and classifies them into glioma, meningioma, pituitary, and no-tumor categories; the classifier fuses fine-tuned InceptionV3, DenseNet121, and Xception, with features refined by ANOVA and L1max selection; five preprocessing methods were compared, all above 98%, with CLAHE best at 99.8% (dataset 1) and 99.61% (dataset 2); augmentation was applied to address class imbalance; the stated motivation is time-intensive manual MRI evaluation with variability
- Does NOT support: any epidemiological figure — its incidence and mortality numbers are drawn from advocacy sources and are unusable under Tier E; and explainability is **not described in the abstract or introduction**, so the source must not be cited either way on explanations (Table 2-1 records "Category label as the reported output") · Caveats: two benchmark datasets; no clinical or external validation reported; headline accuracies are abstract-level
- Used in: Ch. 2 §2.1.4, §2.2.1, §2.2.5 (Table 2-1), §2.2.6

### Corrections and decisions recorded in this pass

- **Aksoy et al., 2025 (rrl-09) — mapping corrected** (see the entry above).
- **Co et al., 2025 (rrl-19) — link target corrected.** The Cureus landing page returns **403** to automated retrieval (re-checked 2026-09-22); the Chapter 2 citation now points at the PMC mirror actually read, PMC12033976 (200).
- **F1-score reconciled by extending the plan (2026-09-22).** Chapter 1's Specific Objective 4 promised F1 while spec §4.1/§7.3 and §2.4 omitted it. Resolution: the evaluation plan was extended rather than the Chapter 1 promise withdrawn. Spec §4.1, §7.3, and the `evaluate.py` layout line now include F1 alongside accuracy, ROC AUC, confusion matrix, and per-class precision/recall; `CHAPTER2.md` gains one defining sentence in §2.1.7 and an F1 score row in §2.4, both grounded in rrl-15 (Hicks et al., 2022, level F). Consequence: the implementation must now compute and report F1, and Chapter 3 must mention it.
- **Youden index retained**, contrary to the reviewer's conditional instruction: spec §13 D3 selects τ on the validation set by maximizing Youden's J subject to sensitivity ≥ 0.95. The new operational row **Screening threshold (τ)** records that use.
- **Foundational exceptions: none used.** fx-01 (Zhou et al., 2016) was **not cleared**, so no pre-window source entered prose; class activation mapping is defined from rrl-08 (in-window). fx-02 (Selvaraju et al., 2017) is likewise unused — §2.1.6 refers to "gradient-weighted variants" without naming the method's origin.
- **CAM naming resolved: Chapter 1 aligned to gradient-free CAM (2026-09-22).** Chapter 1's five Score-CAM mentions were replaced: Background "class activation mapping (CAM)-based visualization"; General Objective "CAM visual explanation"; Specific Objective 3 "class activation mapping (CAM) visual explanation, computed from the model's classification-head weights"; Significance "CAM heatmaps"; Scope "CAM heatmaps". Grounds: spec D1 and §8.3 fix the heatmap as classical gradient-free CAM computed from the exported `head_w`/`features` at one forward pass per image, with Score-CAM (≤ 128 masked passes) only the documented fallback for a hypothetical non-GAP head, and §7.4 asserts against such a head shipping. No citation was added in Chapter 1 — the technique is stated as the study's own design choice — so **fx-01 (Zhou et al., 2016) remains uncleared and unused**, as do the pre-window XAI origins.

### Link liveness re-check (2026-09-22)

All 24 distinct URLs cited in `CHAPTER2.md` were followed: **23 returned HTTP 200**, and the one exception was the Cureus landing page (403 bot block, not a dead or wrong-work link), which was replaced by its PMC mirror. Every citation link resolves to the work cited.

### Chapter 2 status after this pass

- §2.1 Related Literature — 11 subsections; three new themes added per the reviewer (evaluation metrics, dataset partitioning and evaluation validity, computer-aided screening and clinical decision support); explainability rewritten class-activation-mapping-first; detection/classification/segmentation distinction added as §2.1.2
- §2.2 Related System — 6 subsections; two additional systems verified (Ahmmed web platform; registry entries Anand and Irmak as model-centric systems), giving **nine** systems compared; Table 2-1 drafted (caption and List of Tables remain the user's)
- §2.3 Concept of the Study — "user context" clarified as intended user and setting: a design constraint, not a model input
- §2.4 Definition of Terms — scope statement added; F1 score defined (plan extended; Ch. 1 Specific Objective 4 retained); screening threshold (τ) added; Youden index retained with its use recorded
- **Figure 2-1 label corrected (2026-09-22).** The input box's third element now reads "Intended user and setting" in `figures/figure-2-1-conceptual-framework.svg` and its generated inline `figures/preview.html` (visible label and the accessibility `<desc>` in both), matching §2.3.1's clarification and the Figure 2-1 caption instruction in §2.3.4. The diagram itself remains the user's to place in the thesis.
- Remaining user-side work: Table 2-1 caption and List of Tables, and the final APA reference list (Zotero — which must not reintroduce the Aksoy-CAM error)

---

## Chapter 3 verification pass (2026-09-22) — methodology

### [rrl-29] Dyers et al., 2025
- Design science research in quality improvement: Embedding rigour in digital health innovation · African Journal of Primary Health Care & Family Medicine 17(2):5194, doi 10.4102/phcfm.v17i2.5194 · Tier A (peer-reviewed, PMC-indexed) · 2025 in-window
- https://pmc.ncbi.nlm.nih.gov/articles/PMC13150388/ (read 2026-09-22 — abstract, "Understanding design science research", "Design science research process framework") · Access **F**
- Supports: design science research (DSR) is a problem-solving paradigm that creates artefacts embodying prescriptive knowledge, as distinct from describing what exists; its core principles are problem-orientation, artefact-centredness, dual contribution (practical solution + transferable design knowledge), evaluation-driven validation, and iterative refinement through build–evaluate cycles; five artefact types — constructs, models, methods, instantiations, design theories — of which an **instantiation is the actual functioning system** (a prototype application is given as the example); Peffers et al.'s six-phase methodology (problem identification, solution objectives, design and development, demonstration, evaluation, communication), presented as iterative cycles rather than a linear sequence; evaluation is guided by formative vs. summative and artificial vs. naturalistic dimensions; DSR "doesn't just ask 'Does it work?' but also 'What can others learn from how we built it?'"
- Does NOT support: anything about brain MRI, CNNs, screening thresholds, or software quality metrics; nor the claim that any software project is DSR · Caveats: written for healthcare quality-improvement contexts (Tier A but a health-systems venue, not a software-engineering one); describes a research paradigm, not an evaluation protocol for model accuracy
- Used in: Ch. 3 §3.2.1 (developmental research design grounded in DSR), §3.2.2 (iterative build–evaluate process model), §3.2.4 (summative/artificial framing of the evaluation) — **2026-09-22**

### [ds-01] Hamada, 2020 — Br35H dataset record
- "Br35H :: Brain Tumor Detection 2020" · Kaggle dataset record (`ahmedhamada0/brain-tumor-detection`), creator Ahmed Hamada · **Tier C** (dataset record — dataset claims only) · version last updated 2021-11-14 (dated artifact, no recency exception needed)
- Content read via the record endpoint https://www.kaggle.com/api/v1/datasets/view/ahmedhamada0/brain-tumor-detection (read 2026-09-22, HTTP 200, JSON — description verbatim). Canonical page for citation: https://www.kaggle.com/datasets/ahmedhamada0/brain-tumor-detection (re-checked 2026-09-22, HTTP 200, correct title; the page itself renders only its title to automated retrieval because the body is JavaScript-rendered — **page unavailable**, not source unavailable) · Access **F**
- Supports: dataset identity and owner; the archive holds **three folders (yes, no, pred) containing 3,060 brain MRI images**, of which the `yes` folder holds **1,500 tumorous** and the `no` folder **1,500 non-tumorous** images; the licence string carried by the record is **"Data files © Original Authors"**; reported file total 91,765,588 bytes
- Does NOT support: any clinical, epidemiological, or model-performance claim. The record's own description repeats CNS-tumour statistics (85–90% of primary CNS tumours, ~11,700 diagnoses/year, ~34% five-year survival) that are **unusable** — the publishing bodies (CBTRUS/ACS/SEER) are the Tier E sources, and Ch. 1 already carries survival from CBTRUS, 2025 · Caveats: Tier C; the description is uploader-written
- **Correction to `neuroscan-spec.md` §7.1 and Risk 9 (recorded 2026-09-22):** the spec asserts both datasets are "CC BY 4.0". The Br35H record's own licence string is "Data files © Original Authors" — attribution still required, but the licence claim must be corrected. The 3,000 labelled images (1,500/1,500) match the spec; the extra 3,060 total comes from the third (`pred`) folder.
- Used in: Ch. 3 §3.1.3 and Table 3-3 — **2026-09-22**, cited in prose as `(Hamada, 2020)` (creator per the record; the record's last update, 2021-11-14, is stated in the text). Zotero should carry the dataset under the creator with the same URL.

### [ds-02] Nickparvar, 2026 — Brain Tumor MRI Dataset record
- "Brain Tumor MRI Dataset" · Kaggle dataset record (`masoudnickparvar/brain-tumor-mri-dataset`), creator Masoud Nickparvar · **Tier C** · **version 2**, last updated 2026-02-13 (current; dated)
- Content read via https://www.kaggle.com/api/v1/datasets/view/masoudnickparvar/brain-tumor-mri-dataset (read 2026-09-22, HTTP 200, JSON — description verbatim). Canonical page: https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset (re-checked 2026-09-22, HTTP 200) · Access **F**
- Supports: four classes (glioma, meningioma, pituitary tumour, no tumour); **version 2 contains 7,200 human brain MRI images with balanced classes — 1,400 training and 400 testing per class**; version 2 removed duplicate images, balanced the classes, and eliminated overlap between its training and testing sets "to prevent data leakage"; **"Images in the no tumor class were sourced from the Br35H dataset"**; the set is a curated combination of the figshare brain MRI dataset, the SARTAJ dataset, and Br35H, with glioma images from SARTAJ replaced by figshare images during preparation because of label inconsistencies; licence "Attribution 4.0 International (CC BY 4.0)"; image sizes vary and preprocessing (resizing, normalisation, margin removal) is recommended by the uploader
- Does NOT support: any clinical or model-performance claim · Caveats: Tier C; uploader-written record
- **Version divergence (recorded 2026-09-22):** the record now describes **v2 — 7,200 images, 1,400/400 per class**. `neuroscan-spec.md` §7.1 and rrl-05 (Kantu et al., 2025) both describe the earlier **7,023-image** version (Kantu's per-class counts 1,621/1,645/2,000/1,757 sum to 7,023, split 4,522/1,186/1,311). Per the skill, both must be cited with the divergence stated, and the study's own processed counts must come from `data/processed/manifest.json`, not from either figure.
- Cross-source overlap **confirmed by the record itself** (the `no tumor` class is drawn from Br35H) — this is precisely the premise of the mandatory content-hash dedupe before splitting in spec §13 D5
- Used in: Ch. 3 §3.1.3 and Table 3-3 — **2026-09-22**, cited in prose as `(Nickparvar, 2026)` (creator and version-2 date per the record)

### Chapter 3 rewrite (2026-10-25) — guide numbering

`CHAPTER3.md` was rewritten to the chapter guide's nine-section format, replacing the materials/methods structure of the 2026-09-22 draft (retained as `CHAPTER3_Legacy.md`). No new sources were verified for this pass; every citation reuses a registry entry already at level **F**.

- **Section map (Chapter 4 must cite these numbers):** 3.1 Research Design (3.1.1 design and justification, 3.1.2 why CNN-based image processing, 3.1.3 system flow and objective traceability) · 3.2 System Architecture / Framework (3.2.1 environments, 3.2.2 modules, 3.2.3 model–application interface, 3.2.4 screening sequence, 3.2.5 boundary conditions) · 3.3 Data Description (3.3.1 sources, 3.3.2 composition and labeling, 3.3.3 label provenance, 3.3.4 ethics) · 3.4 Data Preprocessing Techniques (3.4.1 duplicate removal, 3.4.2 partitioning, 3.4.3 image preprocessing, 3.4.4 augmentation and class imbalance) · 3.5 CNN Architecture (3.5.1 backbone, 3.5.2 layer configuration, 3.5.3 activations/pooling/regularization, 3.5.4 head and heatmap compatibility, 3.5.5 diagram) · 3.6 Model Training and Validation · 3.7 Evaluation Metrics (3.7.1 metrics, 3.7.2 threshold, 3.7.3 discrimination and reporting, 3.7.4 acceptance, 3.7.5 functional suitability, 3.7.6 heatmap inspection, 3.7.7 limits) · 3.8 System Implementation · 3.9 Tools, Libraries, and Technologies Used.
- **Tables 3-1 to 3-10:** objectives/traceability matrix, ONNX output contract, dataset records, per-partition preprocessing, layer configuration, training configuration, hardware profiles, metric formulas, functional-suitability test cases (TC-01–TC-11), tool table.
- **Figures 3-1 to 3-4 and their files:** 3-1 process model (`figure-3-1-process-model.svg`); 3-2 system architecture (`figure-3-2-architecture.svg`); 3-3 screening flowchart (`figure-3-3-screening-flowchart.svg`); 3-4 CNN block diagram (`figure-3-4-cnn-architecture.svg`, drawn 2026-10-25 — ResNet-18 stem, four residual stages with output sizes, pooling/dropout/linear head, and the two tensors exported for the heatmap). The two referenced SVGs were renamed on 2026-10-25 so that file numbers match figure numbers, and the legacy use-case, context-diagram, and DFD figures were moved to `figures/unused/`; `build-preview.sh` and `preview.html` were regenerated (5 figures) and `check-layout.py` reports 0 issues. One label in the architecture figure was corrected from "Colab GPU" to "local GPU + Colab" to match §3.6.2.
- **Protocol values are stated as configured, not as measured:** ResNet-18 (ImageNet-1k), 224 × 224 input, AdamW at 1 × 10⁻⁴ with cosine annealing, 15 epochs with patience 3, class-weighted cross-entropy with balanced sampling, 70:15:15 stratified split at seed 42, batch 32 (cloud GPU) / 16 (local 4 GB GPU), ONNX opset 17. These come from the approved specification, not from a completed run; they must be reconciled with the actual `run-config.json` before the chapter is submitted, and no result figure appears in Chapter 3.
- **Per-source reporting retained** (§3.7.3): every measure reported overall and separately for Br35H and the Brain Tumor MRI dataset, matching Chapter 2 §2.1.7.
- **Chapter 1 data scope — aligned 2026-10-25.** Specific Objective 1 and the Scope section of `CHAPTER1.md` now name both sources (Br35H and the Brain Tumor MRI dataset, merged into one binary working set after exact duplicates are removed), matching Chapter 3 §3.3 and spec decision D5. No citation was added in Chapter 1: the data scope is the study's own statement, and the dataset records remain cited where the data are described (ds-01, ds-02, Ch. 3 §3.3.1).

### Chapter 3 open items
- **Drafted 2026-09-22.** `CHAPTER3.md` written in full: §3.1.1 software (Table 3-1), §3.1.2 hardware (Table 3-2), §3.1.3 data (Table 3-3), §3.2.1 research design, §3.2.2 process model (Figure 3-1), §3.2.3 procedures — use case diagram (Figure 3-2), DFD levels zero and one (Figures 3-3, 3-4), system architecture (Figure 3-5), screening flowchart (Figure 3-6), export interface (Table 3-4), preprocessing parity, persistence schema (Table 3-5) — and §3.2.4 evaluation. Framing approved by the user: developmental wording, DSR grounding.
- **Diagrams drawn 2026-09-22.** All six Chapter 3 figures now exist as SVG in `figures/` (`figure-3-1-process-model.svg` through `figure-3-6-screening-flowchart.svg`), drawn in the same visual language as Figure 2-1, and each chapter caption records its diagram file. `figures/build-preview.sh` was generalized to inline all seven figures into `figures/preview.html` (54 KB, regenerated); all seven parse as well-formed XML and no element id collides across the inlined set, so the single-file preview stays valid. The user still places the diagrams into the thesis and formats the captions and the List of Figures.
- **Processed dataset counts are not asserted.** §3.1.3 takes them from `data/processed/manifest.json` at run time instead of quoting either the record's version-2 figure (7,200) or the literature's version-1 figure (7,023).
- **Spec §7.1 / Risk 9 licence error** (Br35H is not CC BY 4.0) — correct the spec and the About-panel/README attribution text before it is published.
- **`functional suitability`** — used as the study's own operational term (Ch. 1 Specific Objective 5, §2.4). ISO/IEC 25010 is not in the allowed tiers and was not accessed, so the term is **not** attributed to that standard.
- **No database schema phase** — NeuroScan persists screening history to `history.json`, not to a database, so §3.2.3.6 documents the history record schema in place of a database schema.
- **Figure legibility review (2026-09-22).** Added `figures/check-layout.py`, a layout linter that measures every `<text>` node with the real Segoe UI metrics and reports container overflow, viewBox overflow, text-to-text collisions, text-to-filled-shape collisions, and connector lines running through a label. **Validated against seeded faults** (5/5 caught, and a control label clear of the lines correctly not flagged). All seven figures now report **0 issues**; the tightest non-patch margins are 14&#8211;21 px. Four defects were found and fixed: in Figure 3-4 the label *verdict + probability* overlapped process 7.0 and *input tensor* sat on the P4&#8594;P6 connector, and three note lines in Figures 3-3 and 3-4 ran to the edge of (or past) their boxes. Also eased crowding in Figure 3-2 (flatter use-case ellipses, darker association lines). Its one open item &#8212; type too small to read in print &#8212; was closed in the print-scale pass below.
- **Print-legible type scale (2026-09-22).** Every figure was re-laid-out so that type is legible at the size it will actually be placed. The canvas stays 1160 units wide, so print size is set by type-units per canvas-unit: all seven figures now declare **21&#8211;26 units**, where the old scale declared 9.5&#8211;13. At a 6.3 in placement that is **8.2&#8211;10.2 pt** (at 5.5 in, 7.2&#8211;9.0 pt); the previous scale rendered at 3.7&#8211;5.3 pt. Slower fixes than re-labelling were needed, because the larger type does not fit the old box sizes, so each figure was rebuilt with shorter labels and, where required, a new arrangement:
  - **Figure 2-1** was restructured from three side-by-side columns into stacked **INPUT / PROCESS / OUTPUT bands** inside the same dashed boundary, with the single exit arrow now running down from the output band across the boundary to clinician review. The caption's description (input, process, output components plus one arrow crossing the boundary) still holds, and the accessibility `<desc>` was rewritten to match the new arrangement.
  - **Figures 3-1 to 3-6** keep their arrangements and carry trimmed wording (for example in Figure 3-6 the branch box now reads *|p &#8722; &#964;| &#8804; 0.05 &#8594; manual review* on its own line, and Figure 3-5's run-time band title was shortened so its label mask no longer reaches the *read at startup* label).
  - The final legibility test: `python figures/check-layout.py` reports **0 issues across all seven figures**, and a separate audit of every declared font size reports the smallest type anywhere as **8.2 pt at 6.3 in** (7.2 pt at 5.5 in). `figures/check-layout.py` now reads each figure's own `<style>` block for font sizes instead of assuming one scale, so it measures whatever a file actually declares. Three defects surfaced in that pass and were fixed: the Figure 3-2 boundary label overran its mask rect, the Figure 3-4 *path* label sat on the images return connector, and the Figure 3-5 *read at startup* label overlapped the run-time band label mask.
  - `figures/preview.html` regenerated (7 figures, 53 KB); all seven parse as well-formed XML, every text class is declared, and no element id collides across the inlined set.
- **Chapter 3 link liveness (2026-09-22):** the four links new to this pass were followed and returned HTTP 200 with the correct work (PMC13150388, the two Kaggle dataset pages, onnxruntime.ai/docs) and the two Kaggle record endpoints returned 200 JSON; every reused entry in this chapter was part of the Ch. 2 re-check of 2026-09-22 (23 of 24 URLs HTTP 200, the exception being the Cureus landing page already replaced by its PMC mirror).
