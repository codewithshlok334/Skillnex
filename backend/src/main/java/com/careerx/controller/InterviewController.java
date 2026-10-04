package com.careerx.controller;

import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import com.careerx.service.InterviewService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

  private final Store db;
  private final InterviewService service;

  public InterviewController(Store db, InterviewService service) {
    this.db = db;
    this.service = service;
  }

  @GetMapping
  public Object list(Principal p) {
    return db.list(
      "SELECT * FROM interviews WHERE user_id=? ORDER BY created_at DESC",
      p.getName()
    );
  }

  @PostMapping
  public Object create(@Valid @RequestBody Interview in, Principal p) {
    String id = db.id();
    db.exec(
      "INSERT INTO interviews(id,user_id,role,kind,difficulty,duration,scheduled_at,curriculum_version) VALUES(?,?,?,?,?,?,?,'ROLE_V1')",
      id,
      p.getName(),
      in.role(),
      in.kind(),
      in.difficulty(),
      in.duration(),
      date(in.scheduledAt())
    );
    return Map.of("id", id);
  }

  @PutMapping("/{id}")
  public Object reschedule(@PathVariable String id, @Valid @RequestBody Interview in, Principal p) {
    db.owned("interviews", id, p.getName());
    if (
      db.exec(
        "UPDATE interviews SET role=?,kind=?,difficulty=?,duration=?,scheduled_at=? WHERE id=? AND status='SCHEDULED'",
        in.role(),
        in.kind(),
        in.difficulty(),
        in.duration(),
        date(in.scheduledAt()),
        id
      ) != 1
    ) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Only scheduled interviews can be changed."
    );
    return Map.of("ok", true);
  }

  @DeleteMapping("/{id}")
  public Object cancel(@PathVariable String id, Principal p) {
    db.owned("interviews", id, p.getName());
    if (
      db.exec(
        "UPDATE interviews SET status='CANCELLED' WHERE id=? AND status IN ('SCHEDULED','ACTIVE')",
        id
      ) != 1
    ) throw new ResponseStatusException(HttpStatus.CONFLICT, "This interview cannot be cancelled.");
    return Map.of("ok", true);
  }

  @GetMapping("/{id}")
  public Object get(@PathVariable String id, Principal p) {
    return service.view(id, p.getName());
  }

  @PostMapping("/{id}/start")
  public Object start(
    @PathVariable String id,
    @RequestParam(defaultValue = "AI") String mode,
    @RequestParam(defaultValue = "female") String interviewer,
    Principal p
  ) {
    return service.start(id, p.getName(), mode, interviewer);
  }

  @PostMapping("/{id}/answer")
  public Object answer(@PathVariable String id, @Valid @RequestBody AnswerInput in, Principal p) {
    return service.answer(id, p.getName(), in.questionId(), in.text(), in.inputMode(), in.responseSeconds(), in.speechSeconds(), in.spokenWords());
  }

  @PostMapping("/{id}/next")
  public Object next(@PathVariable String id, Principal p) {
    return service.next(id, p.getName());
  }

  @PostMapping("/{id}/end")
  public Object end(@PathVariable String id, Principal p) {
    return service.end(id, p.getName());
  }

  @PostMapping("/{id}/report")
  public Object report(@PathVariable String id, Principal p) {
    return service.report(id, p.getName());
  }

  private Timestamp date(String input) {
    if (input == null || input.isBlank()) return null;
    Instant instant = Instant.parse(input);
    if (instant.isBefore(Instant.now().minusSeconds(60))) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Choose a future date and time."
    );
    return Timestamp.from(instant);
  }
}
