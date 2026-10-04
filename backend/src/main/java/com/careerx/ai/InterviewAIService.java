package com.careerx.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class InterviewAIService {

  private final AIExecutor ai;
  private final AIService provider;

  public InterviewAIService(AIExecutor ai, AIService provider) {
    this.ai = ai;
    this.provider = provider;
  }

  public boolean available() {
    return provider.available();
  }
  public boolean audioTranscriptionAvailable() { return provider.audioTranscriptionAvailable(); }

  public JsonNode next(String uid, Object context) {
    return ai.run(uid, "InterviewPrompt", context);
  }

  public JsonNode evaluate(String uid, Object context) {
    return ai.run(uid, "InterviewEvaluationPrompt", context);
  }
  public JsonNode turn(String uid, Object context) {
    return ai.run(uid, "InterviewTurnPrompt", context);
  }
}
