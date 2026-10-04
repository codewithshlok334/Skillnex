package com.careerx.controller;

import com.careerx.ai.AIService;
import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class UserController {

  private final Store db;
  private final AIService ai;
  private final boolean demo;
  private final boolean google;

  public UserController(
    Store db,
    AIService ai,
    @Value("${app.demo}") boolean demo,
    @Value("${app.google-enabled:false}") boolean google
  ) {
    this.db = db;
    this.ai = ai;
    this.demo = demo;
    this.google = google;
  }

  @GetMapping("/api/config")
  public Object config() {
    return Map.of(
      "demo",
      demo,
      "aiAvailable",
      ai.available(),
      "semanticSearch",
      ai.embeddingsAvailable(),
      "googleEnabled",
      google
    );
  }

  @GetMapping("/api/users/me")
  public Object me(Principal p) {
    var user = new HashMap<>(
      db.one(
        "SELECT u.id,u.name,u.email,u.role,u.created_at,p.college,p.course,p.branch,p.study_year,p.graduation_year,p.career_goal,p.skills,p.projects,p.photo_url,p.public_profile,p.reputation FROM app_users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?",
        p.getName()
      )
    );
    user.put(
      "badges",
      db.list(
        "SELECT b.* FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id=?",
        p.getName()
      )
    );
    return user;
  }

  @PutMapping("/api/users/me")
  @Transactional
  public Object update(@Valid @RequestBody Profile in, Principal p) {
    db.exec("UPDATE app_users SET name=? WHERE id=?", in.name(), p.getName());
    db.exec(
      "UPDATE profiles SET college=?,course=?,branch=?,study_year=?,graduation_year=?,career_goal=?,skills=?,projects=?,public_profile=? WHERE user_id=?",
      in.college(),
      in.course(),
      in.branch(),
      in.studyYear(),
      in.graduationYear(),
      in.careerGoal(),
      in.skills(),
      in.projects(),
      in.publicProfile(),
      p.getName()
    );
    return me(p);
  }

  @GetMapping("/api/users/{id}")
  public Object publicProfile(@PathVariable String id) {
    return db.one(
      "SELECT u.id,u.name,u.role,p.college,p.branch,p.study_year,p.skills,p.projects,p.reputation FROM app_users u JOIN profiles p ON p.user_id=u.id WHERE u.id=? AND p.public_profile=TRUE",
      id
    );
  }

  @GetMapping("/api/notifications")
  public Object notifications(Principal p) {
    return db.list(
      "SELECT id,kind,message,link,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      p.getName()
    );
  }

  @PostMapping("/api/notifications/read")
  public Object read(Principal p) {
    db.exec(
      "UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL",
      p.getName()
    );
    return Map.of("ok", true);
  }

  @GetMapping("/api/dashboard")
  public Object dashboard(Principal p) {
    String uid = p.getName();
    var result = new HashMap<String, Object>();
    result.put("profile", me(p));
    var r = db.list(
      "SELECT a.result_json,r.name FROM resume_analyses a JOIN resumes r ON r.id=a.resume_id WHERE r.user_id=? ORDER BY a.created_at DESC LIMIT 1",
      uid
    );
    result.put(
      "resume",
      r.isEmpty()
        ? null
        : Map.of(
            "name",
            r.getFirst().get("name"),
            "analysis",
            db.parse((String) r.getFirst().get("result_json"))
          )
    );
    var ir = db.list(
      "SELECT r.result_json FROM interview_reports r JOIN interviews i ON i.id=r.interview_id WHERE i.user_id=? AND i.mode='AI' ORDER BY r.created_at DESC LIMIT 1",
      uid
    );
    result.put(
      "interviewReport",
      ir.isEmpty() ? null : db.parse((String) ir.getFirst().get("result_json"))
    );
    result.put(
      "upcoming",
      db.list(
        "SELECT id,role,kind,difficulty,scheduled_at,duration,status FROM interviews WHERE user_id=? AND status IN ('SCHEDULED','ACTIVE') ORDER BY scheduled_at NULLS LAST LIMIT 3",
        uid
      )
    );
    var roads = db.list(
      "SELECT r.id,r.summary,g.title FROM career_roadmaps r JOIN career_goals g ON g.id=r.goal_id WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 1",
      uid
    );
    result.put("roadmap", roads.isEmpty() ? null : roads.getFirst());
    result.put(
      "roadmapItems",
      roads.isEmpty()
        ? List.of()
        : db.list(
            "SELECT * FROM roadmap_items WHERE roadmap_id=? ORDER BY position",
            roads.getFirst().get("id")
          )
    );
    result.put(
      "community",
      Map.of(
        "questions",
        db.count("SELECT COUNT(*) FROM questions WHERE user_id=? AND hidden=FALSE", uid),
        "answers",
        db.count("SELECT COUNT(*) FROM answers WHERE user_id=? AND hidden=FALSE", uid),
        "votes",
        db.count(
          "SELECT COUNT(*) FROM votes v JOIN answers a ON a.id=v.answer_id WHERE a.user_id=? AND v.value=1",
          uid
        )
      )
    );
    result.put(
      "recentQuestions",
      db.list(
        "SELECT q.id,q.title,q.category,u.name,(SELECT COUNT(*) FROM answers a WHERE a.question_id=q.id AND a.hidden=FALSE) AS answer_count FROM questions q JOIN app_users u ON u.id=q.user_id WHERE q.hidden=FALSE ORDER BY q.created_at DESC LIMIT 3"
      )
    );
    result.put(
      "activity",
      db.list(
        "SELECT kind,message,link,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 4",
        uid
      )
    );
    return result;
  }
}
