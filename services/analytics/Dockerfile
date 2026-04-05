FROM python:3.15-rc-alpine3.22

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY tracker.py .

CMD ["python", "-u", "tracker.py"]
