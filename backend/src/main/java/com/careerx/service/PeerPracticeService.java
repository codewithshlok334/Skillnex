package com.careerx.service;

import com.careerx.repository.Store;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Invite-only two-person rooms. Every read and mutation checks membership. */
@Service
public class PeerPracticeService {
  private final Store db;
  public PeerPracticeService(Store db) { this.db = db; }
  private long now() { return System.currentTimeMillis(); }
  public static ResponseStatusException conflict(String text) { return new ResponseStatusException(HttpStatus.CONFLICT, text); }
  public Map<String,Object> member(String id, String uid) {
    return db.one("SELECT * FROM peer_rooms WHERE id=? AND (host_id=? OR guest_id=?)", id, uid, uid);
  }
  private Map<String,Object> lock(String id, String uid) {
    return db.one("SELECT * FROM peer_rooms WHERE id=? AND (host_id=? OR guest_id=?) FOR UPDATE", id, uid, uid);
  }
  private void live(Map<String,Object> r) {
    if ("COMPLETED".equals(r.get("status")) || ((Number)r.get("expires_ms")).longValue() < now())
      throw conflict("This room has ended or expired. Create a new room to practise again.");
  }
  private void client(String id, String uid, String cid) {
    var m = db.one("SELECT client_id FROM peer_members WHERE room_id=? AND user_id=?", id, uid);
    if (!cid.equals(m.get("client_id"))) throw conflict("This room is open in another tab. Reconnect here to use this tab.");
  }
  private void invalidateReports(String id) {
    db.exec("DELETE FROM peer_reports WHERE room_id=?", id);
    db.exec("UPDATE peer_rooms SET content_revision=content_revision+1 WHERE id=?", id);
  }
  @Transactional
  public Object create(String uid, String title) {
    String id = db.id(); long time = now();
    db.exec("DELETE FROM peer_signals WHERE room_id IN (SELECT id FROM peer_rooms WHERE expires_ms<?)", time);
    db.exec("INSERT INTO peer_rooms(id,host_id,interviewer_id,title,created_ms,expires_ms) VALUES(?,?,?,?,?,?)", id, uid, uid, title.isBlank() ? "Mock interview" : title.strip(), time, time + 86400000L);
    db.exec("INSERT INTO peer_members(room_id,user_id) VALUES(?,?)", id, uid);
    return state(id, uid);
  }
  @Transactional
  public Object join(String id, String uid) {
    var r = db.one("SELECT * FROM peer_rooms WHERE id=? FOR UPDATE", id);
    live(r);
    if (uid.equals(r.get("host_id")) || uid.equals(r.get("guest_id"))) return state(id, uid);
    if (r.get("guest_id") != null) throw conflict("This private room already has two participants.");
    db.exec("UPDATE peer_rooms SET guest_id=?,revision=revision+1 WHERE id=?", uid, id);
    db.exec("INSERT INTO peer_members(room_id,user_id) VALUES(?,?)", id, uid);
    return state(id, uid);
  }
  @Transactional
  public Object connect(String id, String uid, String cid) {
    var r = lock(id, uid); live(r);
    var m = db.one("SELECT client_id FROM peer_members WHERE room_id=? AND user_id=?", id, uid);
    if (!cid.equals(m.get("client_id"))) {
      db.exec("UPDATE peer_members SET client_id=?,seen_ms=?,mic=FALSE,camera=FALSE WHERE room_id=? AND user_id=?", cid, now(), id, uid);
      db.exec("UPDATE peer_rooms SET epoch=epoch+1 WHERE id=?", id);
      db.exec("DELETE FROM peer_signals WHERE room_id=?", id);
    }
    return state(id, uid);
  }
  @Transactional
  public Object sync(String id, String uid, String cid, long cursor, int epoch, boolean mic, boolean camera) {
    var r = lock(id, uid);
    if ("ACTIVE".equals(r.get("status")) && ((Number)r.get("expires_ms")).longValue() < now()) {
      db.exec("UPDATE peer_rooms SET status='COMPLETED',ended_ms=expires_ms,revision=revision+1 WHERE id=?", id);
      db.exec("UPDATE peer_members SET mic=FALSE,camera=FALSE WHERE room_id=?", id);
      db.exec("DELETE FROM peer_signals WHERE room_id=?", id);
      r = member(id, uid);
    }
    if (!"COMPLETED".equals(r.get("status"))) {
      live(r); client(id, uid, cid);
      db.exec("UPDATE peer_members SET seen_ms=?,mic=?,camera=? WHERE room_id=? AND user_id=?", now(), mic, camera, id, uid);
    }
    var result = snapshot(id, uid, false);
    int currentEpoch = ((Number)r.get("epoch")).intValue();
    var signals = db.list("SELECT seq,kind,body FROM peer_signals WHERE room_id=? AND epoch=? AND sender_id<>? AND seq>? ORDER BY seq LIMIT 100", id, currentEpoch, uid, epoch == currentEpoch ? cursor : 0);
    result.put("signals", signals.stream().map(s -> Map.of("seq", s.get("seq"), "kind", s.get("kind"), "payload", db.parse((String)s.get("body")))).toList());
    return result;
  }
  @Transactional
  public void signal(String id, String uid, String cid, int epoch, String kind, String body) {
    var r = lock(id, uid); live(r); client(id, uid, cid);
    if (((Number)r.get("epoch")).intValue() != epoch) throw conflict("Connection changed. Reconnecting…");
    if (db.count("SELECT COUNT(*) FROM peer_signals WHERE room_id=? AND sender_id=?", id, uid) >= 400)
      throw conflict("Connection needs a fresh attempt. Use Reconnect.");
    db.exec("INSERT INTO peer_signals(room_id,sender_id,epoch,kind,body,created_ms) VALUES(?,?,?,?,?,?)", id, uid, epoch, kind, body, now());
  }
  @Transactional
  public void leave(String id, String uid, String cid) {
    lock(id, uid);
    db.exec("UPDATE peer_members SET client_id=NULL,seen_ms=0,mic=FALSE,camera=FALSE WHERE room_id=? AND user_id=? AND client_id=?", id, uid, cid);
  }
  @Transactional
  public Object action(String id, String uid, String action, int revision) {
    var r = lock(id, uid);
    if ("end".equals(action) && "COMPLETED".equals(r.get("status"))) return state(id, uid);
    live(r);
    if (((Number)r.get("revision")).intValue() != revision) throw conflict("The room has changed. Try again.");
    switch (action) {
      case "start" -> {
        if (!uid.equals(r.get("host_id"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "The host starts the interview.");
        if (r.get("guest_id") == null || db.count("SELECT COUNT(*) FROM peer_members WHERE room_id=? AND seen_ms>? AND client_id IS NOT NULL", id, now()-15000) < 2)
          throw conflict("Wait for your partner to join the room.");
        if (!"WAITING".equals(r.get("status"))) throw conflict("The interview has already started.");
        db.exec("UPDATE peer_rooms SET status='ACTIVE',started_ms=?,expires_ms=?,revision=revision+1 WHERE id=?", now(), now()+7200000L, id);
      }
      case "swap" -> {
        if (!"ACTIVE".equals(r.get("status"))) throw conflict("Start the interview before switching roles.");
        Object next = r.get("interviewer_id").equals(r.get("host_id")) ? r.get("guest_id") : r.get("host_id");
        db.exec("UPDATE peer_rooms SET interviewer_id=?,revision=revision+1 WHERE id=?", next, id);
      }
      case "end" -> {
        db.exec("UPDATE peer_rooms SET status='COMPLETED',ended_ms=?,revision=revision+1 WHERE id=?", now(), id);
        db.exec("UPDATE peer_members SET mic=FALSE,camera=FALSE WHERE room_id=?", id);
        db.exec("DELETE FROM peer_signals WHERE room_id=?", id);
      }
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown room action.");
    }
    return state(id, uid);
  }
  @Transactional
  public void consent(String id, String uid, boolean enabled) {
    var r = lock(id, uid); live(r);
    db.exec("UPDATE peer_members SET consent=? WHERE room_id=? AND user_id=?", enabled, id, uid);
  }
  public void requireTranscription(String id, String uid) {
    var r = member(id, uid);
    if (r.get("started_ms") == null) throw conflict("Transcription starts when the interview starts.");
    if (now() > ((Number)r.get("expires_ms")).longValue() + 300000)
      throw conflict("This room has expired. You can still add written notes.");
    if (!Boolean.TRUE.equals(db.one("SELECT consent FROM peer_members WHERE room_id=? AND user_id=?", id, uid).get("consent")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Enable your transcript before sending microphone audio.");
    if ("COMPLETED".equals(r.get("status")) && now() - ((Number)r.get("ended_ms")).longValue() > 300000)
      throw conflict("The transcript upload window has ended. You can still add written notes.");
  }
  @Transactional
  public void note(String id, String uid, String noteId, String source, String text, String role) {
    var r = lock(id, uid);
    if (db.exists("SELECT 1 FROM peer_notes WHERE id=? AND room_id=? AND user_id=?", noteId, id, uid)) return;
    if ("transcript".equals(source)) requireTranscription(id, uid);
    if (text.isBlank()) return;
    if (db.count("SELECT COUNT(*) FROM peer_notes WHERE room_id=? AND user_id=?", id, uid) >= 180)
      throw conflict("This session has reached its notes limit.");
    db.exec("INSERT INTO peer_notes(id,room_id,user_id,source,speaker_role,content,created_ms) VALUES(?,?,?,?,?,?,?)", noteId, id, uid, source, role, text.strip(), now());
    invalidateReports(id);
  }
  @Transactional
  public void removeNote(String id, String uid, String noteId) {
    lock(id, uid);
    if (!db.exists("SELECT 1 FROM peer_notes WHERE id=? AND room_id=? AND user_id=?", noteId, id, uid)) return;
    db.exec("DELETE FROM peer_notes WHERE id=? AND room_id=? AND user_id=?", noteId, id, uid);
    invalidateReports(id);
  }
  @Transactional
  public void feedback(String id, String uid, int clarity, String strengths, String improvements) {
    var r = lock(id, uid);
    if (!"COMPLETED".equals(r.get("status")) || r.get("guest_id") == null) throw conflict("Feedback is available after a two-person session ends.");
    db.exec("DELETE FROM peer_feedback WHERE room_id=? AND author_id=?", id, uid);
    db.exec("INSERT INTO peer_feedback(room_id,author_id,clarity,strengths,improvements) VALUES(?,?,?,?,?)", id, uid, clarity, strengths, improvements);
    invalidateReports(id);
  }
  public List<Map<String,Object>> history(String uid) {
    return db.list("SELECT id,title,status,created_ms,started_ms,ended_ms,expires_ms FROM peer_rooms WHERE host_id=? OR guest_id=? ORDER BY created_ms DESC LIMIT 20", uid, uid);
  }
  public Map<String,Object> state(String id, String uid) {
    return snapshot(id, uid, true);
  }
  private Map<String,Object> snapshot(String id, String uid, boolean details) {
    var r = new HashMap<>(member(id, uid));
    var participants = db.list("SELECT m.user_id AS id,u.name,p.photo_url,m.client_id,m.seen_ms,m.mic,m.camera,m.consent FROM peer_members m JOIN app_users u ON u.id=m.user_id JOIN profiles p ON p.user_id=m.user_id WHERE m.room_id=?", id);
    r.put("participants", participants);
    r.put("serverTime", now());
    if (details) {
      r.put("notes", notes(id, uid));
      r.put("feedback", "COMPLETED".equals(r.get("status")) ? db.list("SELECT * FROM peer_feedback WHERE room_id=?", id) : List.of());
      var reports = db.list("SELECT result_json FROM peer_reports WHERE room_id=? AND user_id=?", id, uid);
      r.put("report", reports.isEmpty() ? null : db.parse((String)reports.getFirst().get("result_json")));
    }
    return r;
  }
  @Transactional
  public void saveReport(String id, String uid, int revision, Object report) {
    var r = lock(id, uid);
    if (((Number)r.get("content_revision")).intValue() != revision) throw conflict("New notes arrived while analysing. Generate the analysis again to include them.");
    db.exec("DELETE FROM peer_reports WHERE room_id=? AND user_id=?", id, uid);
    db.exec("INSERT INTO peer_reports(room_id,user_id,result_json,created_ms) VALUES(?,?,?,?)", id, uid, db.text(report), now());
  }
  public List<Map<String,Object>> notes(String id, String uid) {
    return db.list("SELECT id,user_id,source,speaker_role,content,created_ms FROM peer_notes WHERE room_id=? AND (user_id=? OR source='transcript') ORDER BY created_ms,id", id, uid);
  }
}
