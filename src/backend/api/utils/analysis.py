import numpy as np
import cv2
import tensorflow as tf
import os
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import io
# Исправлено: абсолютный импорт для запуска как скрипта
from src.backend.api.config import PATHOLOGY_COLORS, PATHOLOGY_CLASSES, IMAGE_SIZE


def load_model(model_path):
    """Load AI model with lazy loading"""
    if not hasattr(load_model, 'model'):
        try:
            print(f"Загрузка модели из {model_path}")

            if not os.path.exists(model_path):
                print(f"Файл модели не найден: {model_path}")
                raise FileNotFoundError(f"Файл модели не найден: {model_path}")

            # Настраиваем GPU, если доступен
            gpus = tf.config.experimental.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                print(f"Найден GPU: {gpus}")
            else:
                print("GPU не обнаружен, используется CPU")

            # Загружаем модель
            try:
                load_model.model = tf.keras.models.load_model(model_path, compile=False)
                print("Модель успешно загружена")
            except Exception as e:
                print(f"Ошибка при загрузке модели: {str(e)}")
                raise ValueError(f"Ошибка загрузки модели: {str(e)}")

        except Exception as e:
            print(f"Ошибка при инициализации модели: {str(e)}")
            raise
    return load_model.model


def preprocess_image(image_path):
    """Предобработка изображения"""
    try:
        # Определяем тип файла
        if image_path.lower().endswith('.dcm'):
            # Обработка DICOM файла
            try:
                import pydicom
                dcm = pydicom.dcmread(image_path)
                image = dcm.pixel_array
                # Нормализуем DICOM в зависимости от глубины битности
                if hasattr(dcm, 'BitsStored') and dcm.BitsStored == 16:
                    image = image / 65535.0
                else:
                    image = image / 255.0
            except Exception as e:
                print(f"Ошибка при обработке DICOM файла: {str(e)}")
                raise ValueError(f"Ошибка при обработке DICOM файла: {str(e)}")
        else:
            # Обработка обычного изображения
            image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if image is None:
                print(f"Не удалось прочитать изображение: {image_path}")
                raise ValueError(f"Не удалось прочитать изображение: {image_path}")
            image = image.astype(np.float32) / 255.0

        # Сохраняем оригинальный размер
        original_shape = image.shape

        # Изменяем размер изображения
        image = cv2.resize(image, (IMAGE_SIZE, IMAGE_SIZE))

        # Добавляем размерность для канала (оттенки серого - 1 канал)
        image = np.expand_dims(image, axis=-1)

        # Добавляем размерность для батча
        image = np.expand_dims(image, axis=0)

        return image, original_shape
    except Exception as e:
        print(f"Ошибка при предобработке изображения: {str(e)}")
        raise


def process_results(prediction, original_shape, threshold=0.3):
    """Обработка результатов предсказания с порогом вероятности"""
    print("Min/max по каналам:", np.min(prediction), np.max(prediction))
    print("Сумма по каналам (должна быть 1):", np.sum(prediction[0], axis=-1))
    for class_id in range(prediction.shape[-1]):
        print(f"Class {class_id} max prob: {np.max(prediction[0, :, :, class_id]):.4f}, mean: {np.mean(prediction[0, :, :, class_id]):.4f}")
    try:
        # Изменяем размер вероятностей обратно к оригинальному размеру
        if original_shape and tuple(map(int, prediction.shape[1:3])) != tuple(map(int, original_shape)):
            h, w = map(int, original_shape)
            if h <= 0 or w <= 0:
                print(f"Warning: original_shape некорректен: {original_shape}")
                return {'regions': [], 'color_mask': []}
            probs_resized = np.zeros((1, h, w, prediction.shape[-1]))
            for class_id in range(prediction.shape[-1]):
                class_map = prediction[0, :, :, class_id]
                print(f"DEBUG: class_id={class_id}, type={type(class_map)}, dtype={getattr(class_map, 'dtype', None)}, shape={getattr(class_map, 'shape', None)}")
                if class_map is None or class_map.size == 0 or class_map.ndim != 2:
                    print(f"Warning: class_map for class {class_id} is empty or not 2D, skipping resize.")
                    continue
                if not isinstance(class_map, np.ndarray):
                    class_map = np.array(class_map)
                # Приводим к float32, если не float32/uint8
                if class_map.dtype not in [np.float32, np.uint8]:
                    class_map = class_map.astype(np.float32)
                try:
                    probs_resized[0, :, :, class_id] = cv2.resize(
                        class_map,
                        (w, h),
                        interpolation=cv2.INTER_LINEAR
                    )
                except Exception as e:
                    print(f"Resize error for class {class_id}: {e}")
                    continue
        else:
            probs_resized = prediction

        height, width = probs_resized.shape[1:3]
        color_mask = np.zeros((height, width, 3), dtype=np.uint8)
        regions = []

        for class_id in range(1, 5):  # Пропускаем фон (класс 0)
            # --- Новый способ: берем все пиксели, где вероятность класса > threshold ---
            class_prob = probs_resized[0, :, :, class_id]
            class_mask = (class_prob > threshold).astype(np.uint8)

            if np.any(class_mask):
                class_color = PATHOLOGY_COLORS.get(class_id, [255, 255, 255])
                color_mask[class_mask == 1] = class_color

                contours_info = cv2.findContours(class_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                contours = contours_info[0] if len(contours_info) == 2 else contours_info[1]
                for contour in contours:
                    if cv2.contourArea(contour) > 30:
                        x, y, w, h = cv2.boundingRect(contour)
                        if w == 0 or h == 0:
                            continue
                        M = cv2.moments(contour)
                        if M["m00"] > 0:
                            cx = int(M["m10"] / M["m00"])
                            cy = int(M["m01"] / M["m00"])
                        else:
                            cx, cy = x + w // 2, y + h // 2

                        # Средняя вероятность по маске
                        vals = class_prob[class_mask == 1]
                        probability = float(np.mean(vals)) if vals.size > 0 else 0.0

                        regions.append({
                            'class_id': int(class_id),
                            'class_name': PATHOLOGY_CLASSES[class_id],
                            'probability': probability,
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h),
                            'center_x': int(cx),
                            'center_y': int(cy),
                            'area': float(cv2.contourArea(contour))
                        })

        return {
            'regions': regions,
            'color_mask': color_mask.tolist()
        }
    except Exception as e:
        print(f"Ошибка при обработке результатов: {str(e)}")
        return {'regions': [], 'color_mask': []}


