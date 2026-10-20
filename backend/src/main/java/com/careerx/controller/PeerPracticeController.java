package com.careerx.controller;

import com.careerx.ai.*;
import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import com.careerx.service.PeerPracticeService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/peer")
public class PeerPracticeController {
  private final PeerPracticeService rooms;
  private final Store db;
  private final AIService ai;
  private final AIExecutor executor;
  private final RateLimit rate;
  private final String turnUrls, turnSecret, stunUrl;
  private final Set<String> analysing = ConcurrentHashMap.newKeySet();
  public PeerPracticeController(PeerPracticeService rooms, Store db, AIService ai, AIExecutor executor, RateLimit rate,
      @Value("${app.peer.turn-urls:}") String turnUrls, @Value("${app.peer.turn-secret:}") String turnSecret,
      @Value("${app.peer.stun-url:stun:stun.l.google.com:19302}") String stunUrl) {
    this.rooms=rooms; this.db=db; this.ai=ai; this.executor=executor; this.rate=rate;
    this.turnUrls=turnUrls; this.turnSecret=turnSecret; this.stunUrl=stunUrl;
  }
  public record Create(@NotNull @Size(max=120) String title) {}
  public record Client(@NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String clientId) {}
  public record Sync(@NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String clientId, @Min(0) long cursor, @Min(0) int epoch, boolean mic, boolean camera) {}
  public record Signal(@NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String clientId, @Min(0) int epoch, @Pattern(regexp="description|candidate") @NotNull String kind, @NotNull JsonNode payload) {}
  public record Action(@Pattern(regexp="start|swap|end") @NotNull String action, @Min(0) int revision) {}
  public record Consent(boolean enabled) {}
  public record Note(@Pattern(regexp="[a-fA-F0-9-]{36}") @NotNull String id, @NotBlank @Size(max=5000) String text) {}
  public record Feedback(@Min(1) @Max(5) int clarity, @NotBlank @Size(max=2000) String strengths, @NotBlank @Size(max=2000) String improvements) {}

