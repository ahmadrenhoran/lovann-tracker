FROM n8nio/n8n:latest

USER root

WORKDIR /app/service
COPY service/package*.json ./
RUN npm ci --omit=dev

COPY service ./service-src
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh && chown -R node:node /app

ENV LOVANN_PORT=7860
ENV N8N_INTERNAL_PORT=5678
ENV N8N_PORT=5678
ENV N8N_LISTEN_ADDRESS=0.0.0.0
ENV N8N_USER_FOLDER=/data/.n8n

EXPOSE 7860

ENTRYPOINT []
CMD ["/app/start.sh"]
