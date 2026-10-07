# Cullet — AI Waste Sorting Assistant

Cullet is a small AI-powered waste classification app built for the **Modern Technologies in Municipal Solid Waste Management** assignment.

The idea is simple: upload a photo of a waste item (or use the camera), and Cullet predicts what material it is. It then maps that material to a disposal category and tells you where it should go.

The model currently recognizes **12 types of waste materials**, which are grouped into four disposal categories:

- **Biodegradable**
- **Recyclable**
- **Hazardous**
- **Non-biodegradable**

The trained model is already included in the repository, so you can run the project without training anything first.

---

## How it works

Cullet uses a **MobileNetV2** model with transfer learning.

The model starts with ImageNet-pretrained MobileNetV2 weights and is then trained on a 12-class waste dataset. After the initial training, the upper layers of the MobileNetV2 backbone are fine-tuned to improve the results.

The dataset contains around **10,600 images**, with the classes balanced for training.

### Materials

The model recognizes:

- Battery
- Biological
- Brown glass
- Cardboard
- Clothes
- Green glass
- Metal
- Paper
- Plastic
- Shoes
- Trash
- White glass

### Material → disposal category

Cullet first identifies the material and then maps it to a disposal category.

| Material | Category |
|---|---|
| Biological | Biodegradable |
| Paper | Biodegradable |
| Cardboard | Biodegradable |
| Metal | Recyclable |
| Plastic | Recyclable |
| Brown / Green / White glass | Recyclable |
| Battery | Hazardous |
| Clothes | Non-biodegradable |
| Shoes | Non-biodegradable |
| Trash | Non-biodegradable |

This two-step approach makes the model more useful than directly predicting only four broad categories. If the disposal rules or categories change later, the mapping can be changed without retraining the model.

---

## Tech stack

**Machine Learning**
- Python
- TensorFlow / Keras
- MobileNetV2
- Transfer learning
- Fine-tuning

**Backend**
- Flask
- Gunicorn

**Frontend**
- HTML
- CSS
- JavaScript

There is no frontend framework or template kit. The interface is built from scratch.

---

## Running the project

Clone the repository and install the dependencies:

```bash
pip install -r requirements.txt
```

Then start the Flask server:

```bash
python app.py
```

Open:

```text
http://localhost:5000
```

The trained model is already included under `model/`, so there is no need to train the model before running the application.

---

## Model

The current model is:

**MobileNetV2 + ImageNet pretrained weights + transfer learning + fine-tuning**

Validation accuracy:

**89.6%**

The model is stored at:

```text
model/cullet.keras
```

The ImageNet backbone weights used during training are also included:

```text
model_mobilenetv2_imagenet_remapped.weights.h5
```

The remapping script is kept in the repository as a reference in case those weights need to be regenerated.

---

## Training the model

Training is optional because a trained model is already included.

If you want to retrain it, first get the 12-class dataset from the [GarbageBot dataset](https://github.com/brKhoo/GarbageBot) and arrange it like this:

```text
data/
├── battery/
├── biological/
├── brown-glass/
├── cardboard/
├── clothes/
├── green-glass/
├── metal/
├── paper/
├── plastic/
├── shoes/
├── trash/
└── white-glass/
```

Some classes contain significantly more images than others. For training, it is useful to cap very large classes so that one class does not dominate the dataset.

Then run:

```bash
python train.py
```

The training setup used for the current model was:

- 6 epochs for the classification head
- 4 epochs of fine-tuning
- approximately 35 minutes on a single CPU core
- final validation accuracy: **89.6%**

---

## Why MobileNetV2?

MobileNetV2 was chosen because the goal was not just to build an accurate model, but also to have something lightweight enough to run locally.

Training a deep network from scratch on roughly 11,000 images would also make overfitting much more likely.

Using ImageNet-pretrained weights gives the model a useful starting point for recognizing visual features such as edges, shapes, textures, and patterns. The model can then learn which of those features are useful for distinguishing different waste materials.

---

## Why classify the material first?

Instead of training the model to directly predict:

> Biodegradable / Recyclable / Hazardous / Non-biodegradable

Cullet first predicts the **actual material** and then maps it to a disposal category.

For example:

```text
Image
  ↓
MobileNetV2
  ↓
White Glass
  ↓
Recyclable
```

This gives us more information about what the model actually sees and also makes the system easier to modify later.

For example, if the disposal rules change, the category mapping can be updated without having to retrain the entire model.

---

## API

The Flask backend exposes a `/predict` endpoint.

An image can be sent to the endpoint and the response contains the predicted material, confidence values, disposal category, and sorting information used by the frontend.

The frontend handles the rest of the interaction, including displaying the prediction and disposal recommendation.

---

## Deployment

The application can also be run using Gunicorn:

```bash
gunicorn app:app --bind 0.0.0.0:5000 --workers 1 --threads 4 --timeout 120
```

A `Procfile` is included for platforms that support it:

```text
web: gunicorn app:app --workers 1 --threads 4 --timeout 120
```

The application also reads the `HOST` and `PORT` environment variables, so it can be configured for platforms such as Render, Railway, Heroku, or similar services.

The model is loaded and warmed up when the application starts, avoiding the extra delay on the first prediction.

---

## Limitations

The current dataset is not a perfect representation of real-world waste.

A large portion of the training images have relatively clean backgrounds and controlled framing. Real waste can look very different: objects may be dirty, damaged, partially hidden, mixed together, or photographed under poor lighting.

Because of that, the **89.6% validation accuracy should not be interpreted as 89.6% accuracy on every real-world photo**.

Improving the dataset with more varied real-world images would be one of the main ways to improve the system further.

---

## Project structure

```text
cullet/
├── app.py
├── train.py
├── remap_weights.py
├── requirements.txt
├── Procfile
├── README.md
│
├── model/
│   └── cullet.keras
│
├── data/
│   └── ...              # Dataset used for retraining
│
├── templates/
│   └── index.html
│
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── script.js
```

---

## Future improvements

Some areas that could improve the project further:

- Train on more real-world waste images
- Add more material classes
- Improve performance on cluttered backgrounds
- Add object detection for images containing multiple waste items
- Add better camera-based scanning
- Expand disposal recommendations for different regions
- Deploy the model as a lightweight cloud or edge service

---

## About

**Cullet** was built as a practical application of computer vision and machine learning for waste classification and sorting.

The main goal was to go beyond simply training a classifier and build a complete working system around it — from the image upload and model inference to material classification and disposal guidance.