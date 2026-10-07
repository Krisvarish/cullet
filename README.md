# Cullet — AI Waste Sorting Assistant

A small end-to-end AI application for the "Modern Technologies in Municipal
Solid Waste Management" assignment — covering the **AI for waste
classification** bullet from the brief.

You upload (or photograph) an item, a MobileNetV2 model fine-tuned via
transfer learning identifies the material, then the app maps that to a
disposal **category** — Biodegradable, Recyclable, Hazardous, or
Non-biodegradable — and prints a "sorting ticket" telling you which bin it
belongs in and why.

**A trained model is already included** (`model/cullet.keras`, 89.6%
validation accuracy) — you can run the app immediately without training
anything yourself. Training instructions are included if you want to
retrain or improve it.

## How it works

- **Model**: MobileNetV2 pretrained on ImageNet, with a new classification
  head trained on a 12-class waste dataset (battery, biological, brown/
  green/white glass, cardboard, clothes, metal, paper, plastic, shoes,
  trash) — transfer learning, then a light fine-tune of the top backbone
  layers. ~10,600 images, balanced across classes.
- **Category mapping**: each of the 12 material classes is mapped to one
  of four disposal categories (see `CATEGORY_OF` in `app.py`):
  - **Biodegradable** — biological, paper, cardboard
  - **Recyclable** — metal, plastic, brown/green/white glass
  - **Hazardous** — battery (e-waste; never put in regular trash)
  - **Non-biodegradable** — clothes, shoes, general trash
- **Backend**: Flask serves the trained model via a `/predict` endpoint.
- **Frontend**: a minimal, from-scratch HTML/CSS/JS page (no framework, no
  template kit) styled like a sorting-facility ticket printer.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5000` — the trained model is already in `model/`,
so this just works.

## Deployment

The application is production-ready and includes WSGI support via `gunicorn`:

```bash
gunicorn app:app --bind 0.0.0.0:5000 --workers 1 --threads 4 --timeout 120
```

- **Render / Railway / Heroku**: A [`Procfile`](file:///home/krisvarish/Kris/Python_Projects/cullet-waste-sorting-app/wastesense/Procfile) is included in the project root.
- **Port Environment**: Automatically binds to `$PORT` if set by the hosting platform.
- **Model Warmup**: Preloaded on startup to prevent cold-start request latency.

## Retraining (optional)

If you want to retrain — e.g. with more data, more epochs, or your own
images:

### 1. Get the dataset

The 12-class dataset used here is bundled inside this GitHub repo:
https://github.com/brKhoo/GarbageBot (see `garbage-big/`). Arrange it as:

```
data/
  battery/
  biological/
  brown-glass/
  cardboard/
  clothes/
  green-glass/
  metal/
  paper/
  plastic/
  shoes/
  trash/
  white-glass/
```

(Classes with far more images than others, like `clothes`, are worth
capping to a few hundred/thousand so one class doesn't dominate training.)

### 2. ImageNet weights

`train.py` loads ImageNet-pretrained MobileNetV2 weights from
`model_mobilenetv2_imagenet_remapped.weights.h5` (included) instead of
downloading them live — some networks block Keras' default download URL.
`remap_weights.py` shows how that file was produced, in case you need to
regenerate it.

### 3. Train

```bash
python train.py
```

This took about 35 minutes total on a single CPU core (6 head-training
epochs + 4 fine-tuning epochs) and reached 89.6% validation accuracy.
Console output shows per-epoch accuracy — screenshot this for your report.

## For your report

Good things to include:
- A confusion matrix on the validation set (a few lines of `sklearn` +
  `matplotlib` against `val_gen` in `train.py`).
- The accuracy/loss curves from training (phase 1: 78%→92% train accuracy
  over 6 epochs; phase 2 fine-tuning: final val accuracy 89.6%).
- Why transfer learning: training MobileNetV2 from scratch on ~10K images
  would badly overfit; starting from ImageNet weights lets the head learn
  waste-specific features quickly — accuracy jumped from near-random to
  85% within a single epoch once correct pretrained weights were loaded.
- Why a two-tier classification (material → category) instead of training
  directly on "biodegradable/hazardous/etc.": material classes have much
  clearer, more consistent visual features across photos, and the
  category mapping is reusable logic that doesn't need retraining if your
  bin categories change.
- Limitations: training images are mostly plain-background studio shots,
  so accuracy will be lower on cluttered real-world photos — a real
  deployment gap worth discussing.

## Project structure

```
app.py                                            Flask server + /predict
train.py                                          Training script
remap_weights.py                                  ImageNet weight remapping (reference)
requirements.txt
model/cullet.keras                                Trained model (89.6% val acc)
model_mobilenetv2_imagenet_remapped.weights.h5     ImageNet backbone weights
data/                                              Training images (you provide, for retraining)
templates/index.html
static/css/style.css
static/js/script.js
```
