package com.careerx.controller;

import com.careerx.ai.ResumeAIService;
import com.careerx.dto.Requests.*;
import com.careerx.repository.Store;
import com.careerx.service.DocumentService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ResumeController {

  private final Store db;
  private final DocumentService docs;
  private final ResumeAIService ai;

  public ResumeController(Store db, DocumentService docs, ResumeAIService ai) {
    this.db = db;
    this.docs = docs;
    this.ai = ai;
  }

  @GetMapping("/api/resumes")
  public Object list(Principal p) {
    return db.list(
      "SELECT id,name,created_at FROM resumes WHERE user_id=? ORDER BY created_at DESC",
      p.getName()
    );
  }

  @GetMapping("/api/resumes/{id}")
  public Object get(@PathVariable String id, Principal p) {
    var r = new HashMap<>(db.owned("resumes", id, p.getName()));
    var a = db.list(
      "SELECT result_json FROM resume_analyses WHERE resume_id=? ORDER BY created_at DESC LIMIT 1",
      id
    );
    r.put("analysis", a.isEmpty() ? null : db.parse((String) a.getFirst().get("result_json")));
    if (r.get("document_json") != null) r.put(
      "document",
      db.parse((String) r.remove("document_json"))
    );
    return r;
  }

  @PostMapping("/api/resumes")
  public Object upload(@RequestParam MultipartFile file, Principal p) {
    String text = docs.extract(file);
    String id = db.id();
    String name = Objects.requireNonNullElse(file.getOriginalFilename(), "Resume").replaceAll(
      "[\\\\/]",
      "_"
    );
    if (name.length() > 240) name = name.substring(0, 240);
    db.exec(
      "INSERT INTO resumes(id,user_id,name,content) VALUES(?,?,?,?)",
      id,
      p.getName(),
      name,
      text
    );
    return Map.of("id", id, "name", name);
  }

  @PostMapping("/api/resumes/build")
  public Object build(@Valid @RequestBody ResumeBuild in, Principal p) {
    if (db.text(in.document()).length() > 70000) throw new IllegalArgumentException();
    String id = db.id();
    db.exec(
      "INSERT INTO resumes(id,user_id,name,content,document_json) VALUES(?,?,?,?,?)",
      id,
      p.getName(),
      in.name(),
      in.content(),
      db.text(in.document())
    );
    return Map.of("id", id);
  }

  @PostMapping("/api/resumes/{id}/analyze")
  public Object analyze(@PathVariable String id, Principal p) {
    var r = db.owned("resumes", id, p.getName());
    var result = ai.analyze(p.getName(), (String) r.get("content"));
    db.exec(
      "INSERT INTO resume_analyses(id,resume_id,result_json) VALUES(?,?,?)",
      db.id(),
      id,
      db.text(result)
    );
    db.notify(p.getName(), "ANALYSIS", "Your resume analysis is ready.", "/app/resumes");
    return result;
  }

  @PostMapping("/api/resumes/improve")
  public Object improve(@Valid @RequestBody Text in, Principal p) {
    return ai.improve(p.getName(), in.text());
  }

  @PostMapping("/api/jobs/match")
  public Object match(@Valid @RequestBody Match in, Principal p) {
    var r = db.owned("resumes", in.resumeId(), p.getName());
    var result = ai.match(p.getName(), (String) r.get("content"), in.jobDescription());
    String job = db.id();
    db.exec(
      "INSERT INTO job_descriptions(id,user_id,content) VALUES(?,?,?)",
      job,
      p.getName(),
      in.jobDescription()
    );
    db.exec(
      "INSERT INTO job_matches(id,job_id,resume_id,result_json) VALUES(?,?,?,?)",
      db.id(),
      job,
      in.resumeId(),
      db.text(result)
    );
    return result;
  }

  @PostMapping("/api/resumes/tailor")
  public Object tailor(@Valid @RequestBody Match in, Principal p) {
    var r = db.owned("resumes", in.resumeId(), p.getName());
    var result = ai.tailor(p.getName(), (String) r.get("content"), in.jobDescription());
    db.exec(
      "INSERT INTO resume_versions(id,resume_id,original_text,tailored_text,changes_json) VALUES(?,?,?,?,?)",
      db.id(),
      in.resumeId(),
      r.get("content"),
      result.path("content").asText(),
      db.text(result.path("changes"))
    );
    return Map.of("original", r.get("content"), "tailored", result);
  }

  @GetMapping("/api/resumes/{id}/export")
  public ResponseEntity<byte[]> export(
    @PathVariable String id,
    @RequestParam(defaultValue = "pdf") String format,
    Principal p
  ) throws Exception {
    var resume = db.owned("resumes", id, p.getName());
    String text = (String) resume.get("content");
    String template =
      resume.get("document_json") == null
        ? "minimal"
        : db
            .parse((String) resume.get("document_json"))
            .path("template")
            .asText("minimal");
    if (!Set.of("pdf", "docx").contains(format)) throw new IllegalArgumentException();
    byte[] file = format.equals("pdf") ? docs.pdf(text, template) : docs.docx(text, template);
    return ResponseEntity.ok()
      .header("Content-Disposition", "attachment; filename=skillnex-resume." + format)
      .contentType(
        MediaType.parseMediaType(
          format.equals("pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      )
      .body(file);
  }

  @GetMapping("/api/resume-templates")
  public Object templates() {
    return db.list("SELECT * FROM resume_templates ORDER BY name");
  }
}
