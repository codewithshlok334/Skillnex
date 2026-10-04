package com.careerx.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class CareerAIService {

  private final AIExecutor ai;

  public CareerAIService(AIExecutor ai) {
    this.ai = ai;
  }

  public JsonNode roadmap(String uid, Object context) {
    return ai.run(uid, "CareerRoadmapPrompt", context);
  }

  public JsonNode recommend(String uid, Object context) {
    return ai.run(uid, "CareerRecommendationPrompt", context);
  }
}
