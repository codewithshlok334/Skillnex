package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.careerx.ai.AIService;
import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.*;
import jakarta.servlet.http.Cookie;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PlatformIntegrationTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper json;

  @Autowired
  Store db;

  @MockitoBean
  AIService ai;

  static final String ORIGIN = "http://localhost:5173";

  @Test
  void liveTurnsPreserveAnswersOnProviderFailureAndRetryWithoutDuplicates() throws Exception {
    var owner = account("STUDENT");
    var other = account("STUDENT");
    String id = body(send(owner, "/api/interviews", Map.of("role", "AI Engineer", "kind", "Technical", "difficulty", "Medium", "duration", 30))).path("id").asText();
    String path = "/api/interviews/" + id;
    var started = body(send(owner, path + "/start", null));
    String qid = started.path("transcript").get(0).path("id").asText();
    var payload = Map.of("questionId", qid, "text", "I built a retrieval API with source citations.", "speechSeconds", 8);
    mvc.perform(post(path + "/live/turn").contentType("application/json").content(json.writeValueAsString(payload)).header("Origin", ORIGIN))
      .andExpect(status().isUnauthorized());
    mvc.perform(post(path + "/live/turn").cookie(other.cookie).header("Origin", ORIGIN).contentType("application/json").content(json.writeValueAsString(payload)))
      .andExpect(status().isNotFound());
    mvc.perform(post(path + "/live/turn").cookie(owner.cookie).header("Origin", "https://wrong.example").contentType("application/json").content(json.writeValueAsString(payload)))
      .andExpect(status().isForbidden());
    when(ai.generate(eq("InterviewTurnPrompt"), anyString())).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Provider unavailable"));
    mvc.perform(post(path + "/live/turn").cookie(owner.cookie).header("Origin", ORIGIN).contentType("application/json").content(json.writeValueAsString(payload)))
      .andExpect(status().isServiceUnavailable());
    assertEquals(1, db.count("SELECT COUNT(*) FROM interview_answers WHERE question_id=?", qid));
    when(ai.generate(eq("InterviewTurnPrompt"), anyString())).thenReturn(json.readTree("{\"askFollowup\":false,\"question\":\"Unused\",\"answerReview\":{\"summary\":\"Relevant project\",\"improvement\":\"Explain evaluation\"}}"));
    var next = body(send(owner, path + "/live/turn", payload));
    assertEquals(2, next.path("transcript").size());
    assertEquals("VOICE", next.path("transcript").get(0).path("input_mode").asText());
    assertEquals(2, body(send(owner, path + "/live/turn", payload)).path("transcript").size());
    assertEquals(1, db.count("SELECT COUNT(*) FROM interview_answers WHERE question_id=?", qid));
    send(owner, path + "/end", null);
    mvc.perform(post(path + "/live/token").cookie(owner.cookie).header("Origin", ORIGIN))
      .andExpect(status().isConflict());
    mvc.perform(post(path + "/live/turn").cookie(owner.cookie).header("Origin", ORIGIN).contentType("application/json").content(json.writeValueAsString(payload)))
      .andExpect(status().isConflict());
  }

  @BeforeEach
  void setup() {
    db.exec("DELETE FROM rate_limits");
    when(ai.available()).thenReturn(true);
    when(ai.embeddingsAvailable()).thenReturn(false);
  }

  record Account(String id, Cookie cookie, String email) {}

  Account account(String role) throws Exception {
    String email = UUID.randomUUID() + "@example.com";
    var r = mvc
      .perform(
        post("/api/auth/signup")
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of("name", "Test Student", "email", email, "password", "Strong-password-2026!")
            )
          )
      )
      .andExpect(status().isOk())
      .andReturn();
    String id = body(r).path("id").asText();
    if (!role.equals("STUDENT")) db.exec("UPDATE app_users SET role=? WHERE id=?", role, id);
    String value = r.getResponse().getHeader("Set-Cookie").split(";")[0].split("=", 2)[1];
    return new Account(id, new Cookie("careerx_session", value), email);
  }

  JsonNode body(MvcResult r) throws Exception {
    return json.readTree(r.getResponse().getContentAsString());
  }

  MvcResult send(Account a, String path, Object payload) throws Exception {
    return mvc
      .perform(
        post(path)
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(json.writeValueAsString(payload == null ? Map.of() : payload))
      )
      .andExpect(status().isOk())
      .andReturn();
  }

  String resume(Account a) throws Exception {
    return body(
      send(
        a,
        "/api/resumes/build",
        Map.of(
          "name",
          "Resume",
          "content",
          "Test Student\nEDUCATION\nUniversity\nSKILLS\nJava and SQL\nPROJECTS\nBuilt a student portal using Java.",
          "document",
          Map.of("template", "minimal")
        )
      )
    )
      .path("id")
      .asText();
  }

  @Test
  void savedWorkspaceIsFetchedAfterLogoutAndPasswordLogin() throws Exception {
    Account a = account("STUDENT");
    mvc
      .perform(
        put("/api/users/me")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of(
                "name",
                "Returning Student",
                "college",
                "Saved College",
                "skills",
                "Java, SQL",
                "publicProfile",
                false
              )
            )
          )
      )
      .andExpect(status().isOk());
    String rid = resume(a);
    String thread = body(send(a, "/api/assistant/threads", null))
      .path("id")
      .asText();
    when(ai.generate(eq("AssistantPrompt"), anyString())).thenReturn(
      json.readTree("{\"reply\":\"Saved reply\"}")
    );
    send(
      a,
      "/api/assistant/threads/" + thread + "/messages",
      Map.of(
        "text",
        "Remember this conversation",
        "requestId",
        UUID.randomUUID().toString(),
        "includeProfile",
        false
      )
    );
    for (int attempt = 0; attempt < 2; attempt++) {
      send(a, "/api/auth/logout", null);
      mvc.perform(get("/api/users/me").cookie(a.cookie)).andExpect(status().isUnauthorized());
      var login = mvc
        .perform(
          post("/api/auth/login")
            .header("Origin", ORIGIN)
            .contentType("application/json")
            .content(
              json.writeValueAsString(
                Map.of(
                  "email",
                  a.email.toUpperCase(Locale.ROOT),
                  "password",
                  "Strong-password-2026!"
                )
              )
            )
        )
        .andExpect(status().isOk())
        .andReturn();
      assertEquals(a.id, body(login).path("id").asText());
      String value = login.getResponse().getHeader("Set-Cookie").split(";")[0].split("=", 2)[1];
      a = new Account(a.id, new Cookie("careerx_session", value), a.email);
      mvc
        .perform(get("/api/users/me").cookie(a.cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.college").value("Saved College"))
        .andExpect(jsonPath("$.skills").value("Java, SQL"));
      mvc
        .perform(get("/api/resumes").cookie(a.cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(rid));
      mvc
        .perform(get("/api/assistant/threads/" + thread).cookie(a.cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.messages.length()").value(2));
      mvc
        .perform(get("/api/dashboard").cookie(a.cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.name").value("Returning Student"));
    }
    Account other = account("STUDENT");
    mvc.perform(get("/api/resumes/" + rid).cookie(other.cookie)).andExpect(status().isNotFound());
    mvc
      .perform(get("/api/assistant/threads/" + thread).cookie(other.cookie))
      .andExpect(status().isNotFound());
  }

  @Test
  void authorizationOriginAndPrivacy() throws Exception {
    Account a = account("STUDENT"),
      b = account("STUDENT");
    String rid = resume(a);
    mvc.perform(get("/api/resumes/" + rid).cookie(b.cookie)).andExpect(status().isNotFound());
    mvc.perform(get("/api/resumes/" + rid)).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/auth/logout").cookie(a.cookie)).andExpect(status().isForbidden());
    mvc
      .perform(post("/api/auth/logout").cookie(a.cookie).header("Origin", "https://evil.example"))
      .andExpect(status().isForbidden());
    mvc.perform(get("/api/admin/users").cookie(a.cookie)).andExpect(status().isForbidden());
    mvc.perform(get("/api/users/" + a.id).cookie(b.cookie)).andExpect(status().isNotFound());
    mvc
      .perform(get("/api/users/me").cookie(a.cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.password_hash").doesNotExist());
    mvc
      .perform(get("/api/dashboard").cookie(a.cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.resume").isEmpty());
  }

  @Test
  void assistantConversationIsPrivateContextualAndRetrySafe() throws Exception {
    Account a = account("STUDENT"),
      b = account("STUDENT");
    when(ai.generate(eq("AssistantPrompt"), anyString())).thenReturn(
      json.readTree("{\"reply\":\"Tell me about your project.\"}"),
      json.readTree("{\"reply\":\"Explain how you tested the Java API.\"}")
    );
    db.exec(
      "UPDATE profiles SET skills='Java',career_goal='Backend developer' WHERE user_id=?",
      a.id
    );
    String id = body(send(a, "/api/assistant/threads", null))
      .path("id")
      .asText();
    String path = "/api/assistant/threads/" + id;
    mvc.perform(get(path).cookie(b.cookie)).andExpect(status().isNotFound());
    var first = Map.of(
      "text",
      "Help me prepare",
      "requestId",
      UUID.randomUUID().toString(),
      "includeProfile",
      true
    );
    var result = body(send(a, path + "/messages", first));
    assertEquals(2, result.path("messages").size());
    verify(ai).generate(eq("AssistantPrompt"), contains("Backend developer"));
    assertEquals(result, body(send(a, path + "/messages", first)));
    verify(ai, times(1)).generate(eq("AssistantPrompt"), anyString());
    mvc
      .perform(
        post(path + "/messages")
          .cookie(b.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(json.writeValueAsString(first))
      )
      .andExpect(status().isNotFound());
    var second = Map.of(
      "text",
      "I built a Java API",
      "requestId",
      UUID.randomUUID().toString(),
      "includeProfile",
      false
    );
    result = body(send(a, path + "/messages", second));
    assertEquals(4, result.path("messages").size());
    verify(ai).generate(
      eq("AssistantPrompt"),
      argThat(
        input ->
          input.contains("Tell me about your project.") &&
          input.contains("I built a Java API") &&
          !input.contains("Backend developer")
      )
    );
    when(ai.generate(eq("AssistantPrompt"), anyString())).thenThrow(
      new org.springframework.web.server.ResponseStatusException(
        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
        "Provider unavailable"
      )
    );
    mvc
      .perform(
        post(path + "/messages")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of("text", "Another question", "requestId", UUID.randomUUID().toString())
            )
          )
      )
      .andExpect(status().isServiceUnavailable());
    assertEquals(
      4,
      body(mvc.perform(get(path).cookie(a.cookie)).andReturn())
        .path("messages")
        .size()
    );
  }

  @Test
  void unconfiguredAssistantExplainsSetupWithoutSavingFakeReplies() throws Exception {
    Account a = account("STUDENT");
    when(ai.available()).thenReturn(false);
    String id = body(send(a, "/api/assistant/threads", null))
      .path("id")
      .asText();
    mvc
      .perform(
        post("/api/assistant/threads/" + id + "/messages")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of("text", "Hello", "requestId", UUID.randomUUID().toString())
            )
          )
      )
      .andExpect(status().isServiceUnavailable())
      .andExpect(jsonPath("message").value(org.hamcrest.Matchers.containsString("not connected")));
    assertEquals(0, db.count("SELECT COUNT(*) FROM assistant_messages WHERE thread_id=?", id));
    verify(ai, never()).generate(anyString(), anyString());
  }

  @Test
  void documentsRoundTripAndRejectDisguisedFiles() throws Exception {
    Account a = account("STUDENT");
    String rid = resume(a);
    for (String format : List.of("pdf", "docx")) {
      var exported = mvc
        .perform(get("/api/resumes/" + rid + "/export?format=" + format).cookie(a.cookie))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsByteArray();
      assertTrue(exported.length > 300);
      var file = new MockMultipartFile(
        "file",
        "resume." + format,
        "application/octet-stream",
        exported
      );
      var upload = mvc
        .perform(multipart("/api/resumes").file(file).cookie(a.cookie).header("Origin", ORIGIN))
        .andExpect(status().isOk())
        .andReturn();
      mvc
        .perform(get("/api/resumes/" + body(upload).path("id").asText()).cookie(a.cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").value(org.hamcrest.Matchers.containsString("Java")));
    }
    mvc
      .perform(
        multipart("/api/resumes")
          .file(new MockMultipartFile("file", "bad.pdf", "application/pdf", "not a PDF".getBytes()))
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void resumeAiMatchTailorAndOutage() throws Exception {
    Account a = account("STUDENT");
    String rid = resume(a);
    when(ai.generate(eq("ResumeAnalysisPrompt"), anyString())).thenReturn(
      json.readTree("{\"score\":78,\"summary\":\"Test fixture\",\"issues\":[],\"breakdown\":[]}")
    );
    send(a, "/api/resumes/" + rid + "/analyze", null);
    mvc
      .perform(get("/api/resumes/" + rid).cookie(a.cookie))
      .andExpect(jsonPath("$.analysis.score").value(78));
    when(ai.generate(eq("JobMatchPrompt"), anyString())).thenReturn(
      json.readTree(
        "{\"score\":70,\"matchingSkills\":[\"Java\"],\"missingSkills\":[\"Docker\"],\"keywords\":[],\"projects\":[],\"topics\":[]}"
      )
    );
    assertEquals(
      70,
      body(
        send(
          a,
          "/api/jobs/match",
          Map.of("resumeId", rid, "jobDescription", "Java developer with Docker experience")
        )
      )
        .path("score")
        .asInt()
    );
    when(ai.generate(eq("ResumeTailoringPrompt"), anyString())).thenReturn(
      json.readTree(
        "{\"content\":\"Test Student: Java and SQL. Built a student portal.\",\"changes\":[]}"
      )
    );
    send(a, "/api/resumes/tailor", Map.of("resumeId", rid, "jobDescription", "Java developer"));
    assertEquals(1, db.count("SELECT COUNT(*) FROM resume_versions WHERE resume_id=?", rid));
    when(ai.generate(eq("ResumeAnalysisPrompt"), anyString())).thenThrow(
      new org.springframework.web.server.ResponseStatusException(
        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
        "AI service is temporarily unavailable. Please try again."
      )
    );
    mvc
      .perform(
        post("/api/resumes/" + rid + "/analyze")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
      )
      .andExpect(status().isServiceUnavailable());
    assertEquals(1, db.count("SELECT COUNT(*) FROM resume_analyses WHERE resume_id=?", rid));
  }

  @Test
  void interviewLifecyclePreservesAnswersAndAdaptsContext() throws Exception {
    Account a = account("STUDENT"),
      b = account("STUDENT");
    when(ai.generate(eq("InterviewPrompt"), anyString())).thenReturn(
      json.readTree("{\"question\":\"Tell me about your Java project.\"}"),
      json.readTree("{\"question\":\"How did you design the cache?\"}")
    );
    String id = body(
      send(
        a,
        "/api/interviews",
        Map.of(
          "role",
          "Java Developer",
          "kind",
          "Technical",
          "difficulty",
          "Medium",
          "duration",
          30
        )
      )
    )
      .path("id")
      .asText();
    db.exec("UPDATE interviews SET curriculum_version='LEGACY' WHERE id=?", id);
    send(a, "/api/interviews/" + id + "/start", null);
    var room = body(mvc.perform(get("/api/interviews/" + id).cookie(a.cookie)).andReturn());
    String qid = room.path("transcript").path(0).path("id").asText();
    mvc
      .perform(
        post("/api/interviews/" + id + "/answer")
          .cookie(b.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(json.writeValueAsString(Map.of("questionId", qid, "text", "Hijacked answer")))
      )
      .andExpect(status().isNotFound());
    send(
      a,
      "/api/interviews/" + id + "/answer",
      Map.of("questionId", qid, "text", "I designed a cache for repeated database queries.")
    );
    mvc
      .perform(
        post("/api/interviews/" + id + "/answer")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(json.writeValueAsString(Map.of("questionId", qid, "text", "Duplicate")))
      )
      .andExpect(status().isConflict());
    send(a, "/api/interviews/" + id + "/next", null);
    verify(ai).generate(eq("InterviewPrompt"), contains("I designed a cache"));
    send(a, "/api/interviews/" + id + "/end", null);
    when(ai.generate(eq("InterviewEvaluationPrompt"), anyString())).thenReturn(
      json.readTree(
        "{\"score\":80,\"breakdown\":[],\"strengths\":[],\"improvements\":[],\"topics\":[],\"modelAnswers\":[],\"followUpQuestions\":[]}"
      )
    );
    send(a, "/api/interviews/" + id + "/report", null);
    send(a, "/api/interviews/" + id + "/report", null);
    assertEquals(1, db.count("SELECT COUNT(*) FROM interview_reports WHERE interview_id=?", id));
  }

  @Test
  void codingVoiceMetricsAndTimedFinishPersistWithoutInventingPace() throws Exception {
    Account a = account("STUDENT");
    when(ai.generate(eq("InterviewPrompt"), anyString())).thenReturn(json.readTree("{\"question\":\"Find duplicate values and explain complexity.\"}"));
    String id = body(send(a, "/api/interviews", Map.of("role", "Full Stack Developer", "kind", "Coding", "difficulty", "Hard", "duration", 5))).path("id").asText();
    String path = "/api/interviews/" + id;
    var room = body(send(a, path + "/start", null));
    String qid = room.path("transcript").get(0).path("id").asText();
    mvc.perform(post(path + "/answer").cookie(a.cookie).header("Origin", ORIGIN).contentType("application/json")
      .content(json.writeValueAsString(Map.of("questionId", qid, "text", "My solution", "speechSeconds", -1))))
      .andExpect(status().isBadRequest());
    send(a, path + "/answer", Map.of("questionId", qid, "text", "I use a Set for O(n) time, with tests for empty input.", "inputMode", "MIXED", "responseSeconds", 65, "speechSeconds", 30, "spokenWords", 60));
    db.exec("UPDATE interviews SET started_at=? WHERE id=?", java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(310)), id);
    room = body(send(a, path + "/next", null));
    assertEquals(1, room.path("transcript").size());
    assertEquals(0, room.path("remainingSeconds").asInt());
    assertEquals(30, room.path("transcript").get(0).path("speech_seconds").asInt());
    assertEquals(60, room.path("transcript").get(0).path("spoken_words").asInt());
    assertEquals("MIXED", room.path("transcript").get(0).path("input_mode").asText());
    room = body(send(a, path + "/end", null));
    assertFalse(room.path("ended_at").isNull());
    assertTrue(room.path("elapsedSeconds").asLong() >= 310);
    assertEquals("Test Student", room.path("candidateName").asText());
    verify(ai, never()).generate(eq("InterviewPrompt"), anyString());
    assertEquals("Introduction", room.path("transcript").get(0).path("phase").asText());
  }

  @Test
  void fullConversationDoesNotHitTheOldFifteenCallLimit() throws Exception {
    Account a = account("STUDENT");
    var counter = new java.util.concurrent.atomic.AtomicInteger();
    when(ai.generate(eq("InterviewPrompt"), anyString())).thenAnswer(invocation -> json.readTree("{\"question\":\"Explain trade-off " + counter.incrementAndGet() + " in your project.\"}"));
    String id = body(send(a, "/api/interviews", Map.of("role", "Frontend Developer", "kind", "Technical", "difficulty", "Medium", "duration", 60))).path("id").asText();
    db.exec("UPDATE interviews SET curriculum_version='LEGACY' WHERE id=?", id);
    String path = "/api/interviews/" + id;
    var room = body(send(a, path + "/start", null));
    for (int n = 0; n < 16; n++) {
      String qid = room.path("transcript").get(n).path("id").asText();
      send(a, path + "/answer", Map.of("questionId", qid, "text", "I chose React for reusable components. My decision number " + n));
      room = body(send(a, path + "/next", null));
    }
    assertEquals(17, room.path("transcript").size());
    assertEquals("TEXT", room.path("transcript").get(0).path("input_mode").asText());
    assertTrue(room.path("transcript").get(0).path("speech_seconds").isNull());
    verify(ai).generate(eq("InterviewPrompt"), contains("decision number 15"));
  }

  @Test
  void answerSurvivesFailedFollowup() throws Exception {
    Account a = account("STUDENT");
    when(ai.generate(eq("InterviewPrompt"), anyString())).thenReturn(
      json.readTree("{\"question\":\"Describe a project.\"}")
    );
    String id = body(
      send(
        a,
        "/api/interviews",
        Map.of("role", "Java Developer", "kind", "Technical", "difficulty", "Easy", "duration", 15)
      )
    )
      .path("id")
      .asText();
    var session = body(send(a, "/api/interviews/" + id + "/start", null));
    String qid = session.path("transcript").path(0).path("id").asText();
    send(
      a,
      "/api/interviews/" + id + "/answer",
      Map.of("questionId", qid, "text", "My saved answer")
    );
    when(ai.generate(eq("InterviewTurnPrompt"), anyString())).thenThrow(
      new org.springframework.web.server.ResponseStatusException(
        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
        "AI service is temporarily unavailable. Please try again."
      )
    );
    mvc
      .perform(
        post("/api/interviews/" + id + "/next")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
      )
      .andExpect(status().isServiceUnavailable());
    assertEquals(
      "My saved answer",
      db.one("SELECT content FROM interview_answers WHERE question_id=?", qid).get("content")
    );
  }

  @Test
  void roleCurriculumCoversEveryCategoryAndEveryStage() throws Exception {
    var curriculum = new com.careerx.service.InterviewCurriculum(json);
    assertEquals(35, curriculum.roles().size());
    assertTrue(curriculum.roles().containsAll(List.of("Site Engineer", "UX Designer", "MLOps Engineer", "Salesforce Administrative")));
    var unique = new HashSet<String>();
    for (String role : curriculum.roles()) {
      var plan = curriculum.plan(Map.of("id", "fixed", "role", role, "kind", "Technical", "duration", 30));
      assertEquals(List.of("Introduction", "Easy", "Easy", "Medium", "Medium", "Hard", "Hard", "Closing"), plan.stream().map(com.careerx.service.InterviewCurriculum.Step::phase).toList());
      assertTrue(plan.getFirst().question().contains(role));
      for (int n = 1; n < 7; n++) assertTrue(unique.add(plan.get(n).question()), "Role question should be authored specifically: " + role);
      var shortPlan = curriculum.plan(Map.of("id", "fixed", "role", role, "kind", "Coding", "duration", 5));
      assertEquals(5, shortPlan.size());
      assertTrue(shortPlan.getFirst().question().contains("introduce yourself"));
      assertTrue(shortPlan.get(1).question().contains(role));
    }
    assertEquals(210, unique.size());
  }

  @Test
  void audioTranscriptionIsOwnedBoundedAndDoesNotSubmitAnAnswer() throws Exception {
    Account a = account("STUDENT"), other = account("STUDENT");
    String id = body(send(a,"/api/interviews",Map.of("role","AI Engineer","kind","Technical","difficulty","Medium","duration",15))).path("id").asText();
    String path = "/api/interviews/" + id;
    var room = body(send(a,path+"/start",null));
    String qid=room.path("transcript").get(0).path("id").asText();
    var bytes=java.nio.ByteBuffer.allocate(32044).order(java.nio.ByteOrder.LITTLE_ENDIAN);
    bytes.put("RIFF".getBytes()).putInt(32036).put("WAVEfmt ".getBytes()).putInt(16).putShort((short)1).putShort((short)1).putInt(16000).putInt(32000).putShort((short)2).putShort((short)16).put("data".getBytes()).putInt(32000);
    var audio=new MockMultipartFile("audio","answer.wav","audio/wav",bytes.array());
    when(ai.audioTranscriptionAvailable()).thenReturn(true);
    when(ai.transcribe(any(byte[].class),eq("hi-IN"))).thenReturn("Maine React project banaya.");
    mvc.perform(multipart(path+"/transcribe").file(audio).param("questionId",qid).param("language","hi-IN").cookie(a.cookie).header("Origin",ORIGIN))
      .andExpect(status().isOk()).andExpect(jsonPath("$.text").value("Maine React project banaya."));
    assertTrue(db.list("SELECT id FROM interview_answers WHERE question_id=?",qid).isEmpty());
    mvc.perform(multipart(path+"/transcribe").file(audio).param("questionId",qid).cookie(other.cookie).header("Origin",ORIGIN)).andExpect(status().is4xxClientError());
    mvc.perform(multipart(path+"/transcribe").file(audio).param("questionId","stale").cookie(a.cookie).header("Origin",ORIGIN)).andExpect(status().isConflict());
    mvc.perform(multipart(path+"/transcribe").file(new MockMultipartFile("audio","bad.wav","audio/wav",new byte[100])).param("questionId",qid).cookie(a.cookie).header("Origin",ORIGIN)).andExpect(status().isBadRequest());
    mvc.perform(multipart(path+"/transcribe").file(new MockMultipartFile("audio","large.wav","audio/wav",new byte[3840045])).param("questionId",qid).cookie(a.cookie).header("Origin",ORIGIN)).andExpect(status().isBadRequest());
    send(a,path+"/answer",Map.of("questionId",qid,"text","My saved answer."));
    mvc.perform(multipart(path+"/transcribe").file(audio).param("questionId",qid).cookie(a.cookie).header("Origin",ORIGIN)).andExpect(status().isConflict());
    verify(ai,times(1)).transcribe(any(byte[].class),anyString());
  }

  @Test
  void interviewerSelectionPersistsAndCannotChangeAfterStart() throws Exception {
    Account a = account("STUDENT");
    for (String mode : List.of("AI", "PRACTICE")) {
      String id = body(send(a, "/api/interviews", Map.of("role", "AI Engineer", "kind", "Technical", "difficulty", "Medium", "duration", 15))).path("id").asText();
      String path = "/api/interviews/" + id;
      mvc.perform(post(path + "/start?interviewer=unknown").cookie(a.cookie).header("Origin", ORIGIN))
        .andExpect(status().isBadRequest());
      assertEquals("SCHEDULED", db.one("SELECT status FROM interviews WHERE id=?", id).get("status"));
      var started = body(send(a, path + "/start?mode=" + mode + "&interviewer=male", null));
      assertEquals("male", started.path("interviewer_gender").asText());
      var retry = body(send(a, path + "/start?mode=" + mode + "&interviewer=female", null));
      assertEquals("male", retry.path("interviewer_gender").asText());
      assertEquals(1, retry.path("transcript").size());
      mvc.perform(get(path).cookie(a.cookie)).andExpect(status().isOk())
        .andExpect(jsonPath("$.interviewer_gender").value("male"));
      assertEquals("male", db.one("SELECT interviewer_gender FROM interviews WHERE id=?", id).get("interviewer_gender"));
    }
    String id = body(send(a, "/api/interviews", Map.of("role", "UX Designer", "kind", "Technical", "difficulty", "Easy", "duration", 5))).path("id").asText();
    assertEquals("female", body(send(a, "/api/interviews/" + id + "/start", null)).path("interviewer_gender").asText());
  }

  @Test
  void structuredInterviewUsesAuthoredQuestionsAndBoundsAdaptiveFollowups() throws Exception {
    Account a = account("STUDENT");
    var counter = new java.util.concurrent.atomic.AtomicInteger();
    when(ai.generate(eq("InterviewTurnPrompt"), anyString())).thenAnswer(inv -> json.readTree("{\"question\":\"Explain the trade-off in your retrieval example " + counter.incrementAndGet() + ".\",\"askFollowup\":true,\"answerReview\":{\"summary\":\"The answer describes a retrieval project.\",\"improvement\":\"Explain how you checked retrieval relevance.\"}}"));
    String id = body(send(a, "/api/interviews", Map.of("role", "AI Engineer", "kind", "Technical", "difficulty", "Hard", "duration", 30))).path("id").asText();
    String path = "/api/interviews/" + id;
    var room = body(send(a, path + "/start", null));
    assertTrue(room.path("transcript").get(0).path("question").asText().contains("introduce yourself"));
    verify(ai, never()).generate(eq("InterviewTurnPrompt"), anyString());
    assertEquals(14, room.path("questionLimit").asInt());
    var phases = new ArrayList<String>();
    for (int n = 0; n < 14; n++) {
      var current = room.path("transcript").get(n);
      phases.add(current.path("phase").asText());
      send(a, path + "/answer", Map.of("questionId", current.path("id").asText(), "text", "I built a retrieval project and checked its results. Answer " + n));
      if (n == 13) { assertTrue(room.path("canFinishAfterAnswer").asBoolean()); break; }
      room = body(send(a, path + "/next", null));
    }
    assertEquals(List.of("Introduction", "Easy", "Easy", "Easy", "Easy", "Medium", "Medium", "Medium", "Medium", "Hard", "Hard", "Hard", "Hard", "Closing"), phases);
    assertEquals(13, db.count("SELECT COUNT(*) FROM interview_answers a JOIN interview_questions q ON q.id=a.question_id WHERE q.interview_id=? AND a.feedback_json IS NOT NULL", id));
    assertEquals(6, db.count("SELECT COUNT(*) FROM interview_questions WHERE interview_id=? AND turn_kind='FOLLOW_UP'", id));
    var authored = new com.careerx.service.InterviewCurriculum(json).plan(db.one("SELECT * FROM interviews WHERE id=?", id));
    var main = db.list("SELECT content FROM interview_questions WHERE interview_id=? AND turn_kind='MAIN' ORDER BY position", id);
    assertEquals(authored.stream().map(com.careerx.service.InterviewCurriculum.Step::question).toList(), main.stream().map(q -> q.get("content")).toList());
    mvc.perform(post(path + "/next").cookie(a.cookie).header("Origin", ORIGIN)).andExpect(status().isConflict());
    send(a, path + "/end", null);
    when(ai.generate(eq("InterviewEvaluationPrompt"), anyString())).thenReturn(json.readTree("{\"score\":75,\"summary\":\"Practice review\",\"breakdown\":[],\"strengths\":[],\"improvements\":[\"Evaluate retrieval relevance\"],\"topics\":[],\"modelAnswers\":[],\"followUpQuestions\":[],\"questionReviews\":[]}"));
    send(a, path + "/report", null);
    verify(ai).generate(eq("InterviewEvaluationPrompt"), contains("retrieval relevance"));
    verify(ai, never()).generate(eq("AssistantPrompt"), anyString());
  }

  @Test
  void guidedPracticeCompletesWithoutAIAndNeverInventsAScore() throws Exception {
    when(ai.available()).thenReturn(false);
    Account a = account("STUDENT");
    String id = body(
      send(
        a,
        "/api/interviews",
        Map.of("role", "Java Developer", "kind", "Technical", "difficulty", "Easy", "duration", 15)
      )
    )
      .path("id")
      .asText();
    String path = "/api/interviews/" + id;
    mvc
      .perform(
        post(path + "/start")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
      )
      .andExpect(status().isServiceUnavailable())
      .andExpect(
        jsonPath("message").value(org.hamcrest.Matchers.containsString("guided practice"))
      );
    var room = body(send(a, path + "/start?mode=PRACTICE", null));
    assertEquals("PRACTICE", room.path("mode").asText());
    int limit = room.path("questionLimit").asInt();
    assertTrue(limit > 5 && limit <= 20);
    assertEquals(
      1,
      body(send(a, path + "/start?mode=PRACTICE", null))
        .path("transcript")
        .size()
    );
    for (int n = 0; n < limit; n++) {
      String qid = room.path("transcript").path(n).path("id").asText();
      send(a, path + "/answer", Map.of("questionId", qid, "text", "My saved practice answer " + n));
      if (n + 1 < limit) room = body(send(a, path + "/next", null));
    }
    mvc
      .perform(
        post(path + "/next")
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
      )
      .andExpect(status().isConflict());
    send(a, path + "/end", null);
    var report = body(send(a, path + "/report", null));
    assertTrue(report.path("practice").asBoolean());
    assertFalse(report.has("score"));
    assertEquals(limit, report.path("answeredCount").asInt());
    assertEquals(report, body(send(a, path + "/report", null)));
    var restored = body(
      mvc.perform(get(path).cookie(a.cookie)).andExpect(status().isOk()).andReturn()
    );
    assertEquals("COMPLETED", restored.path("status").asText());
    assertEquals(limit, restored.path("transcript").size());
    assertTrue(restored.path("report").path("practice").asBoolean());
    verify(ai, never()).generate(anyString(), anyString());
  }

  @Test
  void reputationIsIdempotentAndFacultyAuthorizationIsEnforced() throws Exception {
    Account asker = account("STUDENT"),
      author = account("STUDENT"),
      faculty = account("FACULTY");
    String qid = body(
      send(
        asker,
        "/api/community/questions",
        Map.of(
          "title",
          "Why normalize a database?",
          "body",
          "How does normalization reduce duplicate data?",
          "category",
          "DBMS"
        )
      )
    )
      .path("id")
      .asText();
    String aid = body(
      send(
        author,
        "/api/community/answers",
        Map.of("questionId", qid, "body", "Separate related tables by their dependencies.")
      )
    )
      .path("id")
      .asText();
    mvc
      .perform(
        post("/api/community/answers/" + aid + "/vote")
          .cookie(author.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content("{\"value\":1}")
      )
      .andExpect(status().isBadRequest());
    send(asker, "/api/community/answers/" + aid + "/vote", Map.of("value", 1));
    send(asker, "/api/community/answers/" + aid + "/vote", Map.of("value", 1));
    assertEquals(5, db.count("SELECT reputation FROM profiles WHERE user_id=?", author.id));
    mvc
      .perform(
        post("/api/community/answers/" + aid + "/verify")
          .cookie(asker.cookie)
          .header("Origin", ORIGIN)
      )
      .andExpect(status().isForbidden());
    send(faculty, "/api/community/answers/" + aid + "/verify", null);
    send(faculty, "/api/community/answers/" + aid + "/verify", null);
    assertEquals(25, db.count("SELECT reputation FROM profiles WHERE user_id=?", author.id));
    send(asker, "/api/community/answers/" + aid + "/helpful", null);
    send(asker, "/api/community/answers/" + aid + "/helpful", null);
    assertEquals(35, db.count("SELECT reputation FROM profiles WHERE user_id=?", author.id));
    send(asker, "/api/community/answers/" + aid + "/vote", Map.of("value", 0));
    assertEquals(30, db.count("SELECT reputation FROM profiles WHERE user_id=?", author.id));
    send(asker, "/api/community/questions/" + qid + "/bookmark", null);
    send(
      author,
      "/api/community/questions/" + qid + "/comments",
      Map.of("text", "A useful explanation.")
    );
    mvc
      .perform(get("/api/community/search?q=duplicate&bookmarked=true").cookie(asker.cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  void roadmapOwnershipModerationAndBan() throws Exception {
    Account a = account("STUDENT"),
      b = account("STUDENT"),
      admin = account("ADMIN");
    when(ai.generate(eq("CareerRoadmapPrompt"), anyString())).thenReturn(
      json.readTree(
        "{\"summary\":\"Use your existing Java skills.\",\"items\":[{\"title\":\"REST\",\"learn\":\"HTTP\",\"practice\":\"API calls\",\"build\":\"An API\",\"interview\":\"Explain REST\"}]}"
      )
    );
    var r = body(send(a, "/api/career/roadmap", Map.of("text", "Java Developer")));
    String item = r.path("items").path(0).path("id").asText();
    mvc
      .perform(
        patch("/api/career/roadmap/items/" + item)
          .cookie(b.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content("{\"progress\":100}")
      )
      .andExpect(status().isNotFound());
    mvc
      .perform(
        patch("/api/career/roadmap/items/" + item)
          .cookie(a.cookie)
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content("{\"progress\":100}")
      )
      .andExpect(status().isOk());
    String qid = body(
      send(
        a,
        "/api/community/questions",
        Map.of(
          "title",
          "Question for review",
          "body",
          "Report this test fixture.",
          "category",
          "General"
        )
      )
    )
      .path("id")
      .asText();
    send(
      b,
      "/api/community/reports",
      Map.of("targetId", qid, "targetType", "question", "reason", "Moderation test")
    );
    assertEquals(1, db.count("SELECT reputation FROM profiles WHERE user_id=?", a.id));
    String report = (String) db.one("SELECT id FROM reports WHERE target_id=?", qid).get("id");
    send(admin, "/api/admin/reports/" + report + "/resolve", Map.of("action", "remove"));
    assertEquals(-4, db.count("SELECT reputation FROM profiles WHERE user_id=?", a.id));
    mvc
      .perform(get("/api/community/questions/" + qid).cookie(b.cookie))
      .andExpect(status().isNotFound());
    send(admin, "/api/admin/users/" + a.id + "/ban", null);
    mvc.perform(get("/api/users/me").cookie(a.cookie)).andExpect(status().isUnauthorized());
  }

  @Test
  void passwordResetInvalidatesSessionsAndIsSingleUse() throws Exception {
    Account a = account("STUDENT");
    String token = "test-token-with-enough-entropy-for-fixture";
    String hash = java.util.HexFormat.of().formatHex(
      java.security.MessageDigest.getInstance("SHA-256").digest(token.getBytes())
    );
    db.exec(
      "INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)",
      hash,
      a.id,
      java.sql.Timestamp.from(java.time.Instant.now().plusSeconds(1800))
    );
    mvc
      .perform(
        post("/api/auth/reset-password")
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(
            json.writeValueAsString(Map.of("token", token, "password", "Another-strong-password!"))
          )
      )
      .andExpect(status().isOk());
    mvc.perform(get("/api/users/me").cookie(a.cookie)).andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/auth/reset-password")
          .header("Origin", ORIGIN)
          .contentType("application/json")
          .content(
            json.writeValueAsString(Map.of("token", token, "password", "Another-strong-password!"))
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void semanticSearchUsesVectorsAndKeepsBookmarkFilter() throws Exception {
    Account a = account("STUDENT");
    String id = body(
      send(
        a,
        "/api/community/questions",
        Map.of(
          "title",
          "Database normal forms",
          "body",
          "Relations and functional dependencies explained.",
          "category",
          "DBMS"
        )
      )
    )
      .path("id")
      .asText();
    double[] vector = { 1, 0, 0, 0, 0, 0, 0, 0 };
    db.exec(
      "UPDATE questions SET embedding=?,embedding_model=? WHERE id=?",
      db.text(vector),
      "test-embedding",
      id
    );
    when(ai.embeddingsAvailable()).thenReturn(true);
    when(ai.embeddingModel()).thenReturn("test-embedding");
    when(ai.embed(anyString())).thenReturn(vector);
    mvc
      .perform(get("/api/community/search?q=reduce%20duplicate%20data").cookie(a.cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.mode").value("semantic"))
      .andExpect(jsonPath("$.items[0].id").value(id));
    mvc
      .perform(get("/api/community/search?q=duplicate&bookmarked=true").cookie(a.cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.total").value(0));
    send(a, "/api/community/questions/" + id + "/bookmark", null);
    mvc
      .perform(get("/api/community/search?q=duplicate&bookmarked=true").cookie(a.cookie))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.mode").value("semantic"))
      .andExpect(jsonPath("$.total").value(1));
  }
}
