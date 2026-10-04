package com.careerx.controller;

import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final Store db;

  public AdminController(Store db) {
    this.db = db;
  }

  @GetMapping("/analytics")
  public Object analytics() {
    return Map.of(
      "users",
      db.count("SELECT COUNT(*) FROM app_users"),
      "activeUsers",
      db.count(
        "SELECT COUNT(*) FROM app_users WHERE banned=FALSE AND last_active_at>?",
        new java.sql.Timestamp(System.currentTimeMillis() - 2592000000L)
      ),
      "questions",
      db.count("SELECT COUNT(*) FROM questions"),
      "answers",
      db.count("SELECT COUNT(*) FROM answers"),
      "interviews",
      db.count("SELECT COUNT(*) FROM interviews"),
      "analyses",
      db.count("SELECT COUNT(*) FROM resume_analyses"),
      "aiCalls",
      db.count("SELECT COUNT(*) FROM ai_usage"),
      "openReports",
      db.count("SELECT COUNT(*) FROM reports WHERE status='OPEN'"),
      "flaggedContent",
      db.count("SELECT COUNT(*) FROM questions WHERE hidden=TRUE") +
        db.count("SELECT COUNT(*) FROM answers WHERE hidden=TRUE")
    );
  }

  @GetMapping("/users")
  public Object users(@RequestParam(defaultValue = "0") int page) {
    int offset = Math.max(0, Math.min(page, 10000)) * 20;
    return Map.of(
      "items",
      db.list(
        "SELECT id,name,email,role,banned,created_at FROM app_users ORDER BY created_at DESC LIMIT 20 OFFSET ?",
        offset
      ),
      "total",
      db.count("SELECT COUNT(*) FROM app_users")
    );
  }

  @PostMapping("/users/{id}/ban")
  public Object ban(@PathVariable String id, Principal p) {
    if (id.equals(p.getName())) throw new IllegalArgumentException();
    db.one("SELECT id FROM app_users WHERE id=? AND role<>'ADMIN'", id);
    db.exec("UPDATE app_users SET banned=NOT banned,token_version=token_version+1 WHERE id=?", id);
    return Map.of("ok", true);
  }

  @PostMapping("/users/{id}/faculty")
  public Object faculty(@PathVariable String id) {
    db.one("SELECT id FROM app_users WHERE id=? AND role='STUDENT'", id);
    db.exec("UPDATE app_users SET role='FACULTY',token_version=token_version+1 WHERE id=?", id);
    return Map.of("ok", true);
  }

  @GetMapping("/reports")
  public Object reports() {
    var rows = db.list(
      "SELECT r.*,u.name FROM reports r JOIN app_users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 100"
    );
    for (var row : rows) {
      String table = row.get("target_type").equals("question") ? "questions" : "answers";
      var content = db.list("SELECT body FROM " + table + " WHERE id=?", row.get("target_id"));
      row.put(
        "content",
        content.isEmpty() ? "Content unavailable" : content.getFirst().get("body")
      );
    }
    return rows;
  }

  @PostMapping("/reports/{id}/resolve")
  @Transactional
  public Object resolve(@PathVariable String id, @Valid @RequestBody Moderation in) {
    var report = db.one("SELECT * FROM reports WHERE id=? AND status='OPEN' FOR UPDATE", id);
    if (in.action().equals("remove")) {
      String table = report.get("target_type").equals("question") ? "questions" : "answers";
      var content = db.one(
        "SELECT * FROM " + table + " WHERE id=? FOR UPDATE",
        report.get("target_id")
      );
      if (!Boolean.TRUE.equals(content.get("hidden"))) {
        db.exec("UPDATE " + table + " SET hidden=TRUE WHERE id=?", report.get("target_id"));
        db.reputation((String) content.get("user_id"), -5);
      }
    }
    db.exec(
      "UPDATE reports SET status=? WHERE id=?",
      in.action().equals("remove") ? "REMOVED" : "DISMISSED",
      id
    );
    return Map.of("ok", true);
  }

  @PostMapping("/categories")
  public Object category(@Valid @RequestBody Text in) {
    if (in.text().length() > 60) throw new IllegalArgumentException();
    db.exec("INSERT INTO categories(name) VALUES(?)", in.text().strip());
    return Map.of("ok", true);
  }

  @DeleteMapping("/categories/{name}")
  public Object removeCategory(@PathVariable String name) {
    db.exec("DELETE FROM categories WHERE name=?", name);
    return Map.of("ok", true);
  }
}
