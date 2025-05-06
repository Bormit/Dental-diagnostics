import tempfile
import os
import time
import logging
import json
import uuid
import gc
from datetime import datetime

from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
import os
from flask_cors import CORS
import numpy as np
import cv2
import tensorflow as tf
from werkzeug.utils import secure_filename
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import io
import pydicom
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from flask_jwt_extended.exceptions import JWTExtendedException
from flask_jwt_extended import exceptions as jwt_exceptions
from werkzeug.security import generate_password_hash, check_password_hash

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("dental_api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

from src.backend.api.db import db
from src.backend.api.models.models import User, Patient, Appointment
from src.backend.api.models.models import Xray
from sqlalchemy.orm import joinedload

app = Flask(__name__)

# Конфигурация базы данных
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://dentaladmin:12345678@localhost:5432/dental_ai'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT конфиг
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')
jwt = JWTManager(app)

# Инициализация SQLAlchemy
db.init_app(app)
with app.app_context():
    from src.backend.api.models.models import User

# Добавьте этот блок после инициализации Flask-приложения и db.init_app(app)
@app.before_request
def before_request():
    print(f"==> Пришел запрос: {request.method} {request.path}")
    # Устанавливаем контекст приложения для каждого запроса
    if not db.session:
        db.session = db.create_scoped_session()

# Настройка CORS для конкретных источников
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Конфигурация
IMAGE_SIZE = 256  # Размер изображения для модели
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results')
# Используем относительный путь к модели
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                                                       , 'AI', 'saved_models', 'enhanced_model_20250505-220821.keras'))
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'dcm'}
SERVER_PORT = 8000  # Порт сервера
SERVER_HOST = '0.0.0.0'  # Хост сервера
BASE_URL = f"http://localhost:{SERVER_PORT}"  # Базовый URL для ссылок

# Создаем папки, если их нет
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

# Классы патологий
PATHOLOGY_CLASSES = {
    0: 'Фон (нормальная ткань)',
    1: 'Кариес',
    2: 'Глубокий кариес',
    3: 'Периапикальное поражение',
    4: 'Ретинированный зуб'
}

# Цвета для визуализации патологий
PATHOLOGY_COLORS = {
    1: [255, 0, 0],  # Красный для кариеса
    2: [0, 255, 0],  # Зеленый для глубокого кариеса
    3: [0, 0, 255],  # Синий для периапикальных поражений
    4: [255, 255, 0]  # Желтый для ретинированных зубов
}

# Проверка разрешенных расширений файлов
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Загрузка модели (с функцией отложенной загрузки для оптимизации)
def load_model():
    if not hasattr(load_model, 'model'):
        try:
            print(f"Загрузка модели из {MODEL_PATH}")

            # Проверяем наличие файла модели
            if not os.path.exists(MODEL_PATH):
                print(f"Файл модели не найден: {MODEL_PATH}")
                raise FileNotFoundError(f"Файл модели не найден: {MODEL_PATH}")

            # Настраиваем GPU, если доступен
            gpus = tf.config.experimental.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                print(f"Найден GPU: {gpus}")
            else:
                print("GPU не обнаружен, используется CPU")

            # Загружаем модель - используем compile=False, поскольку метрики уже содержатся в модели
            try:
                load_model.model = tf.keras.models.load_model(MODEL_PATH, compile=False)
                print("Модель успешно загружена")
            except Exception as e:
                print(f"Ошибка при загрузке модели: {str(e)}")
                raise ValueError(f"Ошибка загрузки модели: {str(e)}")

        except Exception as e:
            print(f"Ошибка при инициализации модели: {str(e)}")
            raise
    return load_model.model


# Предобработка изображения
def preprocess_image(image_path):
    try:
        # Определяем тип файла
        if image_path.lower().endswith('.dcm'):
            # Обработка DICOM файла
            try:
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


# Постобработка для получения результатов
def postprocess_results(prediction, original_shape):
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
        print(f"Ошибка при постобработке результатов: {str(e)}")
        raise


# Создание визуализации результатов
def create_visualization(original_image, results):
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


