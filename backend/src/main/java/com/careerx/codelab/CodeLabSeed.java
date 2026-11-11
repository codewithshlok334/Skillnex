package com.careerx.codelab;

import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CodeLabSeed implements ApplicationRunner {
  private final Store db;
  private final com.fasterxml.jackson.databind.ObjectMapper json;
  private final JdbcTemplate jdbc;
  public CodeLabSeed(Store db,com.fasterxml.jackson.databind.ObjectMapper json,JdbcTemplate jdbc) { this.db=db; this.json=json; this.jdbc=jdbc; }
  @Override @Transactional
  public void run(ApplicationArguments args) throws Exception {
    try (var input=new ClassPathResource("codelab/questions.json").getInputStream()) {
      JsonNode questions=json.readTree(input);
      if (!questions.isArray() || questions.isEmpty()) throw new IllegalStateException("Missing CodeLab collection");
      Set<Integer> ids=new HashSet<>(); Set<String> slugs=new HashSet<>();
      for(JsonNode q:questions) {
        if(q.path("id").asInt()<1 || !ids.add(q.path("id").asInt()) || q.path("slug").asText().isBlank() || !slugs.add(q.path("slug").asText()))
          throw new IllegalStateException("Invalid or duplicate CodeLab identity");
        if(!Set.of("Easy","Medium","Hard").contains(q.path("difficulty").asText()) ||
           !Set.of("TOKENS","PAIR_INDICES","TOKEN_MULTISET","UNORDERED_LINES","UNORDERED_GROUPS").contains(q.path("checker").asText("TOKENS")))
          throw new IllegalStateException("Invalid CodeLab difficulty or output checker");
        if(q.path("tests").size()<6) throw new IllegalStateException("Missing CodeLab tests");
        for(String language:List.of("java","cpp","python"))
          if(q.path("languages").path(language).path("solution").asText().isBlank()) throw new IllegalStateException("Missing CodeLab solution");
      }
      Map<Integer,String> existing=new HashMap<>();
      jdbc.query("SELECT id,slug FROM code_questions",rs -> { existing.put(rs.getInt("id"),rs.getString("slug")); });
      List<Object[]> questionRows=new ArrayList<>(),solutionRows=new ArrayList<>(),testRows=new ArrayList<>();
      for (JsonNode q:questions) {
        int id=q.path("id").asInt();
        // Never replace a question or the drafts/submissions attached to its ID.
        if(existing.containsKey(id)) {
          if(!existing.get(id).equals(q.path("slug").asText())) throw new IllegalStateException("CodeLab ID was reassigned: "+id);
          continue;
        }
        questionRows.add(new Object[]{
          id,q.path("slug").asText(),q.path("title").asText(),q.path("topic").asText(),q.path("difficulty").asText(),
          db.text(q.path("statement")),q.path("checker").asText("TOKENS")});
        for (String language:java.util.List.of("java","cpp","python")) {
          JsonNode code=q.path("languages").path(language);
          if (code.path("solution").asText().isBlank()) throw new IllegalStateException("Missing CodeLab solution");
          solutionRows.add(new Object[]{id,language,code.path("starter").asText(),code.path("solution").asText()});
        }
        int index=0;
        for (JsonNode test:q.path("tests")) testRows.add(new Object[]{
          id,index++,test.path("sample").asBoolean(),test.path("input").asText(),test.path("output").asText()});
      }
      if(!questionRows.isEmpty()) {
        insertBatches("INSERT INTO code_questions(id,slug,title,topic,difficulty,statement_json,checker) VALUES(?,?,?,?,?,?,?)",questionRows);
        insertBatches("INSERT INTO code_solutions(question_id,language_id,starter,solution) VALUES(?,?,?,?)",solutionRows);
        insertBatches("INSERT INTO code_test_cases(question_id,position,sample,input_text,expected_text) VALUES(?,?,?,?,?)",testRows);
      }
    }
    // A process restart cannot continue remote jobs safely. Never mark an interrupted job as accepted.
    db.exec("UPDATE code_submissions SET status='RUNNER_ERROR',result_json=?,finished_at=CURRENT_TIMESTAMP WHERE status IN ('QUEUED','RUNNING')",
      "{\"message\":\"The server restarted before judging finished. Please run your code again.\",\"cases\":[]}");
  }
  private void insertBatches(String sql,List<Object[]> rows) {
    // Keep individual uploads bounded while the surrounding transaction remains atomic.
    for(int start=0;start<rows.size();start+=8)
      jdbc.batchUpdate(sql,rows.subList(start,Math.min(start+8,rows.size())));
  }
}
