package com.chatbot.saas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * WHY this class exists:
 *   Every Spring Boot application needs exactly one "entry point" class.
 *   This is it — the first thing that runs when you start the application.
 *
 * WHAT it does:
 *   1. Starts the embedded Tomcat web server (no need to install Apache/Nginx)
 *   2. Connects to PostgreSQL database
 *   3. Scans all packages under com.chatbot.saas and registers beans (components)
 *   4. Loads all configuration from application.properties
 *
 * HOW it works:
 *   @SpringBootApplication is a shortcut for three annotations:
 *     - @Configuration      → This class can define Spring beans
 *     - @EnableAutoConfiguration → Auto-configure based on dependencies in pom.xml
 *     - @ComponentScan     → Scan this package + all sub-packages for @Component classes
 *
 *   @EnableJpaAuditing enables automatic @CreatedDate / @LastModifiedDate on entities.
 *   Without this, those timestamp fields won't be auto-populated.
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync  // Enables @Async: lets methods run in background threads (used for document processing)
public class ChatbotSaasApplication {

    public static void main(String[] args) {
        // This one line boots the entire application
        SpringApplication.run(ChatbotSaasApplication.class, args);
    }
}
