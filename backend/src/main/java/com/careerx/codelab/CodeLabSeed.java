package com.careerx.codelab;

import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CodeLabSeed implements ApplicationRunner {
  private final Store db;
  private final com.fasterxml.jackson.databind.ObjectMapper json;
  public CodeLabSeed(Store db,com.fasterxml.jackson.databind.ObjectMapper json) { this.db=db; this.json=json; }
  @Override @Transactional
  public void run(ApplicationArguments args) throws Exception {
    try (var input=new ClassPathResource("codelab/questions.json").getInputStream()) {
      JsonNode questions=json.readTree(input);
      if (questions.size()!=50) throw new IllegalStateException("CodeLab requires the complete 50-question collection");
      for (JsonNode q:questions) {
        int id=q.path("id").asInt();
        if (db.exists("SELECT 1 FROM code_questions WHERE id=?",id)) continue;
        db.exec("INSERT INTO code_questions(id,slug,title,topic,difficulty,statement_json,checker) VALUES(?,?,?,?,?,?,?)",
          id,q.path("slug").asText(),q.path("title").asText(),q.path("topic").asText(),q.path("difficulty").asText(),
          db.text(q.path("statement")),q.path("checker").asText("TOKENS"));
        for (String language:java.util.List.of("java","cpp","python")) {
          JsonNode code=q.path("languages").path(language);
          if (code.path("solution").asText().isBlank()) throw new IllegalStateException("Missing CodeLab solution");
          db.exec("INSERT INTO code_solutions(question_id,language_id,starter,solution) VALUES(?,?,?,?)",
            id,language,code.path("starter").asText(),code.path("solution").asText());
        }
        int index=0;
        for (JsonNode test:q.path("tests")) db.exec(
          "INSERT INTO code_test_cases(question_id,position,sample,input_text,expected_text) VALUES(?,?,?,?,?)",
          id,index++,test.path("sample").asBoolean(),test.path("input").asText(),test.path("output").asText());
      }
    }
    // A process restart cannot continue remote jobs safely. Never mark an interrupted job as accepted.
    db.exec("UPDATE code_submissions SET status='RUNNER_ERROR',result_json=?,finished_at=CURRENT_TIMESTAMP WHERE status IN ('QUEUED','RUNNING')",
      "{\"message\":\"The server restarted before judging finished. Please run your code again.\",\"cases\":[]}");
  }
}
