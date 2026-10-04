FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/tsconfig.json frontend/vite.config.ts ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS backend
WORKDIR /build/backend
COPY backend/pom.xml ./
COPY backend/src ./src
COPY --from=frontend /build/frontend/dist ./src/main/resources/static
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core curl && rm -rf /var/lib/apt/lists/* && groupadd --system careerx && useradd --system --gid careerx careerx
WORKDIR /app
COPY --from=backend /build/backend/target/careerx-1.0.0.jar app.jar
USER careerx
EXPOSE 8080
HEALTHCHECK --interval=30s --start-period=60s --timeout=5s CMD curl --fail "http://localhost:${PORT:-8080}/actuator/health" || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
