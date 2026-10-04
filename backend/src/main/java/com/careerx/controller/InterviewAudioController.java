package com.careerx.controller;

import com.careerx.ai.AIService;
import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/interviews")
public class InterviewAudioController {
  private final Store db;
  private final AIService ai;
  private final RateLimit rate;
  public InterviewAudioController(Store db, AIService ai, RateLimit rate) {
    this.db = db; this.ai = ai; this.rate = rate;
  }

  @PostMapping(value="/{id}/transcribe", consumes="multipart/form-data")
  public Object transcribe(@PathVariable String id, @RequestParam String questionId,
      @RequestParam(defaultValue="en-IN") String language, @RequestParam MultipartFile audio,
      Principal p) throws java.io.IOException {
    var session = db.owned("interviews", id, p.getName());
    if (!"ACTIVE".equals(session.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "Open an active interview to transcribe an answer.");
    var questions = db.list("SELECT q.id,a.id AS answer_id FROM interview_questions q LEFT JOIN interview_answers a ON a.question_id=q.id WHERE q.interview_id=? ORDER BY q.position DESC LIMIT 1", id);
    if (questions.isEmpty() || !questionId.equals(questions.getFirst().get("id")) || questions.getFirst().get("answer_id") != null)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This question has changed or already has an answer.");
    if (!Set.of("en-IN", "hi-IN").contains(language)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose English or Hindi.");
    if (audio.getSize() < 46 || audio.getSize() > 3840044) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Record up to two minutes per clip.");
    byte[] bytes = audio.getBytes();
    var wav = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
    // Accept only the bounded PCM format produced by our browser encoder.
    if (!tag(bytes, 0, "RIFF") || !tag(bytes, 8, "WAVE") || !tag(bytes, 12, "fmt ") || !tag(bytes, 36, "data") ||
        wav.getInt(4) != bytes.length - 8 || wav.getInt(16) != 16 || wav.getShort(20) != 1 || wav.getShort(22) != 1 ||
        wav.getInt(24) != 16000 || wav.getInt(28) != 32000 || wav.getShort(32) != 2 || wav.getShort(34) != 16 ||
        wav.getInt(40) != bytes.length - 44 || (bytes.length - 44) % 2 != 0)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid recording. Record a new clip in the interview room.");
    if (!ai.audioTranscriptionAvailable()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Recorded audio needs a Gemini connection. Try browser dictation or type your answer.");
    rate.check("interview-audio:" + p.getName(), 40, 3600);
    try {
      String text = ai.transcribe(bytes, language);
      db.exec("INSERT INTO ai_usage(id,user_id,task,success) VALUES(?,?,?,TRUE)", db.id(), p.getName(), "InterviewTranscription");
      return Map.of("text", text);
    } catch (RuntimeException e) {
      db.exec("INSERT INTO ai_usage(id,user_id,task,success) VALUES(?,?,?,FALSE)", db.id(), p.getName(), "InterviewTranscription");
      throw e;
    }
  }
  private boolean tag(byte[] b, int at, String value) {
    return new String(b, at, 4, StandardCharsets.US_ASCII).equals(value);
  }
}
