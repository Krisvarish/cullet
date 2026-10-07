import h5py
import numpy as np
import tensorflow as tf

SRC = "model_mobilenetv2_imagenet.h5"
base = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3), include_top=False, weights=None
)

f = h5py.File(SRC, "r")


def ds(group_name, dataset_name):
    return np.array(f[group_name][group_name][dataset_name])


def conv_w(group_name, key="kernel:0"):
    return [ds(group_name, key)]


def bn_w(group_name):
    return [
        ds(group_name, "gamma:0"),
        ds(group_name, "beta:0"),
        ds(group_name, "moving_mean:0"),
        ds(group_name, "moving_variance:0"),
    ]


mapping = {
    "Conv1": ("conv", "Conv1"),
    "bn_Conv1": ("bn", "bn_Conv1"),
    "expanded_conv_depthwise": ("dwconv", "mobl0_conv_0_depthwise"),
    "expanded_conv_depthwise_BN": ("bn", "bn0_conv_0_bn_depthwise"),
    "expanded_conv_project": ("conv", "mobl0_conv_0_project"),
    "expanded_conv_project_BN": ("bn", "bn0_conv_0_bn_project"),
    "Conv_1": ("conv", "Conv_1"),
    "Conv_1_bn": ("bn", "Conv_1_bn"),
}
for i in range(1, 17):
    mapping[f"block_{i}_expand"] = ("conv", f"mobl{i}_conv_{i}_expand")
    mapping[f"block_{i}_expand_BN"] = ("bn", f"bn{i}_conv_{i}_bn_expand")
    mapping[f"block_{i}_depthwise"] = ("dwconv", f"mobl{i}_conv_{i}_depthwise")
    mapping[f"block_{i}_depthwise_BN"] = ("bn", f"bn{i}_conv_{i}_bn_depthwise")
    mapping[f"block_{i}_project"] = ("conv", f"mobl{i}_conv_{i}_project")
    mapping[f"block_{i}_project_BN"] = ("bn", f"bn{i}_conv_{i}_bn_project")

loaded, skipped = 0, []
for layer in base.layers:
    if layer.name not in mapping or not layer.weights:
        continue
    kind, src_name = mapping[layer.name]
    try:
        if kind == "conv":
            w = conv_w(src_name)
        elif kind == "dwconv":
            w = conv_w(src_name, "depthwise_kernel:0")
        else:
            w = bn_w(src_name)
        layer.set_weights(w)
        loaded += 1
    except Exception as e:
        skipped.append((layer.name, str(e)))

print(f"Loaded {loaded}/{len(mapping)} mapped layers")
if skipped:
    print("Skipped:", skipped[:5])

base.save_weights("model_mobilenetv2_imagenet_remapped.weights.h5")
print("Saved remapped weights.")
