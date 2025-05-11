from flask import Blueprint, jsonify, request
from datetime import date, datetime
from sqlalchemy import or_, and_, cast
from sqlalchemy.orm import joinedload

# Импорт всех необходимых моделей
from ..models.models import (
    Patient, Appointment, Diagnosis, Pathology,
    InterpretationResult, Analysis, Xray, NeuralModel, User
)
from ..db import db
from src.backend.api.utils.analysis import get_last_diagnosis

bp = Blueprint('patients', __name__)

@bp.route('/api/patients/today', methods=['GET'])
def get_patients_today():
    today = date.today()
    appointments = (
        Appointment.query
        .options(joinedload(Appointment.patient))
        .filter(Appointment.appointment_date.cast(db.Date) == today)
        .all()
    )
    
    result = []
    for appt in appointments:
        p = appt.patient
        if not p:
            continue  # важно: пропускать если нет пациента
        if p.birth_date:
            age = today.year - p.birth_date.year - ((today.month, today.day) < (p.birth_date.month, p.birth_date.day))
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
            "card": str(p.patient_id),  # исправлено: теперь всегда номер карты!
            "reason": appt.reason,
            "doctor_id": appt.doctor_id
        })
    
    return jsonify(result)

@bp.route('/api/patients/by-date', methods=['GET'])
def get_patients_by_date():
    """
    Возвращает список пациентов с назначениями на выбранную дату (параметр date=YYYY-MM-DD).
    """
    from datetime import datetime
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
            "card": str(p.patient_id),
            "reason": appt.reason,
            "doctor_id": appt.doctor_id
        })
    return jsonify(result)

