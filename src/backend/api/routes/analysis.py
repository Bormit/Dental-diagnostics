import time
import gc
import os
import re
import uuid
import numpy as np
import cv2
import io
import tensorflow as tf
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.utils import secure_filename
from sqlalchemy import desc

from ..models.models import User, Patient, Appointment, Xray, InterpretationResult, Analysis, NeuralModel, Pathology, Diagnosis
from ..db import db
from ..config import UPLOAD_FOLDER, RESULTS_FOLDER, MODEL_PATH, BASE_URL, ALLOWED_EXTENSIONS, PATHOLOGY_CLASSES
from ..utils.analysis import load_model, process_results, preprocess_image, create_visualization

bp = Blueprint('analysis', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/api/analyze', methods=['POST'])
@jwt_required(optional=True)
def analyze_image():
    print("DEBUG: analyze_image вызван")
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
            import pydicom
            dcm = pydicom.dcmread(file_path)
            original_image = dcm.pixel_array
        else:
            original_image = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)

        # Предобработка изображения
        processed_image, original_shape = preprocess_image(file_path)

        # Загружаем модель
        model = load_model(MODEL_PATH)

        # Выполняем предсказание
        prediction = model.predict(processed_image)

        print("Min/max по каналам:", np.min(prediction), np.max(prediction))
        print("Сумма по каналам (должна быть 1):", np.sum(prediction[0], axis=-1))

        for class_id in range(prediction.shape[-1]):
            confident_pixels = np.sum(prediction[0, :, :, class_id] > 0.5)
            print(f"Class {class_id}: confident pixels (>0.5) = {confident_pixels}")

        # Освобождаем память GPU, если использовалась
        tf.keras.backend.clear_session()
        gc.collect()

        # Постобработка результатов
        results = process_results(prediction, original_shape)

        # --- ОТЛАДКА: выводим вероятности всех патологий в regions ---
        if results and 'regions' in results:
            print("=== DEBUG: Вероятности патологий по регионам ===")
            for idx, region in enumerate(results['regions']):
                print(f"Region {idx+1}: class_id={region['class_id']}, class_name={region['class_name']}, probability={region['probability']:.4f}")
            print("=== END DEBUG ===")

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
            import json
            json.dump(response_data, f, indent=2)

        # --- Новая логика: если пациент не выбран, не пишем в БД, но возвращаем результат ---
        patient_id = request.form.get('patient_id') or request.form.get('card_number')
        claims = get_jwt()
        user_id = claims.get('user_id')
        if not patient_id:
            print("Пациент не выбран, результат не сохраняется в БД, только возвращается клиенту")
            # Если запрошена визуализация, создаем временный файл для клиента
            visualization_requested = request.form.get('visualization', 'false').lower() == 'true'
            if visualization_requested:
                try:
                    visualization_buf = create_visualization(original_image, results)
                    vis_path = os.path.join(RESULTS_FOLDER, f"{unique_id}_visualization.png")
                    with open(vis_path, 'wb') as f:
                        f.write(visualization_buf.getvalue())
                    response_data['visualization_url'] = f"{BASE_URL}/api/visualizations/{unique_id}"
                except Exception as e:
                    print(f"Ошибка при создании визуализации: {str(e)}")
                    response_data['visualization_error'] = str(e)
            return jsonify(response_data)

        # --- Запись снимка в БД (xrays) ---
        xray_id = None
        results_list = []  # Список для хранения созданных InterpretationResult
        print(f"request.form (raw): {request.form}")
        print(f"request.form (dict): {dict(request.form)}")
        for k in request.form:
            print(f"request.form[{k}] = {request.form[k]} (type: {type(request.form[k])})")
        print(f"request.files: {list(request.files.keys())}")
        print(f"patient_id={patient_id} (type: {type(patient_id)}), user_id={user_id}, claims={claims}")
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

            # 1. Сохраняем оригинальный снимок в xrays
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

            # 2. Создаем Analysis (обязательная связь для InterpretationResult)
            # Для простоты создаем фиктивную модель и pathology, если нужно

            # Получаем или создаем модель (можно заменить на актуальную)
            model_record = NeuralModel.query.first()
            if not model_record:
                model_record = NeuralModel(name="Default", version="1.0", is_active=True)
                db.session.add(model_record)
                db.session.commit()

            analysis = Analysis(
                xray_id=xray.xray_id,
                model_id=model_record.model_id,
                analysis_date=datetime.now(),
                execution_time=metadata['analysis_time'],
                status='completed'
            )
            db.session.add(analysis)
            db.session.commit()

            # --- Сохраняем визуализацию с именем по analysis_id ---
            visualization_requested = request.form.get('visualization', 'false').lower() == 'true'
            if visualization_requested:
                try:
                    visualization_buf = create_visualization(original_image, results)
                    vis_path = os.path.join(RESULTS_FOLDER, f"{analysis.analysis_id}_visualization.png")
                    with open(vis_path, 'wb') as f:
                        f.write(visualization_buf.getvalue())
                    response_data['visualization_url'] = f"{BASE_URL}/api/visualizations/{analysis.analysis_id}"
                except Exception as e:
                    print(f"Ошибка при создании визуализации: {str(e)}")
                    response_data['visualization_error'] = str(e)

            # Сохраняем результаты анализа в interpretation_results для каждой патологии
            for region in results['regions']:
                pathology = Pathology.query.filter_by(name=region['class_name']).first()
                if not pathology:
                    pathology = Pathology(name=region['class_name'], code=str(region['class_id']))
                    db.session.add(pathology)
                    db.session.commit()
                interpretation = InterpretationResult(
                    analysis_id=analysis.analysis_id,
                    pathology_id=pathology.pathology_id,
                    probability=region.get('probability', 0.0),
                    region_mask=None,
                    description="AI visualization"
                )
                db.session.add(interpretation)
                db.session.flush()  # Получаем result_id
                results_list.append(interpretation)
            db.session.commit()

        except Exception as e:
            print(f"Ошибка при сохранении снимка или результата в БД: {str(e)}")
            response_data['xray_db_error'] = str(e)

        # Получаем первый result_id (или список всех)
        first_result_id = None
        if results_list and len(results_list) > 0:
            first_result_id = results_list[0].result_id

        response_data['result_id'] = first_result_id

        print(f"Анализ завершен, найдено {len(results['regions'])} патологий")
        return jsonify(response_data)

    except Exception as e:
        print(f"Ошибка при анализе изображения: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Эндпоинт для получения визуализации
@bp.route('/api/visualizations/<visualization_id>', methods=['GET'])
def get_visualization(visualization_id):
    try:
        # --- Поддержка UUID для временных визуализаций ---
        # Если visualization_id похож на UUID (анализ без пациента), ищем файл напрямую
        uuid_regex = re.compile(r'^[0-9a-fA-F-]{36}$')
        vis_path = None

        if uuid_regex.match(visualization_id):
            # Это UUID, ищем файл results/{uuid}_visualization.png
            vis_path = os.path.join(RESULTS_FOLDER, f"{visualization_id}_visualization.png")
            if not os.path.exists(vis_path):
                return jsonify({'error': 'Визуализация не найдена'}), 404
            return send_file(vis_path, mimetype='image/png')

        # Иначе считаем, что это integer (analysis_id)
        try:
            analysis_id = int(visualization_id)
        except Exception:
            return jsonify({'error': 'Некорректный идентификатор визуализации'}), 400

        analysis = Analysis.query.filter_by(analysis_id=analysis_id).first()
        if not analysis:
            return jsonify({'error': 'Анализ не найден'}), 404

        xray = Xray.query.filter_by(xray_id=analysis.xray_id).first()
        if not xray:
            return jsonify({'error': 'Снимок не найден'}), 404

        vis_path = os.path.join(RESULTS_FOLDER, f"{analysis_id}_visualization.png")
        if not os.path.exists(vis_path):
            # Альтернативный поиск по xray_id
            import glob
            pattern = os.path.join(RESULTS_FOLDER, f"*{analysis.xray_id}*_visualization.png")
            files = glob.glob(pattern)
            if files:
                vis_path = files[0]
            else:
                return jsonify({'error': 'Визуализация не найдена'}), 404

        return send_file(vis_path, mimetype='image/png')
    except Exception as e:
        print(f"Ошибка при получении визуализации: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/pathologies', methods=['GET'])
def get_pathologies():
    return jsonify(PATHOLOGY_CLASSES)

@bp.route('/api/analysis-result/<int:analysis_id>', methods=['GET'])
def get_analysis_result(analysis_id):
    try:
        analysis = Analysis.query.filter_by(analysis_id=analysis_id).first()
        if not analysis:
            return jsonify({'error': 'Анализ не найден'}), 404

        # Визуализация
        vis_path = os.path.join(RESULTS_FOLDER, f"{analysis_id}_visualization.png")
        visualization_url = None
        if os.path.exists(vis_path):
            visualization_url = f"{BASE_URL}/api/visualizations/{analysis_id}"

        # Патологии
        regions = []
        for interp in InterpretationResult.query.filter_by(analysis_id=analysis_id).all():
            pathology = Pathology.query.filter_by(pathology_id=interp.pathology_id).first()
            regions.append({
                'class_id': pathology.code if pathology else '',
                'class_name': pathology.name if pathology else '',
                'probability': interp.probability
            })

        return jsonify({
            'visualization_url': visualization_url,
            'regions': regions
        })
    except Exception as e:
        print(f"Ошибка при получении результата анализа: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Добавляем маршрут для поиска анализов
@bp.route('/api/analysis-results-search', methods=['POST', 'OPTIONS'])
def search_analyses():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        print("Received data:", data)

        analyses = db.session.query(Analysis).order_by(desc(Analysis.analysis_date)).all()
        results = []
        for analysis in analyses:
            xray = Xray.query.filter_by(xray_id=analysis.xray_id).first()
            patient_name = "-"
            doctor_name = "-"
            patient = None
            doctor = None
            if xray:
                patient = Patient.query.filter_by(patient_id=xray.patient_id).first()
                doctor = User.query.filter_by(user_id=xray.uploaded_by).first()
                if patient:
                    patient_name = patient.full_name
                if doctor:
                    doctor_name = doctor.full_name

            # Фильтрация по ФИО пациента (ищем по patientName, как на фронте)
            if data.get('patientName'):
                if not patient or data['patientName'].lower() not in patient_name.lower():
                    continue

            # Фильтрация по врачу (ищем по doctor, это user_id или "admin")
            if data.get('doctor'):
                doctor_id = data['doctor']
                if doctor_id == 'admin':
                    if not doctor or not doctor.role or doctor.role.lower() != 'admin':
                        continue
                else:
                    if not doctor or str(doctor.user_id) != str(doctor_id):
                        continue

            # Фильтрация по дате анализа (dateFrom/dateTo в формате YYYY-MM-DD)
            if data.get('dateFrom'):
                if not analysis.analysis_date or str(analysis.analysis_date.date()) < data['dateFrom']:
                    continue
            if data.get('dateTo'):
                if not analysis.analysis_date or str(analysis.analysis_date.date()) > data['dateTo']:
                    continue

            interps = InterpretationResult.query.filter_by(analysis_id=analysis.analysis_id).all()
            pathology_names = []
            for interp in interps:
                pathology = Pathology.query.filter_by(pathology_id=interp.pathology_id).first()
                if pathology and pathology.name not in pathology_names:
                    pathology_names.append(pathology.name)

            ai_result_url = None
            vis_path = os.path.join(RESULTS_FOLDER, f"{analysis.analysis_id}_visualization.png")
            if os.path.exists(vis_path):
                ai_result_url = f"{BASE_URL}/api/visualizations/{analysis.analysis_id}"

            results.append({
                'date': analysis.analysis_date.isoformat() if analysis.analysis_date else None,
                'patient_name': patient_name,
                'doctor_name': doctor_name,
                'pathologies': ', '.join(pathology_names) if pathology_names else '-',
                'ai_result_url': ai_result_url,
                'execution_time': analysis.execution_time,
                'status': analysis.status
            })

        print(f"Query results: {len(results)}")
        return jsonify(results)

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@bp.route('/api/admin-stats', methods=['GET'])
def admin_stats():
    try:
        users_count = db.session.query(User).count()
        patients_count = db.session.query(Patient).count()
        # Здесь можно реализовать реальный uptime, пока просто заглушка
        uptime = "99.8%"
        # Возвращаем структуру, ожидаемую фронтом (users, patients, uptime)
        return jsonify({
            "users": users_count,
            "patients": patients_count,
            "uptime": uptime
        })
    except Exception as e:
        print(f"Ошибка при получении статистики: {str(e)}")
        return jsonify({"users": 0, "patients": 0, "uptime": "-"}), 500