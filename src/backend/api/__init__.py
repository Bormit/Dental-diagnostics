from flask import Flask, request, jsonify, send_file
from flask_jwt_extended import JWTManager

from .config import *
from .db import db
from .middleware import setup_cors_middleware


def create_app():
    app = Flask(__name__)

    # Конфигурация базы данных
    app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')

    # Инициализация расширений
    db.init_app(app)
    jwt = JWTManager(app)


    # Глобальный обработчик OPTIONS запросов
    @app.route('/api/<path:path>', methods=['OPTIONS'])
    @app.route('/api', methods=['OPTIONS'])
    def handle_global_options(path=None):
        response = app.make_default_options_response()
        # Не нужно добавлять CORS заголовки здесь, middleware сделает это
        return response

    # JWT error handlers
    @jwt.unauthorized_loader
    def custom_unauthorized_response(callback):
        return jsonify({'error': 'JWT Unauthorized', 'message': callback}), 401

    @jwt.invalid_token_loader
    def custom_invalid_token_response(callback):
        return jsonify({'error': 'JWT Invalid token', 'message': callback}), 422

    @jwt.expired_token_loader
    def custom_expired_token_response(jwt_header, jwt_payload):
        return jsonify({'error': 'JWT Token expired'}), 401

    @jwt.needs_fresh_token_loader
    def custom_needs_fresh_token_response(callback):
        return jsonify({'error': 'JWT Fresh token required', 'message': callback}), 401

    @jwt.revoked_token_loader
    def custom_revoked_token_response(jwt_header, jwt_payload):
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

    # Создаем папки для uploads и results
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(RESULTS_FOLDER, exist_ok=True)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    # Импорт и регистрация блюпринтов
    from .routes import auth, analysis, patients, diagnoses, status, appointments
    app.register_blueprint(auth.bp)
    app.register_blueprint(analysis.bp)
    app.register_blueprint(patients.bp)
    app.register_blueprint(diagnoses.bp)
    app.register_blueprint(status.bp)
    app.register_blueprint(appointments.bp)

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

    # --- CRUD USERS ---
    @app.route('/api/users', methods=['GET'])
    def get_users():
        from .models.models import User
        users = User.query.all()
        return jsonify([{
            'user_id': user.user_id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'specialty': user.specialty
        } for user in users])

    @app.route('/api/users/<int:user_id>', methods=['GET'])
    def get_user(user_id):
        from .models.models import User
        user = User.query.get_or_404(user_id)
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'specialty': user.specialty
        })

    @app.route('/api/users', methods=['POST'])
    def create_user():
        from .models.models import User
        data = request.json
        if not data or not all(k in data for k in ['username', 'password', 'full_name', 'role']):
            return jsonify({'error': 'Необходимо заполнить все обязательные поля'}), 400
        user = User(
            username=data['username'],
            full_name=data['full_name'],
            role=data['role'],
            specialty=data.get('specialty')
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'specialty': user.specialty
        }), 201

    @app.route('/api/users/<int:user_id>', methods=['PUT'])
    def update_user(user_id):
        from .models.models import User
        user = User.query.get_or_404(user_id)
        data = request.json
        if 'username' in data:
            user.username = data['username']
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'role' in data:
            user.role = data['role']
        if 'specialty' in data:
            user.specialty = data['specialty']
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        db.session.commit()
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'specialty': user.specialty
        })

    @app.route('/api/users/<int:user_id>', methods=['DELETE'])
    def delete_user(user_id):
        from .models.models import User
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Пользователь успешно удален'})

    # --- CRUD APPOINTMENTS (GET, POST, PUT, DELETE) ---
    @app.route('/api/appointments', methods=['GET', 'POST'])
    def appointments_handler():
        from .models.models import Appointment
        from flask import request, jsonify
        from datetime import datetime

        if request.method == 'GET':
            from .models.models import User, Patient
            from sqlalchemy.orm import joinedload
            appointments = Appointment.query.options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor)
            ).all()
            return jsonify([{
                'appointment_id': appt.appointment_id,
                'appointment_date': appt.appointment_date.isoformat() if appt.appointment_date else None,
                'appointment_type': appt.appointment_type,
                'status': appt.status,
                'duration_minutes': appt.duration_minutes,
                'reason': appt.reason,
                'notes': appt.notes,
                'patient': {
                    'patient_id': appt.patient.patient_id,
                    'full_name': appt.patient.full_name
                } if appt.patient else None,
                'doctor': {
                    'user_id': appt.doctor.user_id,
                    'full_name': appt.doctor.full_name
                } if appt.doctor else None
            } for appt in appointments])

        elif request.method == 'POST':
            data = request.get_json()
            required = ['patient_id', 'doctor_id', 'appointment_date', 'appointment_type', 'status']
            # Проверяем, что doctor_id и patient_id не пустые, не 'undefined', не null и не равны строке 'null'
            missing = [k for k in required if not data.get(k) or str(data.get(k)).lower() in ['undefined', 'null', '']]
            if missing:
                return jsonify({'error': f'Не заполнены обязательные поля: {", ".join(missing)}'}), 400
            try:
                print("POST /api/appointments data:", data)
                from .models.models import Patient, User
                # Дополнительно проверяем, что id действительно число
                try:
                    patient_id = int(data['patient_id'])
                    doctor_id = int(data['doctor_id'])
                except Exception:
                    return jsonify({'error': 'Некорректный patient_id или doctor_id'}), 400

                patient = Patient.query.get(patient_id)
                doctor = User.query.get(doctor_id)
                if not patient:
                    return jsonify({'error': 'Пациент не найден'}), 404
                if not doctor:
                    return jsonify({'error': 'Врач не найден'}), 404

                try:
                    appt_date = datetime.fromisoformat(data['appointment_date'])
                except Exception as e:
                    return jsonify({'error': f'Некорректный формат даты: {str(e)}'}), 400

                appointment = Appointment(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    appointment_date=appt_date,
                    appointment_type=data['appointment_type'],
                    status=data['status'],
                    duration_minutes=int(data.get('duration_minutes', 30)),
                    reason=data.get('reason', ''),
                    notes=data.get('notes', ''),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.session.add(appointment)
                db.session.commit()
                print("Appointment created, id:", appointment.appointment_id)
                return jsonify({'success': True, 'appointment_id': appointment.appointment_id}), 201
            except Exception as e:
                db.session.rollback()
                import traceback
                print("Ошибка при создании приема:", str(e))
                print(traceback.format_exc())
                return jsonify({'error': f'Ошибка при создании приема: {str(e)}'}), 500

    @app.route('/api/appointments/<int:appointment_id>', methods=['GET', 'PUT', 'DELETE'])
    def appointment_detail(appointment_id):
        from .models.models import Appointment
        from flask import request, jsonify
        from datetime import datetime

        appointment = Appointment.query.get_or_404(appointment_id)

        if request.method == 'GET':
            # Возвращаем данные приема для редактирования
            from .models.models import User, Patient
            return jsonify({
                'appointment_id': appointment.appointment_id,
                'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                'appointment_type': appointment.appointment_type,
                'status': appointment.status,
                'duration_minutes': appointment.duration_minutes,
                'reason': appointment.reason,
                'notes': appointment.notes,
                'patient': {
                    'patient_id': appointment.patient.patient_id,
                    'full_name': appointment.patient.full_name
                } if appointment.patient else None,
                'doctor': {
                    'user_id': appointment.doctor.user_id,
                    'full_name': appointment.doctor.full_name
                } if appointment.doctor else None,
                'patient_id': appointment.patient_id,
                'doctor_id': appointment.doctor_id
            })

        if request.method == 'PUT':
            data = request.get_json()
            if 'patient_id' in data:
                appointment.patient_id = int(data['patient_id'])
            if 'doctor_id' in data:
                appointment.doctor_id = int(data['doctor_id'])
            if 'appointment_date' in data:
                appointment.appointment_date = datetime.fromisoformat(data['appointment_date'])
            if 'appointment_type' in data:
                appointment.appointment_type = data['appointment_type']
            if 'status' in data:
                appointment.status = data['status']
            if 'duration_minutes' in data:
                appointment.duration_minutes = int(data['duration_minutes'])
            if 'reason' in data:
                appointment.reason = data['reason']
            if 'notes' in data:
                appointment.notes = data['notes']
            appointment.updated_at = datetime.now()
            db.session.commit()
            return jsonify({'success': True})

        if request.method == 'DELETE':
            db.session.delete(appointment)
            db.session.commit()
            return jsonify({'success': True})

    # --- ADMIN STATS ---
    @app.route('/api/admin-stats', methods=['GET'])
    def get_admin_stats():
        from .models.models import User, Patient, Appointment, Xray, Analysis
        users_count = User.query.count()
        patients_count = Patient.query.count()
        appointments_count = Appointment.query.count()
        xrays_count = Xray.query.count()
        analyses_count = Analysis.query.count()
        doctors_count = User.query.filter_by(role='doctor').count()
        admins_count = User.query.filter_by(role='admin').count()
        return jsonify({
            'users': {
                'total': users_count,
                'doctors': doctors_count,
                'admins': admins_count
            },
            'patients': patients_count,
            'appointments': appointments_count,
            'xrays': xrays_count,
            'analyses': analyses_count,
            'system_status': 'normal',
            'uptime': '99.8%'
        })

    # Создаем все таблицы базы данных при первом запуске
    with app.app_context():
        from .models.models import User, Patient, Appointment, Xray, Analysis
        db.create_all()

    app = setup_cors_middleware(app)

    return app

# Для запуска через python -m api
# ВНИМАНИЕ: Экспортируем именно create_app, а не app!
# Для совместимости с run.py и Flask CLI:
app = create_app()