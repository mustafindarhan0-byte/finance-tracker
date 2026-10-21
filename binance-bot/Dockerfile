FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MPLBACKEND=Agg \
    ALERTS_DB_PATH=/app/data/alerts.db

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot ./bot
RUN useradd --create-home botuser && mkdir -p /app/data && chown botuser /app/data
USER botuser
VOLUME ["/app/data"]

CMD ["python", "-m", "bot"]
