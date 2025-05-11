from flask import Blueprint, jsonify, request
from datetime import datetime
from ..models.models import Diagnosis, InterpretationResult, Analysis, Xray, Pathology, Appointment
from ..db import db
from datetime import datetime, timedelta

bp = Blueprint('diagnoses', __name__)


@bp.route('/api/diagnoses', methods=['POST'])
def save_diagnosis():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Данные не предоставлены'}), 400

        required_fields = ['patient_id', 'doctor_id', 'diagnosis_text', 'result_id']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({'error': f'Не заполнены обязательные поля: {", ".join(missing)}'}), 400

        # Получаем patient_id и doctor_id для поиска записи
        patient_id = int(data['patient_id'])
        doctor_id = int(data['doctor_id'])

        diagnosis = Diagnosis(
            patient_id=patient_id,
            doctor_id=doctor_id,
            diagnosis_text=data['diagnosis_text'],
            treatment_plan=data.get('treatment_plan', ''),
            result_id=int(data['result_id'])
            # Удалено поле created_at, так как его нет в модели
        )
        db.session.add(diagnosis)
        db.session.commit()

        # После сохранения диагноза ищем и обновляем статус соответствующей записи
        update_appointment_status(patient_id, doctor_id)

        # Возвращаем полный diagnosis-объект для немедленного отображения на фронте
        return jsonify({
            'status': 'success',
            'diagnosis_id': diagnosis.diagnosis_id,
            'diagnosis': {
                'diagnosis_id': diagnosis.diagnosis_id,
                'patient_id': diagnosis.patient_id,
                'doctor_id': diagnosis.doctor_id,
                'diagnosis_text': diagnosis.diagnosis_text,
                'treatment_plan': diagnosis.treatment_plan,
                'result_id': diagnosis.result_id
                # Удалено поле created_at из ответа
            }
        })
    except Exception as e:
        print(f"Ошибка при сохранении заключения: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Найдите функцию update_appointment_status
def update_appointment_status(patient_id, doctor_id):
    try:
        # Ищем активные назначения для данного пациента и врача
        appointments = Appointment.query.filter_by(
            patient_id=patient_id,
            doctor_id=doctor_id,
            status='scheduled'  # Только запланированные
        ).order_by(Appointment.appointment_date.desc()).all()

        if not appointments:
            # Ищем назначения "in_progress" (в процессе)
            appointments = Appointment.query.filter_by(
                patient_id=patient_id,
                doctor_id=doctor_id,
                status='in_progress'
            ).order_by(Appointment.appointment_date.desc()).all()

        # Обновляем статус для найденного назначения
        if appointments:
            appointment = appointments[0]
            appointment.status = 'completed'  # Меняем статус на "завершено"
            appointment.updated_at = datetime.now()  # Обновляем дату изменения

            db.session.commit()
            print(f"Статус назначения {appointment.appointment_id} обновлен на 'completed'")
            return True

        print(f"Не найдено активных назначений для пациента {patient_id} и врача {doctor_id}")
        return False

    except Exception as e:
        print(f"Ошибка при обновлении статуса назначения: {str(e)}")
        db.session.rollback()
        return False


@bp.route('/api/patient-history/<patient_id>', methods=['GET'])
def get_patient_history(patient_id):
    try:
        if not patient_id:
            return jsonify({'error': 'ID пациента не предоставлен'}), 400

        # История снимков из interpretation_results через join
        interpretations = (
            db.session.query(InterpretationResult, Analysis)
            .join(Analysis, InterpretationResult.analysis_id == Analysis.analysis_id)
            .join(Xray, Analysis.xray_id == Xray.xray_id)
            .filter(Xray.patient_id == patient_id)
            .order_by(InterpretationResult.result_id.desc())
            .all()
        )

        # Группируем по analysis_id, собираем все result_id для анализа
        history_by_analysis = {}
        for interp, analysis in interpretations:
            if interp.analysis_id not in history_by_analysis:
                history_by_analysis[interp.analysis_id] = {
                    'result_ids': [],
                    'result_id': interp.result_id,
                    'analysis_id': interp.analysis_id,
                    'upload_date': analysis.analysis_date.isoformat() if analysis.analysis_date else '',
                    'description': interp.description,
                    'diagnosis_text': "",
                    'treatment_plan': ""
                }
            history_by_analysis[interp.analysis_id]['result_ids'].append(interp.result_id)

        # Для каждого анализа ищем Diagnosis по любому result_id
        for analysis_id, item in history_by_analysis.items():
            diagnosis = Diagnosis.query.filter(Diagnosis.result_id.in_(item['result_ids'])).first()
            if diagnosis:
                item['diagnosis_text'] = diagnosis.diagnosis_text or ""
                item['treatment_plan'] = diagnosis.treatment_plan or ""

        history = list(history_by_analysis.values())

        return jsonify({
            'patient_id': patient_id,
            'history': history
        })
    except Exception as e:
        print(f"Ошибка при получении истории пациента: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/appointments/update-status', methods=['POST', 'OPTIONS'])
def update_appointment_status_endpoint():
    """
    Обновляет статус записи на прием.
    Принимает JSON с полями:
    - appointment_id: ID записи
    - status: Новый статус
    - appointment_type: Тип приема (для отслеживания действия)
    """
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', '*')
        return response

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Данные не предоставлены'}), 400

        appointment_id = data.get('appointment_id')
        status = data.get('status')
        appointment_type = data.get('appointment_type')

        if not appointment_id or not status:
            return jsonify({'error': 'ID записи и новый статус обязательны'}), 400

        # Находим запись в БД
        appointment = Appointment.query.filter_by(appointment_id=appointment_id).first()
        if not appointment:
            return jsonify({'error': 'Запись не найдена'}), 404

        # Обновляем статус
        appointment.status = status

        # Если есть поле для отслеживания типа действия, обновляем его
        if hasattr(appointment, 'current_action'):
            appointment.current_action = appointment_type

        # Обновляем время изменения
        appointment.updated_at = datetime.now()

        # Сохраняем изменения
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Статус записи {appointment_id} обновлен на {status}'
        })

    except Exception as e:
        print(f"Ошибка при обновлении статуса записи: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/api/save-conclusion', methods=['POST'])
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
        import uuid
        conclusion_id = str(uuid.uuid4())

        # Формируем структуру заключения
        from datetime import datetime, timedelta
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
        import os
        import json
        from ..config import RESULTS_FOLDER
        conclusion_file = os.path.join(RESULTS_FOLDER, f"conclusion_{conclusion_id}.json")
        with open(conclusion_file, 'w') as f:
            json.dump(conclusion_data, f, indent=2)
        print(f"Заключение сохранено: {conclusion_file}")

        # Обновляем статус соответствующей записи, если указан patient_id и doctor_id
        if data.get('patient_id') and data.get('doctor_id'):
            try:
                patient_id = int(data['patient_id'])
                doctor_id = int(data['doctor_id'])
                update_appointment_status(patient_id, doctor_id)
            except Exception as e:
                print(f"Ошибка при обновлении статуса назначения: {str(e)}")

        # Добавляем полные данные в ответ для немедленного отображения
        return jsonify({
            'status': 'success',
            'conclusion_id': conclusion_id,
            'message': 'Заключение успешно сохранено',
            'conclusion': conclusion_data  # Добавляем полные данные заключения
        })
    except Exception as e:
        print(f"Ошибка при сохранении заключения: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/get-conclusion/<image_id>', methods=['GET'])
def get_conclusion(image_id):
    """Получение заключения по ID снимка"""
    try:
        import os
        import json
        import glob
        from ..config import RESULTS_FOLDER

        # Ищем все файлы заключений в папке
        pattern = os.path.join(RESULTS_FOLDER, "conclusion_*.json")
        conclusion_files = glob.glob(pattern)

        # Перебираем файлы и ищем заключение с нужным image_id
        for file_path in conclusion_files:
            try:
                with open(file_path, 'r') as f:
                    conclusion_data = json.load(f)
                    if conclusion_data.get('image_id') == image_id:
                        return jsonify(conclusion_data)
            except Exception as e:
                print(f"Ошибка при чтении файла {file_path}: {str(e)}")
                continue

        # Если заключение не найдено
        return jsonify({'error': 'Заключение не найдено'}), 404

    except Exception as e:
        print(f"Ошибка при получении заключения: {str(e)}")
        return jsonify({'error': str(e)}), 500