"""
Cullet — training script
Fine-tunes a MobileNetV2 (ImageNet weights) on the 12-class waste dataset
using transfer learning. CPU-friendly, ~30-40 min on a laptop.

Dataset (place before running):
  data/
    battery/*.jpg
    biological/*.jpg
    brown-glass/*.jpg
    cardboard/*.jpg
    clothes/*.jpg
    green-glass/*.jpg
    metal/*.jpg
    paper/*.jpg
    plastic/*.jpg
    shoes/*.jpg
    trash/*.jpg
    white-glass/*.jpg

Get the dataset from: https://github.com/brKhoo/GarbageBot (see garbage-big/)
(arrange images into data/ so each class is its own folder)
"""
import os

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS_HEAD = 6        # train the new classification head
EPOCHS_FINE_TUNE = 4   # unfreeze top MobileNet layers for a light fine-tune


def build_generators():
    datagen = ImageDataGenerator(
        preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input,
        validation_split=0.2,
        rotation_range=20,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.15,
        horizontal_flip=True,
    )
    train_gen = datagen.flow_from_directory(
        DATA_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
        subset="training", class_mode="categorical",
    )
    val_gen = datagen.flow_from_directory(
        DATA_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
        subset="validation", class_mode="categorical",
    )
    return train_gen, val_gen


IMAGENET_WEIGHTS = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "model_mobilenetv2_imagenet_remapped.weights.h5",
)


def build_model(num_classes: int) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=IMG_SIZE + (3,), include_top=False, weights=None
    )
    if os.path.exists(IMAGENET_WEIGHTS):
        # tf.keras's own imagenet download is blocked on some networks; a
        # remapped equivalent checkpoint (see remap_weights.py) is loaded
        # instead — same architecture, same ImageNet pretraining.
        base.load_weights(IMAGENET_WEIGHTS)
    else:
        print("No local ImageNet weights found — training backbone from scratch "
              "(accuracy will be much lower). See README for the weights link.")
    base.trainable = False  # freeze for the head-training phase

    inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs)
    return model, base


def main():
    train_gen, val_gen = build_generators()
    class_names = sorted(train_gen.class_indices, key=train_gen.class_indices.get)
    print("Classes (in model output order):", class_names)

    model, base = build_model(num_classes=len(class_names))
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    print("\n--- Phase 1: training classification head ---")
    model.fit(train_gen, validation_data=val_gen, epochs=EPOCHS_HEAD)

    print("\n--- Phase 2: fine-tuning top MobileNet layers ---")
    base.trainable = True
    for layer in base.layers[:-30]:  # keep most of the backbone frozen
        layer.trainable = False
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(train_gen, validation_data=val_gen, epochs=EPOCHS_FINE_TUNE)

    val_loss, val_acc = model.evaluate(val_gen)
    print(f"\nFinal validation accuracy: {val_acc:.3f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    out_path = os.path.join(MODEL_DIR, "cullet.keras")
    model.save(out_path)
    print(f"Saved model to {out_path}")


if __name__ == "__main__":
    main()
