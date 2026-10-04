package com.careerx.service;

import com.careerx.ai.AIExecutor;
import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LinkedInAnalysisService {
  public record Request(@Size(max=500) String profileUrl,
    @NotBlank @Size(max=160) String targetRole, @NotBlank @Size(min=80,max=60000) String content,
    @AssertTrue(message="Approve sending this profile text to the AI provider before analysing.") boolean consent,
    boolean saveReport, @Size(max=36) String resumeId) {}
  private final Store db;
  private final AIExecutor ai;
  public LinkedInAnalysisService(Store db, AIExecutor ai) { this.db = db; this.ai = ai; }

  public Map<String,Object> analyze(String uid, Request in) {
    if (!in.consent()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Analysis consent is required.");
    boolean fromResume = in.resumeId() != null && !in.resumeId().isBlank();
    String sourceName = fromResume ? (String)db.owned("resumes", in.resumeId(), uid).get("name") : "Profile text";
    String suppliedUrl = Objects.requireNonNullElse(in.profileUrl(), "").strip();
    String url = fromResume && suppliedUrl.isBlank() ? "" : normalizeUrl(suppliedUrl);
    String content = in.content().strip();
    if (content.length() < 80) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least 80 characters of profile content to review.");
    // Only the previewed text and target role go to AI. The OAuth snapshot, URL and tokens do not.
    String task = fromResume ? "LinkedInFromResumePrompt" : "LinkedInAnalysisPrompt";
    JsonNode report = ai.run(uid, task, Map.of("profileText", content, "targetRole", in.targetRole().strip()));
    try {
      validate(report);
      for (var section : report.path("sections")) {
        if (section.path("status").asText().equals("provided") && !content.contains(section.path("evidence").asText()))
          throw new IllegalArgumentException();
      }
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI review could not be verified against your text. Please retry.");
    }
    // Source labels are assigned by the server, never inferred from model output.
    ObjectNode labelled = report.deepCopy();
    labelled.put("sourceType", fromResume ? "resume" : "profile_text");
    labelled.put("sourceName", sourceName);
    var out = new LinkedHashMap<String,Object>();
    out.put("report", labelled); out.put("profileUrl", url); out.put("targetRole", in.targetRole().strip());
    out.put("saved", in.saveReport());
    if (in.saveReport()) {
      String id = db.id();
      db.exec("INSERT INTO linkedin_reports(id,user_id,profile_url,target_role,result_json,consent_version) VALUES(?,?,?,?,?,?)",
        id, uid, url, in.targetRole().strip(), db.text(labelled), fromResume ? "linkedin-resume-v1" : "linkedin-analysis-v1");
      out.put("id", id);
    }
    return out;
  }
  public static String normalizeUrl(String value) {
    try {
      URI uri = URI.create(value.strip());
      if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null ||
          !Set.of("linkedin.com", "www.linkedin.com").contains(uri.getHost().toLowerCase(Locale.ROOT)) ||
          uri.getUserInfo() != null || uri.getPort() != -1 || !uri.getRawPath().matches("/in/[A-Za-z0-9%._-]{1,200}/?"))
        throw new IllegalArgumentException();
      return "https://www.linkedin.com" + uri.getRawPath().replaceAll("/$", "") + "/";
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a LinkedIn profile URL such as https://www.linkedin.com/in/your-name/.");
    }
  }
  public static void validate(JsonNode report) {
    if (!report.isObject()) throw new IllegalArgumentException();
    text(report, "summary", 4000, false);
    if (!report.path("sections").isArray() || report.path("sections").size() != 4) throw new IllegalArgumentException();
    Set<String> remaining = new HashSet<>(Set.of("Headline", "About", "Experience", "Skills"));
    for (var section : report.path("sections")) {
      if (!remaining.remove(section.path("name").asText()) || !Set.of("provided", "not_provided").contains(section.path("status").asText()))
        throw new IllegalArgumentException();
      boolean absent = section.path("status").asText().equals("not_provided");
      text(section, "evidence", 3000, absent); text(section, "feedback", 4000, false); text(section, "suggestedText", 6000, true);
      if (absent && (!section.path("evidence").asText().isEmpty() || !section.path("suggestedText").asText().isEmpty()))
        throw new IllegalArgumentException();
    }
    for (String field : List.of("keywordsToConsider", "actionPlan")) {
      var array = report.path(field);
      if (!array.isArray() || array.size() > 12 || (field.equals("actionPlan") && array.isEmpty())) throw new IllegalArgumentException();
      for (var item : array) if (!item.isTextual() || item.asText().isBlank() || item.asText().length() > 2000) throw new IllegalArgumentException();
    }
  }
  private static void text(JsonNode node, String field, int max, boolean empty) {
    if (!node.path(field).isTextual() || node.path(field).asText().length() > max || (!empty && node.path(field).asText().isBlank()))
      throw new IllegalArgumentException();
  }
}
