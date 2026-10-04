package com.careerx.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** Authored role curriculum. The model may add one follow-up, but cannot reorder stages. */
@Component
public class InterviewCurriculum {
  public record Step(String phase, String question) {}
  private final JsonNode bank;
  public InterviewCurriculum(ObjectMapper json) throws IOException {
    try (var stream = new ClassPathResource("interview/role-questions.json").getInputStream()) {
      bank = json.readTree(stream);
    }
    if (bank.size() != 35) throw new IllegalStateException("Expected 35 interview roles");
    bank.forEach(role -> {
      for (String phase : List.of("easy", "medium", "hard")) {
        if (role.path(phase).size() != 2) throw new IllegalStateException("Incomplete role curriculum");
      }
    });
  }
  public List<String> roles() {
    var result = new ArrayList<String>();
    bank.fieldNames().forEachRemaining(result::add);
    return result;
  }
  public boolean structured(Map<String,Object> session) {
    return "ROLE_V1".equals(session.get("curriculum_version"));
  }
  public List<Step> plan(Map<String,Object> session) {
    String role = String.valueOf(session.get("role"));
    String kind = String.valueOf(session.get("kind"));
    String key = switch(role) {
      case "Software Developer", "Python Developer", "General HR" -> "Software Engineer";
      case "AI/ML" -> "Machine Learning Engineer";
      default -> role;
    };
    var profile = bank.has(key) ? bank.path(key) : bank.path("Software Engineer");
    int count = ((Number)session.get("duration")).intValue() <= 10 ? 1 : 2;
    int variant = Math.floorMod(String.valueOf(session.get("id")).hashCode(), 2);
    var result = new ArrayList<Step>();
    result.add(new Step("Introduction", "Please introduce yourself and tell me about one project or experience that prepares you for a " + role + " role."));
    for (int level = 0; level < 3; level++) {
      String phase = List.of("Easy", "Medium", "Hard").get(level);
      for (int slot = 0; slot < count; slot++) {
        String question = profile.path(phase.toLowerCase(Locale.ROOT)).get((slot + variant) % 2).asText();
        if (kind.equals("HR") || kind.equals("Behavioral") || (kind.equals("Mixed") && slot == 1)) {
          question = behavioral(role, kind, level, slot);
        } else if (kind.equals("Coding")) {
          question = coding(role, level, slot);
        }
        result.add(new Step(phase, question));
      }
    }
    result.add(new Step("Closing", "Looking back at this " + role + " interview, which answer would you improve, and what would you practice next?"));
    return List.copyOf(result);
  }
  public int limit(Map<String,Object> session) {
    int main = plan(session).size();
    return "PRACTICE".equals(session.get("mode")) ? main : main + main - 2;
  }
  private String behavioral(String role, String kind, int level, int slot) {
    String[][] questions = {
      {"What interests you about working as a " + role + ", and which skill would you bring to the team?", "Describe a small team task where you took responsibility. What did you personally do?"},
      {"Describe a disagreement during a project relevant to " + role + ". How did you decide what to do?", "Tell me about receiving difficult feedback. What did you change, and how did you check the result?"},
      {"As a " + role + ", you face conflicting deadlines and a serious quality risk. How would you prioritize and communicate your decision?", "Describe a failure with unclear ownership and incomplete information. How would you investigate, coordinate recovery and prevent recurrence?"}
    };
    if (kind.equals("Behavioral") && level == 0 && slot == 0) return "Tell me about a specific situation where you learned a skill needed by a " + role + ". What did you do and what happened?";
    return questions[level][slot];
  }
  private String coding(String role, int level, int slot) {
    String context = switch(role) {
      case "Data Analyst", "Business Intelligence Analyst", "Database Administrator", "SAP Consultant", "Salesforce Administrative" -> "business records";
      case "AI Engineer", "Data Scientist", "Machine Learning Engineer", "MLOps Engineer" -> "model prediction records";
      case "Network Engineer", "Cyber Security Analyst", "Cyber Security Engineer", "System Engineer", "Cloud Engineer", "Cloud Architect", "Cloud Developer", "Associate Cloud Engineer", "DevOps Engineer" -> "service event records";
      case "Site Engineer", "Graduate Engineer Trainee", "Embedded Systems Engineer" -> "sensor or material records";
      case "UX Designer", "Content Developer" -> "content and usability records";
      default -> "application event records";
    };
    String[][] tasks = {
      {"Given records with string id and integer value, keep only the first record for each id. Example [(a,2),(a,3),(b,4)] becomes [(a,2),(b,4)]. Explain empty input and invalid records.", "Given records with string category and integer value, return totals by category. Example [(x,2),(y,1),(x,3)] gives x=5,y=1. Explain missing categories."},
      {"Given timestamped records with id and value in arbitrary order, retain the newest for each id; break timestamp ties by original input order. Explain complexity and tests.", "Given records with category and value, return the three highest category totals with a deterministic tie-break. Explain how you would paginate the result consistently."},
      {"Design and write pseudocode for an at-least-once event consumer that updates per-id totals without counting retries twice. Explain atomicity, crashes and deduplication retention.", "Design and write pseudocode for processing records larger than memory. Explain bounded memory, invalid input, partial failures, checkpoints and reproducible results."}
    };
    return "For a " + role + " working with " + context + ": " + tasks[level][slot] + " Use your preferred language, SQL where suitable, or pseudocode. We review your reasoning; code is not executed.";
  }
}
