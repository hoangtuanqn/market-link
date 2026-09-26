# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------
# Backend (Spring Boot 4 / Java 25 / Maven wrapper)
#   target "dev"  : runs spring-boot:run, the source is mounted from the host
#   target "prod" : a fat jar on a slim JRE
# ---------------------------------------------------------------------

FROM eclipse-temurin:25-jdk AS base
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
# Download the dependencies + Maven plugins (spring-boot, spotless, compiler...) into an image layer up front;
# the compose m2 volume is initialized from this content so dev does not have to download again
RUN ./mvnw -B -q dependency:go-offline dependency:resolve-plugins

# ---------- dev ----------
FROM base AS dev
EXPOSE 8080 5005
CMD ["./mvnw", "-B", "spring-boot:run", \
     "-Dspring-boot.run.jvmArguments=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"]

# ---------- build ----------
FROM base AS build
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests \
    && cp target/*.jar /app/app.jar

# ---------- prod ----------
FROM eclipse-temurin:25-jre AS prod
WORKDIR /app
# the uploads-data volume is initialized from /app/uploads, so the spring user can write uploaded images
RUN groupadd -r spring && useradd -r -g spring spring \
    && mkdir -p /app/uploads && chown spring:spring /app/uploads
COPY --from=build /app/app.jar app.jar
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