# Добавьте обработчик ошибок JWT
@jwt.unauthorized_loader
def custom_unauthorized_response(callback):
    print(f"[JWT] Unauthorized: {callback}")
    return jsonify({'error': 'JWT Unauthorized', 'message': callback}), 401

@jwt.invalid_token_loader
def custom_invalid_token_response(callback):
    print(f"[JWT] Invalid token: {callback}")
    return jsonify({'error': 'JWT Invalid token', 'message': callback}), 422

@jwt.expired_token_loader
def custom_expired_token_response(jwt_header, jwt_payload):
    print("[JWT] Token expired")
    return jsonify({'error': 'JWT Token expired'}), 401

@jwt.needs_fresh_token_loader
def custom_needs_fresh_token_response(callback):
    print(f"[JWT] Fresh token required: {callback}")
    return jsonify({'error': 'JWT Fresh token required', 'message': callback}), 401

@jwt.revoked_token_loader
def custom_revoked_token_response(jwt_header, jwt_payload):
    print("[JWT] Token revoked")
    return jsonify({'error': 'JWT Token revoked'}), 401


print("=== DentalAI REST API запущен ===")

@app.route('/api/analyze', methods=['POST'])
@jwt_required(optional=True)
def analyze_image():
    print("DEBUG: analyze_image с JWT вызван")
    try:
        print(f"Получен запрос с параметрами: {request.form}")
        print(f"Файлы в запросе: {request.files.keys()}")
        start_time = time.time()

        # Проверяем наличие файла в запросе
        if 'image' not in request.files:
            return jsonify({'error': 'Файл изображения не предоставлен'}), 400

        file = request.files['image']

        # Проверяем, что файл имеет имя
        if file.filename == '':
            return jsonify({'error': 'Не выбран файл'}), 400

        # Проверяем расширение файла
        if not allowed_file(file.filename):
            return jsonify(
                {'error': f'Тип файла не поддерживается. Поддерживаемые типы: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

        # Генерируем уникальное имя файла
        filename = secure_filename(file.filename)
        unique_id = str(uuid.uuid4())
        file_ext = os.path.splitext(filename)[1]
        unique_filename = f"{unique_id}{file_ext}"

        # Сохраняем файл
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        print(f"Файл сохранен: {file_path}")

        # Загружаем оригинальное изображение для визуализации
        if file_path.lower().endswith('.dcm'):
            dcm = pydicom.dcmread(file_path)
            original_image = dcm.pixel_array
        else:
            original_image = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)

        # Предобработка изображения
        processed_image, original_shape = preprocess_image(file_path)

        # Загружаем модель
        model = load_model()

        # Выполняем предсказание
        prediction = model.predict(processed_image)

        # Освобождаем память GPU, если использовалась
        tf.keras.backend.clear_session()
        gc.collect()

        # Постобработка результатов
        results = postprocess_results(prediction, original_shape)

        # Добавляем метаданные
        metadata = {
            'file_name': filename,
            'analysis_time': time.time() - start_time,
            'image_size': original_shape,
            'model_name': os.path.basename(MODEL_PATH),
            'timestamp': datetime.now().isoformat()
        }

        # Добавляем информацию о пациенте, если предоставлена
        patient_info = {}
        if 'patient_name' in request.form:
            patient_info['name'] = request.form.get('patient_name')
        if 'card_number' in request.form:
            patient_info['card_number'] = request.form.get('card_number')
        if patient_info:
            metadata['patient_info'] = patient_info

        # Объединяем результаты и метаданные
        response_data = {
            'metadata': metadata,
            'results': results
        }

        # Сохраняем результаты
        result_file = os.path.join(RESULTS_FOLDER, f"{unique_id}_results.json")
        with open(result_file, 'w') as f:
            json.dump(response_data, f, indent=2)

        # --- Исправлено: запись снимка в БД (xrays) ---
        xray_id = None
        print(f"request.form (raw): {request.form}")
        print(f"request.form (dict): {dict(request.form)}")
        for k in request.form:
            print(f"request.form[{k}] = {request.form[k]} (type: {type(request.form[k])})")
        print(f"request.files: {list(request.files.keys())}")
        patient_id = request.form.get('patient_id') or request.form.get('card_number')
        claims = get_jwt()
        user_id = claims.get('user_id')
        print(f"patient_id={patient_id} (type: {type(patient_id)}), user_id={user_id}, claims={claims}")
        if not patient_id:
            print("patient_id отсутствует в запросе")
            return jsonify({'error': 'patient_id обязателен'}), 422
        try:
            patient_id = int(patient_id)
        except Exception:
            print(f"patient_id не приводится к int: {patient_id}")
            return jsonify({'error': 'patient_id должен быть числом'}), 422
        if not user_id:
            print("user_id отсутствует в JWT токене")
            return jsonify({'error': 'Для загрузки снимка требуется авторизация'}), 401
        uploaded_by = user_id

        try:
            db_file_path = os.path.relpath(file_path, start=os.path.dirname(os.path.dirname(__file__)))
            xray_type = "рентген"
            xray_status = "pending"

            xray = Xray(
                patient_id=patient_id,
                uploaded_by=uploaded_by,
                file_path=db_file_path,
                type=xray_type,
                upload_date=datetime.now(),
                status=xray_status
            )
            db.session.add(xray)
            db.session.commit()
            xray_id = str(xray.xray_id)
            response_data['xray_id'] = xray_id

            # После успешного анализа можно обновить статус на 'analyzed'
            xray.status = 'analyzed'
            db.session.commit()
        except Exception as e:
            print(f"Ошибка при сохранении снимка в БД: {str(e)}")
            response_data['xray_db_error'] = str(e)

        # Создаем визуализацию, если запрошено
        visualization_requested = request.form.get('visualization', 'false').lower() == 'true'

        if visualization_requested:
            # Создаем визуализацию
            try:
                visualization_buf = create_visualization(original_image, results)

                # Сохраняем визуализацию
                vis_path = os.path.join(RESULTS_FOLDER, f"{unique_id}_visualization.png")
                with open(vis_path, 'wb') as f:
                    f.write(visualization_buf.getvalue())

                # Добавляем URL для получения визуализации
                response_data['visualization_url'] = f"{BASE_URL}/api/visualizations/{unique_id}"
            except Exception as e:
                print(f"Ошибка при создании визуализации: {str(e)}")
                response_data['visualization_error'] = str(e)

        print(f"Анализ завершен, найдено {len(results['regions'])} патологий")
        return jsonify(response_data)

    except Exception as e:
        print(f"Ошибка при анализе изображения: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# Эндпоинт для получения визуализации
@app.route('/api/visualizations/<visualization_id>', methods=['GET'])
def get_visualization(visualization_id):
    try:
        vis_path = os.path.join(RESULTS_FOLDER, f"{visualization_id}_visualization.png")

        if not os.path.exists(vis_path):
            return jsonify({'error': 'Визуализация не найдена'}), 404

        return send_file(vis_path, mimetype='image/png')
    except Exception as e:
        print(f"Ошибка при получении визуализации: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Эндпоинт для получения списка патологий
@app.route('/api/pathologies', methods=['GET'])
def get_pathologies():
    return jsonify(PATHOLOGY_CLASSES)


# Эндпоинт для проверки статуса сервера
@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        # Проверяем, загружена ли модель
        model_loaded = hasattr(load_model, 'model')

        # Проверяем, доступно ли GPU
        gpus = tf.config.experimental.list_physical_devices('GPU')

        response = {
            'status': 'ok',
            'server_time': datetime.now().isoformat(),
            'model_loaded': model_loaded,
            'model_path': MODEL_PATH,
            'model_exists': os.path.exists(MODEL_PATH),
            'gpu_available': len(gpus) > 0,
            'gpu_info': [str(gpu) for gpu in gpus] if gpus else None,
            'memory_info': {
                'upload_folder_size_mb': get_folder_size(UPLOAD_FOLDER) / (1024 * 1024),
                'results_folder_size_mb': get_folder_size(RESULTS_FOLDER) / (1024 * 1024)
            },
            'server_port': SERVER_PORT,
            'server_url': BASE_URL
        }

        return jsonify(response)
    except Exception as e:
        print(f"Ошибка при получении статуса: {str(e)}")
        return jsonify({'error': str(e), 'status': 'error'}), 500


# Получение размера папки
def get_folder_size(folder_path):
    total_size = 0
    for dirpath, _, filenames in os.walk(folder_path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
    return total_size


# Обработчики ошибок
@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Некорректный запрос'}), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Ресурс не найден'}), 404


@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({'error': 'Внутренняя ошибка сервера'}), 500


# Добавляем эндпоинт для корневого пути
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'name': 'DentalAI API',
        'version': '1.0.0',
        'description': 'API для интеллектуальной системы поддержки принятия решений для диагностики в стоматологической практике',
        'endpoints': {
            '/api/status': 'Проверка статуса сервера',
            '/api/analyze': 'Анализ рентгеновского снимка',
            '/api/pathologies': 'Получение списка возможных патологий',
            '/api/visualizations/{id}': 'Получение визуализации результатов анализа'
        }
    })


