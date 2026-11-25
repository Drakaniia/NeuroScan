# 3 METHODOLOGY

This chapter describes how NeuroScan was designed, built, and evaluated. It states what was developed, how it was developed, and how it was measured, and it is organized so that each specific objective stated in Chapter 1 has a method in this chapter and a corresponding result in Chapter 4. Section 3.1 states the research design and the overall flow of the system; §3.2 presents the architecture and the modules that compose it; §3.3 describes the data; §3.4 documents the preprocessing techniques; §3.5 specifies the convolutional neural network; §3.6 covers training and validation; §3.7 defines the evaluation metrics and the acceptance conditions; §3.8 describes how the system was implemented and delivered; and §3.9 consolidates the tools, libraries, and technologies used.

## 3.1 Research Design

### 3.1.1 Research design and its justification

This study employs a developmental–evaluative design with an experimental component. It is developmental because its principal output is a working artifact — the NeuroScan screening application — rather than a description of a phenomenon that already exists, and it is evaluative because the artifact is assessed against stated criteria once it has been built. The model component is experimental in the narrower sense that a trained classifier is measured on data withheld from its development, so that the reported performance is an observed result under a controlled protocol rather than an estimate.

The structure of the work follows design science research, a problem-solving paradigm in which knowledge is created by designing and building artifacts that embody prescriptive knowledge about a class of problems ([Dyers et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13150388/)). Two of that paradigm's commitments shape this chapter: that an instantiation — the functioning system itself, as opposed to a model or a method — is a legitimate object of evaluation, and that the paradigm asks not only whether an artifact works but what others can learn from how it was built ([Dyers et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13150388/)). The first is why the application is evaluated alongside the network it runs; the second is why the preprocessing constants, the model–application interface, and the partitioning rules are documented here as reusable specifications rather than left implicit in the source code.

The study also inherits a problem orientation from Chapter 2 rather than choosing its subject freely. The reviewed literature reports that explanation quality, clinician trust, and usability in real settings remain largely unevaluated ([Abbas et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12427955/)), that few CNN-based brain tumor classification studies have focused on clinical usability at all ([Xie et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9406354/)), and that among the systems reviewed only two deliver their output through a user-facing platform, both of them web services ([Aksoy et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12388561/)). NeuroScan therefore addresses a question the model-centric literature leaves open — how a trained classifier is delivered to the person who would use it — under the further constraint that the images should not leave the machine on which they are stored.

The evaluation stance is stated here because it bounds what the results can mean. Design science research distinguishes formative from summative evaluation, and evaluation conducted in artificial settings from evaluation conducted in naturalistic ones ([Dyers et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13150388/)). Both evaluations carried out in this study are summative and artificial: the network is measured once on a held-out partition of public benchmark data, and the prototype is assessed against documented test cases rather than in a clinical setting. The study therefore establishes whether the artifact meets its stated objectives. It does not establish clinical validity, and no claim of diagnostic accuracy in practice is made.

### 3.1.2 Why CNN-based image processing is appropriate

The task is a two-class decision on a single image, and a convolutional neural network is appropriate for it on three grounds. Such networks learn discriminative features directly from image data rather than from hand-crafted descriptors ([Vamsidhar et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12216004/)), which removes the need to specify in advance which image properties distinguish a tumor-bearing scan from a normal one. The approach has been applied to brain tumor classification from MRI across the reviewed literature, with reported accuracies ranging from 91.63% to 100% for the meningioma, glioma, and pituitary task in a review of 83 studies ([Xie et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9406354/)). And transfer learning allows a pre-trained network to be adapted to this task, which can provide better accuracy even when the number of available training samples is small ([Rasa et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11459499/)) — a relevant property because the study relies on public datasets rather than on a hospital archive.

The scope of the task is a deliberate narrowing rather than a limitation of the method. Detection localizes a lesion, segmentation delineates its extent, and classification assigns a label, and the review literature treats these tasks separately rather than as one problem ([Missaoui et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12074157/)). NeuroScan performs classification only: one two-dimensional slice receives one label, tumor present or no tumor, together with a confidence value and an activation heatmap. That choice is the study's own, and it is the reason the evaluation in §3.7 measures classification performance rather than localization or overlap.

### 3.1.3 System flow and objective traceability

The system follows the sequence of image acquisition, preprocessing, feature extraction by the network, classification, explanation, and output to the user. An image is acquired from a file or enumerated from a folder; it is decoded, resized, and normalized to the input convention of the network; the network extracts features and produces class scores in a single forward pass; the scores are converted to a probability and compared with a stored threshold to yield a verdict; a class activation map is computed from the same forward pass and rendered over the source image; and the result is displayed, stored locally, and optionally exported. Evaluation sits outside that runtime sequence: it is performed at development time, on data the network has not seen.

Development proceeded through seven milestone phases with exit criteria, presented as Figure 3-1: repository bootstrap, data preparation, training and export, application scaffold and inference, heatmap, batch and history and export, and packaging. The phases track progress rather than delimiting staged deliveries, since the objective is the complete usable application; iteration between them is what the build–evaluate cycle of design science research describes ([Dyers et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13150388/)).

