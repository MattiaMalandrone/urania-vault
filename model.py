# train_model.py
import tensorflow as tf
import numpy as np
import json
import os
import cv2

# === CONFIGURAZIONE ===
IMAGE_SIZE = 224
BATCH_SIZE = 8
EPOCHS = 10
NUM_CLASSES = 3  # Titolo, Autore, Numero

# === PERCORSI ===
DATASET_DIR = './dataset/images/'
ANNOTATIONS_FILE = './dataset/annotations/instances_default.json'

# === CARICAMENTO ANNOTAZIONI ===
def load_annotations():
    with open(ANNOTATIONS_FILE) as f:
        return json.load(f)

# === PREPROCESSING DELLE IMMAGINI ===
def preprocess_image(image_path):
    image = cv2.imread(image_path)
    image = cv2.resize(image, (IMAGE_SIZE, IMAGE_SIZE))
    image = image / 255.0
    return image.astype(np.float32)

# === PREPARAZIONE DEL DATASET ===
def create_dataset(annotations):
    images = []
    boxes = []
    labels = []

    for ann in annotations['annotations']:
        img_data = next((img for img in annotations['images'] if img['id'] == ann['image_id']), None)
        if img_data is None:
            continue

        img_path = os.path.join(DATASET_DIR, img_data['file_name'])
        image = preprocess_image(img_path)
        images.append(image)

        # Normalizza le coordinate del bounding box
        x, y, w, h = ann['bbox']
        boxes.append([y / img_data['height'], x / img_data['width'], (y + h) / img_data['height'], (x + w) / img_data['width']])
        labels.append(ann['category_id'] - 1)  # TensorFlow richiede etichette a partire da 0

    images = np.array(images, dtype=np.float32)
    boxes = np.array(boxes, dtype=np.float32)
    labels = np.array(labels, dtype=np.int32)

    return tf.data.Dataset.from_tensor_slices((images, {'boxes': boxes, 'labels': labels}))

# === COSTRUZIONE DEL MODELLO ===
def build_model():
    base_model = tf.keras.applications.MobileNetV2(input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3), include_top=False, weights='imagenet')
    base_model.trainable = True

    inputs = tf.keras.Input(shape=(IMAGE_SIZE, IMAGE_SIZE, 3))
    x = base_model(inputs, training=True)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    bbox_output = tf.keras.layers.Dense(4, name='boxes')(x)
    class_output = tf.keras.layers.Dense(NUM_CLASSES, activation='softmax', name='labels')(x)

    return tf.keras.Model(inputs=inputs, outputs={'boxes': bbox_output, 'labels': class_output})

# === PERDITA PERSONALIZZATA ===
# def custom_loss(y_true, y_pred):
#     true_boxes = tf.cast(y_true['boxes'], tf.float32)
#     true_labels = tf.cast(y_true['labels'], tf.int32)
#     pred_boxes = tf.cast(y_pred['boxes'], tf.float32)
#     pred_labels = tf.cast(y_pred['labels'], tf.float32)

#     bbox_loss = tf.reduce_mean(tf.square(true_boxes - pred_boxes))
#     class_loss = tf.keras.losses.sparse_categorical_crossentropy(true_labels, pred_labels)

#     return bbox_loss + tf.reduce_mean(class_loss)

# === PREPARAZIONE DEL DATASET ===
annotations = load_annotations()
dataset = create_dataset(annotations)
dataset = dataset.shuffle(buffer_size=1000).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

# === COMPILAZIONE DEL MODELLO ===
model = build_model()
model.compile(
    optimizer='adam', 
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# === ADDESTRAMENTO ===
model.fit(dataset, epochs=EPOCHS)

# === SALVATAGGIO ===
model.save('book_detector_model')
print('Modello addestrato e salvato con successo!')
