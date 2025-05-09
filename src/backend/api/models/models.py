from ..db import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON, ENUM
from sqlalchemy import LargeBinary

from werkzeug.security import generate_password_hash, check_password_hash

# Создание ENUM типов
user_role = ENUM('admin', 'doctor', name='user_role_enum', create_type=True)
image_status = ENUM('pending', 'analyzed', name='image_status_enum', create_type=True)
analysis_status = ENUM('pending', 'completed', 'failed', name='analysis_status_enum', create_type=True)
gender_type = ENUM('male', 'female', 'other', name='gender_enum', create_type=True)
appointment_type_enum = ENUM(
    'consultation', 'treatment', 'diagnostics', 'follow_up', 'emergency',
    name='appointment_type_enum', create_type=True
)
appointment_status_enum = ENUM(
    'scheduled', 'completed', 'cancelled',
    name='appointment_status_enum', create_type=True
)

# Модели
class User(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(user_role, nullable=False)
    specialty = db.Column(db.String(100))

    # Отношения
    xrays = db.relationship('Xray', backref='uploaded_by_user')
    diagnoses = db.relationship('Diagnosis', backref='doctor', foreign_keys='Diagnosis.doctor_id')
    appointments = db.relationship('Appointment', backref='doctor', foreign_keys='Appointment.doctor_id')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Patient(db.Model):
    __tablename__ = 'patients'

    patient_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    gender = db.Column(gender_type, nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))

    # Отношения
    xrays = db.relationship('Xray', backref='patient')
    diagnoses = db.relationship('Diagnosis', backref='patient', foreign_keys='Diagnosis.patient_id')
    appointments = db.relationship('Appointment', back_populates='patient')


class NeuralModel(db.Model):
    __tablename__ = 'neural_models'

    model_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    version = db.Column(db.String(20), nullable=False)
    architecture = db.Column(db.String(50))
    training_data = db.Column(JSON)
    is_active = db.Column(db.Boolean, nullable=False, default=False)

    # Отношения
    parameters = db.relationship('ModelParameter', backref='model')
    metrics = db.relationship('ModelPathologyMetric', backref='model')
    analyses = db.relationship('Analysis', backref='model')


class ModelParameter(db.Model):
    __tablename__ = 'model_parameters'

    param_id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('neural_models.model_id', ondelete='CASCADE'), nullable=False)
    loss_weights = db.Column(JSON)
    hyperparameters = db.Column(JSON)
    calibration_method = db.Column(db.String(50))


class Pathology(db.Model):
    __tablename__ = 'pathologies'

    pathology_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    description = db.Column(db.Text)

    # Отношения
    metrics = db.relationship('ModelPathologyMetric', backref='pathology')
    interpretation_results = db.relationship('InterpretationResult', backref='pathology')


class ModelPathologyMetric(db.Model):
    __tablename__ = 'model_pathology_metrics'

    metric_id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('neural_models.model_id', ondelete='CASCADE'), nullable=False)
    pathology_id = db.Column(db.Integer, db.ForeignKey('pathologies.pathology_id'), nullable=False)
    sensitivity = db.Column(db.Float)
    specificity = db.Column(db.Float)
    f_measure = db.Column(db.Float)


class Xray(db.Model):
    __tablename__ = 'xrays'

    xray_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.patient_id', ondelete='CASCADE'), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    upload_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(8), nullable=False, default='pending')

    # Отношения
    analyses = db.relationship('Analysis', backref='xray')


class Analysis(db.Model):
    __tablename__ = 'analyses'

    analysis_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    xray_id = db.Column(db.Integer, db.ForeignKey('xrays.xray_id', ondelete='CASCADE'), nullable=False)
    model_id = db.Column(db.Integer, db.ForeignKey('neural_models.model_id'), nullable=False)
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)
    execution_time = db.Column(db.Float)
    status = db.Column(analysis_status, default='pending')

    # Отношения
    interpretation_results = db.relationship('InterpretationResult', backref='analysis')


class InterpretationResult(db.Model):
    __tablename__ = 'interpretation_results'

    result_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    analysis_id = db.Column(db.Integer, db.ForeignKey('analyses.analysis_id', ondelete='CASCADE'), nullable=False)
    pathology_id = db.Column(db.Integer, db.ForeignKey('pathologies.pathology_id'), nullable=False)
    probability = db.Column(db.Float, nullable=False)
    region_mask = db.Column(LargeBinary)  # правильный тип для бинарных данных в PostgreSQL
    description = db.Column(db.Text)

    # Отношения
    diagnoses = db.relationship('Diagnosis', backref='result', foreign_keys='Diagnosis.result_id')


class Diagnosis(db.Model):
    __tablename__ = 'diagnoses'
    diagnosis_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    result_id = db.Column(db.Integer, db.ForeignKey('interpretation_results.result_id'), nullable=False)  # теперь NOT NULL
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.patient_id'))
    diagnosis_text = db.Column(db.Text)
    treatment_plan = db.Column(db.Text)


class Appointment(db.Model):
    __tablename__ = 'appointments'

    appointment_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.patient_id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer)
    appointment_type = db.Column(appointment_type_enum, nullable=False)
    status = db.Column(appointment_status_enum, nullable=False)
    reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)

    # Отношения
    patient = db.relationship('Patient', back_populates='appointments')