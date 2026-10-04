FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core curl && rm -rf /var/lib/apt/lists/* && groupadd --system careerx && useradd --system --gid careerx careerx
WORKDIR /app
COPY --from=build /build/target/careerx-1.0.0.jar app.jar
USER careerx
EXPOSE 8080
HEALTHCHECK --interval=30s --start-period=45s --timeout=5s CMD curl --fail http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
