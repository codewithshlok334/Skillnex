package com.careerx.security;

import com.careerx.repository.Store;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class SessionFilter extends OncePerRequestFilter {

  private final Tokens tokens;
  private final Store db;
  private final Set<String> origins;

  public SessionFilter(Tokens t, Store db, String origin) {
    tokens = t;
    this.db = db;
    origins = Set.of(origin.split(","));
  }

  protected void doFilterInternal(HttpServletRequest r, HttpServletResponse s, FilterChain chain)
    throws ServletException, IOException {
    // Cookie authentication requires an exact trusted Origin for every state-changing request.
    if (
      !Set.of("GET", "HEAD", "OPTIONS").contains(r.getMethod()) &&
      (r.getHeader("Origin") == null || !origins.contains(r.getHeader("Origin")))
    ) {
      s.setStatus(403);
      s.setContentType("application/json");
      s.getWriter().write("{\"message\":\"Untrusted request origin\"}");
      return;
    }
    if (r.getCookies() != null) for (Cookie c : r.getCookies())
      if (c.getName().equals("careerx_session")) {
        try {
          var claims = tokens.read(c.getValue());
          var u = db.one(
            "SELECT id,role,token_version,banned FROM app_users WHERE id=?",
            claims.getSubject()
          );
          if (
            !Boolean.TRUE.equals(u.get("banned")) &&
            ((Number) u.get("token_version")).intValue() == claims.get("v", Integer.class)
          ) {
            var auth = new UsernamePasswordAuthenticationToken(
              u.get("id"),
              null,
              List.of(new SimpleGrantedAuthority("ROLE_" + u.get("role")))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
            db.exec(
              "UPDATE app_users SET last_active_at=CURRENT_TIMESTAMP WHERE id=? AND last_active_at<?",
              u.get("id"),
              new java.sql.Timestamp(System.currentTimeMillis() - 3600000)
            );
          }
        } catch (Exception ignored) {}
      }
    chain.doFilter(r, s);
  }
}
