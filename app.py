"""
Cullet — AI waste-sorting assistant
Flask backend: loads the trained MobileNetV2 classifier and serves
predictions to the frontend.
"""
import io
import os

from flask import Flask, request, jsonify, render_template
from PIL import Image
import numpy as np
import tensorflow as tf

APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(APP_DIR, "model", "cullet.keras")
IMG_SIZE = (224, 224)

# Class order MUST match the training generator's alphabetical class order
# (Keras' ImageDataGenerator sorts subfolders alphabetically).
CLASSES = [
    "battery", "biological", "brown-glass", "cardboard", "clothes",
    "green-glass", "metal", "paper", "plastic", "shoes", "trash",
    "white-glass",
]

# Every material class belongs to one broad disposal category. The model
# predicts the material (what it visually recognises); this table maps
# that to the category that actually decides which bin it goes in.
CATEGORY_OF = {
    "biological": "Biodegradable",
    "paper": "Biodegradable",
    "cardboard": "Biodegradable",
    "battery": "Hazardous",
    "metal": "Recyclable",
    "plastic": "Recyclable",
    "brown-glass": "Recyclable",
    "green-glass": "Recyclable",
    "white-glass": "Recyclable",
    "clothes": "Non-biodegradable",
    "shoes": "Non-biodegradable",
    "trash": "Non-biodegradable",
}

CATEGORY_INFO = {
    "Biodegradable": {"color": "#7C9473", "bin": "Compost / Wet Waste"},
    "Recyclable": {"color": "#4E7D9C", "bin": "Dry / Recyclable"},
    "Hazardous": {"color": "#B5623A", "bin": "Hazardous Waste Drop-off"},
    "Non-biodegradable": {"color": "#6B655A", "bin": "Landfill / General Waste"},
}

# Disposal guidance shown to the user for each predicted material class.
TIPS = {
    "biological": "Food scraps and garden waste can go straight into a "
                  "compost bin or wet-waste collection. Do not bag them in plastic.",
    "paper": "Remove any plastic wrapping or lamination first. Shredded "
             "paper should be bagged so it doesn't scatter during collection.",
    "cardboard": "Flatten the box and keep it dry. Wet or greasy cardboard, "
                 "such as pizza boxes, belongs in general waste instead of recycling.",
    "battery": "Never place batteries in regular trash or recycling because they can "
               "spark fires in collection trucks. Take them to a designated "
               "e-waste drop-off point.",
    "metal": "Empty and rinse cans before disposal. Crushing aluminum cans "
             "saves space but is not required.",
    "plastic": "Check the resin code and rinse off food residue. Contamination "
               "is the primary reason recyclable plastic gets rejected.",
    "brown-glass": "Rinse out residue and keep containers whole. Broken glass "
                   "poses a handling hazard for sanitation workers.",
    "green-glass": "Rinse out residue and keep containers whole. Broken glass "
                   "poses a handling hazard for sanitation workers.",
    "white-glass": "Rinse out residue and keep containers whole. Broken glass "
                   "poses a handling hazard for sanitation workers.",
    "clothes": "Wearable garments belong in textile donation bins. Only "
               "heavily damaged or worn-out fabric should go to general waste.",
    "shoes": "Pair shoes together and check for local donation or textile "
             "recycling drop-offs before binning.",
    "trash": "This item cannot be cleanly composted or recycled through "
             "standard municipal streams. Route to general waste.",
}


def format_class_name(name: str) -> str:
    """Format machine class identifiers (e.g. 'brown-glass') to human-readable title case ('Brown Glass')."""
    if not name:
        return ""
    words = name.replace("-", " ").replace("_", " ").split()
    return " ".join(word.capitalize() for word in words)


def info_for(material: str) -> dict:
    category = CATEGORY_OF[material]
    return {
        "category": category,
        "bin": CATEGORY_INFO[category]["bin"],
        "color": CATEGORY_INFO[category]["color"],
        "tip": TIPS[material],
    }

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
_model = None


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File size exceeds the 16MB limit."}), 413


def load_and_warmup_model():
    """Load the model and run an initial warm-up pass before accepting requests."""
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"No trained model found at {MODEL_PATH}. "
                "Run `python train.py` first (see README.md)."
            )
        print(f"Loading trained model from {MODEL_PATH}...")
        _model = tf.keras.models.load_model(MODEL_PATH)
        print("Running model warm-up...")
        dummy_tensor = np.zeros((1, *IMG_SIZE, 3), dtype=np.float32)
        _ = _model(dummy_tensor, training=False).numpy()[0]
        print("Model warm-up completed successfully.")
    return _model


def get_model():
    global _model
    if _model is None:
        load_and_warmup_model()
    return _model


def preprocess(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32)
    arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
    return np.expand_dims(arr, axis=0)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    if not file or not file.filename or file.filename.strip() == "":
        return jsonify({"error": "No image file selected"}), 400

    try:
        model = get_model()
        batch = preprocess(file.read())
        preds = model(batch, training=False).numpy()[0]
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Could not read image: {e}"}), 400

    order = np.argsort(preds)[::-1]

    # Calculate category-level confidence by summing model probabilities
    # of all material classes mapped to each category.
    category_probs = {cat: 0.0 for cat in CATEGORY_INFO}
    for i, class_name in enumerate(CLASSES):
        cat = CATEGORY_OF[class_name]
        category_probs[cat] += float(preds[i])

    category_confidences = {
        cat: round(prob * 100, 1) for cat, prob in category_probs.items()
    }

    top = [
        {
            "label": CLASSES[i],
            "formatted_label": format_class_name(CLASSES[i]),
            "confidence": round(float(preds[i]) * 100, 1),
            **info_for(CLASSES[i]),
        }
        for i in order[:3]
    ]

    result = {
        **top[0],
        "category_confidence": category_confidences[top[0]["category"]],
    }

    return jsonify({
        "top": top,
        "result": result,
        "category_confidences": category_confidences,
    })


# Preload model on startup so production servers (e.g. gunicorn) serve requests immediately
load_and_warmup_model()

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 5000))
    app.run(host=host, debug=True, port=port)