def create_visualization(original_image, results):
    """Создание визуализации результатов"""
    try:
        fig, ax = plt.subplots(figsize=(10, 8))

        # Отображаем оригинальное изображение
        ax.imshow(original_image, cmap='gray')

        # Преобразуем color_mask из списка в массив numpy
        if isinstance(results['color_mask'], list):
            color_mask = np.array(results['color_mask'], dtype=np.uint8)
        else:
            color_mask = results['color_mask']

        # Создаем маску с альфа-каналом для наложения
        height, width = color_mask.shape[:2]
        rgba_mask = np.zeros((height, width, 4), dtype=np.uint8)
        rgba_mask[..., :3] = color_mask

        # Устанавливаем альфа-канал только для пикселей, где есть патологии
        mask_sum = np.sum(color_mask, axis=2)
        rgba_mask[..., 3] = (mask_sum > 0) * 150  # Полупрозрачность для областей с патологиями

        # Накладываем маску на изображение
        ax.imshow(rgba_mask)

        # Подсчитываем количество патологий каждого класса
        pathology_counts = {}
        for region in results['regions']:
            class_id = region['class_id']
            if class_id not in pathology_counts:
                pathology_counts[class_id] = 0
            pathology_counts[class_id] += 1

        # Добавляем улучшенную легенду с количеством патологий
        legend_elements = []
        for class_id, class_name in PATHOLOGY_CLASSES.items():
            if class_id > 0:  # Пропускаем фон
                color = np.array(PATHOLOGY_COLORS.get(class_id, [255, 255, 255])) / 255.0
                emphasis = " ★" if class_id in [3, 4] else ""
                count = pathology_counts.get(class_id, 0)
                if count > 0:
                    label = f"{class_name}{emphasis} ({count} шт.)"
                    legend_elements.append(plt.Line2D([0], [0], marker='o', color='w',
                                                     markerfacecolor=color, markersize=10,
                                                     label=label))

        # Добавляем легенду с боковой полосой прокрутки если много элементов
        if len(legend_elements) > 6:
            ax.legend(handles=legend_elements, loc='lower right', fontsize=8, framealpha=0.7,
                     title="Обнаруженные патологии", bbox_to_anchor=(1.02, 0), ncol=1)
        else:
            ax.legend(handles=legend_elements, loc='lower right', fontsize=8, framealpha=0.7,
                     title="Обнаруженные патологии")

        # Добавляем заголовок
        num_pathologies = len(results['regions'])
        if num_pathologies > 0:
            ax.set_title(f"Обнаружено патологий: {num_pathologies}", fontsize=12)
        else:
            ax.set_title("Патологии не обнаружены", fontsize=12)

        # Убираем оси
        ax.axis('off')
        plt.tight_layout()

        # Преобразуем фигуру в изображение
        canvas = FigureCanvas(fig)
        buf = io.BytesIO()
        canvas.print_png(buf)
        plt.close(fig)

        return buf
    except Exception as e:
        print(f"Ошибка при создании визуализации: {str(e)}")
        raise