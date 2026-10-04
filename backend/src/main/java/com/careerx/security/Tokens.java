package com.careerx.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletResponse;
import java.util.*;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class Tokens {

  private final SecretKey key;
  private final boolean secure;

  public Tokens(
    @Value("${app.jwt-secret}") String secret,
    @Value("${app.secure-cookie}") boolean secure
  ) {
    if (secret.length() < 32) throw new IllegalStateException(
      "JWT_SECRET must contain at least 32 characters"
    );
    this.key = Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    this.secure = secure;
  }

  public String create(String id, int version) {
    return Jwts.builder()
      .issuer("careerx")
      .subject(id)
      .claim("v", version)
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + 86400000L))
      .signWith(key)
      .compact();
  }

  public Claims read(String token) {
    return Jwts.parser()
      .verifyWith(key)
      .requireIssuer("careerx")
      .build()
      .parseSignedClaims(token)
      .getPayload();
  }

  public void cookie(HttpServletResponse response, String value) {
    response.addHeader(
      "Set-Cookie",
      ResponseCookie.from("careerx_session", value)
        .httpOnly(true)
        .secure(secure)
        .sameSite("Lax")
        .path("/")
        .maxAge(value.isEmpty() ? 0 : 86400)
        .build()
        .toString()
    );
  }
}