**Figure 3-1.** *The milestone-based process model followed in the study.* [Insert the diagram here. A single figure is required, showing the seven phases in sequence — repository bootstrap, data preparation, training and export, application scaffold and inference, heatmap, batch/history/export, and packaging — with each phase's exit criterion shown beneath it and return arrows from the verification activities of each phase to the phase they feed, so that the iterative rather than linear character of the process is visible.] *(Diagram file: `figures/figure-3-1-process-model.svg`.)*

Table 3-1 maps each specific objective from Chapter 1 to the sections of this chapter that address it and to the results it produces. The results column names the content that Chapter 4 reports rather than a section number, so that the two chapters remain aligned when Chapter 4 is finalized.

**Table 3-1.** Specific objectives mapped to methods in this chapter and to the results reported in Chapter 4.

| Specific objective (Chapter 1) | Method in this chapter | Results reported in Chapter 4 |
|---|---|---|
| 1. Design and train a CNN for binary classification of 2D brain MRI images | §§3.3, 3.4, 3.5, 3.6 | Composition of the processed dataset; training and validation learning curves |
| 2. Integrate the trained model into a Windows desktop application supporting single-image and batch-folder screening with live progress | §§3.2, 3.6.4, 3.8.1–3.8.3, 3.8.6 | Implementation of the screening workflow; functional suitability test results |
| 3. Integrate a CAM visual explanation computed from the classification-head weights | §§3.2.3, 3.5.4, 3.8.4 | Explainability results: heatmap overlays and their qualitative inspection |
| 4. Evaluate the model on a held-out test set and report accuracy, precision, recall, specificity, F1, ROC-AUC, and the confusion matrix | §§3.7.1–3.7.4 | Test-set performance, confusion matrix, ROC curve, and per-source results |
| 5. Assess the functional suitability of the prototype through test cases | §§3.7.5, 3.7.6 | Test-case outcomes for loading, screening, heatmaps, history, and export |

## 3.2 System Architecture / Framework

### 3.2.1 Development-time and run-time environments

The architecture separates the work performed before deployment from the work performed when the application runs, and the boundary between the two is a single exported model file. The development-time environment is a Python pipeline that downloads and verifies the dataset archives, removes duplicates, partitions the data, trains and evaluates the network, and exports the trained model. The run-time environment is the Tauri desktop application, which hosts a React and TypeScript interface inside the Windows WebView2 control and a Rust backend that performs every image operation and every inference.

The two environments meet at an exported ONNX model, which is an open format for representing machine learning models that defines a common set of operators and a common file format, so that a model can be used across a variety of frameworks, tools, runtimes, and compilers ([ONNX, n.d.](https://onnx.ai/)). The export exists so that the application does not require a Python installation on the machine of an end user: training and evaluation happen in Python, and inference happens in the native application through ONNX Runtime ([ONNX Runtime, n.d.](https://onnxruntime.ai/docs/)). The model and its configuration record are bundled inside the installer as application resources and are located through the shell's resource resolver rather than by a current-directory lookup.

One design decision is worth stating explicitly. The application maintains a single runtime inference path, and the Python implementation is treated as a training and validation surface rather than as an alternative runtime. This avoids the failure mode in which two implementations of the same preprocessing drift apart and produce different predictions for the same image.

**Figure 3-2.** *System architecture of NeuroScan.* [Insert the diagram here. A single figure is required, showing the development-time Python pipeline (download and verify, deduplicate and split, train and evaluate, export) above the exported ONNX model and configuration record as the interface, and the run-time Tauri application below it with the React frontend, the Rust command layer, and the inference core alongside the history store, with an explicit indication that no network connection exists at run time.] *(Diagram file: `figures/figure-3-2-architecture.svg`.)*

### 3.2.2 Modules of the system

The runtime architecture is composed of seven modules.

1. **Image acquisition.** Resolves a single selected file or enumerates a folder recursively, filtering by supported extension and skipping hidden and system directories.
2. **Validation and loading.** Decodes each image under the documented rules of §3.4.3 and returns a per-file error rather than aborting when a file cannot be read.
3. **Preprocessing.** Converts the decoded image to the fixed input convention: 224 × 224 pixels, three channels, unit range, and normalization by the statistics of the pre-trained backbone.
4. **Feature extraction.** Executes one forward pass of the network and returns the class scores together with the final convolutional feature map and the classification-head weights.
5. **Classification and decision.** Converts the scores to a probability, compares it with the screening threshold stored in the configuration record, and assigns the verdict.
6. **Explanation.** Computes the class activation map from the feature map and head weights of the same forward pass and composites it over the source image.
7. **Recording and export.** Appends the result to the local screening history and, on request, writes a CSV summary and heatmap-annotated image copies.

A separate evaluation harness runs at development time rather than in the application. It reads the held-out partition, applies the same preprocessing, and computes the measures defined in §3.7 from the confusion matrix, so that the figures reported in Chapter 4 are produced by one documented implementation.

### 3.2.3 Model–application interface

The exported model exposes four outputs in a single forward pass, and this interface is what allows the application to explain a prediction without a second computation. The first output carries the class scores, from which the verdict and the probability are derived. The second carries the final convolutional feature map before global pooling, which the heatmap requires. The third carries the classification head's weight matrix, emitted at export time, and the fourth carries the head's bias, exported for completeness and for the parity checks described in §3.6.4. Table 3-2 lists the outputs and their roles.

**Table 3-2.** Outputs of the exported model, produced in a single forward pass.

| Output | Shape | Purpose |
|---|---|---|
| Class scores (logits) | 1 × 2 | Verdict and class probability after the softmax conversion in the application |
| Feature map | 1 × 512 × 7 × 7 | Final convolutional features before global pooling, used for the heatmap |
| Head weights | 2 × 512 | Classification-head weight matrix; row *c* is class *c*'s heatmap weight vector |
| Head bias | 2 | Classification-head bias, used for parity checks |

The export is not a neutral conversion, and two rules protect the interface. The model is exported with a fixed input shape, a documented operator-set version, and folded batch-normalization layers, so that the graph the application executes is the graph that was evaluated. And the export step asserts that the classification head is a global average pooling layer followed by a linear layer with no convolution after pooling; if the head does not satisfy that condition, the export fails rather than producing a model whose weights cannot serve as heatmap weights. The runtime documentation places responsibility for validating the accuracy, performance, and suitability of a deployed model on the model's developer ([ONNX Runtime, n.d.](https://onnxruntime.ai/docs/)), which is why the parity procedure in §3.6.4 is treated as part of the method rather than as an optional development aid.

### 3.2.4 Screening sequence and decision rule

Screening an image follows a fixed sequence, presented as Figure 3-3. The image is decoded and converted to the input convention; one forward pass yields the class scores, the feature map, and the head weights; the scores are converted to a probability by the softmax function; and that probability is compared with the screening threshold. A probability at or above the threshold yields a tumor verdict and one below it yields a no-tumor verdict.

**Figure 3-3.** *Flowchart of the single-image screening process.* [Insert the diagram here. A single figure is required, showing decode, resize to 224 × 224, normalization, tensor construction, a single forward pass, the softmax probability, the threshold comparison with its three outcomes (tumor, low confidence, no tumor), the heatmap computation from the same forward pass, the overlay rendering, and the error branches for a failed decode and for a uniform heatmap.] *(Diagram file: `figures/figure-3-3-screening-flowchart.svg`.)*

Two refinements of that rule are deliberate. First, a probability that falls within a narrow band of ±0.05 either side of the threshold is not presented as a decision: the result is labelled low confidence and referred for manual review, so that a borderline image is never shown as decisive. Second, two error paths are defined rather than left to the implementation. A file that cannot be decoded produces a per-file error entry and the batch continues, so that one unreadable file cannot abort a scan of a folder; and a heatmap whose values are uniform, which can occur with a degenerate input, is not normalized but skipped, so that the source image is displayed uncolored rather than the computation failing.

The explanation shown alongside the verdict is a class activation map, the visualization technique that generates a heatmap highlighting the regions of an input image that contribute most to a specific class prediction ([Nazir et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11497403/)). In this study the map is computed from the exported head weights rather than by backpropagation, because inference through the runtime provides no gradients; §3.5.4 states the mechanism. The role the output is designed to play determines the operating point: a model used in image interpretation acts as a concurrent aid, a second reader, or a pre-screening filter, and in each case the clinician remains the decision-maker ([Chen et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11608314/)). NeuroScan is built as the pre-screening kind, which is why the threshold is selected with a sensitivity constraint in §3.7.2 and why the verdict is accompanied by an explanation rather than presented alone.

### 3.2.5 Boundary conditions

Three boundaries are stated so that the architecture is not read as claiming more than it does. The application contains no network entity at any level: no component uploads an image, queries a service, or checks for updates during screening. It contains no diagnostic function, because its output is a screening label with a confidence value rather than a diagnosis. And clinician review of a result lies outside the system boundary, so no module represents it; the disclaimer states that a qualified clinician makes the final decision.

## 3.3 Data Description

### 3.3.1 Source of data

The study uses two publicly available, labeled collections of two-dimensional brain magnetic resonance images, both obtained from Kaggle in 2026 through the platform's public archive download endpoints without authentication. Each download was checked against a recorded byte size, tested for archive integrity before extraction, and retried once on transient failure. The first collection is Br35H, whose record documents three folders containing 3,060 brain MRI images, of which the `yes` folder holds 1,500 tumorous and the `no` folder 1,500 non-tumorous images, under the license string "Data files © Original Authors" and a last update of 14 November 2021 ([Hamada, 2020](https://www.kaggle.com/datasets/ahmedhamada0/brain-tumor-detection)). The study uses the 1,500 tumorous and 1,500 non-tumorous images as a balanced binary source and does not use the unlabeled `pred` folder.

The second collection is the Brain Tumor MRI dataset, whose record documents four classes — glioma, meningioma, pituitary tumor, and no tumor — and states that version 2 contains 7,200 images with balanced classes, arranged as 1,400 training and 400 testing images per class, having removed duplicate images and eliminated overlap between its training and testing sets to prevent data leakage, under an Attribution 4.0 International (CC BY 4.0) license ([Nickparvar, 2026](https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset)). The same record also states that the no-tumor class was sourced from Br35H, and that the collection is a curated combination of the figshare brain MRI dataset, the SARTAJ dataset, and Br35H in which glioma images from SARTAJ were replaced with images from figshare during preparation because of label inconsistencies ([Nickparvar, 2026](https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset)).

The two sources do not agree with the literature on the size of the second collection. A study that evaluated lightweight architectures on this dataset reports it as comprising 7,023 images, with 1,621 glioma, 1,645 meningioma, 2,000 no-tumor, and 1,757 pituitary images, split into 4,522 training, 1,186 validation, and 1,311 test images ([Kantu et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/)). Those figures describe an earlier version of the same record, which now documents version 2 and its 7,200 images. Both figures are therefore stated here rather than one being preferred, and the number of images the pipeline actually processed is taken from the run's own manifest rather than from either published figure, because it depends on how many exact duplicates the union of the two sources is found to contain. Table 3-3 records the two sources as their own records document them.

**Table 3-3.** Datasets used, as documented by their publishing records.

| Dataset record | Contents as documented | License as documented | Role in the study |
|---|---|---|---|
| Br35H — Brain Tumor Detection 2020 ([Hamada, 2020](https://www.kaggle.com/datasets/ahmedhamada0/brain-tumor-detection)) | Three folders (`yes`, `no`, `pred`) with 3,060 brain MRI images, including 1,500 tumorous and 1,500 non-tumorous images | "Data files © Original Authors"; last updated 14 November 2021 | Primary balanced binary source (1,500 tumor and 1,500 no-tumor images) |
| Brain Tumor MRI Dataset ([Nickparvar, 2026](https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset)) | Four classes (glioma, meningioma, pituitary, no tumor); version 2 documents 7,200 images at 1,400 training and 400 testing per class, with duplicates removed and train–test overlap eliminated; no-tumor class sourced from Br35H | Attribution 4.0 International (CC BY 4.0) | Secondary source: four-class collection collapsed to the binary task, with fine labels retained in the manifest |
| *Note* | A published evaluation of this collection reports the earlier version of 7,023 images ([Kantu et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/)); the divergence is stated in the text above. | | |

### 3.3.2 Composition and labeling

The two collections are merged into a single working set, and the label assigned to each image is binary: an image from the `yes` folder of Br35H or from the glioma, meningioma, or pituitary folders of the second collection is labelled tumor, and an image from the `no` folder or from the no-tumor class is labelled no tumor. The three tumor categories are therefore collapsed into one positive class, which matches the binary screening task stated in Chapter 1 and excludes tumor typing from the study.

Each image's original fine label and contributing source are retained in a manifest, so that the same downloads can be reused if the study is later extended to four-class classification. The allocation of those images to training, validation, and test partitions is described in §3.4.2. The manifest also carries the content hash used for duplicate removal, the surviving binary label, and the partition to which the image was assigned. It is the record of what the pipeline actually processed, and every count reported in Chapter 4 is taken from it rather than from a published figure.

Collapsing the classes produces an uneven set: because the second collection contributes three tumor classes but only one no-tumor class, tumor images outnumber no-tumor images by roughly seven to three in the merged working set. That imbalance is not removed by discarding images. It is handled during training by class-balanced sampling and a class-weighted loss, as described in §3.4.4, and it is disclosed in the reporting of results because accuracy is known to mislead when class proportions differ ([Hicks et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8993826/)).

### 3.3.3 Annotation and label provenance

No image was re-annotated for this study. The labels are the datasets' own annotations as published, and they carry the limitations of that provenance: they represent a single annotation per image, they have not been confirmed by a second reader, and the records do not document the scanners or acquisition protocols behind the images. Two consequences follow. Variation in acquisition across scanners cannot be controlled or measured, and a label error present in the source is inherited by the model and by the results. Both consequences bound what the performance reported in Chapter 4 can mean, and both are restated with the limitations of the evaluation in §3.7.7.

### 3.3.4 Ethical considerations

The study uses no clinical data and no human participants. Both collections are public benchmark datasets of de-identified brain MRI images released for research use, so no ethics review or informed consent procedure was required, and no image in the study is linked to an identifiable person. Attribution is required by both records and is discharged by crediting Ahmed Hamada for Br35H and Masoud Nickparvar for the Brain Tumor MRI dataset, recording each license and URL in the processed manifest, and reproducing the credits in the application's About panel and the project readme.

Privacy is also an architectural consideration rather than only a licensing one. Analysis performed in the cloud requires that patient information cross a network, which raises privacy concerns together with security and regulatory barriers ([Dong et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10099365/)). Because every image in this study is processed on the machine that holds it and no network entity exists at screening time, that class of transfer does not occur, and the same property is what the study offers to a setting in which the images would be patient records rather than benchmark files.

## 3.4 Data Preprocessing Techniques

### 3.4.1 Duplicate removal

Before any split is made, exact duplicates are removed by content hash: the SHA-256 digest of each image's decoded pixels is computed across the union of the two collections, and images sharing a digest are represented once while every contributing source and fine label is recorded against the surviving copy. This step is mandatory rather than precautionary. Because the no-tumor class of the second collection was sourced from Br35H ([Nickparvar, 2026](https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset)), identical images would otherwise appear in both sources, and without deduplication they would fall on both sides of the train–test boundary and inflate the reported accuracy. The measure is also consistent with the finding that earlier work in this area has introduced data leakage through augmented test sets and unstandardized dataset splits ([Kantu et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/)). Near-duplicate analysis, which would catch re-encoded or slightly cropped copies, is outside the scope of this study and is named as a limitation in §3.7.7.

### 3.4.2 Partitioning

The deduplicated set is divided into training, validation, and test partitions in a 70:15:15 ratio, stratified by the binary label and seeded so that the division is reproducible. The test partition is set aside at this point and is used neither for training nor for selecting the decision threshold; the validation partition is used for monitoring training, for early stopping, and for threshold selection. This separation follows the standard division of model development into training, validation, and test phases, in which the final metrics are computed once on a test set that was withheld after training and tuning were complete ([Hicks et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8993826/)).

A hold-out partition was preferred to k-fold cross-validation for two reasons. The merged set provides a test partition large enough to estimate the reported measures with usable precision, and a single fixed partition keeps the test figures comparable across the training iterations described in §3.6, whereas a re-drawn fold structure would change the test data with every run. Cross-validation remains the appropriate strategy where data are scarce, and it is the strategy the reviewed transfer-learning comparison adopted for its smaller datasets ([Rasa et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11459499/)).

Patient-level separation, the usual safeguard when several images come from one person, is not available for these collections, which carry no patient identifiers and consist of individual slices. The study relies instead on content-based duplicate removal before splitting, on validation and test partitions that receive no augmentation, and on reporting test results both overall and per source dataset.

### 3.4.3 Image preprocessing

Every image, whether it is screened in the application or evaluated in the development harness, is converted to the same input convention. The decode step replicates a single-channel image to three channels, drops an alpha channel if present, and applies the EXIF orientation when the file carries one, so that a grayscale MRI and a color copy of the same scan are treated alike. The decoded image is resized to 224 × 224 pixels by bilinear interpolation, scaled to the unit range by division by 255, and normalized channel-wise with the mean and standard deviation of the pre-trained backbone. The result is arranged as a single four-dimensional tensor in channel-first order with 32-bit floating-point values.

The resize target and the normalization statistics are not free parameters: they are the values the backbone was pre-trained with, and they are held in one documented place that both the Python and the Rust implementations read. There is therefore one authority for each constant rather than two, which is the mechanism by which the training and deployment paths are kept in agreement (§3.6.4).

### 3.4.4 Augmentation and class imbalance

Augmentation is applied to the training partition only. The operations are a random resized crop to 224 × 224 with a scale range of 0.8 to 1.0, a horizontal flip with probability 0.5, a rotation of up to 10 degrees, and mild brightness and contrast jitter of 0.1. A horizontal flip changes which side of the image a lesion appears on, and it is used here because the label is invariant under mirroring: the task records whether a tumor is present, not where it is or what type it is. The validation and test partitions are left unmodified, a discipline the reviewed literature adopts specifically to avoid the leakage that augmented test sets introduce ([Kantu et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/)).

Augmentation serves two purposes in this design. It enlarges the effective training set and reduces overfitting, which is the use the reviewed transfer-learning comparison makes of it ([Rasa et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11459499/)), and it is applied together with class-balanced sampling and a class-weighted cross-entropy loss to counter the uneven class distribution described in §3.3.2 — the same remedy the reviewed literature applies to class imbalance ([Khan et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12149374/)). Table 3-4 states which operation applies to which partition.

**Table 3-4.** Preprocessing and augmentation operations by partition.

| Operation | Training | Validation | Test | Purpose |
|---|---|---|---|---|
| Content-hash duplicate removal | Applied before splitting | — | — | Prevents identical images straddling partitions |
| Decode rules (grayscale to RGB, alpha dropped, EXIF applied) | Applied | Applied | Applied | Treats different encodings of the same scan alike |
| Bilinear resize to 224 × 224 | Applied | Applied | Applied | Matches the fixed input of the network |
| Normalization by backbone statistics | Applied | Applied | Applied | Matches the convention of the pre-trained weights |
| Random resized crop (0.8–1.0) | Applied | Not applied | Not applied | Scale invariance; reduces overfitting |
| Horizontal flip (p = 0.5) | Applied | Not applied | Not applied | Mirror invariance of the presence label |
| Rotation (±10°) | Applied | Not applied | Not applied | Orientation tolerance |
| Brightness and contrast jitter (0.1) | Applied | Not applied | Not applied | Acquisition variation |
| Class-balanced sampling | Applied | Not applied | Not applied | Counters the approximately 70:30 class distribution |
| Class-weighted loss | Applied | Not applied | Not applied | Penalizes errors on the minority class |

## 3.5 CNN Architecture

### 3.5.1 Backbone selection

The network is a ResNet-18 convolutional neural network initialized with ImageNet-1k pre-trained weights. Three considerations determined the choice. Fine-tuning a pre-trained backbone is the transfer-learning route the reviewed literature reports as effective when training data are limited ([Rasa et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11459499/)). A residual architecture of this depth is small enough to execute on a processor: deep architectures such as VGG-16, ResNet-50, and InceptionV3 are computationally intensive and less practical where graphics hardware is unavailable ([Kantu et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/)), and the deployment target here is an ordinary Windows machine without a discrete accelerator (§3.6.2). And the architecture's head is a global average pooling layer followed by a linear layer, which is the condition that makes the exported head weights usable as heatmap weights (§3.5.4).

ResNet-18 has approximately 11.2 million parameters with a two-class head and exports to roughly 45 MB in single-precision ONNX, which places the shipped model well inside the size target set for the installer. The network is described here in full so that the exported graph is not opaque: Table 3-5 gives the layer configuration.

### 3.5.2 Layer configuration

**Table 3-5.** Layer configuration of the network.

| Stage | Layer | Configuration | Output |
|---|---|---|---|
| Input | — | 3 × 224 × 224, normalized | 3 × 224 × 224 |
| Stem | Convolution | 7 × 7, 64 filters, stride 2, padding 3 | 64 × 112 × 112 |
| Stem | Batch normalization, ReLU | — | 64 × 112 × 112 |
| Stem | Max pooling | 3 × 3, stride 2, padding 1 | 64 × 56 × 56 |
| Stage 1 | 2 residual blocks | 3 × 3 convolutions, 64 filters, identity shortcuts | 64 × 56 × 56 |
| Stage 2 | 2 residual blocks | 3 × 3 convolutions, 128 filters, first block stride 2 | 128 × 28 × 28 |
| Stage 3 | 2 residual blocks | 3 × 3 convolutions, 256 filters, first block stride 2 | 256 × 14 × 14 |
| Stage 4 | 2 residual blocks | 3 × 3 convolutions, 512 filters, first block stride 2 | 512 × 7 × 7 |
| Pooling | Global average pooling | 7 × 7 to a single value per channel | 512 |
| Regularization | Dropout | Probability 0.3 | 512 |
| Head | Linear | 512 to 2 | 2 |

### 3.5.3 Activations, pooling, and regularization

Every convolution is followed by batch normalization and a rectified linear unit, and each residual block adds its input to its output through a shortcut connection, which is what allows a network of this depth to be trained without degradation. Pooling appears twice: a max pooling layer in the stem reduces the spatial resolution early, and a single global average pooling layer at the end collapses each channel to one value, so that the head receives a 512-dimensional vector rather than a spatial map. The global pooling is also what makes the explanation possible, for the reason given in §3.5.4.

Regularization is distributed across four mechanisms rather than concentrated in one. Dropout with probability 0.3 is applied between the pooled features and the linear head. Weight decay is applied through the optimizer. Early stopping ends training when validation loss stops improving (§3.6.3). And augmentation enlarges the effective training set (§3.4.4). The combination is deliberate: the dataset is moderate in size and unevenly distributed, and a single regularizer would not address both overfitting and the minority-class error rate.

### 3.5.4 Classification head and heatmap compatibility

The head is a global average pooling layer, a dropout layer, and a linear layer that maps 512 features to two class scores. Because there is no convolution after pooling, the row of the weight matrix that corresponds to a class is exactly that class's set of activation weights. For the predicted class *c*, the class activation map is therefore computed as

*M<sub>c</sub>(x, y)* = ReLU( Σ<sub>k</sub> *w<sub>c,k</sub>* · *f<sub>k</sub>(x, y)* )

where *f<sub>k</sub>* is channel *k* of the 7 × 7 feature map and *w<sub>c,k</sub>* is the corresponding head weight. Negative contributions are discarded by the rectifier, the result is resized to 224 × 224, normalized to the full range of intensities, assigned a color map, and composited over the source image. This is the gradient-free form of class activation mapping, the technique that generates a heatmap highlighting the regions of an input image that contribute most to a class prediction ([Nazir et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11497403/)), and it requires no additional forward pass because the weights it needs are already exported (§3.2.3). The export assertion described in §3.2.3 exists so that a head which does not satisfy the pooling-then-linear condition cannot be shipped by mistake.

### 3.5.5 Architecture diagram

**Figure 3-4.** *Block diagram of the convolutional network.* [Insert the diagram here. A single figure is required, showing the input tensor, the stem, the four residual stages with their output sizes, the global average pooling layer, the dropout layer, and the two-class linear head, with the feature map and the head weight matrix marked as the two tensors that leave the network to produce the heatmap.] *(Diagram file: `figures/figure-3-4-cnn-architecture.svg`.)*

## 3.6 Model Training and Validation

### 3.6.1 Training configuration

Training is configured once and recorded, so that a reported result can be traced to the settings that produced it. The optimizer is AdamW with an initial learning rate of 1 × 10<sup>−4</sup>, a weight decay of 1 × 10<sup>−4</sup>, and a cosine annealing schedule over the planned epochs. The loss is a class-weighted cross-entropy whose weights are inversely proportional to the training-split class frequencies, and sampling is class-balanced so that each batch approximates an even split between the two classes. Training runs for at most 15 epochs with early stopping after three consecutive epochs without improvement in validation loss, and the checkpoint with the lowest validation loss is retained rather than the final one. Table 3-6 records the configuration.

**Table 3-6.** Training configuration.

| Parameter | Value | Note |
|---|---|---|
| Backbone | ResNet-18, ImageNet-1k pre-trained | Fine-tuned end to end |
| Input | 224 × 224 × 3, normalized | Backbone statistics (§3.4.3) |
| Output | 2 class scores | `[no_tumor, tumor]` class order |
| Loss | Class-weighted cross-entropy | Weights inversely proportional to training-split frequencies |
| Optimizer | AdamW | Weight decay 1 × 10<sup>−4</sup> |
| Learning rate | 1 × 10<sup>−4</sup>, cosine annealing | Single schedule over the planned epochs |
| Batch size | 32 on the cloud GPU; 16 on the local 4 GB GPU | Reduced locally by video-memory capacity |
| Maximum epochs | 15 | Early stopping with patience 3 on validation loss |
| Retained checkpoint | Lowest validation loss | Not the final epoch |
| Sampling | Class-balanced | Applied to the training loader only |
| Random seed | 42 | Applied to partitioning, sampling, and augmentation |
| Export | ONNX, fixed shape, batch normalization folded | Operator set 17 |

### 3.6.2 Hardware and software environment

Model development and testing were carried out on an Acer Nitro ANV15-41 running Windows, with an AMD Ryzen 5 7535HS processor with Radeon graphics at 3.30 GHz, 16 GB of memory of which 13.8 GB is usable at 4800 MT/s, an NVIDIA GeForce RTX 2050 with 4 GB of video memory alongside the integrated Radeon graphics, and a 477 GB drive with 150 GB free. The RTX 2050 is CUDA-capable, and its 4 GB of video memory caps the batch size at which full fine-tuning can run locally; training was therefore divided between the local GPU and a Google Colab GPU runtime, with the training script detecting the available device automatically and retaining per-epoch checkpoints. The local processor was used for CPU-only smoke runs, for evaluation, and for the parity checks in §3.6.4.

The deployment target is different from the development machine, and the difference is a design input rather than an afterthought. The application is intended for an ordinary Windows desktop or laptop without a discrete graphics processor, which is the hardware profile reported for clinical workstations ([Dong et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10099365/)) and the setting in which lightweight architectures are held to be practical ([Kantu et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC13103188/)). Two constraints follow: the shipped model must run on a processor alone within the latency target of §3.8.6, and peak memory must remain within what an 8 GB machine can sustain. Table 3-7 states both profiles.

**Table 3-7.** Development and deployment hardware.

| Component | Development and test environment | Deployment target |
|---|---|---|
| Processor | AMD Ryzen 5 7535HS with Radeon graphics (3.30 GHz) | Ordinary x86-64 Windows processor |
| Memory | 16 GB (13.8 GB usable) at 4800 MT/s | 8 GB, with peak application memory targeted below approximately 2 GB |
| Graphics | NVIDIA GeForce RTX 2050 (4 GB) plus integrated Radeon graphics | No discrete accelerator assumed; inference on the processor |
| Storage | 477 GB drive, 150 GB free | Installer plus the bundled model (approximately 45 MB) |
| Operating system | Windows | Windows only in this version |
| Training host | Local RTX 2050 and a Google Colab GPU runtime | Not applicable |

### 3.6.3 Validation strategy

The validation partition serves three purposes and the test partition serves one. Validation monitors training epoch by epoch, supplies the loss used for early stopping and checkpoint selection, and supplies the data on which the decision threshold is chosen. The test partition is evaluated once, after training and threshold selection are complete, and the measures reported in Chapter 4 are computed from that single evaluation.

The decision threshold is selected on the validation partition and never on the test partition, by the rule stated in §3.7.2. The selected threshold is written into the model's configuration record and ships with the model, and every stored result retains both the probability and the threshold that produced its verdict, so that a verdict remains re-derivable if the operating point is ever changed.

### 3.6.4 Export and parity verification

Preprocessing is implemented twice — once in Python for training and evaluation, once in Rust for the application — and the two implementations are kept in agreement by two mechanisms rather than by inspection. The constants that define the input convention (target size, channel order, normalization statistics, and class order) are held in one documented place that is mirrored into both codebases. And a parity test compares the tensor produced by the Rust path with the tensor produced for the same image by the Python path under a documented per-element tolerance, and additionally requires the two paths to agree on the verdict and the probability for each sample image.

Exact pixel equality between two independent image resamplers is not claimed. Bilinear resampling is not implemented identically in the two libraries, and the tolerance exists precisely because of that difference; what the test establishes is that the difference is small enough not to change a prediction. Because the runtime documentation assigns responsibility for validating a deployed model to its developer ([ONNX Runtime, n.d.](https://onnxruntime.ai/docs/)), a passing parity test is treated as a condition for shipping rather than as a development convenience.

### 3.6.5 Training procedure

Training proceeds in a fixed order, and the order matters because it is what keeps the test partition clean:

1. Download both archives, verify their byte sizes, and test archive integrity.
2. Merge the collections, compute content hashes, and remove exact duplicates.
3. Collapse the fine labels to the binary task while recording them in the manifest.
4. Partition the deduplicated set into 70:15:15 stratified, seeded splits and seal the test partition.
5. Fine-tune the pre-trained backbone on the training partition, monitoring validation loss for early stopping and checkpoint selection.
6. Select the decision threshold on the validation partition under the sensitivity constraint of §3.6.3.
7. Export the model and its configuration record, and run the parity test of §3.6.4.
8. Evaluate once on the sealed test partition and record the measures defined in §3.7.

## 3.7 Evaluation Metrics

### 3.7.1 Confusion matrix and derived measures

Every reported measure is derived from the four counts produced by a binary classifier: true positives, true negatives, false positives, and false negatives ([Hicks et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8993826/)). Accuracy is the proportion of correctly classified images, precision is the proportion of images labelled tumor that are tumor, recall or sensitivity is the proportion of tumor images correctly identified, and the F1 score is the harmonic mean of precision and recall, which penalizes extreme values of either measure and is not symmetric between the two classes ([Hicks et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8993826/)). Specificity is the negative-class counterpart of recall, the percentage of true negatives among all subjects who do not have the condition ([Shreffler & Huecker, 2023](https://www.ncbi.nlm.nih.gov/books/NBK557491/)). Table 3-8 states the formulas, in which TP, TN, FP, and FN denote true positives, true negatives, false positives, and false negatives.

**Table 3-8.** Measures reported on the held-out test partition.

| Measure | Formula | What it states |
|---|---|---|
| Accuracy | (TP + TN) / (TP + TN + FP + FN) | Proportion of all images classified correctly |
| Precision | TP / (TP + FP) | Proportion of images labelled tumor that are tumor |
| Recall (sensitivity) | TP / (TP + FN) | Proportion of tumor images correctly identified |
| Specificity | TN / (TN + FP) | Proportion of no-tumor images correctly identified |
| F1 score | 2 · (Precision · Recall) / (Precision + Recall) | Harmonic mean of precision and recall |
| Youden index (*J*) | Sensitivity + Specificity − 1 | Criterion maximized when selecting the threshold |

Accuracy is reported alongside the other measures rather than as the sole headline figure, because its value depends on how the classes are distributed and no single measure captures every desirable property; a model can appear accurate on an imbalanced dataset while performing poorly on the class of interest ([Hicks et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8993826/)). That is the case for the collapsed dataset used here, which is why the measures are reported together.

### 3.7.2 Operating threshold

The decision threshold τ is a property of the deployed system, not only of the evaluation. It is selected on the validation partition by maximizing the Youden index subject to a sensitivity of at least 0.95 where that is attainable, and any shortfall against that constraint is recorded rather than concealed by a lower bar. The Youden index is the summary that identifies the cutoff maximizing sensitivity and specificity together ([Çorbacıoğlu & Aksel, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10664195/)), and the sensitivity constraint is the concrete expression of the study's position that a missed tumor is the more costly error for a pre-screening aid ([Chen et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11608314/)).

The threshold is stored in the model's configuration record and applied identically in the application and in the evaluation harness. The application displays it beside the probability of every result and marks it on the probability bar, so that a user can see how far a given image fell from the operating point. A probability within ±0.05 of τ is reported as low confidence rather than as a verdict (§3.2.4).

### 3.7.3 Discrimination and reporting plan

Receiver operating characteristic analysis applies to tests that yield continuous outputs, and the area under the curve summarizes the test's ability to distinguish between classes across all cutoff values, ranging from 0.5 for no better than chance to 1.0 for perfect discrimination; the same guidance requires a confidence interval when an area under the curve is interpreted ([Çorbacıoğlu & Aksel, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10664195/)). Because the model returns a probability rather than a fixed label, the curve and its area are reported alongside the thresholded measures, with a confidence interval reported for the area under the curve.

Every measure is reported twice: once over the whole test partition and once separately for each contributing source. The second breakdown exists because the merged set is dominated by the larger collection, and a strong overall figure could otherwise conceal weak performance on the smaller one. The breakdown follows the per-source reporting discipline set out in Chapter 2, and it serves the same purpose as deduplication: a headline figure should not be able to hide a weak result on either source.

### 3.7.4 Acceptance criteria

The model component is accepted when it reaches at least 95% accuracy on the held-out test partition, with the remaining measures reported alongside it. That bar is a design target fixed before training rather than a figure chosen after seeing a result. If it is not met, the response is to iterate on augmentation and on the training configuration and to report the achieved figures; a change to the bar would be documented and justified rather than applied silently.

The prototype component is accepted when every test case in §3.7.5 passes and the parity check of §3.6.4 is green. Passing a test case means the observed result matched the expected result recorded before the case was run; a failed case is reported as failed, with the observed behavior recorded, rather than removed from the set.

### 3.7.5 Functional suitability

Functional suitability is used in this study in its operational sense: the degree to which the application performs its specified functions correctly under test. It is not attributed to any external quality standard, and it is assessed by test cases rather than by a survey instrument. Each case states its preconditions, the steps taken, the expected result, and the observed result, and each is recorded as passed or failed. Table 3-9 lists the cases.

**Table 3-9.** Functional suitability test cases.

| ID | Function under test | Expected result |
|---|---|---|
| TC-01 | Load a single image in a supported format | Image preview displayed with its file name and dimensions |
| TC-02 | Screen a single image | Verdict, probability, and the applied threshold displayed |
| TC-03 | Screen an image whose probability falls within ±0.05 of the threshold | Result labelled low confidence for manual review, not a clean verdict |
| TC-04 | Screen a folder of images | Progress reported during the scan; every supported file appears in the results grid with its verdict |
| TC-05 | Screen a folder containing an unreadable file | Per-file error row recorded; the remaining files are still screened |
| TC-06 | Display the heatmap for a screened image | Class activation map composited over the source image, with the overlay toggle and opacity control working |
| TC-07 | Reopen a previously screened entry from the history after restarting the application | Entry present with its verdict, probability, and threshold |
| TC-08 | Export the history as a CSV file | File written with one row per entry and the documented columns |
| TC-09 | Export annotated image copies | One original and one heatmap-annotated PNG written per selected entry, with sanitized file names |
| TC-10 | Open a history entry whose source file has been removed | Verdict and probability shown with a source-not-found notice instead of a heatmap |
| TC-11 | Read the disclaimer | Disclaimer visible in every view of the application |

### 3.7.6 Qualitative inspection of the heatmaps

The heatmap is inspected qualitatively on at least ten known-tumor images from the test partition. The check asks whether the highlighted regions correspond to the lesion rather than to background, skull, or non-tumor tissue, and its outcome is recorded together with the images and notes in the project repository. This is deliberately a small, documented inspection rather than a quantitative measure, and it is not a measure of explanation fidelity: the literature that motivates the user-facing design reports that explanation fidelity, clinician trust, and usability in real settings remain largely unevaluated ([Abbas et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12427955/)), and this study does not close that gap. What the inspection can establish is that the map lands on plausible image regions for images whose lesion is known; what it cannot establish is that the map is useful to the person reading it.

### 3.7.7 Scope and limits of the evaluation

The evaluation is internal and artificial, in the sense stated in §3.1.1. The network is trained and tested on public benchmark images partitioned by this study, so no external, multi-centre, prospective, or clinical validation is performed; scanner and protocol variation is uncontrolled because the dataset records do not document it; the labels are the datasets' own and were not confirmed by a second reader; near-duplicates that survive content-hash removal are not detected; and the system's output is a screening label rather than a diagnosis. These limitations are the same ones that apply to the comparable systems reviewed in Chapter 2, and they define the sense in which the figures reported in Chapter 4 should be read: as evidence that the artifact meets its stated objectives on benchmark data, not as evidence of clinical readiness.

## 3.8 System Implementation

### 3.8.1 Development environment and runtime

The application is built with Tauri 2, which pairs a React and TypeScript frontend rendered in the Windows WebView2 control with a Rust backend. The backend performs all image and inference work: the `ort` crate binds ONNX Runtime for inference, the `image` crate decodes and resizes images and composites the heatmap overlay, `ndarray` handles tensor input and output, and `serde` with `serde_json` handles the persisted history and the model's configuration record. The dialog and file-system plugins provide the native folder pickers used to open folders and to choose export destinations. The frontend is scaffolded with Vite, and the application is compiled with the stable Rust toolchain for MSVC.

The decision to run the model inside a desktop application rather than behind a service is architectural, not incidental. Cloud deployment would require patient information to cross a network, with the privacy, security, and regulatory consequences that entails, while bespoke desktop software carries its own cost in administrative and security approval and per-device configuration; the reviewed deployment work describes that cost as significant at scale and notes that simpler two-dimensional classification is more tractable on consumer hardware than the volumetric workload it characterized ([Dong et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10099365/)). NeuroScan accepts the installation and configuration cost in exchange for keeping every image on the machine that already holds it, and it takes the two-dimensional scope as the condition under which that exchange is realistic.

### 3.8.2 Single-image screening

The single-image path accepts a file chosen through the native dialog or supplied by drag and drop. The image is displayed in a preview panel, and screening produces a verdict with its probability, a probability bar marked at the applied threshold, and the class activation map as a toggled overlay whose opacity the user controls. The result is appended to the history automatically, so that a screening performed once is not lost when the view is closed. This path and the batch path share the same inference core, so a manually selected image and the same image encountered inside a folder scan are preprocessed and classified identically.

### 3.8.3 Batch folder screening

The batch path accepts a folder and screens every supported image inside it, recursing into subdirectories so that per-patient folder layouts are handled. Hidden and system directories are skipped, the supported extensions are `.png`, `.jpg`, and `.jpeg`, and a per-file size cap is applied. Progress is reported to the interface through events as each file completes, and results appear in a grid carrying a thumbnail, the file name, the verdict, and the probability; selecting a row opens the detail view with its heatmap. A file that fails to decode produces an error row and does not stop the scan, which is the error path stated in §3.2.4.

Memory is managed as a first-class constraint rather than left to the runtime. Images are decoded one at a time, resized to 224 × 224 immediately, and the full-resolution copy is discarded before the next file is read, so that no batch holds a collection of decoded images in memory. Classification runs on a blocking worker so that the interface remains responsive, and a single-flight guard prevents two heavy runs from overlapping.

### 3.8.4 Heatmap rendering

The heatmap is produced in the backend from the same forward pass that produced the verdict, using the computation stated in §3.5.4. The 7 × 7 map is upsampled to the input resolution through the same bilinear path used in preprocessing, normalized to the full intensity range, assigned a color map, and composited over the source image at the opacity the interface requests. Two guards are implemented with the rendering rather than added afterwards: a uniform map is skipped rather than normalized, and a map whose channel contributions are all non-positive is displayed as an uncolored image rather than as an empty overlay. Because the map costs no additional forward pass, the explanation is available in the single-image view, in the batch grid's detail view, and in exported copies without a separate rendering step.

### 3.8.5 Screening history and export

Screening results are persisted to a single JSON document in the application's data directory, written atomically by writing a temporary file and renaming it, so that a crash during a write can lose at most the entry in flight and cannot corrupt the store. All screening paths append through the same writer, and the store is capped at 500 entries, with the oldest entries evicted first and an explicit clear operation always available. Each entry records the raw probability rather than only the derived verdict, together with the threshold that was applied, the identifier and version of the model that produced it, the source path and file name, and the timestamp.

Heatmap images are not persisted. The detail view recomputes the heatmap on demand, and only when the source file still exists and the entry was produced by the model version currently bundled, so that a heatmap can never be displayed beside a verdict it did not explain; when either condition fails, the entry shows its verdict and probability with a notice instead (TC-10).

Two exports are provided. The CSV summary contains one row per entry with the columns `file_name`, `source_path`, `verdict`, `probability`, `threshold`, `model_id`, `model_version`, and `timestamp`, written in UTF-8 with a byte-order mark so that spreadsheet applications open it correctly, and quoted according to the standard comma-separated conventions because Windows paths contain commas and backslashes. The annotated export writes, for each selected entry, the original image and a copy with the heatmap composited over it, with output file names sanitized for Windows reserved characters while the true source name remains recorded in the CSV and the history. The destination folder is chosen by the user through the native dialog at export time rather than fixed in advance.

### 3.8.6 Packaging and deployment

The application is packaged as a Windows installer, and this version targets Windows only; the code keeps the platform-specific surface small, but no other operating system is built or tested. The model, its configuration record, and the inference runtime library ship as application resources inside the installer and are resolved through the shell's resource resolver at startup, never through a current-directory lookup, which is the failure mode that breaks packaged applications. The model is loaded once at startup and the inference session is reused for every subsequent image.

Three non-functional targets apply to the delivered application. Screening must complete in under approximately one second per image on a processor, including heatmap rendering, because a screening aid that pauses visibly on each file interrupts the workflow it is meant to support. Peak memory must remain below approximately 2 GB, because the deployment target is an 8 GB machine (§3.6.2). And no network access may occur at screening time: the application performs no upload, no telemetry, and no update check, so that its privacy claim is a property of the executable rather than of its documentation.

## 3.9 Tools, Libraries, and Technologies Used

Development proceeded in two environments that meet at the exported model: a Python pipeline in which the network is trained and evaluated, and the Windows application in which it is executed. Table 3-10 consolidates the tools and their roles, and the paragraphs after it record the choices that are not self-evident.

**Table 3-10.** Tools, libraries, and technologies used.

| Category | Tool or library | Version | Purpose in the study |
|---|---|---|---|
| Programming language (model) | Python | 3.14.2 | Model definition, training loop, evaluation, and export |
| Deep learning framework | PyTorch with torchvision | PyTorch 2.12, with torchvision paired to that release (CUDA build on the training host; CPU build locally) | Network construction, fine-tuning, augmentation, and evaluation |
| Environment manager | `uv` | 0.11.13 | Isolated, reproducible Python environment |
| Model interchange | ONNX | Operator set 17 | Portable representation of the trained network; the interface between the pipeline and the application |
| Inference runtime | ONNX Runtime, bound through the Rust `ort` crate | Bundled at build time | Execution of the exported model inside the application |
| Cloud training | Google Colab GPU runtime with a mirrored notebook | — | Full fine-tuning of the pre-trained backbone alongside the local GPU |
| Application shell | Tauri | 2 | Desktop shell, backend commands, and Windows packaging |
| Backend language | Rust (stable, MSVC) | 1.88.0 | Image decoding, inference, heatmap computation, persistence, and export |
| Image and data handling | Rust `image`, `ndarray`, `serde`, `serde_json` | Current crate releases | Decoding and resizing, tensor input and output, heatmap compositing, and history persistence |
| Frontend | React with TypeScript, built by Vite | Node 24.12.0 with npm 11.15.0 | Screening, batch, history, and about views |
| Version control | Git | 2.52.0 | Source control of the pipeline, the application, and the exported configuration record |

The model is trained in Python and deployed into a native application, which is the pattern the runtime's own documentation describes ([ONNX Runtime, n.d.](https://onnxruntime.ai/docs/)). Exporting to ONNX rather than embedding a Python interpreter keeps the installer free of a second runtime and keeps the shipped artifact to a model file plus a native application, and it is possible because the format defines a common set of operators and a common file format rather than a library-specific serialization ([ONNX, n.d.](https://onnx.ai/)).

Python 3.14 was retained because the PyTorch release installed for this study supports it, and the local installation is a CPU build, with the cloud runtime supplying the CUDA build used for full fine-tuning. The frontend toolchain runs on Node 24 with npm, the Rust application builds on the stable MSVC toolchain rather than on the nightly toolchain installed on the same machine, and version control is handled with Git. The application requires none of these tools on the machine where it is installed: once packaged, it needs only Windows and the bundled runtime library.
