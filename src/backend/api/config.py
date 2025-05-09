import os
import logging

# Конфигурация
DB_URI = 'postgresql://dentaladmin:12345678@localhost:5432/dental_ai'
IMAGE_SIZE = 256
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results')
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                                      'AI', 'saved_models', 'enhanced_model_20250505-220821.keras'))
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'dcm'}
SERVER_PORT = 8000
SERVER_HOST = '0.0.0.0'
BASE_URL = f"http://localhost:{SERVER_PORT}"

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
