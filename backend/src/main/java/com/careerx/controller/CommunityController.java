package com.careerx.controller;

import com.careerx.ai.CommunityAIService;
import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import com.careerx.service.CommunityService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
public class CommunityController {

  private final Store db;
  private final CommunityService service;
  private final CommunityAIService ai;
  private final RateLimit rate;

  public CommunityController(
    Store db,
    CommunityService service,
    CommunityAIService ai,
    RateLimit rate
  ) {
    this.db = db;
    this.service = service;
    this.ai = ai;
    this.rate = rate;
  }

  @GetMapping("/categories")
  public Object categories() {
    return db.list("SELECT name FROM categories ORDER BY name");
  }

  @GetMapping({ "/questions", "/search" })
  public Object list(
    @RequestParam(defaultValue = "") String q,
    @RequestParam(defaultValue = "") String category,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "recent") String sort,
    @RequestParam(defaultValue = "false") boolean bookmarked,
    Principal p
  ) {
    return service.search(q, category, page, sort, p.getName(), bookmarked);
  }

  @PostMapping("/questions")
  @Transactional
  public Object ask(@Valid @RequestBody Question in, Principal p) {
    rate.check("post:" + p.getName(), 20, 3600);
    String id = db.id();
    db.exec(
      "INSERT INTO questions(id,user_id,title,original_title,body,category) VALUES(?,?,?,?,?,?)",
      id,
      p.getName(),
      in.title(),
      in.originalTitle() == null ? in.title() : in.originalTitle(),
      in.body(),
      in.category()
    );
    db.reputation(p.getName(), 1);
    return Map.of("id", id);
  }

  @GetMapping("/questions/{id}")
  public Object get(@PathVariable String id, Principal p) {
    return service.detail(id, p.getName());
  }

  @PostMapping("/questions/enhance")
  public Object enhance(@Valid @RequestBody Text in, Principal p) {
    return ai.enhance(p.getName(), in.text());
  }

  @PostMapping("/questions/{id}/explain")
  public Object explain(@PathVariable String id, Principal p) {
    return service.explain(id, p.getName());
  }

  @PostMapping("/answers")
  @Transactional
  public Object answer(@Valid @RequestBody Answer in, Principal p) {
    rate.check("answer:" + p.getName(), 30, 3600);
    var q = db.one("SELECT user_id FROM questions WHERE id=? AND hidden=FALSE", in.questionId());
    String id = db.id();
    db.exec(
      "INSERT INTO answers(id,question_id,user_id,body) VALUES(?,?,?,?)",
      id,
      in.questionId(),
      p.getName(),
      in.body()
    );
    if (!q.get("user_id").equals(p.getName())) db.notify(
      (String) q.get("user_id"),
      "ANSWER",
      "Someone answered your question.",
      "/app/community/" + in.questionId()
    );
    return Map.of("id", id);
  }

  @PostMapping("/answers/{id}/vote")
  public Object vote(@PathVariable String id, @Valid @RequestBody Vote in, Principal p) {
    return service.vote(id, p.getName(), in.value());
  }

  @PostMapping("/answers/{id}/verify")
  public Object verify(@PathVariable String id, Principal p) {
    return service.verify(id, p.getName());
  }

  @PostMapping("/answers/{id}/helpful")
  public Object helpful(@PathVariable String id, Principal p) {
    return service.accept(id, p.getName());
  }

  @PostMapping("/questions/{id}/bookmark")
  @Transactional
  public Object bookmark(@PathVariable String id, Principal p) {
    db.one("SELECT id FROM questions WHERE id=? AND hidden=FALSE", id);
    if (
      db.exists("SELECT 1 FROM bookmarks WHERE user_id=? AND question_id=?", p.getName(), id)
    ) db.exec("DELETE FROM bookmarks WHERE user_id=? AND question_id=?", p.getName(), id);
    else db.exec("INSERT INTO bookmarks(user_id,question_id) VALUES(?,?)", p.getName(), id);
    return Map.of("ok", true);
  }

  @PostMapping("/questions/{id}/comments")
  public Object comment(@PathVariable String id, @Valid @RequestBody Text in, Principal p) {
    if (in.text().length() > 2000) throw new IllegalArgumentException();
    rate.check("comment:" + p.getName(), 30, 3600);
    db.one("SELECT id FROM questions WHERE id=? AND hidden=FALSE", id);
    db.exec(
      "INSERT INTO comments(id,question_id,user_id,body) VALUES(?,?,?,?)",
      db.id(),
      id,
      p.getName(),
      in.text()
    );
    return Map.of("ok", true);
  }

  @PostMapping("/reports")
  public Object report(@Valid @RequestBody Report in, Principal p) {
    rate.check("report:" + p.getName(), 10, 3600);
    db.one(
      "SELECT id FROM " +
        (in.targetType().equals("question") ? "questions" : "answers") +
        " WHERE id=? AND hidden=FALSE",
      in.targetId()
    );
    db.exec(
      "INSERT INTO reports(id,user_id,target_id,target_type,reason) VALUES(?,?,?,?,?)",
      db.id(),
      p.getName(),
      in.targetId(),
      in.targetType(),
      in.reason()
    );
    return Map.of("ok", true);
  }
}
