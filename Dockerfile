FROM python:3.12-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-client \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 lantern
WORKDIR /app
COPY lanternwrt ./lanternwrt
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
USER lantern
EXPOSE 8787
ENTRYPOINT ["python", "-m", "lanternwrt.server", "--bind", "0.0.0.0"]
