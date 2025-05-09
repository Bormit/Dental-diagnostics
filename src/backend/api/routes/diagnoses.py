from flask import Blueprint, jsonify, request
from ..models.models import Diagnosis, InterpretationResult, Analysis, Xray, Pathology
from ..db import db

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

        diagnosis = Diagnosis(
            patient_id=int(data['patient_id']),
            doctor_id=int(data['doctor_id']),
            diagnosis_text=data['diagnosis_text'],
            treatment_plan=data.get('treatment_plan', ''),
            result_id=int(data['result_id'])
        )
        db.session.add(diagnosis)
        db.session.commit()
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
            }
        })
    except Exception as e:
        print(f"Ошибка при сохранении заключения: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/patient-history/<patient_id>', methods=['GET'])
def get_patient_history(patient_id):
    try:
        if not patient_id:
            return jsonify({'error': 'ID пациента не предоставлен'}), 400

        # История снимков теперь из interpretation_results через join
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
        from datetime import datetime
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
