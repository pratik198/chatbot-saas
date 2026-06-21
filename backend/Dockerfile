# =============================================================
# DOCKERFILE FOR SPRING BOOT BACKEND
# =============================================================
# This file tells Docker how to build and run our Spring Boot app.
#
# HOW Docker images work:
#   A Docker image is like a lightweight VM snapshot.
#   It contains the OS, Java runtime, and your application.
#   Anyone can run this image and get the exact same environment.
#
# Multi-stage build:
#   Stage 1 (build stage): uses Maven + JDK to compile and package the app
#   Stage 2 (run stage):   uses only JRE to run the compiled JAR
#   This keeps the final image smaller (no Maven, no JDK source tools).
# =============================================================

# ── STAGE 1: Build ──────────────────────────────────────────
# maven:3.9-eclipse-temurin-21 includes both Maven and JDK 21 in one image
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory inside the container
WORKDIR /app

# Copy pom.xml first — Docker caches this layer.
# If pom.xml hasn't changed, Maven won't re-download dependencies on every build.
# This is a Docker optimization trick called "dependency caching".
COPY pom.xml .

# Download all dependencies (without building the app yet)
# -B = batch mode (no interactive output), -q = quiet, dependency:go-offline = download deps
RUN mvn dependency:go-offline -B -q 2>/dev/null || mvn dependency:go-offline -B

# Now copy the source code
COPY src ./src

# Package the application into a JAR file
# -DskipTests = skip running tests during Docker build (run them in CI instead)
RUN mvn package -DskipTests -B

# ── STAGE 2: Run ─────────────────────────────────────────────
# Use only JRE (smaller than JDK — no compiler tools needed to run)
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy only the compiled JAR from the build stage
# The *.jar pattern matches whatever Maven named the JAR file
COPY --from=build /app/target/*.jar app.jar

# Expose port 8080 (the port our Spring Boot app listens on)
# This is documentation — Docker doesn't actually open the port here
EXPOSE 8080

# Run the application
# -Djava.security.egd reduces startup time on Linux by using /dev/./urandom for random numbers
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
