from src.backend.api.rest import app, db
from src.backend.api.models.models import User, Patient, NeuralModel  # импортируйте все модели
import io


def dump_sql():
    buffer = io.StringIO()

    # Получаем метаданные из всех моделей
    metadata = db.metadata

    # Генерируем SQL для создания схемы
    from sqlalchemy.schema import CreateTable
    for table in metadata.sorted_tables:
        buffer.write(str(CreateTable(table)) + ';\n\n')

    return buffer.getvalue()


# Сохраняем SQL в файл
with open('../../../sql/create_tables.sql', 'w') as f:
    f.write(dump_sql())

print("SQL успешно сгенерирован в файле create_tables.sql")