package com.careerx.repository;

import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class Store {

  public final JdbcTemplate jdbc;
  public final ObjectMapper json;

  public Store(JdbcTemplate jdbc, ObjectMapper json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  public String id() {
    return UUID.randomUUID().toString();
  }

  public int exec(String sql, Object... args) {
    return jdbc.update(sql, args);
  }

  public List<Map<String, Object>> list(String sql, Object... args) {
    return jdbc.queryForList(sql, args);
  }

  public Map<String, Object> one(String sql, Object... args) {
    var rows = list(sql, args);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
    return rows.getFirst();
  }

  public boolean exists(String sql, Object... args) {
    return !list(sql, args).isEmpty();
  }

  public int count(String sql, Object... args) {
    return Objects.requireNonNull(jdbc.queryForObject(sql, Integer.class, args));
  }

  public String text(Object data) {
    try {
      return json.writeValueAsString(data);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid document");
    }
  }

  public JsonNode parse(String text) {
    try {
      return json.readTree(text);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid JSON");
    }
  }

  public void notify(String uid, String kind, String message, String link) {
    exec(
      "INSERT INTO notifications(id,user_id,kind,message,link) VALUES(?,?,?,?,?)",
      id(),
      uid,
      kind,
      message,
      link
    );
  }

  public Map<String, Object> owned(String table, String id, String uid) {
    if (
      !Set.of("resumes", "interviews", "career_roadmaps", "questions").contains(table)
    ) throw new IllegalArgumentException();
    return one("SELECT * FROM " + table + " WHERE id=? AND user_id=?", id, uid);
  }

  public void badge(String uid, String badge) {
    if (!exists("SELECT 1 FROM user_badges WHERE user_id=? AND badge_id=?", uid, badge)) {
      try {
        exec("INSERT INTO user_badges(user_id,badge_id) VALUES(?,?)", uid, badge);
        notify(uid, "BADGE", "You earned a new badge!", "/app/profile");
      } catch (org.springframework.dao.DuplicateKeyException ignored) {}
    }
  }

  public void reputation(String uid, int delta) {
    exec("UPDATE profiles SET reputation=reputation+? WHERE user_id=?", delta, uid);
    int rep = count("SELECT reputation FROM profiles WHERE user_id=?", uid);
    if (rep >= 50) badge(uid, "helper");
    if (rep >= 200) badge(uid, "expert");
    if (rep >= 500) badge(uid, "top");
  }
}
