# Stage 1: build the jar with Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# Stage 2: run it on a slim JRE, as a non-root user
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S recoverpro && adduser -S recoverpro -G recoverpro
COPY --from=build /app/target/*.jar app.jar
USER recoverpro:recoverpro
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
