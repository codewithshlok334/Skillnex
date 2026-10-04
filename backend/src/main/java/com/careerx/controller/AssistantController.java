package com.careerx.controller;

import com.careerx.ai.AIExecutor;
import com.careerx.ai.AIService;
import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/assistant/threads")
public class AssistantController {

  private final Store db;
  private final AIExecutor ai;
  private final AIService provider;
  private final RateLimit rate;

  public AssistantController(Store db, AIExecutor ai, AIService provider, RateLimit rate) {
    this.db = db;
    this.ai = ai;
    this.provider = provider;
    this.rate = rate;
  }

  public record Message(
    @NotBlank @Size(max = 4000) String text,
    @NotBlank @Pattern(regexp = "[a-fA-F0-9-]{36}") String requestId,
    boolean includeProfile
  ) {}

  @GetMapping
  public Object list(Principal p) {
    return db.list(
      "SELECT * FROM assistant_threads WHERE user_id=? ORDER BY updated_at DESC LIMIT 100",
      p.getName()
    );
  }

  @PostMapping
  public Object create(Principal p) {
    rate.check("assistant-thread:" + p.getName(), 30, 3600);
    String id = db.id();
    db.exec("INSERT INTO assistant_threads(id,user_id) VALUES(?,?)", id, p.getName());
    return Map.of("id", id);
  }

  @GetMapping("/{id}")
  public Object get(@PathVariable String id, Principal p) {
    return view(id, p.getName());
  }

  private Object view(String id, String uid) {
    var thread = new HashMap<>(
      db.one("SELECT * FROM assistant_threads WHERE id=? AND user_id=?", id, uid)
    );
    thread.put(
      "messages",
      db.list(
        "SELECT id,role,content,created_at FROM assistant_messages WHERE thread_id=? ORDER BY position",
        id
      )
    );
    return thread;
  }

  @PostMapping("/{id}/messages")
  @Transactional
  public Object send(@PathVariable String id, @Valid @RequestBody Message in, Principal p) {
    var thread = db.one(
      "SELECT * FROM assistant_threads WHERE id=? AND user_id=? FOR UPDATE",
      id,
      p.getName()
    );
    if (
      db.exists(
        "SELECT 1 FROM assistant_messages WHERE thread_id=? AND request_id=?",
        id,
        in.requestId()
      )
    ) return view(id, p.getName());
    if (!provider.available()) throw new ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "AI assistant is not connected yet. Configure the server's AI provider, API key, and model, then restart the backend."
    );
    int count = db.count("SELECT COUNT(*) FROM assistant_messages WHERE thread_id=?", id);
    if (count >= 100) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "This conversation is full. Start a new chat to continue."
    );
    var recent = new ArrayList<>(
      db.list(
        "SELECT role,content FROM assistant_messages WHERE thread_id=? ORDER BY position DESC LIMIT 12",
        id
      )
    );
    Collections.reverse(recent);
    var context = new HashMap<String, Object>();
    context.put("conversation", recent);
    context.put("message", in.text().trim());
    if (in.includeProfile()) {
      context.put(
        "profile",
        db.one(
          "SELECT course,branch,career_goal,skills,projects FROM profiles WHERE user_id=?",
          p.getName()
        )
      );
    }
    var reply = ai.run(p.getName(), "AssistantPrompt", context).path("reply").asText();
    db.exec(
      "INSERT INTO assistant_messages(id,thread_id,position,role,content,request_id) VALUES(?,?,?,'user',?,?)",
      db.id(),
      id,
      count,
      in.text().trim(),
      in.requestId()
    );
    db.exec(
      "INSERT INTO assistant_messages(id,thread_id,position,role,content,request_id) VALUES(?,?,?,'assistant',?,?)",
      db.id(),
      id,
      count + 1,
      reply,
      in.requestId()
    );
    String title =
      count == 0 ? in.text().trim().replaceAll("\\s+", " ") : (String) thread.get("title");
    db.exec(
      "UPDATE assistant_threads SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      title.substring(0, Math.min(100, title.length())),
      id
    );
    return view(id, p.getName());
  }
}
