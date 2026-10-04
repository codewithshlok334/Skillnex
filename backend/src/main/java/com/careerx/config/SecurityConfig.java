package com.careerx.config;

import com.careerx.repository.Store;
import com.careerx.security.*;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwords() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecurityFilterChain chain(
    HttpSecurity http,
    Tokens tokens,
    Store db,
    @Value("${app.origin}") String origin,
    ObjectProvider<ClientRegistrationRepository> registrations
  ) throws Exception {
    // The API-only development build keeps its original route/security policy.
    // The single-site Docker build adds the Vite output to classpath:/static.
    boolean frontendBundled = new ClassPathResource("static/index.html").exists();
    http
      .csrf(c -> c.disable())
      .cors(c -> c.configurationSource(cors(origin)))
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> {
        if (frontendBundled) {
          String[] frontendPaths = {
            "/", "/index.html", "/login", "/signup", "/forgot-password", "/reset-password",
            "/demo", "/app", "/app/**", "/assets/**", "/audio/**", "/brand/**", "/images/**",
            "/favicon.svg"
          };
          a.requestMatchers(HttpMethod.GET, frontendPaths).permitAll()
            .requestMatchers(HttpMethod.HEAD, frontendPaths).permitAll();
        }
        a
          .requestMatchers(
            "/api/auth/**",
            "/api/config",
            "/actuator/health",
            "/oauth2/**",
            "/login/oauth2/**"
          )
          .permitAll()
          .requestMatchers("/api/admin/**")
          .hasRole("ADMIN")
          .anyRequest()
          .authenticated();
      })
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((r, s, x) -> {
            s.setStatus(401);
            s.setContentType("application/json");
            s.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
          })
          .accessDeniedHandler((r, s, x) -> {
            s.setStatus(403);
            s.setContentType("application/json");
            s.getWriter().write("{\"message\":\"You do not have permission for this action.\"}");
          })
      )
      .headers(h ->
        h
          .contentTypeOptions(c -> {})
          .frameOptions(f -> f.deny())
          .contentSecurityPolicy(c ->
            c.policyDirectives(frontendBundled
              ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; font-src 'self'; media-src 'self' blob:; " +
                "connect-src 'self' wss://generativelanguage.googleapis.com; " +
                "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
              : "default-src 'none'; frame-ancestors 'none'")
          )
          .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()"))
          .addHeaderWriter(new StaticHeadersWriter("Referrer-Policy", "strict-origin-when-cross-origin"))
      )
      .addFilterBefore(
        new SessionFilter(tokens, db, origin),
        UsernamePasswordAuthenticationFilter.class
      );
    if (registrations.getIfAvailable() != null) http.oauth2Login(o ->
      o
        .successHandler((req, res, auth) -> {
          var user =
            (org.springframework.security.oauth2.core.oidc.user.OidcUser) auth.getPrincipal();
          if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            res.sendError(403);
            return;
          }
          String email = user.getEmail().toLowerCase(Locale.ROOT);
          String id;
          if (db.exists("SELECT 1 FROM app_users WHERE email=?", email)) {
            var existing = db.one("SELECT * FROM app_users WHERE email=?", email);
            // Prevent implicit takeover/linking of an existing password account.
            if (
              existing.get("password_hash") != null || Boolean.TRUE.equals(existing.get("banned"))
            ) {
              res.sendRedirect(origin.split(",")[0] + "/login?error=account-link");
              return;
            }
            id = (String) existing.get("id");
          } else {
            id = db.id();
            db.exec(
              "INSERT INTO app_users(id,email,name,role) VALUES(?,?,?,'STUDENT')",
              id,
              email,
              user.getFullName() == null ? email : user.getFullName()
            );
            db.exec("INSERT INTO profiles(user_id) VALUES(?)", id);
          }
          int v = db.count("SELECT token_version FROM app_users WHERE id=?", id);
          tokens.cookie(res, tokens.create(id, v));
          res.sendRedirect(origin.split(",")[0] + "/app");
        })
        .failureHandler((req, res, ex) ->
          res.sendRedirect(origin.split(",")[0] + "/login?error=google")
        )
    );
    return http.build();
  }

  private CorsConfigurationSource cors(String origin) {
    var c = new CorsConfiguration();
    c.setAllowedOrigins(Arrays.asList(origin.split(",")));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Content-Type"));
    c.setAllowCredentials(true);
    var s = new UrlBasedCorsConfigurationSource();
    s.registerCorsConfiguration("/**", c);
    return s;
  }
}
