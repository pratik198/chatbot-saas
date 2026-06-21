# ChatBot SaaS — Complete Learning Guide
### Java Spring Boot for Node.js Engineers

> **How to use this doc:** Every concept is explained using real code from THIS project.
> File paths link directly to the source. Read each section, then open the referenced file.
> By the end you will understand every line of this codebase and have resume-ready knowledge.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Java vs Node.js — Mental Map](#2-java-vs-nodejs--mental-map)
3. [Maven — The npm of Java](#3-maven--the-npm-of-java)
4. [Java Language Fundamentals](#4-java-language-fundamentals)
5. [Spring Boot — The Framework](#5-spring-boot--the-framework)
6. [Dependency Injection (IoC)](#6-dependency-injection-ioc)
7. [The 3-Layer Architecture](#7-the-3-layer-architecture)
8. [REST Controllers](#8-rest-controllers)
9. [Services — Business Logic](#9-services--business-logic)
10. [PostgreSQL + JPA/Hibernate](#10-postgresql--jpahibernate)
11. [Repositories — Data Access](#11-repositories--data-access)
12. [Lombok — Bye Boilerplate](#12-lombok--bye-boilerplate)
13. [Spring Security + JWT](#13-spring-security--jwt)
14. [Validation & Exception Handling](#14-validation--exception-handling)
15. [Async Processing](#15-async-processing)
16. [WebClient — HTTP Calls to External APIs](#16-webclient--http-calls-to-external-apis)
17. [Qdrant — Vector Database](#17-qdrant--vector-database)
18. [RAG — How the AI Answers Questions](#18-rag--how-the-ai-answers-questions)
19. [Docker & Docker Compose](#19-docker--docker-compose)
20. [Resume Topics Checklist](#20-resume-topics-checklist)
21. [Study Path — What to Learn Next](#21-study-path--what-to-learn-next)

---

## 1. Architecture Overview

```
Browser / Frontend (React + Vite)
        │
        │  HTTP requests (JSON)
        ▼
┌─────────────────────────────────────────────┐
│         Spring Boot Backend (Java)          │
│                                             │
│  [Controller] → [Service] → [Repository]   │
│       ↕              ↕                      │
│  [JWT Filter]   [OllamaService]             │
│                      ↕                      │
│             [EmbeddingService]              │
│                      ↕                      │
│              [QdrantService]                │
└─────────────────────────────────────────────┘
        │                     │
        ▼                     ▼
 PostgreSQL               Qdrant
 (structured data)        (vector embeddings)
        │
        ▼
   Ollama (AI)
   running locally
```

**In Node.js terms:**
- Spring Boot = Express.js (but with everything built-in)
- JPA/Hibernate = Sequelize / Prisma (ORM)
- Spring Security = Passport.js + middleware
- WebClient = axios / node-fetch
- Maven = npm / package.json

---

## 2. Java vs Node.js — Mental Map

| Concept | Node.js | Java (this project) |
|---------|---------|---------------------|
| Runtime | `node index.js` | JVM (Java Virtual Machine) |
| Type system | Dynamic (TypeScript = optional) | Static (types are mandatory) |
| Package manager | npm / package.json | Maven / pom.xml |
| Framework | Express.js | Spring Boot |
| ORM | Prisma / Sequelize | Hibernate / JPA |
| HTTP server | http / express | Embedded Tomcat (built into Spring Boot) |
| Middleware | `app.use(fn)` | Filter / Interceptor |
| Route handler | `app.get('/path', handler)` | `@GetMapping("/path")` |
| JSON body | `req.body` | `@RequestBody YourDto` |
| Query param | `req.query.id` | `@RequestParam Long id` |
| URL param | `req.params.id` | `@PathVariable Long id` |
| Env vars | `process.env.PORT` | `@Value("${server.port}")` |
| `async/await` | `async function f()` | `@Async` (different mechanism) |
| `Promise` | `Promise<T>` | `Mono<T>` (WebFlux) or `CompletableFuture<T>` |
| `require('x')` | CommonJS import | `import com.chatbot.saas.X` |
| Class | `class Foo {}` | `public class Foo {}` |
| Interface | TypeScript interface | Java `interface` |
| No return value | `void` function | `void` method |
| Error handling | `try/catch`, `.catch()` | `try/catch`, `@ExceptionHandler` |
| Logging | `console.log` | `log.info()` (SLF4J + Logback) |
| Config file | `.env` | `application.properties` |

---

## 3. Maven — The npm of Java

**File:** `backend/pom.xml`

Maven is the build tool. `pom.xml` (Project Object Model) = `package.json`.

```xml
<!-- pom.xml — equivalent to package.json -->

<parent>
  <!-- This is like extending a base config — gives you sensible defaults -->
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.2.0</version>
</parent>

<dependencies>
  <!-- npm equivalent: { "express": "^4.18.0" } -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
</dependencies>
```

### Key Maven commands (like npm scripts)

| npm | Maven |
|-----|-------|
| `npm install` | `mvn dependency:resolve` |
| `npm run build` | `mvn package` |
| `npm test` | `mvn test` |
| `npm start` | `mvn spring-boot:run` |
| `node_modules/` | `~/.m2/repository/` (local cache) |

### "Starters" — Spring Boot's Bundle Dependencies

In `pom.xml` you'll see `spring-boot-starter-X`. Each starter pulls in a group of related libraries:

| Starter | What it includes |
|---------|-----------------|
| `spring-boot-starter-web` | Spring MVC + Embedded Tomcat + Jackson (JSON) |
| `spring-boot-starter-security` | Spring Security (auth + authorization) |
| `spring-boot-starter-data-jpa` | Hibernate + Spring Data JPA |
| `spring-boot-starter-validation` | Bean Validation (like Joi/Zod) |
| `spring-boot-starter-webflux` | Reactive HTTP client (WebClient) |

---

## 4. Java Language Fundamentals

As a Node.js dev, Java will feel verbose at first. Here's what's different.

### 4.1 Static Typing

```java
// Java — types are MANDATORY
String name = "John";         // cannot hold a number
int age = 25;                  // cannot hold a string
Long id = 1L;                  // Long (capital L) is an Object; long (lowercase) is a primitive
boolean isActive = true;

// JavaScript equivalent
const name = "John";          // dynamic — can be reassigned to anything
```

### 4.2 Classes are Everything

In Java, ALL code lives inside a class. There are no standalone functions.

```java
// Java — every function is a method inside a class
public class AuthService {
    public LoginResponse login(LoginRequest request) {
        // logic here
    }
}

// JavaScript equivalent
function login(request) {  // can exist outside a class
    // logic here
}
```

### 4.3 Access Modifiers

```java
public class User {
    public  String email;      // accessible from everywhere
    private String password;   // only inside this class
    protected String role;     // inside this class + subclasses
    // (no modifier) = package-private: only within same package folder
}
```

### 4.4 Generics — Like TypeScript Generics

```java
// Java generic: List<String> means "a list that only holds Strings"
List<String> names = new ArrayList<>();
names.add("Alice");

// TypeScript equivalent
const names: string[] = [];
names.push("Alice");

// More complex: Map<String, Object> = { [key: string]: any }
Map<String, Object> payload = new HashMap<>();
payload.put("chatbotId", 1L);
payload.put("text", "Our refund policy...");
```

### 4.5 Optional — Like Maybe/null safety

```java
// Java Optional wraps a value that might be null
Optional<User> user = userRepository.findByEmail("john@example.com");

// Three ways to unwrap:
user.orElseThrow(() -> new RuntimeException("Not found"));  // throw if absent
user.orElse(defaultUser);                                   // default if absent
user.isPresent()                                            // check if present

// Node.js equivalent
const user = await User.findOne({ email: 'john@example.com' });
if (!user) throw new Error('Not found');
```

### 4.6 Enums

```java
// In User.java
public enum Role {
    ADMIN,
    USER
}

// Usage
User.Role role = User.Role.ADMIN;

// Java enums are full classes — can have methods and fields
// TypeScript equivalent:
// enum Role { ADMIN = "ADMIN", USER = "USER" }
```

### 4.7 The `@` Symbol — Annotations

Annotations are metadata that Spring reads at startup to configure behavior.
They're like decorators in TypeScript/NestJS.

```java
@RestController          // "this class handles HTTP requests"
@RequestMapping("/api")  // "all routes in this class start with /api"
public class AuthController {

    @PostMapping("/login")  // "this method handles POST /api/login"
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        ...
    }
}
```

---

## 5. Spring Boot — The Framework

### 5.1 What Spring Boot Does for You

Spring Boot is "opinionated" — it auto-configures everything based on what's in your pom.xml:

- Added `spring-boot-starter-web`? → Starts Tomcat on port 8080 automatically.
- Added `spring-boot-starter-data-jpa` + PostgreSQL driver? → Connects to the DB automatically.
- Added `spring-boot-starter-security`? → Locks down all endpoints automatically.

You override defaults in `application.properties`.

### 5.2 The Entry Point

**File:** `backend/src/main/java/com/chatbot/saas/ChatbotSaasApplication.java`

```java
@SpringBootApplication      // combines @Configuration + @EnableAutoConfiguration + @ComponentScan
@EnableJpaAuditing          // auto-fills @CreatedDate / @LastModifiedDate
@EnableAsync                // allows @Async methods to run in background threads
public class ChatbotSaasApplication {
    public static void main(String[] args) {
        SpringApplication.run(ChatbotSaasApplication.class, args);
        // This one line starts the whole app:
        // - Scans all classes under com.chatbot.saas
        // - Creates all @Bean, @Service, @Repository, @Component, @Controller objects
        // - Starts embedded Tomcat
        // - Connects to PostgreSQL
    }
}
```

**Node.js equivalent:**
```javascript
// index.js
const express = require('express');
const app = express();
app.listen(8080);
```

### 5.3 application.properties — The .env File

**File:** `backend/src/main/resources/application.properties`

```properties
# Like .env in Node.js, but with type-safe key access
server.port=8080

# Environment variable support: ${ENV_VAR:default_value}
# Equivalent to: process.env.DB_HOST || 'localhost'
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:5432/chatbot_saas

jwt.secret=${JWT_SECRET:fallback_secret}
jwt.expiration=86400000
```

Reading these values in Java:
```java
@Value("${jwt.secret}")         // reads "jwt.secret" from application.properties
private String secretKey;

@Value("${jwt.expiration}")
private long jwtExpiration;

// Node.js equivalent:
// const secretKey = process.env.JWT_SECRET;
```

### 5.4 Package Structure — Folders = Namespaces

```
com.chatbot.saas
    ├── auth/               ← Authentication (login/register)
    │   ├── AuthController.java
    │   ├── AuthService.java
    │   ├── JwtUtil.java
    │   └── dto/            ← Data Transfer Objects (request/response shapes)
    ├── chatbot/            ← Chatbot CRUD
    ├── chat/               ← AI conversations
    ├── knowledgebase/      ← PDF/FAQ/text processing
    ├── lead/               ← Lead capture
    ├── user/               ← User profile
    ├── handoff/            ← Agent handoff inbox
    ├── analytics/          ← Analytics data
    ├── widget/             ← Embeddable widget endpoint
    └── common/             ← Shared utilities
        ├── config/         ← Security, CORS, JWT filter
        ├── exception/      ← Global error handler
        └── response/       ← ApiResponse wrapper
```

**Key rule:** The `package` declaration at the top of each file must match its folder path.

---

## 6. Dependency Injection (IoC)

This is the biggest mental shift from Node.js. In Node.js you `require()` what you need. In Spring, you *declare* what you need and Spring *injects* it for you.

### The Problem DI Solves

```javascript
// Node.js — you manage the dependency yourself
const userRepo = require('./userRepository');
const jwtUtil = require('./jwtUtil');

function login(email, password) {
    const user = userRepo.findByEmail(email);
    return jwtUtil.generateToken(user);
}
```

```java
// Java Spring — you declare dependencies, Spring wires them
@Service
public class AuthService {

    // These are NOT new'd up by you. Spring creates them and injects them.
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // @RequiredArgsConstructor (Lombok) generates this constructor
    // Spring sees the constructor parameters and injects the matching beans
    public AuthService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }
}
```

### Why is DI useful?

1. **Testing:** You can swap the real `UserRepository` for a mock in tests without changing `AuthService`.
2. **Single instances:** By default, Spring creates ONE instance of each class (singleton) — shared across all requests efficiently.
3. **No manual wiring:** Spring figures out the order to create things automatically.

### The Stereotype Annotations (tells Spring "create this as a bean")

```java
@Component      // generic Spring-managed bean
@Service        // same as @Component but semantically "this is a service"
@Repository     // same as @Component + translates DB exceptions
@Controller     // same as @Component + handles HTTP requests
@RestController // @Controller + @ResponseBody (returns JSON automatically)
@Configuration  // @Component + defines @Bean methods
```

### @Bean — Manual Bean Definition

For classes you don't own (third-party libraries), you can't add `@Service` to them. Instead:

```java
// In SecurityConfig.java
@Bean                         // "Spring, create this and manage it"
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}

// Now anywhere you need PasswordEncoder, Spring injects this same instance
@Service
public class AuthService {
    private final PasswordEncoder passwordEncoder;  // Spring injects the BCryptPasswordEncoder
    ...
}
```

---

## 7. The 3-Layer Architecture

Every feature follows this pattern. It's like MVC but for REST APIs.

```
HTTP Request
    ↓
[Controller]     ← Receives request, calls service, returns response
    ↓                 (like Express route handlers — should be THIN)
[Service]        ← Business logic lives here
    ↓                 (orchestrates repositories, calls external APIs)
[Repository]     ← Talks to the database
    ↓                 (auto-generated SQL from method names)
[PostgreSQL]
```

### Why 3 layers?

- **Separation of concerns:** Each layer has ONE job.
- **Testability:** You can test service logic without a real HTTP request or DB.
- **Maintainability:** Changing DB (PostgreSQL → MySQL) only touches Repository layer.

### Example — Login Flow

```
POST /api/auth/login
    ↓
AuthController.login()          ← validates input, calls service
    ↓
AuthService.login()             ← authenticates credentials, generates JWT
    ↓
UserRepository.findByEmail()    ← SELECT * FROM users WHERE email = ?
    ↓
PostgreSQL
```

---

## 8. REST Controllers

**File:** `backend/src/main/java/com/chatbot/saas/auth/AuthController.java`

```java
@RestController              // = @Controller + auto JSON serialization
@RequestMapping("/api/auth") // base path for all routes in this class
@RequiredArgsConstructor     // Lombok: generates constructor for `final` fields (DI)
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        //   ↑                  ↑
        //   validate input     parse JSON body into RegisterRequest object

        LoginResponse response = authService.register(request);

        // ResponseEntity lets you control the HTTP status code
        return ResponseEntity
            .status(HttpStatus.CREATED)   // 201
            .body(ApiResponse.success("Registration successful", response));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        //                    ↑
        //                    .ok() = 200 status shortcut
    }
}
```

### HTTP Method Annotations

```java
@GetMapping("/chatbots")          // GET    /api/chatbots
@PostMapping("/chatbots")         // POST   /api/chatbots
@PutMapping("/chatbots/{id}")     // PUT    /api/chatbots/1
@PatchMapping("/chatbots/{id}")   // PATCH  /api/chatbots/1
@DeleteMapping("/chatbots/{id}")  // DELETE /api/chatbots/1
```

### Parameter Annotations

```java
// URL path variable:  GET /chatbots/42
@GetMapping("/{id}")
public ChatbotResponse get(@PathVariable Long id) { ... }
// Node.js: app.get('/:id', (req) => req.params.id)

// Query parameter: GET /chatbots?page=2&size=10
@GetMapping
public List<ChatbotResponse> list(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size) { ... }
// Node.js: req.query.page

// Request body (JSON):  POST /chatbots  { "name": "Support Bot" }
@PostMapping
public ChatbotResponse create(@Valid @RequestBody CreateChatbotRequest request) { ... }
// Node.js: req.body.name

// Currently logged-in user (from JWT):
@GetMapping("/me")
public UserProfileResponse getProfile(@AuthenticationPrincipal User user) { ... }
// This is the User object Spring Security set after verifying the JWT
```

### ApiResponse — Consistent Response Wrapper

**File:** `backend/src/main/java/com/chatbot/saas/common/response/ApiResponse.java`

Every endpoint returns the same shape:
```json
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "eyJ...", "userId": 1 }
}
```

This makes frontend consumption predictable. Node.js equivalent:
```javascript
res.json({ success: true, message: '...', data: result });
```

---

## 9. Services — Business Logic

**File:** `backend/src/main/java/com/chatbot/saas/auth/AuthService.java`

```java
@Service              // tells Spring to manage this class
@RequiredArgsConstructor
@Slf4j                // Lombok: adds `log` logger (SLF4J)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional    // if ANY step throws, roll back ALL DB changes
    public LoginResponse register(RegisterRequest request) {
        // 1. Check email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        // 2. Build User entity using Builder pattern (Lombok)
        User user = User.builder()
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword())) // BCrypt
            .firstName(request.getFirstName())
            .role(User.Role.USER)
            .isActive(true)
            .build();

        // 3. Save to PostgreSQL
        User savedUser = userRepository.save(user);
        log.info("User registered: {}", savedUser.getId());

        // 4. Generate JWT, return response
        String token = jwtUtil.generateToken(savedUser);
        return buildLoginResponse(savedUser, token);
    }
}
```

### @Transactional — Database Transactions

```java
@Transactional
public void doSomething() {
    userRepo.save(user);           // Step 1
    chatbotRepo.save(chatbot);     // Step 2
    // If Step 2 throws, Step 1 is ROLLED BACK automatically
}

// Node.js equivalent with Prisma:
// await prisma.$transaction([
//   prisma.user.create(...),
//   prisma.chatbot.create(...)
// ]);
```

### Logging with @Slf4j

```java
@Slf4j        // Lombok annotation that adds: private static final Logger log = ...
public class AuthService {
    public void register(...) {
        log.debug("Debug details: {}", someVar);   // development only
        log.info("User registered: {}", userId);   // normal operations
        log.warn("Risky thing happened: {}", msg); // warnings
        log.error("Something broke: {}", err);     // errors
    }
}
// {} is a placeholder — safer and faster than string concatenation
// Like console.log(`User registered: ${userId}`)
```

---

## 10. PostgreSQL + JPA/Hibernate

### 10.1 What JPA/Hibernate Does

JPA (Java Persistence API) = specification (interface).
Hibernate = implementation (like Prisma implements the Prisma schema).

You write Java classes → Hibernate generates SQL → PostgreSQL stores data.

### 10.2 Entity — Maps a Java Class to a DB Table

**File:** `backend/src/main/java/com/chatbot/saas/user/User.java`

```java
@Entity                         // "This class is a database table"
@Table(name = "users")          // PostgreSQL table name
@Data                           // Lombok: getters, setters, toString
@Builder                        // Lombok: User.builder().email("x").build()
@NoArgsConstructor              // Lombok: new User() — no-arg constructor (JPA needs this)
@AllArgsConstructor             // Lombok: constructor with ALL fields
@EntityListeners(AuditingEntityListener.class)  // auto-fill timestamps
public class User implements UserDetails {

    @Id                                          // PRIMARY KEY
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // AUTO INCREMENT
    private Long id;

    @Column(unique = true, nullable = false)     // UNIQUE NOT NULL in SQL
    private String email;

    @Column(name = "password_hash", nullable = false)  // column named "password_hash"
    private String passwordHash;                        // field named "passwordHash" (camelCase)

    @Enumerated(EnumType.STRING)    // store as "ADMIN"/"USER" text, not 0/1
    private Role role;

    @CreatedDate
    @Column(name = "created_at", updatable = false)   // auto-set on INSERT, never UPDATE
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")    // auto-set on every UPDATE
    private LocalDateTime updatedAt;
}
```

This generates the equivalent SQL:
```sql
CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role         VARCHAR(50) NOT NULL DEFAULT 'USER',
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMP NOT NULL,
    updated_at   TIMESTAMP NOT NULL
);
```

### 10.3 Relationships Between Tables

In this project, `Chatbot` belongs to a `User`:
```java
@Entity
public class Chatbot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;   // Foreign key — references users.id
    
    // Note: This project uses explicit userId Long fields rather than
    // @ManyToOne @JoinColumn relationships. Both approaches work.
    // The @ManyToOne approach would be:
    // @ManyToOne
    // @JoinColumn(name = "user_id")
    // private User user;
}
```

### 10.4 DDL Auto — Schema Management

In `application.properties`:
```properties
spring.jpa.hibernate.ddl-auto=update
```

| Value | Behavior | Use When |
|-------|----------|----------|
| `create` | Drop + recreate tables every startup | Never in prod |
| `create-drop` | Drop on shutdown | Tests only |
| `update` | Add new columns/tables, never drop | Development |
| `validate` | Error if schema doesn't match entities | Production |
| `none` | Do nothing | You manage migrations manually |

**For production:** use Flyway or Liquibase for proper migration tracking (like Prisma migrate).

### 10.5 show-sql — See What Hibernate is Doing

```properties
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

This prints every SQL query to the console — extremely useful for learning and debugging:
```sql
select u1_0.id, u1_0.email, u1_0.first_name ...
from users u1_0
where u1_0.email = ?
```

---

## 11. Repositories — Data Access

**File:** `backend/src/main/java/com/chatbot/saas/user/UserRepository.java`

Spring Data JPA auto-generates SQL from method names. No SQL needed.

```java
// extends JpaRepository<EntityType, PrimaryKeyType>
public interface UserRepository extends JpaRepository<User, Long> {

    // Spring reads the method name and generates:
    // SELECT * FROM users WHERE email = ?
    Optional<User> findByEmail(String email);

    // SELECT COUNT(*) FROM users WHERE email = ? > 0
    boolean existsByEmail(String email);
}
```

### Method Name Conventions

```java
// JpaRepository already gives you these for free:
repository.findById(1L)           // SELECT * WHERE id = 1
repository.findAll()              // SELECT * (careful — loads everything)
repository.save(entity)           // INSERT or UPDATE
repository.delete(entity)         // DELETE
repository.count()                // SELECT COUNT(*)
repository.existsById(1L)         // SELECT COUNT(*) WHERE id = 1 > 0

// Custom methods — Spring generates SQL from the method name:
findByEmail(String email)                     // WHERE email = ?
findByEmailAndIsActive(String email, boolean active)  // WHERE email = ? AND is_active = ?
findByUserIdOrderByCreatedAtDesc(Long userId) // WHERE user_id = ? ORDER BY created_at DESC
countByConversationId(Long id)               // SELECT COUNT(*) WHERE conversation_id = ?
deleteByConversationId(Long id)              // DELETE WHERE conversation_id = ?
existsByEmail(String email)                  // SELECT 1 WHERE email = ? LIMIT 1
findTop10ByUserIdOrderByCreatedAtDesc(Long userId)  // LIMIT 10
```

### Custom JPQL Queries

For complex queries, use `@Query`:
```java
@Query("SELECT c FROM Conversation c WHERE c.chatbotId = :chatbotId AND c.userId = :userId ORDER BY c.updatedAt DESC")
List<Conversation> findConversations(@Param("chatbotId") Long chatbotId, @Param("userId") Long userId);
```

---

## 12. Lombok — Bye Boilerplate

Lombok is an annotation processor that generates Java code at compile time.
Without it, Java is extremely verbose.

**Without Lombok:**
```java
public class User {
    private String email;
    private String firstName;

    public User() {}
    public User(String email, String firstName) {
        this.email = email;
        this.firstName = firstName;
    }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    // + equals(), hashCode(), toString() ...
}
```

**With Lombok:**
```java
@Data           // generates: getters + setters + equals + hashCode + toString
@Builder        // generates: User.builder().email("x").firstName("y").build()
@NoArgsConstructor   // generates: new User()
@AllArgsConstructor  // generates: new User(email, firstName)
public class User {
    private String email;
    private String firstName;
}
```

### Lombok Annotations Used in This Project

| Annotation | What it generates |
|------------|------------------|
| `@Data` | Getters + Setters + `equals()` + `hashCode()` + `toString()` |
| `@Builder` | Builder pattern: `User.builder().field(value).build()` |
| `@NoArgsConstructor` | `public User() {}` |
| `@AllArgsConstructor` | `public User(String email, ...)` |
| `@RequiredArgsConstructor` | Constructor for `final` fields only (used with DI) |
| `@Slf4j` | `private static final Logger log = LoggerFactory.getLogger(Foo.class)` |
| `@Value` | Immutable class (all fields final, no setters) — used for DTOs |

---

## 13. Spring Security + JWT

This is the most complex part. Let's break it into pieces.

### 13.1 How JWT Authentication Works (High Level)

```
1. User POSTs /api/auth/login with email + password
2. Server verifies credentials, generates JWT, returns it
3. Client stores JWT (localStorage or memory)
4. Every future request includes:  Authorization: Bearer eyJhbGci...
5. Server's JwtAuthFilter reads the JWT, validates it, sets the user in context
6. Controller can now access the current user via @AuthenticationPrincipal
```

### 13.2 JWT Structure

A JWT looks like: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiJ9          ← Base64 of: {"alg":"HS256"}
.eyJzdWIiOiJqb2huQGUuY29tIn0  ← Base64 of: {"sub":"john@e.com","exp":...}
.SflKxwRJSMeKKF2QT4fwpMeJf36  ← HMAC-SHA256 signature (cannot be faked without the secret)
```

### 13.3 JwtUtil — Creates and Validates Tokens

**File:** `backend/src/main/java/com/chatbot/saas/auth/JwtUtil.java`

```java
@Component
@Slf4j
public class JwtUtil {

    @Value("${jwt.secret}") private String secretKey;
    @Value("${jwt.expiration}") private long jwtExpiration;

    // Create a JWT for a user
    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .subject(userDetails.getUsername())  // email stored in "sub" claim
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
            .signWith(getSigningKey())           // sign with HMAC-SHA256
            .compact();
    }

    // Read the email from a JWT
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Check: email matches + not expired
    public boolean isTokenValid(String token, UserDetails userDetails) {
        return extractEmail(token).equals(userDetails.getUsername()) && !isTokenExpired(token);
    }
}
```

### 13.4 JwtAuthFilter — Runs on Every Request

**File:** `backend/src/main/java/com/chatbot/saas/common/config/JwtAuthFilter.java`

This is like Express middleware:
```javascript
// Node.js equivalent
app.use((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        const user = verifyToken(token);
        req.user = user;  // attach user to request
    }
    next();
});
```

In Spring:
```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ... {
        // 1. Read "Authorization: Bearer eyJ..." header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);  // no token → skip
            return;
        }

        // 2. Extract token (remove "Bearer ")
        String jwt = authHeader.substring(7);

        // 3. Extract email from token
        String userEmail = jwtUtil.extractEmail(jwt);

        // 4. Load user from DB
        UserDetails userDetails = userService.loadUserByUsername(userEmail);

        // 5. Validate token
        if (jwtUtil.isTokenValid(jwt, userDetails)) {
            // 6. Set user as authenticated in Spring's context
            UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authToken);
            // Now @AuthenticationPrincipal works in controllers
        }

        // 7. Continue to controller
        filterChain.doFilter(request, response);
    }
}
```

### 13.5 SecurityConfig — The Security Rules

**File:** `backend/src/main/java/com/chatbot/saas/common/config/SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())          // disable CSRF for REST APIs
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()    // public: no JWT needed
                .requestMatchers("/api/widget/**").permitAll()  // public: widget API
                .anyRequest().authenticated()                   // everything else: JWT required
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // no sessions
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // industry standard for hashing passwords
    }
}
```

### 13.6 UserDetails — Spring Security's User Interface

**File:** `backend/src/main/java/com/chatbot/saas/user/User.java`

Our `User` entity implements `UserDetails` so Spring Security can work with it directly:

```java
public class User implements UserDetails {

    // Spring Security calls these:
    @Override
    public String getUsername() { return email; }         // our "username" = email

    @Override
    public String getPassword() { return passwordHash; }  // the BCrypt hash

    @Override
    public boolean isEnabled() { return isActive; }       // deactivated users = rejected

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
        // e.g. "ROLE_USER" or "ROLE_ADMIN"
    }
    // ... other required methods all return true (keep simple for now)
}
```

### 13.7 CORS — Why the Frontend Can Call the Backend

```
Frontend: http://localhost:3000
Backend:  http://localhost:8080
```

Different ports = different "origins". Browsers block cross-origin requests by default.
CORS headers tell the browser: "this origin is allowed to call me."

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:3001"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    // ...
}
```

In Node.js: `app.use(cors({ origin: 'http://localhost:3000' }))`

---

## 14. Validation & Exception Handling

### 14.1 Bean Validation

**File:** `backend/src/main/java/com/chatbot/saas/auth/dto/RegisterRequest.java`

```java
public class RegisterRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "First name is required")
    private String firstName;
}
```

These fire when `@Valid` is on the `@RequestBody`:
```java
public ResponseEntity<...> register(@Valid @RequestBody RegisterRequest request) {
//                                   ↑
//                          validation runs BEFORE this method is called
//                          if invalid → 400 Bad Request automatically
```

### Common Validation Annotations

| Annotation | Validates |
|------------|-----------|
| `@NotNull` | Field is not null |
| `@NotBlank` | String is not null/empty/whitespace |
| `@Email` | Valid email format |
| `@Size(min=8)` | String length |
| `@Min(0)`, `@Max(100)` | Number range |
| `@Pattern(regexp="...")` | Regex match |

### 14.2 Global Exception Handler

**File:** `backend/src/main/java/com/chatbot/saas/common/exception/GlobalExceptionHandler.java`

Without this, exceptions show raw Java stack traces to the frontend — bad UX and a security risk.

```java
@RestControllerAdvice   // applies to ALL @RestController classes
@Slf4j
public class GlobalExceptionHandler {

    // Catches @Valid failures
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
        // collect all field errors, return 400
    }

    // Catches our custom "not found" exception
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404).body(ApiResponse.error(ex.getMessage()));
    }

    // Catches wrong password
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<?>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(401).body(ApiResponse.error("Invalid email or password"));
    }

    // Catch-all fallback
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<?>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
    }
}
```

**Node.js equivalent:**
```javascript
app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Something went wrong' });
});
```

---

## 15. Async Processing

**File:** `backend/src/main/java/com/chatbot/saas/knowledgebase/DocumentService.java`

PDF processing takes 10–30 seconds. We can't block the HTTP request that long.

### The Pattern

```java
// 1. HTTP request arrives: save Document with status=PROCESSING, return 202 immediately
@Transactional
public DocumentResponse uploadPdf(Long chatbotId, MultipartFile file) {
    Document doc = Document.builder()
        .status(Document.ProcessingStatus.PROCESSING)
        ...
        .build();
    Document saved = documentRepository.save(doc);

    processDocumentAsync(saved.getId());  // start background work, don't wait

    return DocumentResponse.fromDocument(saved);  // return IMMEDIATELY with PROCESSING status
}

// 2. Background thread runs this (NOT the HTTP request thread)
@Async   // ← runs in Spring's thread pool, not the Tomcat request thread
public void processDocumentAsync(Long documentId) {
    // extract text → chunk → embed → store in Qdrant → update status=READY
    // (takes 10-30 seconds)
    document.setStatus(Document.ProcessingStatus.READY);
    documentRepository.save(document);
}
```

**@EnableAsync** must be on the main class (`ChatbotSaasApplication`) to activate this.

**Node.js equivalent:**
```javascript
app.post('/upload', async (req, res) => {
    const doc = await db.document.create({ status: 'PROCESSING' });
    res.json(doc);              // respond immediately

    processInBackground(doc.id)  // fire and forget
        .catch(console.error);
});
```

---

## 16. WebClient — HTTP Calls to External APIs

**File:** `backend/src/main/java/com/chatbot/saas/chat/OllamaService.java`

Spring WebClient is the modern HTTP client (replaces RestTemplate). Used to call Ollama and Qdrant.

```java
WebClient client = WebClient.builder()
    .baseUrl("http://localhost:11434")
    .build();

// POST request with JSON body, get response as Map
Map<?, ?> response = client
    .post()
    .uri("/api/chat")
    .contentType(MediaType.APPLICATION_JSON)
    .bodyValue(requestBody)      // auto-serializes to JSON
    .retrieve()
    .bodyToMono(Map.class)       // parse response JSON into Map
    .block();                    // block until response arrives (synchronous)
```

### Reactive vs Blocking

`.block()` makes it synchronous (like `await` in Node.js).

The full reactive chain without `.block()`:
```java
client.post().uri("/api/chat").bodyValue(body)
    .retrieve()
    .bodyToMono(Map.class)           // returns Mono<Map> (like Promise<Map>)
    .subscribe(response -> {         // like .then(response => {})
        // handle response async
    });
```

**Node.js equivalent:**
```javascript
const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
});
const data = await response.json();
```

---

## 17. Qdrant — Vector Database

**File:** `backend/src/main/java/com/chatbot/saas/knowledgebase/qdrant/QdrantService.java`

### What is a Vector Database?

Regular DB stores text. You search with `WHERE text LIKE '%refund%'`.
Problem: searching for "give me my money back" won't match "refund policy".

Vector DB stores embeddings — lists of ~768 numbers that capture semantic meaning.
"Give me my money back" and "refund policy" end up with similar vectors.
Qdrant finds the closest vectors in milliseconds — **semantic search**.

### Key Concepts

```
Collection = table in SQL
Point = row in SQL = { id, vector, payload }
Vector = float[] of 768 numbers (for nomic-embed-text)
Payload = JSON metadata attached to the vector
```

### Operations

```java
// Create collection (once)
PUT /collections/chatbot_knowledge
{ "vectors": { "size": 768, "distance": "Cosine" } }

// Store a chunk embedding
PUT /collections/chatbot_knowledge/points
{ "points": [{ "id": "uuid", "vector": [0.12, -0.45, ...], "payload": { "text": "..." } }] }

// Search for similar text
POST /collections/chatbot_knowledge/points/search
{ "vector": [query embedding], "limit": 3, "filter": { "must": [{ "key": "chatbotId", "match": { "value": 1 } }] } }
```

### The Pipeline

```
"What is your refund policy?"
    ↓ EmbeddingService.embed()
[0.12, -0.45, 0.88, ...768 numbers...]
    ↓ QdrantService.searchSimilar()
[Top 3 closest document chunks]
    ↓ injected into system prompt
Ollama answers accurately using the chunks
```

---

## 18. RAG — How the AI Answers Questions

**File:** `backend/src/main/java/com/chatbot/saas/chat/ChatService.java`

RAG = Retrieval Augmented Generation.

### The Full Chat Pipeline

```java
private SendMessageResponse processMessage(Conversation conversation, Chatbot chatbot, String userMessage) {

    // STEP 1: Save user's message to PostgreSQL
    messageRepository.save(Message.builder().content(userMessage).role(user).build());

    // STEP 2: Embed the user's question (convert text → 768 numbers)
    float[] queryEmbedding = embeddingService.embed(userMessage);
    // "What is your refund policy?" → [0.12, -0.45, 0.88, ...]

    // STEP 3: Search Qdrant for relevant chunks
    List<Map<String, Object>> chunks = qdrantService.searchSimilar(queryEmbedding, chatbot.getId(), 3);
    // Returns: ["Our return policy allows returns within 30 days", "No receipt needed", ...]

    // STEP 4: Build the system prompt (chatbot identity + knowledge context)
    String systemPrompt = buildSystemPrompt(chatbot, chunks);
    // "You are SupportBot. Relevant info: [1] Returns within 30 days. [2] No receipt needed."

    // STEP 5: Load recent conversation history (for follow-up questions)
    List<Message> history = messageRepository.findByConversationId(conversation.getId());

    // STEP 6: Assemble the Ollama messages array
    List<Map<String, String>> ollamaMessages = [
        { "role": "system",    "content": systemPrompt },
        { "role": "user",      "content": "What is your refund policy?" },    // history
        { "role": "assistant", "content": "30 days, no receipt needed." },    // history
        { "role": "user",      "content": "What if I bought it as a gift?" } // CURRENT
    ];

    // STEP 7: Call Ollama
    String aiResponse = ollamaService.chat(ollamaMessages);

    // STEP 8: Save AI response to PostgreSQL
    messageRepository.save(Message.builder().content(aiResponse).role(assistant).build());
}
```

### Why RAG Beats Fine-tuning

| Approach | Pros | Cons |
|----------|------|------|
| No context | Fast | AI doesn't know your business |
| Fine-tuning | AI "remembers" data permanently | Expensive, slow, static |
| RAG | Dynamic, always up-to-date, cheap | Slightly slower (search step) |

---

## 19. Docker & Docker Compose

### 19.1 Dockerfile — Backend

**File:** `backend/Dockerfile`

```dockerfile
# Multi-stage build — two stages:

# STAGE 1: Compile the Java app (needs JDK + Maven)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first (Docker layer caching)
# If pom.xml didn't change, Maven downloads are cached
COPY pom.xml .
RUN mvn dependency:go-offline -B   # download all dependencies

COPY src ./src
RUN mvn package -DskipTests -B     # compile + package into .jar

# STAGE 2: Run the compiled app (needs only JRE, not JDK)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Why multi-stage?**
- Stage 1 image (Maven + JDK): ~500MB
- Stage 2 image (JRE only): ~150MB
- We discard Stage 1 after building — production image is smaller and more secure.

**Node.js equivalent:**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### 19.2 Docker Compose — Orchestrating All Services

**File:** `docker-compose.yml`

Starts all 4 services with one command: `docker-compose up --build`

```yaml
services:

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chatbot_saas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"      # host:container (avoids conflicts with local postgres)
    volumes:
      - postgres_data:/var/lib/postgresql/data  # persist data across restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]

  qdrant:
    image: qdrant/qdrant:v1.7.0
    ports:
      - "6337:6333"

  backend:
    build: ./backend
    environment:
      DB_HOST: postgres      # service name = hostname inside Docker network
      DB_PORT: 5432
      OLLAMA_BASE_URL: http://host.docker.internal:11434  # access host machine
    depends_on:
      postgres:
        condition: service_healthy  # wait for postgres healthcheck to pass
    ports:
      - "8089:8080"

  frontend:
    build: ./frontend
    ports:
      - "3001:80"
    depends_on:
      - backend
```

### Key Docker Concepts

| Concept | Explanation |
|---------|-------------|
| **Image** | Blueprint (frozen snapshot). Like a class in OOP. |
| **Container** | Running instance of an image. Like an object (instance of a class). |
| **Volume** | Persistent storage. Survives container restarts. |
| **Network** | Docker Compose services talk to each other by service name (e.g., `postgres`, `qdrant`). |
| **Port mapping** | `"5434:5432"` = host port 5434 maps to container port 5432 |
| `depends_on` | Start order guarantee. `backend` waits for `postgres` health check. |
| `host.docker.internal` | Special DNS name to reach the host machine from inside a container. |

### Docker Commands to Know

```bash
docker-compose up --build     # build images + start all services
docker-compose down           # stop + remove containers
docker-compose logs -f backend # stream backend logs
docker-compose ps             # see running containers

docker ps                     # list all running containers
docker exec -it chatbot_postgres psql -U postgres chatbot_saas  # connect to DB
docker images                 # list built images
```

---

## 20. Resume Topics Checklist

For every topic below, you can say: "I implemented this in my ChatBot SaaS project."

### Java

- [ ] Static typing, generics (`List<T>`, `Map<K,V>`, `Optional<T>`)
- [ ] OOP: classes, interfaces, enums, inheritance
- [ ] Builder pattern (Lombok `@Builder`)
- [ ] Exception handling (custom exceptions, try/catch)
- [ ] Java 21 features (records, text blocks, pattern matching)

### Spring Boot

- [ ] `@SpringBootApplication` and auto-configuration
- [ ] Dependency Injection (`@Autowired`, `@RequiredArgsConstructor`, `@Bean`)
- [ ] REST controllers (`@RestController`, `@GetMapping`, `@PostMapping`, etc.)
- [ ] `@RequestBody`, `@PathVariable`, `@RequestParam`, `@AuthenticationPrincipal`
- [ ] `ResponseEntity` and HTTP status codes
- [ ] `application.properties` and `@Value`
- [ ] `@Transactional` for atomic DB operations
- [ ] `@Async` for background processing
- [ ] `@Valid` + Bean Validation (`@NotBlank`, `@Email`, `@Size`)
- [ ] Global exception handling (`@RestControllerAdvice`, `@ExceptionHandler`)
- [ ] Spring WebFlux `WebClient` for HTTP calls

### Spring Security

- [ ] JWT authentication (stateless, no sessions)
- [ ] `OncePerRequestFilter` (custom security filter)
- [ ] `SecurityFilterChain` configuration
- [ ] BCrypt password hashing
- [ ] `UserDetails` interface implementation
- [ ] CORS configuration
- [ ] Role-based access control (`ROLE_USER`, `ROLE_ADMIN`)

### JPA / Hibernate

- [ ] `@Entity`, `@Table`, `@Column`, `@Id`, `@GeneratedValue`
- [ ] `@CreatedDate`, `@LastModifiedDate`, `@EntityListeners`
- [ ] `@Enumerated(EnumType.STRING)`
- [ ] `@OneToMany`, `@ManyToOne` relationships
- [ ] Spring Data repositories (`JpaRepository`)
- [ ] Derived query methods (`findByEmailAndIsActive`)
- [ ] `@Query` for custom JPQL
- [ ] Transaction management

### PostgreSQL

- [ ] Schema design (users, chatbots, conversations, messages, etc.)
- [ ] Primary keys (`BIGSERIAL PRIMARY KEY`)
- [ ] Foreign keys (parent–child relationships)
- [ ] Unique constraints (`UNIQUE NOT NULL`)
- [ ] Enums as strings vs integers
- [ ] Basic SQL: SELECT, INSERT, UPDATE, DELETE, JOIN
- [ ] Connection pooling (HikariCP — built into Spring Boot)

### Docker & DevOps

- [ ] Writing Dockerfiles (multi-stage builds)
- [ ] Docker Compose (multi-service orchestration)
- [ ] Volume management (persistent data)
- [ ] Service networking (service names as hostnames)
- [ ] Health checks (`depends_on: condition: service_healthy`)
- [ ] Environment variable injection

### AI / ML Concepts

- [ ] Embeddings — converting text to float vectors
- [ ] RAG (Retrieval Augmented Generation)
- [ ] Vector databases (Qdrant) and similarity search
- [ ] System prompts and conversation history
- [ ] LLM integration (Ollama / Llama3.2)
- [ ] Cosine similarity for semantic search

### Software Architecture

- [ ] 3-layer architecture (Controller → Service → Repository)
- [ ] DTO pattern (Data Transfer Objects — separate API shapes from DB entities)
- [ ] Repository pattern (abstract data access)
- [ ] Service layer (encapsulate business logic)
- [ ] Builder pattern
- [ ] Singleton scope (Spring beans)
- [ ] Multi-tenancy (users own their chatbots — ownership checks everywhere)

---

## 21. Study Path — What to Learn Next

Work through these in order. Each item builds on the previous.

### Week 1 — Java Foundations
1. Run the app locally: `docker-compose up --build`
2. Read [ChatbotSaasApplication.java](backend/src/main/java/com/chatbot/saas/ChatbotSaasApplication.java) — understand the entry point
3. Read [User.java](backend/src/main/java/com/chatbot/saas/user/User.java) — understand JPA entities
4. Play with `pom.xml` — what happens if you remove a dependency?
5. Enable `spring.jpa.show-sql=true` and watch SQL queries in logs

### Week 2 — REST API + Database
1. Trace a full login request: `AuthController` → `AuthService` → `UserRepository` → PostgreSQL
2. Use Postman/Insomnia to call `POST /api/auth/register` and `POST /api/auth/login`
3. Connect to the PostgreSQL DB directly: `docker exec -it chatbot_postgres psql -U postgres chatbot_saas`
4. Run `\dt` (list tables), `SELECT * FROM users;`
5. Add a new field to an entity and watch Hibernate `ALTER TABLE` in logs

### Week 3 — Security
1. Read [JwtUtil.java](backend/src/main/java/com/chatbot/saas/auth/JwtUtil.java) — understand JWT
2. Read [JwtAuthFilter.java](backend/src/main/java/com/chatbot/saas/common/config/JwtAuthFilter.java) — the middleware
3. Decode a JWT at [jwt.io](https://jwt.io) to see the payload
4. Test what happens when you call `/api/chatbots` without a token (should get 403)
5. Read [SecurityConfig.java](backend/src/main/java/com/chatbot/saas/common/config/SecurityConfig.java)

### Week 4 — Knowledge Base + RAG
1. Read [DocumentService.java](backend/src/main/java/com/chatbot/saas/knowledgebase/DocumentService.java) — the async pipeline
2. Read [QdrantService.java](backend/src/main/java/com/chatbot/saas/knowledgebase/qdrant/QdrantService.java) — vector DB
3. Upload a PDF via the UI, watch the logs, check Qdrant at `http://localhost:6337/dashboard`
4. Read [ChatService.java](backend/src/main/java/com/chatbot/saas/chat/ChatService.java) — the RAG pipeline
5. Ask a chatbot a question about the uploaded PDF — watch the RAG work

### Week 5 — Docker + Deployment
1. Build the Docker image manually: `docker build -t chatbot-backend ./backend`
2. Run it: `docker run -p 8080:8080 chatbot-backend`
3. Read [docker-compose.yml](docker-compose.yml) — understand each service
4. Try `docker-compose logs -f backend` while uploading a PDF
5. Stop and restart with `docker-compose down && docker-compose up` — confirm data persists (volumes)

### Advanced Topics (after the above)
- **Flyway/Liquibase** — proper DB migration management (instead of `ddl-auto=update`)
- **Spring Data pagination** — `Pageable` for large result sets
- **Unit testing** — `@SpringBootTest`, `@MockBean`, JUnit 5
- **Actuator** — health endpoints (`/actuator/health`) for monitoring
- **Profiles** — `@Profile("dev")` vs `@Profile("prod")` for environment-specific config
- **Caching** — `@Cacheable` with Spring Cache
- **WebSockets** — real-time chat instead of polling
- **Stripe integration** — subscription billing for the Billing page

---

## Quick Reference — Annotations Cheat Sheet

```java
// CLASS-LEVEL (what this class IS)
@SpringBootApplication  // app entry point
@RestController         // HTTP controller, returns JSON
@Service                // business logic
@Repository             // data access
@Component              // generic Spring bean
@Configuration          // defines @Bean methods
@Entity                 // JPA database entity
@Table(name="tbl")      // specify table name

// DEPENDENCY INJECTION
@Autowired              // inject a dependency (field injection — avoid)
@RequiredArgsConstructor // Lombok: constructor injection for final fields (PREFER)
@Bean                   // register this method's return value as a Spring bean
@Value("${prop.name}")  // read from application.properties

// HTTP MAPPING
@RequestMapping("/base")    // base path
@GetMapping("/path")        // GET handler
@PostMapping("/path")       // POST handler
@PutMapping("/{id}")        // PUT handler
@PatchMapping("/{id}")      // PATCH handler
@DeleteMapping("/{id}")     // DELETE handler

// METHOD PARAMETERS
@RequestBody           // parse JSON body into object
@PathVariable          // URL segment: /chatbots/{id}
@RequestParam          // query param: ?page=2
@AuthenticationPrincipal  // currently logged-in user (from JWT)
@Valid                 // trigger bean validation on the parameter

// DATABASE (JPA)
@Id                    // primary key
@GeneratedValue        // auto-increment
@Column(...)           // column config (name, nullable, unique)
@Enumerated(STRING)    // store enum as text
@CreatedDate           // auto-set on INSERT
@LastModifiedDate      // auto-set on UPDATE
@Transactional         // wrap method in a DB transaction

// SECURITY
@RestControllerAdvice  // global exception handler
@ExceptionHandler(Foo.class)  // handle this exception type

// ASYNC
@Async             // run this method in a background thread
@EnableAsync       // activate @Async on main class

// LOMBOK
@Data              // getters + setters + equals + hashCode + toString
@Builder           // builder pattern
@NoArgsConstructor // no-arg constructor
@AllArgsConstructor // all-fields constructor
@RequiredArgsConstructor // constructor for final fields
@Slf4j             // private static final Logger log = ...
```

---

*Generated from the actual source code of this project. Every concept has a corresponding file you can read.*
