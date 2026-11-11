package com.careerx.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Builds a two-person report without exposing private notes or trusting model attribution. */
public final class PeerReviewReport {
  private static final JsonNodeFactory JSON = JsonNodeFactory.instance;
  private static final Map<String,String> CRITERIA;
  static {
    var labels = new LinkedHashMap<String,String>();
    labels.put("clarity", "Clarity");
    labels.put("structure", "Answer / question structure");
    labels.put("reasoning", "Technical reasoning");
    labels.put("interviewing", "Interviewing and follow-ups");
    CRITERIA = Collections.unmodifiableMap(labels);
  }
  private final Map<String,Object> room;
  private final List<Map<String,Object>> participants, all, selected = new ArrayList<>();
  private final Object feedback;

  @SuppressWarnings("unchecked")
  public PeerReviewReport(Map<String,Object> snapshot) {
    room = (Map<String,Object>) snapshot.get("room");
    participants = new ArrayList<>((List<Map<String,Object>>) snapshot.get("participants"));
    participants.sort(Comparator.comparingInt(p -> p.get("id").equals(room.get("host_id")) ? 0 : 1));
    all = (List<Map<String,Object>>) snapshot.get("entries");
    feedback = snapshot.get("feedback");
    // Reserve equal context for each speaker so a talkative partner cannot crowd out the other.
    var used = new HashMap<String,Integer>();
    for (var entry : all) {
      String uid = (String) entry.get("user_id"), text = (String) entry.get("content");
      int already = used.getOrDefault(uid, 0);
      if (already + text.length() <= 30000) {
        selected.add(entry);
        used.put(uid, already + text.length());
      }
    }
  }

  private List<Map<String,Object>> own(String uid) {
    return selected.stream().filter(n -> uid.equals(n.get("user_id"))).toList();
  }
  private boolean enough(String uid) {
    return own(uid).stream().mapToInt(n -> ((String)n.get("content")).strip().length()).sum() >= 80;
  }
  public boolean needsAI() {
    return participants.stream().anyMatch(p -> enough((String)p.get("id")));
  }
  public Object input() {
    return Map.of("session",room.get("title"),"participants",participants.stream().map(p ->
      Map.of("userId",p.get("id"),"name",p.get("name"),"hasEnoughEvidence",enough((String)p.get("id")))).toList(),
      "entries",selected,"peerFeedback",feedback);
  }

