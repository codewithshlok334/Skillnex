package com.careerx.controller;

import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import com.careerx.security.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.security.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final Store db;
  private final PasswordEncoder passwords;
  private final Tokens tokens;
  private final RateLimit rate;
  private final JavaMailSender mail;
  private final boolean demo;
  private final String origin, from;

  public AuthController(
    Store db,
    PasswordEncoder passwords,
    Tokens tokens,
    RateLimit rate,
    JavaMailSender mail,
    @Value("${app.demo}") boolean demo,
    @Value("${app.origin}") String origin,
    @Value("${app.mail-from}") String from
  ) {
    this.db = db;
    this.passwords = passwords;
    this.tokens = tokens;
    this.rate = rate;
    this.mail = mail;
    this.demo = demo;
    this.origin = origin.split(",")[0];
    this.from = from;
  }

  @PostMapping("/signup")
  @Transactional
  public Object signup(
    @Valid @RequestBody Signup in,
    HttpServletRequest req,
    HttpServletResponse res
  ) {
    rate.check("signup:" + req.getRemoteAddr(), 10, 3600);
    String email = in.email().trim().toLowerCase(Locale.ROOT);
    if (
      db.exists("SELECT 1 FROM app_users WHERE email=?", email)
    ) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "An account already exists for this email."
    );
    String id = db.id();
    db.exec(
      "INSERT INTO app_users(id,email,password_hash,name) VALUES(?,?,?,?)",
      id,
      email,
      passwords.encode(in.password()),
      in.name()
    );
    db.exec(
      "INSERT INTO profiles(user_id,college,course,branch,study_year,graduation_year,career_goal) VALUES(?,?,?,?,?,?,?)",
      id,
      in.college(),
      in.course(),
      in.branch(),
      in.studyYear(),
      in.graduationYear(),
      in.careerGoal()
    );
    tokens.cookie(res, tokens.create(id, 0));
    return Map.of("id", id);
  }

  @PostMapping("/login")
  public Object login(
    @Valid @RequestBody Login in,
    HttpServletRequest req,
    HttpServletResponse res
  ) {
    rate.check("login-ip:" + req.getRemoteAddr(), 30, 900);
    String email = in.email().trim().toLowerCase(Locale.ROOT);
    rate.check("login:" + email, 10, 900);
    var users = db.list("SELECT * FROM app_users WHERE email=?", email);
    String hash = users.isEmpty()
      ? "$2a$12$E9Wq0KWJuUYBhaCpAVW9i.06apUJFSWvebkMsNxnXeujPLfbUyLW6"
      : (String) users.getFirst().get("password_hash");
    boolean match = hash != null && passwords.matches(in.password(), hash);
    if (
      users.isEmpty() || !match || Boolean.TRUE.equals(users.getFirst().get("banned"))
    ) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    var u = users.getFirst();
    tokens.cookie(
      res,
      tokens.create((String) u.get("id"), ((Number) u.get("token_version")).intValue())
    );
    return Map.of("id", u.get("id"));
  }

  @PostMapping("/logout")
  public Object logout(HttpServletResponse res, java.security.Principal p) {
    if (p != null) db.exec(
      "UPDATE app_users SET token_version=token_version+1 WHERE id=?",
      p.getName()
    );
    tokens.cookie(res, "");
    return Map.of("ok", true);
  }

  @PostMapping("/forgot-password")
  public Object forgot(@Valid @RequestBody Email in, HttpServletRequest req) {
    rate.check("reset:" + req.getRemoteAddr(), 5, 900);
    var rows = db.list(
      "SELECT id FROM app_users WHERE email=? AND password_hash IS NOT NULL",
      in.email().trim().toLowerCase(Locale.ROOT)
    );
    String token = null;
    if (!rows.isEmpty()) {
      byte[] bytes = new byte[32];
      new SecureRandom().nextBytes(bytes);
      token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
      String uid = (String) rows.getFirst().get("id");
      db.exec("DELETE FROM password_resets WHERE user_id=?", uid);
      db.exec(
        "INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)",
        hash(token),
        uid,
        Timestamp.from(Instant.now().plusSeconds(1800))
      );
      if (!demo) {
        try {
          var msg = new SimpleMailMessage();
          msg.setFrom(from);
          msg.setTo(in.email());
          msg.setSubject("Reset your SkillNex password");
          msg.setText(
            "Reset your password within 30 minutes: " + origin + "/reset-password?token=" + token
          );
          mail.send(msg);
        } catch (Exception e) {
          db.exec("DELETE FROM password_resets WHERE user_id=?", uid);
          org.slf4j.LoggerFactory.getLogger(getClass()).warn("Password reset delivery failed");
        }
      }
    }
    var out = new HashMap<String, Object>();
    out.put("message", "If this email has an account, a reset link has been sent.");
    if (demo && token != null) out.put("demoResetUrl", "/reset-password?token=" + token);
    return out;
  }

  @PostMapping("/reset-password")
  @Transactional
  public Object reset(@Valid @RequestBody Reset in) {
    var rows = db.list(
      "SELECT * FROM password_resets WHERE token_hash=? AND expires_at>? FOR UPDATE",
      hash(in.token()),
      Timestamp.from(Instant.now())
    );
    if (rows.isEmpty()) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "This reset link has expired or was already used."
    );
    db.exec(
      "UPDATE app_users SET password_hash=?,token_version=token_version+1 WHERE id=?",
      passwords.encode(in.password()),
      rows.getFirst().get("user_id")
    );
    db.exec("DELETE FROM password_resets WHERE user_id=?", rows.getFirst().get("user_id"));
    return Map.of("ok", true);
  }

  private String hash(String input) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(
          input.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        )
      );
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