  @GetMapping("/config")
  public Object config(Principal p) throws Exception {
    var servers = new ArrayList<Object>();
    if (!stunUrl.isBlank()) servers.add(Map.of("urls", stunUrl));
    boolean relay = !turnUrls.isBlank() && !turnSecret.isBlank();
    if (relay) {
      // coturn REST credentials expire; the long-lived shared secret never reaches the browser.
      String username = (System.currentTimeMillis()/1000 + 3600) + ":" + p.getName();
      Mac hmac = Mac.getInstance("HmacSHA1");
      hmac.init(new SecretKeySpec(turnSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
      servers.add(Map.of("urls", Arrays.stream(turnUrls.split(",")).map(String::strip).toList(), "username", username,
        "credential", Base64.getEncoder().encodeToString(hmac.doFinal(username.getBytes(StandardCharsets.UTF_8)))));
    }
    return Map.of("iceServers", servers, "relayAvailable", relay, "transcriptionAvailable", ai.audioTranscriptionAvailable(), "analysisAvailable", ai.available());
  }
  @GetMapping("/rooms") public Object list(Principal p) { return rooms.history(p.getName()); }
  @PostMapping("/rooms") public Object create(@Valid @RequestBody Create in, Principal p) {
    rate.check("peer-create:"+p.getName(), 12, 3600); return rooms.create(p.getName(), in.title());
  }
  @GetMapping("/rooms/{id}") public Object state(@PathVariable String id, Principal p) { return rooms.state(id,p.getName()); }
  @PostMapping("/rooms/{id}/join") public Object join(@PathVariable String id, Principal p) {
    rate.check("peer-join:"+p.getName(), 40, 600); return rooms.join(id,p.getName());
  }
  @PostMapping("/rooms/{id}/connect") public Object connect(@PathVariable String id, @Valid @RequestBody Client in, Principal p) { return rooms.connect(id,p.getName(),in.clientId()); }
  @PostMapping("/rooms/{id}/sync") public Object sync(@PathVariable String id, @Valid @RequestBody Sync in, Principal p) { return rooms.sync(id,p.getName(),in.clientId(),in.cursor(),in.epoch(),in.mic(),in.camera()); }
  @PostMapping("/rooms/{id}/signal") public Object signal(@PathVariable String id, @Valid @RequestBody Signal in, Principal p) {
    String payload = db.text(in.payload());
    if (!in.payload().isObject() || payload.length()>40000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid connection message.");
    if (in.kind().equals("description") && (!Set.of("offer","answer").contains(in.payload().path("type").asText()) || !in.payload().path("sdp").isTextual()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid session description.");
    rooms.signal(id,p.getName(),in.clientId(),in.epoch(),in.kind(),payload); return Map.of("ok",true);
  }
  @PostMapping("/rooms/{id}/leave") public Object leave(@PathVariable String id, @Valid @RequestBody Client in, Principal p) { rooms.leave(id,p.getName(),in.clientId()); return Map.of("ok",true); }
  @PostMapping("/rooms/{id}/action") public Object action(@PathVariable String id,@Valid @RequestBody Action in, Principal p) { return rooms.action(id,p.getName(),in.action(),in.revision()); }
  @PostMapping("/rooms/{id}/consent") public Object consent(@PathVariable String id,@RequestBody Consent in,Principal p) { rooms.consent(id,p.getName(),in.enabled()); return Map.of("ok",true); }
  @PostMapping("/rooms/{id}/notes") public Object note(@PathVariable String id,@Valid @RequestBody Note in,Principal p) {
    var r=rooms.member(id,p.getName());
    rooms.note(id,p.getName(),in.id(),"note",in.text(),p.getName().equals(r.get("interviewer_id")) ? "interviewer" : "candidate"); return Map.of("ok",true);
  }
  @DeleteMapping("/rooms/{id}/notes/{noteId}") public Object remove(@PathVariable String id,@PathVariable String noteId,Principal p) { rooms.removeNote(id,p.getName(),noteId); return Map.of("ok",true); }
  @PostMapping("/rooms/{id}/feedback") public Object feedback(@PathVariable String id,@Valid @RequestBody Feedback in,Principal p) { rooms.feedback(id,p.getName(),in.clarity(),in.strengths(),in.improvements()); return Map.of("ok",true); }

  @PostMapping(value="/rooms/{id}/transcribe", consumes="multipart/form-data")
  public Object transcribe(@PathVariable String id, @RequestParam String clipId, @RequestParam(defaultValue="en-IN") String language,
      @RequestParam(defaultValue="candidate") String speakerRole, @RequestParam MultipartFile audio, Principal p) throws Exception {
    rooms.requireTranscription(id,p.getName());
    if (!clipId.matches("[a-fA-F0-9-]{36}") || !Set.of("en-IN","hi-IN").contains(language) || !Set.of("candidate","interviewer").contains(speakerRole)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid transcript request.");
    if (db.exists("SELECT 1 FROM peer_notes WHERE id=? AND room_id=? AND user_id=?",clipId,id,p.getName())) return Map.of("ok",true);
    if (!ai.audioTranscriptionAvailable()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Speech transcription is not configured. Save written answers in Notes for your analysis.");
    byte[] bytes=audio.getBytes(); validateWav(bytes);
    rate.check("peer-audio:"+p.getName(),150,3600);
    String text=ai.transcribe(bytes,language);
    rooms.note(id,p.getName(),clipId,"transcript",text,speakerRole);
    return Map.of("ok",true,"text",text);
  }
  static void validateWav(byte[] bytes) {
    if (bytes.length<46 || bytes.length>1920044) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Audio clips must be under one minute.");
    var b=ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
    if (!tag(bytes,0,"RIFF") || !tag(bytes,8,"WAVE") || !tag(bytes,12,"fmt ") || !tag(bytes,36,"data") || b.getInt(4)!=bytes.length-8 || b.getInt(16)!=16 || b.getShort(20)!=1 || b.getShort(22)!=1 || b.getInt(24)!=16000 || b.getInt(28)!=32000 || b.getShort(32)!=2 || b.getShort(34)!=16 || b.getInt(40)!=bytes.length-44 || (bytes.length-44)%2!=0)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid microphone recording.");
  }
  private static boolean tag(byte[] b,int at,String text) { return new String(b,at,4,StandardCharsets.US_ASCII).equals(text); }

  @PostMapping("/rooms/{id}/analysis")
  public Object analyse(@PathVariable String id,Principal p) {
    String uid=p.getName(), key=id+":"+uid;
    var r=rooms.member(id,uid);
    if (!"COMPLETED".equals(r.get("status"))) throw PeerPracticeService.conflict("Analysis is available only after the interview ends.");
    var previous=db.list("SELECT result_json FROM peer_reports WHERE room_id=? AND user_id=?",id,uid);
    if (!previous.isEmpty()) return db.parse((String)previous.getFirst().get("result_json"));
    if (!analysing.add(key)) throw PeerPracticeService.conflict("Your analysis is already being prepared.");
    try {
      var all=rooms.notes(id,uid);
      var selected=new ArrayList<Map<String,Object>>(); int used=0;
      for (var n:all) { int size=((String)n.get("content")).length(); if (used+size>60000) break; selected.add(n); used+=size; }
      String own=selected.stream().filter(n->uid.equals(n.get("user_id"))).map(n->(String)n.get("content")).collect(java.util.stream.Collectors.joining("\n"));
      if (own.strip().length()<80) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"There is not enough of your conversation to analyse yet. Add your questions and answers in Notes, or wait for your transcript to finish.");
      var input=Map.of("participantToReview",uid,"session",r.get("title"),"entries",selected,"peerFeedback",db.list("SELECT clarity,strengths,improvements FROM peer_feedback WHERE room_id=? AND author_id<>?",id,uid));
      var result=executor.run(uid,"PeerReviewPrompt",input);
      for (var mistake:result.path("mistakes")) if (!own.contains(mistake.path("quote").asText()))
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Analysis included an unsupported quote. Please try again.");
      ((com.fasterxml.jackson.databind.node.ObjectNode)result).put("reviewedEntries",selected.size()).put("totalEntries",all.size());
      rooms.saveReport(id,uid,((Number)r.get("content_revision")).intValue(),result);
      return result;
    } finally { analysing.remove(key); }
  }
}
