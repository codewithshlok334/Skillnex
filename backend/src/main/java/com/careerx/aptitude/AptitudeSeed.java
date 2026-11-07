package com.careerx.aptitude;

import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashSet;
import java.util.Set;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AptitudeSeed implements ApplicationRunner {
  private final Store db;
  private final com.fasterxml.jackson.databind.ObjectMapper json;
  private final org.springframework.jdbc.core.JdbcTemplate jdbc;
  public AptitudeSeed(Store db,com.fasterxml.jackson.databind.ObjectMapper json,org.springframework.jdbc.core.JdbcTemplate jdbc) { this.db = db; this.json=json; this.jdbc=jdbc; }

  @Override @Transactional
  public void run(ApplicationArguments args) throws Exception {
    try (var input = new ClassPathResource("aptitude/questions.json").getInputStream()) {
      JsonNode bank = json.readTree(input);
      if (bank.size() != 500) throw new IllegalStateException("Aptitude Arena requires 500 questions");
      Set<Integer> ids = new HashSet<>();
      Set<String> prompts = new HashSet<>();
      Set<Integer> existing = new HashSet<>();
      db.list("SELECT id FROM aptitude_questions").forEach(row -> existing.add(((Number)row.get("id")).intValue()));
      var inserts = new java.util.ArrayList<Object[]>();
      for (JsonNode q : bank) {
        int id = q.path("id").asInt(), answer = q.path("correctIndex").asInt(-1);
        Set<String> choices = new HashSet<>();
        q.path("options").forEach(choice -> choices.add(choice.asText().trim()));
        if (id < 1 || !ids.add(id) || !prompts.add(q.path("prompt").asText() + q.path("passage").asText()) ||
            choices.size() != 4 || choices.contains("") || answer < 0 || answer > 3 ||
            q.path("explanation").asText().isBlank()) throw new IllegalStateException("Invalid aptitude question " + id);
        if (existing.contains(id)) continue;
        inserts.add(new Object[]{
          id, q.path("title").asText(), q.path("category").asText(), q.path("topic").asText(), q.path("difficulty").asText(),
          q.path("prompt").asText(), q.path("passage").asText(""), db.text(q.path("options")), answer,
          q.path("explanation").asText(), q.path("source").path("kind").asText(), db.text(q.path("source"))});
      }
      if(!inserts.isEmpty()) jdbc.batchUpdate("INSERT INTO aptitude_questions(id,title,category,topic,difficulty,prompt,passage,options_json,correct_index,explanation,source_kind,source_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",inserts);
    }
  }
}
