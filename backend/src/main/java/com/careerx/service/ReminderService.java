package com.careerx.service;

import com.careerx.repository.Store;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class ReminderService {

  private final Store db;

  public ReminderService(Store db) {
    this.db = db;
  }

  @Scheduled(fixedDelay = 60000)
  public void remind() {
    for (var i : db.list(
      "SELECT id,user_id,role,scheduled_at FROM interviews WHERE status='SCHEDULED' AND scheduled_at BETWEEN ? AND ?",
      Timestamp.from(Instant.now()),
      Timestamp.from(Instant.now().plusSeconds(900))
    )) {
      String event = "interview:" + i.get("id") + ":" + i.get("scheduled_at");
      if (!db.exists("SELECT 1 FROM notifications WHERE event_key=?", event)) try {
        db.exec(
          "INSERT INTO notifications(id,user_id,kind,message,link,event_key) VALUES(?,?,?,?,?,?)",
          db.id(),
          i.get("user_id"),
          "REMINDER",
          "Your " + i.get("role") + " interview starts within 15 minutes.",
          "/app/interviews/" + i.get("id"),
          event
        );
      } catch (org.springframework.dao.DuplicateKeyException ignored) {}
    }
  }
}
