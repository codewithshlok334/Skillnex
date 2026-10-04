package com.careerx.service;

import com.careerx.config.LinkedInProperties;
import com.careerx.repository.Store;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LinkedInConnectionService {
  public record Flow(String userId, String nonce, String attemptId) {}
  private final Store db;
  private final LinkedInProperties settings;
  private final LinkedInClient client;
  public LinkedInConnectionService(Store db, LinkedInProperties settings, LinkedInClient client) {
    this.db = db; this.settings = settings; this.client = client;
  }
  public Map<String, Object> status(String uid) {
    var rows = db.list("SELECT display_name,connected_at FROM linkedin_connections WHERE user_id=? AND subject IS NOT NULL", uid);
    var out = new LinkedHashMap<String, Object>();
    out.put("configured", settings.configured()); out.put("connected", !rows.isEmpty());
    out.put("profile", rows.isEmpty() ? null : rows.getFirst());
    out.put("access", "basic-profile-only");
    return out;
  }
  @org.springframework.scheduling.annotation.Scheduled(fixedDelay=600000)
  public void expireStates() {
    db.exec("DELETE FROM linkedin_oauth_states WHERE expires_at<?", Timestamp.from(Instant.now()));
  }
  @Transactional
  public String begin(String uid, String session) {
    if (!settings.configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
      "LinkedIn connection is not configured yet. You can still analyse pasted profile text or a PDF.");
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE", uid);
    db.exec("DELETE FROM linkedin_oauth_states WHERE expires_at<? OR user_id=?", Timestamp.from(Instant.now()), uid);
    String state = random(), nonce = random(), attempt = db.id();
    if (!db.exists("SELECT 1 FROM linkedin_connections WHERE user_id=?", uid))
      db.exec("INSERT INTO linkedin_connections(user_id,attempt_id) VALUES(?,?)", uid, attempt);
    else db.exec("UPDATE linkedin_connections SET attempt_id=? WHERE user_id=?", attempt, uid);
    db.exec("INSERT INTO linkedin_oauth_states(state_hash,user_id,session_hash,nonce,attempt_id,expires_at) VALUES(?,?,?,?,?,?)",
      digest(state), uid, digest(session), nonce, attempt, Timestamp.from(Instant.now().plusSeconds(600)));
    return client.authorizationUrl(state, nonce);
  }
  @Transactional
  public Flow consume(String uid, String session, String state) {
    if (state == null || state.length() > 128) throw invalid();
    var rows = db.list("SELECT * FROM linkedin_oauth_states WHERE state_hash=? AND user_id=? AND session_hash=? AND expires_at>? FOR UPDATE",
      digest(state), uid, digest(session), Timestamp.from(Instant.now()));
    if (rows.isEmpty()) throw invalid();
    var row = rows.getFirst();
    db.exec("DELETE FROM linkedin_oauth_states WHERE state_hash=?", digest(state));
    return new Flow(uid, (String) row.get("nonce"), (String) row.get("attempt_id"));
  }
  public void complete(Flow flow, LinkedInClient.Profile profile) {
    // A disconnect or newer connection attempt invalidates an in-flight callback.
    if (db.exec("UPDATE linkedin_connections SET subject=?,display_name=?,connected_at=CURRENT_TIMESTAMP,attempt_id=NULL WHERE user_id=? AND attempt_id=?",
        profile.subject(), profile.name(), flow.userId(), flow.attemptId()) != 1) throw invalid();
  }
  @Transactional
  public void disconnect(String uid) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE", uid);
    db.exec("DELETE FROM linkedin_oauth_states WHERE user_id=?", uid);
    db.exec("DELETE FROM linkedin_connections WHERE user_id=?", uid);
  }
  private ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, "LinkedIn connection expired or belongs to another session. Connect again.");
  }
  private static String random() {
    byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
  public static String digest(String value) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
  }
}
