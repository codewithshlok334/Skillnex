package com.careerx.controller;

import com.careerx.ai.CareerAIService;
import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/career")
public class CareerController {

  private final Store db;
  private final CareerAIService ai;

  public CareerController(Store db, CareerAIService ai) {
    this.db = db;
    this.ai = ai;
  }

  public Object context(String uid, String goal) {
    var c = new HashMap<String, Object>();
    c.put(
      "profile",
      db.one("SELECT career_goal,skills,projects FROM profiles WHERE user_id=?", uid)
    );
    c.put("target", goal);
    c.put(
      "resume",
      db.list("SELECT content FROM resumes WHERE user_id=? ORDER BY created_at DESC LIMIT 1", uid)
    );
    c.put(
      "interviews",
      db.list(
        "SELECT r.result_json FROM interview_reports r JOIN interviews i ON i.id=r.interview_id WHERE i.user_id=? ORDER BY r.created_at DESC LIMIT 3",
        uid
      )
    );
    c.put(
      "community",
      db.list(
        "SELECT category,COUNT(*) AS questions FROM questions WHERE user_id=? GROUP BY category",
        uid
      )
    );
    return c;
  }

  @GetMapping("/roadmap")
  public Object get(Principal p) {
    var list = db.list(
      "SELECT r.id,r.summary,g.title,r.created_at FROM career_roadmaps r JOIN career_goals g ON g.id=r.goal_id WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 1",
      p.getName()
    );
    if (list.isEmpty()) return Map.of("items", List.of());
    var r = new HashMap<>(list.getFirst());
    r.put(
      "items",
      db.list("SELECT * FROM roadmap_items WHERE roadmap_id=? ORDER BY position", r.get("id"))
    );
    return r;
  }

  @PostMapping("/roadmap")
  @Transactional
  public Object create(@Valid @RequestBody Text in, Principal p) {
    if (in.text().length() > 200) throw new IllegalArgumentException();
    var result = ai.roadmap(p.getName(), context(p.getName(), in.text()));
    String goal = db.id(),
      road = db.id();
    db.exec(
      "INSERT INTO career_goals(id,user_id,title) VALUES(?,?,?)",
      goal,
      p.getName(),
      in.text()
    );
    db.exec(
      "INSERT INTO career_roadmaps(id,user_id,goal_id,summary) VALUES(?,?,?,?)",
      road,
      p.getName(),
      goal,
      result.path("summary").asText()
    );
    int pos = 0;
    for (var item : result.path("items"))
      db.exec(
        "INSERT INTO roadmap_items(id,roadmap_id,title,position,learn,practice,build,interview) VALUES(?,?,?,?,?,?,?,?)",
        db.id(),
        road,
        item.path("title").asText(),
        pos++,
        item.path("learn").asText(),
        item.path("practice").asText(),
        item.path("build").asText(),
        item.path("interview").asText()
      );
    db.exec("UPDATE profiles SET career_goal=? WHERE user_id=?", in.text(), p.getName());
    return get(p);
  }

  @PatchMapping("/roadmap/items/{id}")
  public Object progress(@PathVariable String id, @Valid @RequestBody Progress in, Principal p) {
    db.one(
      "SELECT i.id FROM roadmap_items i JOIN career_roadmaps r ON r.id=i.roadmap_id WHERE i.id=? AND r.user_id=?",
      id,
      p.getName()
    );
    db.exec("UPDATE roadmap_items SET progress=? WHERE id=?", in.progress(), id);
    return Map.of("ok", true);
  }

  @PostMapping("/recommendations")
  public Object recommend(Principal p) {
    return ai.recommend(p.getName(), context(p.getName(), "Next best action"));
  }
}
