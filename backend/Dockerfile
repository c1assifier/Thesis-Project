FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY scripts ./scripts
COPY app ./app

EXPOSE 8000

RUN chmod +x ./scripts/start.sh

CMD ["./scripts/start.sh"]
