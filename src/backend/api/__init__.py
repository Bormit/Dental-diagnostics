from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .db import db
from .config import *
import os
import logging

app = Flask(__name__)

# Конфигурация базы данных
app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT конфиг
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')
jwt = JWTManager(app)

# Обработчики ошибок JWT
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

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Некорректный запрос'}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Ресурс не найден'}), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({'error': 'Внутренняя ошибка сервера'}), 500

# Инициализация SQLAlchemy
db.init_app(app)

# Настройка CORS для конкретных источников
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:63343",
    "http://127.0.0.1:63343",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]}}, supports_credentials=True)
print("CORS enabled for http://localhost:63343, http://127.0.0.1:63343, http://localhost:8000, http://127.0.0.1:8000")

@app.before_request
def before_request():
    print(f"==> Получен запрос: {request.method} {request.path}")
    # Устанавливаем контекст приложения для каждого запроса
    if not db.session:
        db.session = db.create_scoped_session()

# Создаем папки для uploads и results
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

# Импорт и регистрация блюпринтов
from .routes import auth, analysis, patients, diagnoses, status

app.register_blueprint(auth.bp)
app.register_blueprint(analysis.bp)
app.register_blueprint(patients.bp)
app.register_blueprint(diagnoses.bp)
app.register_blueprint(status.bp)

# Корневой маршрут
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
            '/api/visualizations/{id}': 'Получение визуализации результатов анализа',
            '/api/auth/login': 'Авторизация пользователя',
            '/api/patients': 'Работа с пациентами',
            '/api/diagnoses': 'Работа с заключениями'
        }
    })

@app.route('/api/ping')
def ping():
    return 'pong'

# Обслуживание загруженных файлов
@app.route('/api/uploads/<path:filename>')
def serve_uploaded_file(filename):
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    return send_file(os.path.join(uploads_dir, filename))

# Создаем все таблицы базы данных
with app.app_context():
    # Импортируем модели здесь, чтобы избежать циклических импортов
    from .models.models import User, Patient, Appointment, Xray, Analysis
    db.create_all()
    print("База данных инициализирована")

print("=== DentalAI REST API запущен ===")