  public ObjectNode complete(JsonNode raw) {
    try {
      if (needsAI()) validateShape(raw);
      var supplied = new HashMap<String,JsonNode>();
      if (needsAI()) {
        for (var participant : raw.path("participants")) {
          String uid = participant.path("userId").asText();
          if (participants.stream().noneMatch(p -> uid.equals(p.get("id"))) || supplied.put(uid,participant) != null)
            throw new IllegalArgumentException("Invalid speaker attribution");
        }
      }
      var report = JSON.objectNode();
      report.put("version",2).put("contentRevision",((Number)room.get("content_revision")).intValue());
      report.put("basis","shared_transcripts_and_notes").put("generatedAt",Instant.now().toString());
      report.put("summary",needsAI() ? raw.path("summary").asText() : "The interview has ended. There is not enough saved conversation to assess either participant yet.");
      report.put("coverage",needsAI() ? raw.path("coverage").asText() : "Only shared transcripts and explicitly shared notes can support this report. Private notes and unsaved speech are not assessed.");
      report.put("reviewedEntries",selected.size()).put("totalEntries",all.size());
      var result = report.putArray("participants");
      for (var person : participants) {
        String uid = (String)person.get("id");
        var entries = own(uid);
        var participant = result.addObject().put("userId",uid).put("name",(String)person.get("name"));
        var roles = participant.putArray("roles");
        entries.stream().map(e -> (String)e.get("speaker_role")).distinct().forEach(roles::add);
        participant.put("evidenceEntries",entries.size());
        participant.put("totalEvidenceEntries",all.stream().filter(e -> uid.equals(e.get("user_id"))).count());
        if (!enough(uid)) {
          participant.put("status","insufficient_evidence").putNull("overallScore");
          participant.put("coverage",entries.isEmpty() ? "No shared conversation was saved for this participant. This is not a zero score." : "Too little shared conversation was saved for a reliable assessment. This is not a zero score.");
          var criteria = participant.putArray("criteria");
          CRITERIA.forEach((key,label) -> criteria.addObject().put("key",key).put("label",label).putNull("score").put("reason","Not enough saved evidence to assess this area."));
          participant.putArray("strengths"); participant.putArray("mistakes");
          participant.putArray("improvements");
          participant.putArray("nextSteps").add("Share your actual questions and answers in Notes, or enable your transcript for your next interview.");
          continue;
        }
        JsonNode assessment = supplied.get(uid);
        if (assessment == null) throw new IllegalArgumentException("Missing participant");
        participant.put("status","reviewed").put("coverage",assessment.path("coverage").asText());
        var criteria = participant.putArray("criteria");
        var byKey = new HashMap<String,JsonNode>();
        for (var criterion : assessment.path("criteria")) {
          String key = criterion.path("key").asText();
          if (!CRITERIA.containsKey(key) || byKey.put(key,criterion) != null) throw new IllegalArgumentException("Unknown criterion");
        }
        int scoreSum = 0, scored = 0;
        for (var key : CRITERIA.keySet()) {
          var criterion = byKey.get(key);
          if (criterion == null) throw new IllegalArgumentException("Missing criterion");
          var target = criteria.addObject().put("key",key).put("label",CRITERIA.get(key)).put("reason",criterion.path("reason").asText());
          if (criterion.path("score").isNull()) target.putNull("score");
          else { int score = criterion.path("score").asInt(); target.put("score",score); scoreSum += score; scored++; }
        }
        if (scored == 0) participant.putNull("overallScore");
        else participant.put("overallScore",Math.round((float)scoreSum/scored));
        for (String field : List.of("strengths","improvements","nextSteps")) participant.set(field,assessment.path(field).deepCopy());
        var mistakes = participant.putArray("mistakes");
        for (var mistake : assessment.path("mistakes")) {
          String noteId = mistake.path("noteId").asText(), quote = mistake.path("quote").asText();
          if (entries.stream().noneMatch(e -> noteId.equals(e.get("id")) && ((String)e.get("content")).contains(quote)))
            throw new IllegalArgumentException("Unsupported speaker quote");
          var target = mistakes.addObject();
          for (String field : List.of("noteId","quote","issue","improvement")) target.put(field,mistake.path(field).asText());
        }
      }
      return report;
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"The analysis could not be matched reliably to each participant's saved conversation. Please try again.");
    }
  }

  /** Validate the provider's schema before accepting any free-form response. */
  public static void validateShape(JsonNode n) {
    text(n,"summary",6000); text(n,"coverage",4000);
    if (!n.path("participants").isArray() || n.path("participants").size() != 2) throw new IllegalArgumentException();
    for (var p : n.path("participants")) {
      text(p,"userId",36); text(p,"coverage",4000);
      for (String field : List.of("strengths","improvements","nextSteps")) {
        if (!p.path(field).isArray() || p.path(field).size() > 8) throw new IllegalArgumentException();
        for (var item : p.path(field)) if (!item.isTextual() || item.asText().isBlank() || item.asText().length()>2000) throw new IllegalArgumentException();
      }
      if (!p.path("criteria").isArray() || p.path("criteria").size() != CRITERIA.size()) throw new IllegalArgumentException();
      for (var c : p.path("criteria")) {
        text(c,"key",40); text(c,"reason",2000);
        var score = c.get("score");
        if (score == null || (!score.isNull() && (!score.isIntegralNumber() || !score.canConvertToInt() || score.asInt()<0 || score.asInt()>100))) throw new IllegalArgumentException();
      }
      if (!p.path("mistakes").isArray() || p.path("mistakes").size() > 12) throw new IllegalArgumentException();
      for (var mistake : p.path("mistakes")) {
        text(mistake,"noteId",36); text(mistake,"quote",5000);
        text(mistake,"issue",2000); text(mistake,"improvement",2000);
      }
    }
  }
  private static void text(JsonNode n, String field, int max) {
    if (n == null || !n.path(field).isTextual() || n.path(field).asText().isBlank() || n.path(field).asText().length()>max) throw new IllegalArgumentException();
  }
}
