package com.careerx.controller;

import com.careerx.ai.InterviewLiveTokenService;
import com.careerx.service.InterviewService;
import com.careerx.security.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/interviews/{id}/live")
public class InterviewLiveController {
  private final InterviewService interviews;
  private final InterviewLiveTokenService tokens;
  private final RateLimit rate;
  public InterviewLiveController(InterviewService interviews, InterviewLiveTokenService tokens, RateLimit rate) {
    this.interviews = interviews; this.tokens = tokens; this.rate = rate;
  }

  @PostMapping("/token")
  public ResponseEntity<?> token(@PathVariable String id, Principal user) {
    var interview = interviews.context(id, user.getName());
    if (!"ACTIVE".equals(interview.get("status")) || !"AI".equals(interview.get("mode")))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Start an AI interview before connecting voice.");
    rate.check("interview-live-token:" + user.getName(), 20, 3600);
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tokens.issue(interview));
  }

  public record LiveAnswer(@NotBlank @Size(max=64) String questionId,
    @NotBlank @Size(max=15000) String text, @Min(0) @Max(86400) Integer speechSeconds) {}

  @PostMapping("/turn")
  public Object turn(@PathVariable String id, @Valid @RequestBody LiveAnswer answer, Principal user) {
    rate.check("interview-live-turn:" + user.getName(), 120, 3600);
    // Separate transactions: an AI next-question failure must not roll back the saved answer.
    interviews.saveLiveAnswer(id, user.getName(), answer.questionId(), answer.text(), answer.speechSeconds());
    return interviews.advanceLive(id, user.getName(), answer.questionId());
  }
}
