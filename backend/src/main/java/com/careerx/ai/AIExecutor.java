package com.careerx.ai;

import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class AIExecutor {

  private final AIService ai;
  private final Store db;
  private final RateLimit rate;

  public AIExecutor(AIService ai, Store db, RateLimit rate) {
    this.ai = ai;
    this.db = db;
    this.rate = rate;
  }

  public JsonNode run(String uid, String task, Object data) {
    boolean interview = task.equals("InterviewPrompt") || task.equals("InterviewTurnPrompt") || task.equals("InterviewEvaluationPrompt");
    rate.check((interview ? "interview-ai:" : "ai:") + uid, interview ? 60 : 15, 3600);
    try {
      var result = ai.generate(task, db.text(data));
      db.exec(
        "INSERT INTO ai_usage(id,user_id,task,success) VALUES(?,?,?,TRUE)",
        db.id(),
        uid,
        task
      );
      return result;
    } catch (RuntimeException e) {
      db.exec(
        "INSERT INTO ai_usage(id,user_id,task,success) VALUES(?,?,?,FALSE)",
        db.id(),
        uid,
        task
      );
      throw e;
    }
  }
}
