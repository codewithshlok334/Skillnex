package com.careerx.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CommunityAIService {

  private final AIExecutor ai;

  public CommunityAIService(AIExecutor ai) {
    this.ai = ai;
  }

  public JsonNode explain(String uid, Object context) {
    return ai.run(uid, "CommunityAnswerPrompt", context);
  }

  public JsonNode enhance(String uid, String text) {
    return ai.run(uid, "QuestionEnhancementPrompt", Map.of("originalQuestion", text));
  }
}
