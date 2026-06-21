package com.chatbot.saas.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

/**
 * WHY this class exists:
 *   JWT (JSON Web Token) is how we identify users without sessions.
 *   Instead of storing "who is logged in" in memory, we give the user a signed token.
 *   Every request, the user sends this token. We verify its signature and trust the identity.
 *
 * WHAT it does:
 *   - generateToken: creates a JWT for a given email
 *   - extractEmail: reads the email from inside a JWT
 *   - isTokenValid: checks if token is authentic and not expired
 *
 * HOW JWT works (a quick mental model):
 *   A JWT has 3 parts separated by dots: header.payload.signature
 *   - Header: algorithm used (HS256)
 *   - Payload: the data we store (email, expiry time)
 *   - Signature: HMAC hash of header+payload using our secret key
 *
 *   When we receive a token, we re-compute the signature.
 *   If it matches → token is authentic (nobody tampered with the payload).
 *   If it doesn't match → token is invalid → reject the request.
 *
 * SECURITY NOTE:
 *   The secret key in application.properties must be:
 *   - At least 256 bits (32 characters) long for HS256
 *   - Kept SECRET — never committed to git, stored in environment variables
 *
 * @Component → Spring creates one shared instance of this class (singleton)
 */
@Component
@Slf4j
public class JwtUtil {

    /**
     * @Value reads "jwt.secret" from application.properties.
     * We set it as an environment variable in production for security.
     */
    @Value("${jwt.secret}")
    private String secretKey;

    /**
     * Token expiration in milliseconds.
     * Default 86400000ms = 24 hours.
     * After this time, the user must log in again.
     */
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    /**
     * Generates a JWT token for the given user.
     *
     * What goes inside the token (the "payload"):
     * - subject: the user's email (who this token represents)
     * - issuedAt: when the token was created
     * - expiration: when the token becomes invalid
     *
     * The token is signed with our secret key → only we can verify it.
     *
     * @param userDetails - the authenticated user (we use their email as subject)
     * @return            - a compact JWT string like "eyJhbGci..."
     */
    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
                .subject(userDetails.getUsername())           // email goes here
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())                    // sign with our secret
                .compact();                                   // build the final string
    }

    /**
     * Extracts the email (subject) from a JWT token.
     * Called in JwtAuthFilter to know "which user is this token for?"
     */
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Validates a JWT token by checking:
     * 1. The email in the token matches the user we loaded from DB
     * 2. The token has not expired
     *
     * @param token       - the JWT from the Authorization header
     * @param userDetails - the user loaded from DB (for email comparison)
     * @return            - true if valid, false if expired or mismatched
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String email = extractEmail(token);
        return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    /** Returns true if the token's expiration date is before the current time. */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Generic claim extractor. Extracts any value from the JWT payload.
     * Uses a Function so callers can specify exactly which claim to extract.
     *
     * Example: extractClaim(token, Claims::getSubject) → returns the email
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Parses the JWT and returns all claims (the full payload).
     * If the signature is invalid or the token is malformed, JJWT throws an exception.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())   // use our secret to verify signature
                .build()
                .parseSignedClaims(token)      // parse + verify in one call
                .getPayload();                 // return the payload (claims)
    }

    /**
     * Converts our Base64-encoded secret string into a cryptographic SecretKey.
     * JJWT requires a SecretKey object (not raw bytes) for signing.
     *
     * The secret in application.properties is Base64-encoded for safe storage.
     * Decoders.BASE64.decode() converts it back to raw bytes.
     * Keys.hmacShaKeyFor() wraps those bytes in a proper HMAC key.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
