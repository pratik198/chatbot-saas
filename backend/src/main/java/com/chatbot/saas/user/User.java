package com.chatbot.saas.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * WHY this class exists:
 *   This is a JPA Entity AND a Spring Security UserDetails implementation.
 *   JPA maps it to the "users" table in PostgreSQL.
 *   UserDetails makes Spring Security understand how to authenticate this user.
 *
 * WHAT it does:
 *   Represents a single user in our system with all their info:
 *   email, hashed password, name, role, and timestamps.
 *
 * HOW it works:
 *   @Entity       → Hibernate will create a "users" table from this class
 *   @Data         → Lombok auto-generates getters, setters, equals, hashCode, toString
 *   @Builder      → Lombok generates a builder pattern: User.builder().email("...").build()
 *   @NoArgsConstructor / @AllArgsConstructor → Lombok generates constructors
 *   @EntityListeners → Enables @CreatedDate and @LastModifiedDate auto-fill
 *
 *   Implementing UserDetails:
 *   Spring Security calls getUsername() to know "who is this user?"
 *   and getPassword() to check credentials. We plug our User entity directly in.
 */
@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User implements UserDetails {

    /**
     * @Id marks this as the primary key column.
     * @GeneratedValue(IDENTITY) tells PostgreSQL to auto-increment this value.
     * So you don't need to set the ID — the database does it automatically.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * unique = true ensures no two users share the same email.
     * If you try to insert a duplicate email, PostgreSQL throws a constraint error.
     * nullable = false means this column cannot be NULL in the database.
     */
    @Column(unique = true, nullable = false)
    private String email;

    /**
     * IMPORTANT: We NEVER store raw passwords in a database!
     * This stores the BCrypt hash of the password.
     * BCrypt turns "myPassword123" → "$2a$10$rFmKL8kGTf..."
     * You can verify but cannot reverse-engineer the original password.
     */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    /**
     * Role controls what the user can do (authorization).
     * @Enumerated(STRING) stores "ADMIN" or "USER" as text, not 0 or 1.
     * Text is easier to read when debugging or querying the database directly.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    /**
     * Soft-delete pattern: instead of deleting users, we mark them inactive.
     * This preserves their data (chatbots, conversations, etc.) for audit trails.
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    /**
     * @CreatedDate: Spring automatically fills this when the entity is first saved.
     * updatable = false means it can never be changed after creation.
     */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * @LastModifiedDate: Spring updates this every time save() is called on the entity.
     */
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ─────────────────────────────────────────────────────────────
    //   Spring Security's UserDetails interface — required methods
    //   Spring Security calls these when authenticating a request
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns the list of permissions (roles) this user has.
     * "ROLE_" prefix is Spring Security convention.
     * So Role.ADMIN becomes "ROLE_ADMIN" in Spring Security.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    /**
     * Spring Security uses getPassword() internally during login.
     * We return the BCrypt hash — Spring will compare it to the input.
     */
    @Override
    public String getPassword() {
        return passwordHash;
    }

    /**
     * Spring Security uses getUsername() as the unique identifier.
     * We use email as the "username" in our system.
     */
    @Override
    public String getUsername() {
        return email;
    }

    /** Return true so that accounts never expire (keep it simple for now). */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /** Return true so that accounts are never locked (keep it simple for now). */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /** Return true so that credentials never expire (keep it simple for now). */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Return isActive: if we deactivate a user in the database,
     * Spring Security will reject their JWT immediately on the next request.
     */
    @Override
    public boolean isEnabled() {
        return isActive;
    }

    // ─────────────────────────────────────────────────────────────
    //   Role Enum — defines what roles a user can have
    // ─────────────────────────────────────────────────────────────

    /**
     * WHY an enum instead of a String?
     * Enum prevents typos: "ADMIM" would never compile.
     * String allows: user.setRole("ADMIM") — bug hiding in plain sight.
     */
    public enum Role {
        ADMIN,  // Platform administrator: can see all tenants, manage system
        USER    // Regular user: manages their own chatbots and settings
    }
}
