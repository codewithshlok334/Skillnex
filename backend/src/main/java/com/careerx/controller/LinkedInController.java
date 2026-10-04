package com.careerx.controller;

import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import com.careerx.service.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import java.security.Principal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/linkedin")
public class LinkedInController {
  public record Connect(@AssertTrue(message="Approve importing your basic LinkedIn profile first.") boolean consent) {}
  private final LinkedInConnectionService connections;
  private final LinkedInClient client;
  private final LinkedInAnalysisService analysis;
  private final DocumentService docs;
  private final Store db;
  private final RateLimit rate;
  private final String aiProvider;
  public LinkedInController(LinkedInConnectionService connections, LinkedInClient client, LinkedInAnalysisService analysis,
    DocumentService docs, Store db, RateLimit rate, @Value("${app.ai.base-url}") String aiBase) {
    this.connections=connections; this.client=client; this.analysis=analysis; this.docs=docs; this.db=db; this.rate=rate;
    String host;
    try { host=java.net.URI.create(aiBase).getHost(); } catch (IllegalArgumentException ex) { host=null; }
    aiProvider = "generativelanguage.googleapis.com".equals(host) ? "Google Gemini" : "api.openai.com".equals(host) ? "OpenAI" :
      "api.anthropic.com".equals(host) ? "Anthropic" : host == null ? "the configured AI provider" : host;
  }
  @ModelAttribute
  public void privateResponse(HttpServletResponse response) {
    response.setHeader("Cache-Control", "no-store"); response.setHeader("Referrer-Policy", "no-referrer");
  }
  @GetMapping("/status")
  public Object status(Principal user) {
    var status=connections.status(user.getName()); status.put("analysisProvider",aiProvider); return status;
  }
  @PostMapping("/connect")
  public Object connect(@Valid @RequestBody Connect input, Principal user, HttpServletRequest request) {
    rate.check("linkedin-connect:"+user.getName(), 10, 3600);
    return Map.of("authorizationUrl", connections.begin(user.getName(), session(request)));
  }
  @GetMapping("/callback")
  public void callback(@RequestParam(required=false) String state, @RequestParam(required=false) String code,
    @RequestParam(required=false) String error, Principal user, HttpServletRequest request, HttpServletResponse response) throws java.io.IOException {
    String result;
    try {
      rate.check("linkedin-callback:"+user.getName(), 30, 3600);
      var flow=connections.consume(user.getName(), session(request), state);
      if (error != null) result="cancelled";
      else {
        if (code==null || code.isBlank() || code.length()>10000) throw new IllegalArgumentException();
        connections.complete(flow, client.exchange(code, flow.nonce())); result="connected";
      }
    } catch (Exception ex) { result="failed"; }
    // Same-origin relative redirect: no Host/forwarded-host trust and no user-controlled return URL.
    response.setStatus(303); response.setHeader("Location", "/app/linkedin?connection="+result);
  }
  @DeleteMapping("/connection")
  public Object disconnect(Principal user) { connections.disconnect(user.getName()); return Map.of("ok",true); }
  @PostMapping("/extract")
  public Object extract(@RequestParam MultipartFile file, Principal user) {
    rate.check("linkedin-extract:"+user.getName(), 20, 3600);
    if (!Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT).endsWith(".pdf"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Upload a LinkedIn profile PDF, or paste your text.");
    // Memory-only extraction; no file, resume record or AI request is created.
    return Map.of("text",docs.extract(file));
  }
  @PostMapping("/analyze")
  public Object analyze(@Valid @RequestBody LinkedInAnalysisService.Request input, Principal user) {
    return analysis.analyze(user.getName(), input);
  }
  @GetMapping("/resume-preview/{id}")
  public Object resumePreview(@PathVariable String id, Principal user) {
    var resume = db.owned("resumes", id, user.getName());
    String text = Objects.toString(resume.get("content"), "");
    if (text.length() > 60000)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This resume is too long for the preview. Choose a shorter saved resume.");
    // Read only the selected owner's resume. Loading the preview never calls AI.
    return Map.of("id",resume.get("id"),"name",resume.get("name"),"text",text);
  }
  @GetMapping("/reports")
  public Object reports(Principal user) {
    return db.list("SELECT id,profile_url,target_role,created_at FROM linkedin_reports WHERE user_id=? ORDER BY created_at DESC LIMIT 100",user.getName());
  }
  @GetMapping("/reports/{id}")
  public Object report(@PathVariable String id, Principal user) {
    var record=db.one("SELECT id,profile_url,target_role,result_json,created_at FROM linkedin_reports WHERE id=? AND user_id=?",id,user.getName());
    return Map.of("id",record.get("id"),"profileUrl",record.get("profile_url"),"targetRole",record.get("target_role"),
      "report",db.parse((String)record.get("result_json")),"saved",true,"createdAt",record.get("created_at"));
  }
  @DeleteMapping("/reports/{id}")
  public Object delete(@PathVariable String id, Principal user) {
    if (db.exec("DELETE FROM linkedin_reports WHERE id=? AND user_id=?",id,user.getName())!=1)
      throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Report not found.");
    return Map.of("ok",true);
  }
  private String session(HttpServletRequest request) {
    if(request.getCookies()!=null) for(var cookie:request.getCookies()) if(cookie.getName().equals("careerx_session")) return cookie.getValue();
    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in again before connecting LinkedIn.");
  }
}
