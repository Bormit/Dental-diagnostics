from flask import Blueprint, jsonify, request
from ..models.models import Appointment
from ..db import db
from datetime import datetime

bp = Blueprint('appointments', __name__)


@bp.route('/api/appointments/update-status', methods=['POST', 'OPTIONS'])
def update_appointment_status():
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


@bp.route('/api/appointments/find', methods=['POST', 'OPTIONS'])
def find_appointment():
    """
    Находит активное назначение для пациента по ID пациента и типу приема.
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

        patient_id = data.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'ID пациента обязателен'}), 400

        # Базовый запрос - ищем по patient_id
        query = Appointment.query.filter_by(patient_id=patient_id)

        # Ищем активные назначения
        appointments = query.filter(
            Appointment.status.in_(['scheduled', 'in_progress'])
        ).order_by(Appointment.appointment_date.desc()).limit(5).all()

        if not appointments:
            # Если активных назначений нет, ищем последнее назначение
            appointment = query.order_by(Appointment.appointment_date.desc()).first()
            if not appointment:
                return jsonify({'message': 'Назначения для пациента не найдены'}), 404

            return jsonify({
                'appointment_id': appointment.appointment_id,
                'status': appointment.status,
                'appointment_type': appointment.appointment_type,
                'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None
            })

        # Берем самое последнее назначение
        appointment = appointments[0]

        return jsonify({
            'appointment_id': appointment.appointment_id,
            'status': appointment.status,
            'appointment_type': appointment.appointment_type,
            'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None
        })

    except Exception as e:
        print(f"Ошибка при поиске назначения: {str(e)}")
        return jsonify({'error': str(e)}), 500