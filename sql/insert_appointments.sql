INSERT INTO appointments (
    patient_id, doctor_id, appointment_date, duration_minutes, appointment_type, status, reason
) VALUES
    (1, 1, '2025-05-06 09:00:00', 30, 'consultation', 'scheduled', 'Первичный осмотр'),
    (2, 1, '2025-05-06 09:30:00', 60, 'treatment', 'scheduled', 'Лечение кариеса'),
    (3, 2, '2025-05-06 10:00:00', 45, 'diagnostics', 'scheduled', 'Диагностика периапикального поражения'),
    (4, 1, '2025-05-06 11:00:00', 30, 'consultation', 'scheduled', 'Консультация по имплантации'),
    (5, 2, '2025-05-06 11:30:00', 60, 'treatment', 'scheduled', 'Лечение глубокого кариеса'),
    (6, 1, '2025-05-06 13:00:00', 30, 'follow_up', 'scheduled', 'Контрольный осмотр'),
    (7, 2, '2025-05-06 13:30:00', 45, 'treatment', 'scheduled', 'Эндодонтическое лечение'),
    (8, 1, '2025-05-06 14:30:00', 30, 'consultation', 'scheduled', 'Консультация по ретинированному зубу'),
    (9, 2, '2025-05-06 15:00:00', 60, 'emergency', 'scheduled', 'Острая боль в области 4.6'),
    (10, 1, '2025-05-06 16:00:00', 45, 'treatment', 'scheduled', 'Пломбирование 2.5');
