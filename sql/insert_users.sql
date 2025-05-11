-- Вставка пользователя-врача
INSERT INTO users (user_id, username, password_hash, full_name, role, specialty) VALUES
  (1, 'doctor', '$2b$12$exampledoctorhash', 'Иванов Иван Иванович', 'doctor', 'Стоматолог-терапевт');

-- Вставка пользователя-администратора
INSERT INTO users (user_id, username, password_hash, full_name, role, specialty) VALUES
  (2, 'admin', '$2b$12$exampleadminhash', 'Петров Петр Петрович', 'admin', NULL);

-- Примечание: замените password_hash на реальные bcrypt-хэши, сгенерированные через backend.
