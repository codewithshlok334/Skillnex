package com.careerx.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ResumeAIService {

  private final AIExecutor ai;

  public ResumeAIService(AIExecutor ai) {
    this.ai = ai;
  }

  public JsonNode analyze(String uid, String text) {
    return ai.run(uid, "ResumeAnalysisPrompt", Map.of("resume", text));
  }

  public JsonNode improve(String uid, String text) {
    return ai.run(uid, "ResumeImprovementPrompt", Map.of("original", text));
  }

}
