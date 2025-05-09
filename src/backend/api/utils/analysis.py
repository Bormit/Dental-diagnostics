import numpy as np
import cv2
import tensorflow as tf
import os
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import io
from ..config import PATHOLOGY_COLORS, PATHOLOGY_CLASSES, IMAGE_SIZE


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


def process_results(prediction, original_shape):
    """Обработка результатов предсказания"""
    try:
        # Получаем категории для каждого пикселя
        if len(prediction.shape) == 4:  # [batch, height, width, classes]
            prediction_mask = np.argmax(prediction[0], axis=-1)
        else:
            prediction_mask = np.argmax(prediction, axis=-1)

        # Изменяем размер маски обратно к оригинальному размеру
        if original_shape and original_shape != prediction_mask.shape:
            prediction_mask = cv2.resize(
                prediction_mask.astype(np.uint8),
                (original_shape[1], original_shape[0]),
                interpolation=cv2.INTER_NEAREST
            )

        # Создаем цветную маску для визуализации
        height, width = prediction_mask.shape
        color_mask = np.zeros((height, width, 3), dtype=np.uint8)

        # Анализируем каждый класс патологии
        regions = []
        for class_id in range(1, 5):  # Пропускаем фон (класс 0)
            # Находим области для текущего класса
            class_mask = (prediction_mask == class_id).astype(np.uint8)

            # Если есть области данного класса
            if np.any(class_mask):
                # Применяем цвет к маске
                class_color = PATHOLOGY_COLORS.get(class_id, [255, 255, 255])
                color_mask[prediction_mask == class_id] = class_color

                # Находим контуры для этой патологии
                contours, _ = cv2.findContours(class_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for contour in contours:
                    # Фильтруем маленькие контуры (шум)
                    if cv2.contourArea(contour) > 30:
                        # Получаем ограничивающий прямоугольник
                        x, y, w, h = cv2.boundingRect(contour)

                        # Вычисляем центроид
                        M = cv2.moments(contour)
                        if M["m00"] > 0:
                            cx = int(M["m10"] / M["m00"])
                            cy = int(M["m01"] / M["m00"])
                        else:
                            cx, cy = x + w // 2, y + h // 2

                        # Получаем среднюю вероятность этого класса в этой области
                        if len(prediction.shape) == 4:  # [batch, height, width, classes]
                            roi = prediction[0,
                                  max(0, y):min(y + h, height),
                                  max(0, x):min(x + w, width),
                                  class_id]
                            probability = float(np.mean(roi)) if roi.size > 0 else 0.5
                        else:
                            probability = 0.7  # Значение по умолчанию, если форма неожиданная

                        # Добавляем информацию в список регионов
                        regions.append({
                            'class_id': int(class_id),
                            'class_name': PATHOLOGY_CLASSES[class_id],
                            'probability': float(probability),
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h),
                            'center_x': int(cx),
                            'center_y': int(cy),
                            'area': float(cv2.contourArea(contour))
                        })

        return {
            'mask': prediction_mask.tolist(),
            'color_mask': color_mask.tolist(),
            'regions': regions
        }
    except Exception as e:
        print(f"Ошибка при обработке результатов: {str(e)}")
        raise


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

        # Добавляем аннотации для каждого обнаруженного региона
        for region in results['regions']:
            x, y = region['center_x'], region['center_y']
            class_name = region['class_name']
            probability = region['probability']

            # Специальное выделение для редких патологий (классы 3 и 4)
            if region['class_id'] in [3, 4]:
                ax.text(x, y, f"{class_name} ★\n{probability:.1%}",
                        color='yellow', fontsize=10, fontweight='bold',
                        bbox=dict(facecolor='black', alpha=0.7, pad=2),
                        ha='center', va='center')
            else:
                ax.text(x, y, f"{class_name}\n{probability:.1%}",
                        color='white', fontsize=9,
                        bbox=dict(facecolor='black', alpha=0.5, pad=1),
                        ha='center', va='center')

        # Добавляем легенду для цветов
        legend_elements = []
        for class_id, class_name in PATHOLOGY_CLASSES.items():
            if class_id > 0:  # Пропускаем фон
                color = np.array(PATHOLOGY_COLORS.get(class_id, [255, 255, 255])) / 255.0
                emphasis = " ★" if class_id in [3, 4] else ""
                legend_elements.append(plt.Line2D([0], [0], marker='o', color='w',
                                                  markerfacecolor=color, markersize=10,
                                                  label=f"{class_name}{emphasis}"))

        ax.legend(handles=legend_elements, loc='lower right', fontsize=8, framealpha=0.7)

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