@bp.route('/api/patients', methods=['GET', 'POST'])
def patients_handler():
    if request.method == 'GET':
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
                })
            return jsonify(result)
        except Exception as e:
            print(f"Ошибка при получении списка пациентов: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
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


@bp.route('/api/patient-search', methods=['POST'])
def patient_search():
    """
    Поиск пациента по ФИО, дате рождения и полу, по номеру карты (patient_id),
    а также расширенный поиск по диагнозу (через interpretation_results), врачу и периоду посещения.
    """
    data = request.get_json() or request.form
    name = data.get('name', '').strip()
    birth_date = data.get('birthDate', '').strip()
    gender = data.get('gender', '').strip()
    card_number = data.get('cardNumber', '').strip()
    diagnosis = data.get('diagnosis', '').strip()
    attending_doctor = data.get('attendingDoctor', '').strip()
    visit_date_from = data.get('visitDateFrom', '').strip()
    visit_date_to = data.get('visitDateTo', '').strip()

    print(
        f"Поиск пациентов с параметрами: name={name}, birthDate={birth_date}, gender={gender}, cardNumber={card_number}, diagnosis={diagnosis}")

    # Если указан номер карты (patient_id) — ищем только по нему
    if card_number:
        try:
            patient = Patient.query.filter_by(patient_id=int(card_number)).first()
        except Exception:
            return jsonify({'error': 'Некорректный номер карты'}), 400
        if not patient:
            return jsonify({'patient': None}), 200
        # Последнее посещение
        last_appointment = (
            Appointment.query
            .filter_by(patient_id=patient.patient_id)
            .order_by(Appointment.appointment_date.desc())
            .first()
        )
        last_visit = ""
        if last_appointment and last_appointment.appointment_date:
            last_visit = last_appointment.appointment_date.strftime('%d.%m.%Y')
        # --- diagnoses ---
        diagnoses = Diagnosis.query.filter_by(patient_id=patient.patient_id).order_by(Diagnosis.diagnosis_id.desc()).all()
        diagnoses_list = [
            {
                'diagnosis_id': d.diagnosis_id,
                'diagnosis_text': d.diagnosis_text
            } for d in diagnoses
        ]
        last_diag = get_last_diagnosis(diagnoses_list)
        return jsonify({
            'patient': {
                'id': str(patient.patient_id),
                'name': patient.full_name,
                'birthDate': patient.birth_date.strftime('%Y-%m-%d') if patient.birth_date else '',
                'gender': patient.gender,
                'cardNumber': str(patient.patient_id),
                'phone': patient.phone or "",
                'lastVisit': last_visit,
                'diagnoses': diagnoses_list,
                'lastDiagnosis': last_diag['diagnosis_text'] if last_diag else '-'
            }
        })

    # Если расширенный поиск (по диагнозу, врачу, периоду)
    if diagnosis or attending_doctor or (visit_date_from or visit_date_to):
        from sqlalchemy import or_, and_
        query = db.session.query(Patient).distinct()

        # --- Поиск по диагнозу через interpretation_results ---
        if diagnosis:
            print(f"Поиск по диагнозу: {diagnosis}")
            # Получаем pathology_id по коду или названию (Pathology.code или Pathology.name)
            diagnosis_filter = or_(
                Pathology.code.ilike(f"%{diagnosis}%"),
                Pathology.name.ilike(f"%{diagnosis}%")
            )
            # Получаем pathology_id
            pathology_objs = Pathology.query.filter(diagnosis_filter).all()
            pathology_ids = [p.pathology_id for p in pathology_objs]
            print(f"Найдены pathology_ids: {pathology_ids}")
            if not pathology_ids:
                return jsonify({'patients': []})

            # Получаем analysis_id из interpretation_results по pathology_id
            analysis_ids = [ir.analysis_id for ir in InterpretationResult.query.filter(
                InterpretationResult.pathology_id.in_(pathology_ids)
            ).all()]
            print(f"Найдены analysis_ids: {analysis_ids}")
            if not analysis_ids:
                return jsonify({'patients': []})

            # Получаем xray_id из Analysis
            xray_ids = [a.xray_id for a in Analysis.query.filter(Analysis.analysis_id.in_(analysis_ids)).all()]
            print(f"Найдены xray_ids: {xray_ids}")
            if not xray_ids:
                return jsonify({'patients': []})

            # Получаем patient_id из Xray
            patient_ids_diag = [x.patient_id for x in Xray.query.filter(Xray.xray_id.in_(xray_ids)).all()]
            print(f"Найдены patient_ids: {patient_ids_diag}")
            if not patient_ids_diag:
                return jsonify({'patients': []})

            query = query.filter(Patient.patient_id.in_(patient_ids_diag))

        # --- Поиск по врачу и/или периоду через appointments ---
        if attending_doctor or visit_date_from or visit_date_to:
            query = query.join(Appointment, Patient.patient_id == Appointment.patient_id)
            if attending_doctor:
                query = query.filter(Appointment.doctor_id == attending_doctor)
            if visit_date_from:
                try:
                    from datetime import datetime
                    date_from = datetime.strptime(visit_date_from, '%Y-%m-%d')
                    query = query.filter(Appointment.appointment_date >= date_from)
                except Exception:
                    return jsonify({'error': 'Некорректный формат даты начала периода'}), 400
            if visit_date_to:
                try:
                    from datetime import datetime
                    date_to = datetime.strptime(visit_date_to, '%Y-%m-%d')
                    query = query.filter(Appointment.appointment_date <= date_to)
                except Exception:
                    return jsonify({'error': 'Некорректный формат даты конца периода'}), 400

        patients = query.all()
        print(f"Всего найдено пациентов: {len(patients)}")
        result = []
        for p in patients:
            last_appointment = (
                Appointment.query
                .filter_by(patient_id=p.patient_id)
                .order_by(Appointment.appointment_date.desc())
                .first()
            )
            last_visit = ""
            if last_appointment and last_appointment.appointment_date:
                last_visit = last_appointment.appointment_date.strftime('%d.%m.%Y')
            # --- diagnoses ---
            diagnoses = Diagnosis.query.filter_by(patient_id=p.patient_id).order_by(Diagnosis.diagnosis_id.desc()).all()
            diagnoses_list = [
                {
                    'diagnosis_id': d.diagnosis_id,
                    'diagnosis_text': d.diagnosis_text
                } for d in diagnoses
            ]
            last_diag = get_last_diagnosis(diagnoses_list)
            result.append({
                'id': str(p.patient_id),
                'name': p.full_name,
                'birthDate': p.birth_date.strftime('%Y-%m-%d') if p.birth_date else '',
                'gender': p.gender,
                'cardNumber': str(p.patient_id),
                'phone': p.phone or "",
                'lastVisit': last_visit,
                'diagnoses': diagnoses_list,
                'lastDiagnosis': last_diag['diagnosis_text'] if last_diag else '-'
            })
        return jsonify({'patients': result})

    # Обычный поиск по ФИО, дате рождения и полу
    if name and birth_date and gender:
        try:
            from datetime import datetime
            birth_date_obj = datetime.strptime(birth_date, '%Y-%m-%d').date()
        except Exception:
            return jsonify({'error': 'Некорректный формат даты рождения'}), 400
        patient = Patient.query.filter(
            Patient.full_name == name,
            Patient.birth_date == birth_date_obj,
            Patient.gender == gender
        ).first()
        if not patient:
            return jsonify({'patient': None}), 200
        last_appointment = (
            Appointment.query
            .filter_by(patient_id=patient.patient_id)
            .order_by(Appointment.appointment_date.desc())
            .first()
        )
        last_visit = ""
        if last_appointment and last_appointment.appointment_date:
            last_visit = last_appointment.appointment_date.strftime('%d.%m.%Y')
        # --- diagnoses ---
        diagnoses = Diagnosis.query.filter_by(patient_id=patient.patient_id).order_by(Diagnosis.diagnosis_id.desc()).all()
        diagnoses_list = [
            {
                'diagnosis_id': d.diagnosis_id,
                'diagnosis_text': d.diagnosis_text
            } for d in diagnoses
        ]
        last_diag = get_last_diagnosis(diagnoses_list)
        return jsonify({
            'patient': {
                'id': str(patient.patient_id),
                'name': patient.full_name,
                'birthDate': patient.birth_date.strftime('%Y-%m-%d') if patient.birth_date else '',
                'gender': patient.gender,
                'cardNumber': str(patient.patient_id),
                'phone': patient.phone or "",
                'lastVisit': last_visit,
                'diagnoses': diagnoses_list,
                'lastDiagnosis': last_diag['diagnosis_text'] if last_diag else '-'
            }
        })

    # Если ничего не подошло
    return jsonify({
                       'error': 'Необходимо указать ФИО, дату рождения и пол или номер карты, либо параметры расширенного поиска'}), 400

@bp.route('/api/doctors', methods=['GET'])
def get_doctors():
    """
    Возвращает список докторов для выпадающего списка поиска.
    """
    doctors = User.query.filter_by(role='doctor').all()
    result = []
    for doc in doctors:
        result.append({
            "id": doc.user_id,
            "full_name": doc.full_name,
            "specialty": doc.specialty
        })
    return jsonify(result)

@bp.route('/api/conclusions', methods=['GET'])
def get_conclusions():
    diagnoses = Diagnosis.query.order_by(Diagnosis.diagnosis_id.desc()).all()
    result = []
    for d in diagnoses:
        patient = Patient.query.filter_by(patient_id=d.patient_id).first()
        doctor = User.query.filter_by(user_id=d.doctor_id).first()
        # Найти последний Appointment до Diagnosis (или ближайший)
        appointment = (
            Appointment.query
            .filter_by(patient_id=d.patient_id)
            .filter(Appointment.appointment_date <= getattr(d, 'created_at', datetime.max))
            .order_by(Appointment.appointment_date.desc())
            .first()
        )
        if appointment and appointment.appointment_date:
            date_full = appointment.appointment_date.strftime('%d.%m.%Y')
        elif hasattr(d, 'created_at') and d.created_at:
            date_full = d.created_at.strftime('%d.%m.%Y')
        else:
            date_full = ""
        result.append({
            "diagnosis_id": d.diagnosis_id,
            "date": date_full,
            "patient": patient.full_name if patient else "",
            "doctor": doctor.full_name if doctor else "",
            "diagnosis_text": d.diagnosis_text,
            "treatment_plan": d.treatment_plan,
            "status": getattr(d, "status", "Подтверждено")
        })
    return jsonify(result)

@bp.route('/api/conclusions-search', methods=['POST'])
def conclusions_search():
    data = request.get_json() or request.form
    patient_name = data.get('patientName', '').strip()
    date_from = data.get('dateFrom', '').strip()
    date_to = data.get('dateTo', '').strip()
    doctor_id = data.get('doctor', '').strip()
    diagnosis_text = data.get('diagnosis', '').strip()
    recommendations = data.get('recommendations', '').strip()
    status = data.get('status', '').strip()

    query = Diagnosis.query

    if doctor_id:
        query = query.filter(Diagnosis.doctor_id == doctor_id)
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
            # Фильтруем по дате приема (Appointment)
            query = query.join(Appointment, Appointment.patient_id == Diagnosis.patient_id)
            query = query.filter(Appointment.appointment_date >= date_from_obj)
        except Exception:
            pass
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
            query = query.join(Appointment, Appointment.patient_id == Diagnosis.patient_id)
            query = query.filter(Appointment.appointment_date <= date_to_obj)
        except Exception:
            pass
    if patient_name:
        query = query.join(Patient, Diagnosis.patient_id == Patient.patient_id)
        query = query.filter(Patient.full_name.ilike(f"%{patient_name}%"))
    if diagnosis_text:
        query = query.filter(Diagnosis.diagnosis_text.ilike(f"%{diagnosis_text}%"))
    if recommendations:
        query = query.filter(Diagnosis.treatment_plan.ilike(f"%{recommendations}%"))
    if hasattr(Diagnosis, "status") and status:
        query = query.filter(Diagnosis.status == status)

    diagnoses = query.order_by(Diagnosis.diagnosis_id.desc()).all()
    result = []
    for d in diagnoses:
        patient = Patient.query.filter_by(patient_id=d.patient_id).first()
        doctor = User.query.filter_by(user_id=d.doctor_id).first()
        # Найти последний Appointment до Diagnosis (или ближайший)
        appointment = (
            Appointment.query
            .filter_by(patient_id=d.patient_id)
            .filter(Appointment.appointment_date <= getattr(d, 'created_at', datetime.max))
            .order_by(Appointment.appointment_date.desc())
            .first()
        )
        if appointment and appointment.appointment_date:
            date_full = appointment.appointment_date.strftime('%d.%m.%Y')
        elif hasattr(d, 'created_at') and d.created_at:
            date_full = d.created_at.strftime('%d.%m.%Y')
        else:
            date_full = ""
        result.append({
            "diagnosis_id": d.diagnosis_id,
            "date": date_full,
            "patient": patient.full_name if patient else "",
            "doctor": doctor.full_name if doctor else "",
            "diagnosis_text": d.diagnosis_text,
            "treatment_plan": d.treatment_plan,
            "status": getattr(d, "status", "Подтверждено")
        })
    return jsonify(result)
