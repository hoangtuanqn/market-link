# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------
# Backend (Spring Boot 4 / Java 25 / Maven wrapper)
#   target "dev"  : chạy spring-boot:run, source được mount từ host
#   target "prod" : fat jar trên JRE gọn nhẹ
# ---------------------------------------------------------------------

FROM eclipse-temurin:25-jdk AS base
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
# Tải trước dependency + Maven plugin (spring-boot, spotless, compiler...) vào layer image;
# volume m2 của compose sẽ được khởi tạo từ nội dung này nên dev không phải tải lại
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
RUN groupadd -r spring && useradd -r -g spring spring
COPY --from=build /app/app.jar app.jar
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