# --- AUTH ROUTES ---

def handle_login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Необходимо указать имя пользователя и пароль'}), 400
    user = User.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        user_info = {
            'user_id': user.user_id,
            'username': user.username,
            'role': user.role
        }
        access_token = create_access_token(identity=str(user.user_id), additional_claims=user_info)
        return jsonify({'access_token': access_token, 'user': {
            'user_id': user.user_id,
            'username': user.username,
            'role': user.role,
            'full_name': user.full_name
        }})
    return jsonify({'error': 'Неверное имя пользователя или пароль'}), 401

@app.route('/api/auth/login', methods=['POST'])
def login():
    return handle_login()

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['username', 'password', 'full_name', 'role']
    if not all(k in data for k in required):
        return jsonify({'error': 'Необходимо заполнить все поля'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Пользователь уже существует'}), 409
    user = User(
        username=data['username'],
        full_name=data['full_name'],
        role=data['role'],
        specialty=data.get('specialty')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Пользователь зарегистрирован'}), 201

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    claims = get_jwt()
    return jsonify({'user': claims})

# Добавляем новый эндпоинт для сохранения заключения врача
@app.route('/api/save-conclusion', methods=['POST'])
def save_conclusion():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Данные не предоставлены'}), 400
        # Проверяем наличие необходимых полей
        required_fields = ['patient_id', 'image_id', 'conclusion', 'recommendations']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'Отсутствуют необходимые поля: {", ".join(missing_fields)}'}), 400

        # Создаем уникальный ID для заключения
        conclusion_id = str(uuid.uuid4())

        # Формируем структуру заключения
        conclusion_data = {
            'id': conclusion_id,
            'patient_id': data['patient_id'],
            'image_id': data['image_id'],
            'conclusion_text': data['conclusion'],
            'recommendations': data['recommendations'],
            'doctor_id': data.get('doctor_id', 'unknown'),
            'created_at': datetime.now().isoformat(),
            'pathologies': data.get('pathologies', []),
        }

        # Сохраняем заключение в JSON файл
        conclusion_file = os.path.join(RESULTS_FOLDER, f"conclusion_{conclusion_id}.json")
        with open(conclusion_file, 'w') as f:
            json.dump(conclusion_data, f, indent=2)
        print(f"Заключение сохранено: {conclusion_file}")
        return jsonify({
            'status': 'success',
            'conclusion_id': conclusion_id,
            'message': 'Заключение успешно сохранено'
        })
    except Exception as e:
        print(f"Ошибка при сохранении заключения: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Добавляем эндпоинт для получения истории анализов пациента
@app.route('/api/patient-history/<patient_id>', methods=['GET'])
def get_patient_history(patient_id):
    try:
        if not patient_id:
            return jsonify({'error': 'ID пациента не предоставлен'}), 400

        # Получаем снимки из БД (xrays)
        xrays = (
            Xray.query
            .filter_by(patient_id=patient_id)
            .order_by(Xray.upload_date.desc())
            .all()
        )

        history = []
        for xray in xrays:
            history.append({
                'xray_id': xray.xray_id,
                'upload_date': xray.upload_date.isoformat() if xray.upload_date else '',
                'file_path': xray.file_path,
                'status': xray.status,
                'type': xray.type,
                'uploaded_by': xray.uploaded_by,
                # Можно добавить другие поля по необходимости
            })

        return jsonify({
            'patient_id': patient_id,
            'history': history
        })
    except Exception as e:
        print(f"Ошибка при получении истории пациента: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Добавляем эндпоинт для получения списка пациентов на сегодня
@app.route('/api/patients/today', methods=['GET'])
def get_patients_today():
    """
    Возвращает список пациентов с назначениями на сегодня из БД.
    """
    from datetime import date
    today = date.today()
    # Получаем все назначения на сегодня с пациентами
    appointments = (
        Appointment.query
        .options(joinedload(Appointment.patient))
        .filter(Appointment.appointment_date.cast(db.Date) == today)
        .all()
    )
    result = []
    for appt in appointments:
        p = appt.patient
        # Проверяем наличие даты рождения
        if p.birth_date:
            age = today.year - p.birth_date.year - ((today.month, today.day) < (p.birth_date.month, p.birth_date.day))
        else:
            age = ""
        gender = "М" if p.gender == "male" else ("Ж" if p.gender == "female" else "Другое")
        # Формируем строку времени (часы:минуты)
        appt_time = appt.appointment_date.strftime('%H:%M') if appt.appointment_date else ""
        # Преобразуем тип и статус к читаемому виду
        appt_type = {
            'consultation': 'консультация',
            'treatment': 'лечение',
            'diagnostics': 'диагностика',
            'follow_up': 'контроль',
            'emergency': 'экстренный'
        }.get(appt.appointment_type, appt.appointment_type)
        status = 'экстренный' if appt.appointment_type == 'emergency' else 'ожидает'
        result.append({
            "id": str(p.patient_id),
            "name": p.full_name,
            "gender": gender,
            "age": age,
            "type": appt_type,
            "time": appt_time,
            "status": status,
            "card": "",  # если есть поле карты, подставьте его
            "reason": appt.reason
        })
    return jsonify(result)

@app.route('/api/patients/by-date', methods=['GET'])
def get_patients_by_date():
    """
    Возвращает список пациентов с назначениями на выбранную дату (параметр date=YYYY-MM-DD).
    """
    from datetime import datetime, date
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Не указана дата'}), 400
    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return jsonify({'error': 'Некорректный формат даты, используйте YYYY-MM-DD'}), 400
    appointments = (
        Appointment.query
        .options(joinedload(Appointment.patient))
        .filter(Appointment.appointment_date.cast(db.Date) == selected_date)
        .all()
    )
    result = []
    for appt in appointments:
        p = appt.patient
        if p.birth_date:
            age = selected_date.year - p.birth_date.year - ((selected_date.month, selected_date.day) < (p.birth_date.month, p.birth_date.day))
        else:
            age = ""
        gender = "М" if p.gender == "male" else ("Ж" if p.gender == "female" else "Другое")
        appt_time = appt.appointment_date.strftime('%H:%M') if appt.appointment_date else ""
        appt_type = {
            'consultation': 'консультация',
            'treatment': 'лечение',
            'diagnostics': 'диагностика',
            'follow_up': 'контроль',
            'emergency': 'экстренный'
        }.get(appt.appointment_type, appt.appointment_type)
        status = 'экстренный' if appt.appointment_type == 'emergency' else 'ожидает'
        result.append({
            "id": str(p.patient_id),
            "name": p.full_name,
            "gender": gender,
            "age": age,
            "type": appt_type,
            "time": appt_time,
            "status": status,
            "card": "",  # если есть поле карты, подставьте его
            "reason": appt.reason
        })
    return jsonify(result)

@app.route('/api/patients', methods=['GET', 'POST'])
def patients_handler():
    if request.method == 'GET':
        # --- Получение всех пациентов ---
        try:
            patients = Patient.query.all()
            result = []
            for p in patients:
                result.append({
                    "patient_id": str(p.patient_id),
                    "full_name": p.full_name,
                    "birth_date": p.birth_date.strftime('%Y-%m-%d') if p.birth_date else "",
                    "phone": p.phone or "",
                    "email": p.email or "",
                    "gender": p.gender or "",
                    # Можно добавить другие поля по необходимости
                })
            return jsonify(result)
        except Exception as e:
            print(f"Ошибка при получении списка пациентов: {str(e)}")
            return jsonify({'error': str(e)}), 500
    elif request.method == 'POST':
        # --- Создание нового пациента ---
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Данные не предоставлены'}), 400
            required_fields = ['lastName', 'firstName', 'birthDate', 'gender', 'phoneNumber']
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                return jsonify({'error': f'Не заполнены обязательные поля: {", ".join(missing)}'}), 400
            # Формируем full_name
            full_name = data.get('lastName', '').strip()
            if data.get('firstName'):
                full_name += ' ' + data.get('firstName').strip()
            if data.get('middleName'):
                full_name += ' ' + data.get('middleName').strip()
            patient = Patient(
                full_name=full_name,
                birth_date=datetime.strptime(data.get('birthDate'), '%Y-%m-%d') if data.get('birthDate') else None,
                gender=data.get('gender'),
                phone=data.get('phoneNumber'),
                email=data.get('email')
            )
            db.session.add(patient)
            db.session.commit()
            return jsonify({'cardNumber': str(patient.patient_id)}), 201
        except Exception as e:
            print(f"Ошибка при создании пациента: {str(e)}")
            return jsonify({'error': str(e)}), 500

@app.route('/api/patient-search', methods=['POST'])
def patient_search():
    """
    Поиск пациента по ФИО, дате рождения и полу (без номера карты).
    """
    data = request.get_json() or request.form
    name = data.get('name', '').strip()
    birth_date = data.get('birthDate', '').strip()
    gender = data.get('gender', '').strip()
    if not name or not birth_date or not gender:
        return jsonify({'error': 'Необходимо указать ФИО, дату рождения и пол'}), 400

    # Преобразуем строку даты в объект date
    try:
        from datetime import datetime
        birth_date_obj = datetime.strptime(birth_date, '%Y-%m-%d').date()
    except Exception:
        return jsonify({'error': 'Некорректный формат даты рождения'}), 400
    # Поиск по полному совпадению ФИО, дате рождения и полу
    patient = Patient.query.filter(
        Patient.full_name == name,
        Patient.birth_date == birth_date_obj,
        Patient.gender == gender
    ).first()
    if not patient:
        return jsonify({'patient': None}), 200

    return jsonify({
        'patient': {
            'id': str(patient.patient_id),
            'name': patient.full_name,
            'birthDate': patient.birth_date.strftime('%Y-%m-%d') if patient.birth_date else '',
            'gender': patient.gender,
            'cardNumber': str(patient.patient_id)  # если нужно
        }
    })

@app.route('/api/uploads/<path:filename>')
def serve_uploaded_file(filename):
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    return send_file(os.path.join(uploads_dir, filename))

@app.route('/api/ping')
def ping():
    return 'pong'

# Запуск сервера
if __name__ == '__main__':
    try:
        # Проверка наличия файла модели перед запуском
        if not os.path.exists(MODEL_PATH):
            print(f"Файл модели не найден: {MODEL_PATH}")
            print("Модель будет загружена при первом запросе")
        else:
            # Предварительная загрузка модели перед запуском сервера
            try:
                load_model()
                print("Модель успешно загружена")
            except Exception as e:
                print(f"Ошибка при загрузке модели: {str(e)}")
                print("Сервер запущен без предварительной загрузки модели")
        print(f"Сервер запускается на {SERVER_HOST}:{SERVER_PORT}")
        # Запуск сервера
        app.run(host=SERVER_HOST, port=SERVER_PORT, debug=False)
    except Exception as e:
        print(f"Критическая ошибка при запуске сервера: {str(e)}")





