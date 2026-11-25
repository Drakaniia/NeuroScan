# Methods
Methods refer to the systematic processes, strategies, and techniques used by the researcher to collect, analyze, and interpret data or to develop and evaluate a system or prototype.
In a Capstone Project, the “methods” describe how the study was conducted — from design, development, testing, to evaluation.

It answers the questions: what, how and why.

---
<!-- Slide 3 -->
# Objectives of the Study
General Objective
To develop a hybrid deepfake detection framework that combines forensic features and deep learning representations to improve robustness, generalization, and interpretability in detecting manipulated media.

---
<!-- Slide 4 -->
# Objectives of the Study
Specific Objectives
To design a hybrid detection architecture that fuses forensic cues (noise residuals, JPEG artifacts, frequency-domain descriptors) with deep learning features (CNNs and Vision Transformers).
To assess the performance of the proposed model across benchmark datasets (FaceForensics++, Celeb-DF v2, DFDC) and evaluate its generalization ability.
To test the robustness of the hybrid model under real-world conditions such as video compression, adversarial perturbations, and unseen manipulation techniques.
To enhance model interpretability through Grad-CAM visualizations and forensic heatmaps, ensuring explainable AI for multimedia forensics.

---
<!-- Slide 5 -->
# Objectives of the Study (Matrix)
| Specific Objectives | Methods | Results & Discussion |
| --- | --- | --- |
| To develop a hybrid detection architecture… | Datasets, Preprocessing, Feature Extraction, Hybrid Model Architecture, Training Protocol and Validation | Preprocessing Results, Feature Extraction Results, Training and Validation Learning Curves |
| To assess the performance of the proposed model across benchmark… | Evaluation Metrics | Performance on Benchmark Datasets |
| To test the robustness of the hybrid model… | Evaluation Metrics | Robustness Tests |
| To enhance model interpretability… | Evaluation Metrics | Explainability Results |

---
<!-- Slide 6 -->
# Parts of Method
MATERIALS
Software
Hardware
Data
METHODS.
Research Design
Process Model
Other Methods
Evaluation

---
<!-- Slide 7 -->
# Type of Research for Capstone
| Research Type | Purpose | Typical Instrument | Output / Focus |
| --- | --- | --- | --- |
| Developmental–Evaluative | To develop and assess a system or prototype | ISO/IEC 25010 survey | Software quality, usability, performance |
| Descriptive (Quantitative) | To describe users’ perceptions or satisfaction levels toward a system | Closed-ended questionnaire (Likert-scale), checklist | Statistical results (mean, SD, frequency) showing levels of quality or satisfaction |
| Experimental | To test cause-and-effect relationships between variables | Controlled tests, performance benchmarks, experimental setup | Measured performance differences, accuracy rates, or improvements |
| Qualitative | To explore experiences, perceptions, or meanings related to system use | Interviews, open-ended survey questions, focus group discussions, observation notes | Themes, patterns, user insights, descriptive narratives explaining why and how users perceive the system |











-
<!-- Slide 8 -->
# Sample Format for Image Processing Using CNN
3.1 Research Design
Describe the overall method (e.g., Experimental, Developmental, or Design and Implementation)
Explain why CNN-based image processing is appropriate for the study
Provide an overview of the system flow or conceptual framework
3.2 System Architecture / Framework
Present the block diagram or flowchart of the system
Include modules such as:
Image Acquisition
Preprocessing
Feature Extraction using CNN
Classification / Detection
Evaluation and Output

---
<!-- Slide 9 -->
# Sample Format for Image Processing Using CNN
3.3 Data Description
Source of Data: Identify where images are obtained (e.g., Kaggle dataset, self-collected images)
Dataset Composition: Number of images per class, image formats, resolution, etc.
Data Annotation / Labeling: Explain how classes are defined or labeled.
Ethical Considerations: Discuss privacy, copyright, or consent (if human or medical data).
3.4 Data Preprocessing Techniques
Image Resizing and Normalization
Noise Removal / Smoothing
Augmentation: rotation, flipping, zooming, color adjustments
Data Splitting: training, validation, and test sets (e.g., 70-20-10)

---
<!-- Slide 10 -->
# Sample Format for Image Processing Using CNN
3.5 Convolutional Neural Network (CNN) Architecture
Describe the CNN model used (custom-built or transfer learning model such as VGG16, ResNet, MobileNet, etc.)
Specify:
Number of layers
Activation functions
Pooling layers
Dropout and regularization techniques
Optimizer (Adam, SGD, etc.)
Include diagram or figure of the CNN architecture
3.6 Model Training and Validation
Training Parameters: epochs, batch size, learning rate, loss function
Hardware Setup: GPU/CPU, RAM, software frameworks (TensorFlow, Keras, PyTorch)
Validation Strategy: k-fold cross-validation or hold-out validation

---
<!-- Slide 11 -->
# Sample Format for Image Processing Using CNN
3.7 Evaluation Metrics
Accuracy
Precision
Recall
F1-score
Confusion Matrix
Mean Average Precision (if detection task)
ROC Curve and AUC (if binary classification)
3.8 System Implementation
Tools and Programming Languages used (e.g., Python, OpenCV, TensorFlow)
Development Environment (e.g., Jupyter Notebook, Google Colab, VS Code)
Deployment method (e.g., Web app, Mobile app, or Standalone GUI)


# Sample Format for AI-Based Systems — e.g., Predictive Models, Intelligent Recommenders, Recognition Systems, NLP, etc.
3.9 Tools, Libraries, and Technologies Used

| Category | Tool / Library | Purpose |
| --- | --- | --- |
| Programming Language | Python | Model building |
| Framework | TensorFlow / PyTorch | AI model development |
| Database | MySQL / MongoDB | Data storage |
| Deployment | Flask / Streamlit / FastAPI | Integration and testing |


