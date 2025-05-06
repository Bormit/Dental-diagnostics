
CREATE TABLE neural_models (
	model_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	version VARCHAR(20) NOT NULL, 
	architecture VARCHAR(50), 
	training_data JSON, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (model_id)
)

;


CREATE TABLE pathologies (
	pathology_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	description TEXT, 
	PRIMARY KEY (pathology_id), 
	UNIQUE (code)
)

;


CREATE TABLE patients (
	patient_id INTEGER NOT NULL, 
	full_name VARCHAR(100) NOT NULL, 
	birth_date DATE NOT NULL, 
	gender VARCHAR(6) NOT NULL, 
	phone VARCHAR(20), 
	email VARCHAR(100), 
	PRIMARY KEY (patient_id)
)

;


CREATE TABLE users (
	user_id INTEGER NOT NULL, 
	username VARCHAR(50) NOT NULL, 
	password_hash VARCHAR(256) NOT NULL, 
	full_name VARCHAR(100) NOT NULL, 
	role VARCHAR(6) NOT NULL, 
	specialty VARCHAR(100), 
	PRIMARY KEY (user_id), 
	UNIQUE (username)
)

;


CREATE TABLE model_parameters (
	param_id INTEGER NOT NULL, 
	model_id INTEGER NOT NULL, 
	loss_weights JSON, 
	hyperparameters JSON, 
	calibration_method VARCHAR(50), 
	PRIMARY KEY (param_id), 
	FOREIGN KEY(model_id) REFERENCES neural_models (model_id) ON DELETE CASCADE
)

;


CREATE TABLE model_pathology_metrics (
	metric_id INTEGER NOT NULL, 
	model_id INTEGER NOT NULL, 
	pathology_id INTEGER NOT NULL, 
	sensitivity FLOAT, 
	specificity FLOAT, 
	f_measure FLOAT, 
	PRIMARY KEY (metric_id), 
	FOREIGN KEY(model_id) REFERENCES neural_models (model_id) ON DELETE CASCADE, 
	FOREIGN KEY(pathology_id) REFERENCES pathologies (pathology_id)
)

;


CREATE TABLE xrays (
	xray_id INTEGER NOT NULL, 
	patient_id INTEGER NOT NULL, 
	uploaded_by INTEGER NOT NULL, 
	file_path VARCHAR(255) NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	upload_date TIMESTAMP NOT NULL,
	status VARCHAR(8) NOT NULL, 
	PRIMARY KEY (xray_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE, 
	FOREIGN KEY(uploaded_by) REFERENCES users (user_id)
)

;


CREATE TABLE analyses (
	analysis_id INTEGER NOT NULL, 
	xray_id INTEGER NOT NULL, 
	model_id INTEGER NOT NULL, 
	analysis_date TIMESTAMP, 
	execution_time FLOAT, 
	status VARCHAR(9), 
	PRIMARY KEY (analysis_id), 
	FOREIGN KEY(xray_id) REFERENCES xrays (xray_id) ON DELETE CASCADE, 
	FOREIGN KEY(model_id) REFERENCES neural_models (model_id)
)

;


CREATE TABLE interpretation_results (
	result_id INTEGER NOT NULL, 
	analysis_id INTEGER NOT NULL, 
	pathology_id INTEGER NOT NULL, 
	probability FLOAT NOT NULL, 
	region_mask BYTEA, 
	description TEXT, 
	PRIMARY KEY (result_id), 
	FOREIGN KEY(analysis_id) REFERENCES analyses (analysis_id) ON DELETE CASCADE, 
	FOREIGN KEY(pathology_id) REFERENCES pathologies (pathology_id)
)

;


CREATE TABLE diagnoses (
	diagnosis_id INTEGER NOT NULL, 
	result_id INTEGER NOT NULL, 
	doctor_id INTEGER NOT NULL, 
	patient_id INTEGER NOT NULL, 
	diagnosis_text TEXT NOT NULL, 
	treatment_plan TEXT, 
	PRIMARY KEY (diagnosis_id), 
	FOREIGN KEY(result_id) REFERENCES interpretation_results (result_id), 
	FOREIGN KEY(doctor_id) REFERENCES users (user_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
)

;

