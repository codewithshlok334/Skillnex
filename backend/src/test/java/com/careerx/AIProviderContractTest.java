package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.careerx.ai.HttpAIService;
import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;

class AIProviderContractTest {

  HttpServer server;
  AtomicReference<String> response = new AtomicReference<>(),
    request = new AtomicReference<>(),
    authorization = new AtomicReference<>();
  HttpAIService ai;
  Store db;
  AtomicInteger responseStatus = new AtomicInteger(200),
    requests = new AtomicInteger();

  @BeforeEach
  void setup() throws Exception {
    var mapper = new ObjectMapper();
    db = mock(Store.class);
    when(db.text(any())).thenAnswer(i -> mapper.writeValueAsString(i.getArgument(0)));
    when(db.parse(anyString())).thenAnswer(i -> mapper.readTree((String) i.getArgument(0)));
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/chat/completions", e -> {
      requests.incrementAndGet();
      authorization.set(e.getRequestHeaders().getFirst("Authorization"));
      request.set(new String(e.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
      byte[] b = response.get().getBytes(StandardCharsets.UTF_8);
      e.getResponseHeaders().add("Content-Type", "application/json");
      e.sendResponseHeaders(responseStatus.get(), b.length);
      e.getResponseBody().write(b);
      e.close();
    });
    server.start();
    ai = new HttpAIService(
      db,
      "compatible",
      "http://127.0.0.1:" + server.getAddress().getPort(),
      "test-key",
      "test-model",
      ""
    );
  }

  @AfterEach
  void stop() {
    server.stop(0);
  }

  @Test
  void geminiAudioUsesMultimodalInputAndValidatesTranscript() throws Exception {
    ai = new HttpAIService(db,"compatible","http://127.0.0.1:"+server.getAddress().getPort(),"test-key","gemini-test","");
    assertTrue(ai.audioTranscriptionAvailable());
    var mapper = new ObjectMapper();
    response.set(mapper.writeValueAsString(java.util.Map.of("choices",java.util.List.of(java.util.Map.of("message",java.util.Map.of("content","{\"text\":\"I built an API.\"}"))))));
    assertEquals("I built an API.",ai.transcribe(new byte[]{1,2,3},"en-IN"));
    var payload = mapper.readTree(request.get());
    assertEquals("input_audio",payload.path("messages").get(1).path("content").get(1).path("type").asText());
    assertEquals("AQID",payload.path("messages").get(1).path("content").get(1).path("input_audio").path("data").asText());
    response.set("{\"choices\":[{\"message\":{\"content\":\"{\\\"text\\\":123}\"}}]}");
    assertThrows(org.springframework.web.server.ResponseStatusException.class,()->ai.transcribe(new byte[]{1},"en-IN"));
    requests.set(0); responseStatus.set(429);
    assertThrows(org.springframework.web.server.ResponseStatusException.class,()->ai.transcribe(new byte[]{1},"en-IN"));
    assertEquals(1,requests.get());
  }

  @Test
  void sendsServerSideSafetyPromptAndValidatesStructuredOutput() throws Exception {
    var mapper = new ObjectMapper();
    response.set(
      mapper.writeValueAsString(
        java.util.Map.of(
          "choices",
          java.util.List.of(
            java.util.Map.of(
              "message",
              java.util.Map.of("content", "{\"suggestion\":\"Built a Java application.\"}")
            )
          )
        )
      )
    );
    var r = ai.generate("ResumeImprovementPrompt", "{\"original\":\"Made a Java app.\"}");
    assertEquals("Built a Java application.", r.path("suggestion").asText());
    assertTrue(request.get().contains("Never invent jobs"));
    assertTrue(request.get().contains("Made a Java app"));
  }

  @Test
  void rejectsMalformedAndOutOfRangeOutput() throws Exception {
    var mapper = new ObjectMapper();
    for (String invalid : java.util.List.of(
      "not json",
      "{\"score\":900,\"breakdown\":[],\"issues\":[],\"summary\":\"invalid\"}"
    )) {
      response.set(
        mapper.writeValueAsString(
          java.util.Map.of(
            "choices",
            java.util.List.of(java.util.Map.of("message", java.util.Map.of("content", invalid)))
          )
        )
      );
      assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
        ai.generate("ResumeAnalysisPrompt", "resume")
      );
    }
  }

  @Test
  void assistantQuotaErrorIsClearAndDoesNotRetrySilently() {
    responseStatus.set(429);
    response.set("{\"error\":{\"message\":\"private upstream details\"}}");
    var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
      ai.generate("AssistantPrompt", "hello")
    );
    assertEquals(429, error.getStatusCode().value());
    assertTrue(error.getReason().contains("quota"));
    assertFalse(error.getReason().contains("private upstream"));
    assertEquals(1, requests.get());
  }

  @Test
  void assistantBusyProviderReturnsWithoutASecondLongWait() {
    responseStatus.set(503);
    response.set("{}");
    assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
      ai.generate("AssistantPrompt", "hello")
    );
    assertEquals(1, requests.get());
  }

  @Test
  void unconfiguredProviderDoesNotFabricate() {
    var disabled = new HttpAIService(db, "compatible", "https://api.example.com", "", "", "");
    assertFalse(disabled.available());
    assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
      disabled.generate("ResumeAnalysisPrompt", "resume")
    );
  }

  @Test
  void assistantUsesProviderAndRejectsMissingReply() throws Exception {
    var mapper = new ObjectMapper();
    response.set(
      mapper.writeValueAsString(
        java.util.Map.of(
          "choices",
          java.util.List.of(
            java.util.Map.of(
              "message",
              java.util.Map.of("content", "{\"reply\":\"Tell me about your project.\"}")
            )
          )
        )
      )
    );
    assertEquals(
      "Tell me about your project.",
      ai
        .generate("AssistantPrompt", "{\"message\":\"Help with my interview\"}")
        .path("reply")
        .asText()
    );
    assertTrue(request.get().contains("Hindi or Hinglish"));
    assertTrue(request.get().contains("general-purpose conversational assistant"));
    assertTrue(request.get().contains("Do not restrict conversations to careers"));
    assertTrue(request.get().contains("Help with the user's question across topics"));
    response.set(
      mapper.writeValueAsString(
        java.util.Map.of(
          "choices",
          java.util.List.of(
            java.util.Map.of(
              "message",
              java.util.Map.of("content", "{\"message\":\"invalid shape\"}")
            )
          )
        )
      )
    );
    assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
      ai.generate("AssistantPrompt", "hello")
    );
  }

  @Test
  void trimsDeploymentSettingsBeforeSendingHeadersAndModel() throws Exception {
    response.set("{\"choices\":[{\"message\":{\"content\":\"{\\\"reply\\\":\\\"ready\\\"}\"}}]}");
    var normalized = new HttpAIService(db, " COMPATIBLE \n", " \t" + base() + "///\n",
      "  test-key\r\n", " test-model \t", " embedding-model \n");
    assertTrue(normalized.available());
    assertEquals("embedding-model", normalized.embeddingModel());
    assertEquals("ready", normalized.generate("AssistantPrompt", "hello").path("reply").asText());
    assertEquals("Bearer test-key", authorization.get());
    assertEquals("test-model", new ObjectMapper().readTree(request.get()).path("model").asText());
    assertEquals(1, requests.get());
  }

  @Test
  void rejectsMalformedConfigurationBeforeAnyRequestWithoutEchoingValues() {
    for (String badKey : java.util.List.of("secret\nline", "secret\tline", "secret\u007fline", "secret-\u00e9")) {
      var configured = new HttpAIService(db, "compatible", base(), badKey, "test-model", "");
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
        () -> configured.generate("AssistantPrompt", "private prompt"));
      assertEquals(503, error.getStatusCode().value());
      assertTrue(error.getReason().contains("AI_API_KEY"));
      assertFalse(error.getReason().contains("secret"));
    }
    for (String badBase : java.util.List.of("not-a-url", "ftp://api.example.test", "https://private:secret@api.example.test",
      "https://api.example.test?secret=value", "https://api.example.test/#private", "https://api.example.test:99999")) {
      var configured = new HttpAIService(db, "compatible", badBase, "test-key", "test-model", "");
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
        () -> configured.generate("AssistantPrompt", "private prompt"));
      assertTrue(error.getReason().contains("AI_BASE_URL"));
      assertFalse(error.getReason().contains(badBase));
    }
    var badProvider = new HttpAIService(db, "unknown-provider", base(), "test-key", "test-model", "");
    assertTrue(assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> badProvider.generate("AssistantPrompt", "hello")).getReason().contains("AI_PROVIDER"));
    var badModel = new HttpAIService(db, "compatible", base(), "test-key", "test\nmodel", "");
    assertTrue(assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> badModel.generate("AssistantPrompt", "hello")).getReason().contains("AI_MODEL"));
    assertEquals(0, requests.get());
  }

  @Test
  void distinguishesProviderConfigurationAndInvalidJsonWithoutLeakingUpstreamBodies() {
    response.set("private upstream secret");
    for (int status : new int[] {400, 401, 403, 404, 422}) {
      responseStatus.set(status);
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
        () -> ai.generate("AssistantPrompt", "private prompt"));
      assertEquals(503, error.getStatusCode().value());
      assertFalse(error.getReason().contains("temporarily"));
      assertFalse(error.getReason().contains("private upstream"));
    }
    responseStatus.set(200);
    var invalid = assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> ai.generate("AssistantPrompt", "private prompt"));
    assertEquals(502, invalid.getStatusCode().value());
    assertTrue(invalid.getReason().contains("invalid or incomplete response"));
    assertEquals(6, requests.get());
  }

  @Test
  void preservesNonChatQuotaRetryAndSanitizesDiagnostics() {
    var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(HttpAIService.class);
    var entries = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
    entries.start(); logger.addAppender(entries);
    try {
      responseStatus.set(429);
      response.set("private-upstream-body test-key private-prompt");
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
        () -> ai.generate("ResumeImprovementPrompt", "private-prompt"));
      assertEquals(429, error.getStatusCode().value());
      assertEquals(2, requests.get());
      responseStatus.set(200);
      assertThrows(org.springframework.web.server.ResponseStatusException.class,
        () -> ai.generate("AssistantPrompt", "private-prompt"));
      assertTrue(entries.list.stream().anyMatch(entry -> entry.getFormattedMessage().contains("status=429")));
      assertTrue(entries.list.stream().anyMatch(entry -> entry.getFormattedMessage().contains("JsonParseException")));
      for (var entry : entries.list) {
        String message = entry.getFormattedMessage();
        assertNull(entry.getThrowableProxy());
        assertFalse(message.contains("private-upstream"));
        assertFalse(message.contains("private-prompt"));
        assertFalse(message.contains("test-key"));
        assertFalse(message.contains(base()));
      }
    } finally { logger.detachAppender(entries); entries.stop(); }
  }

  @Test
  void reportsServerTransportFailureInsteadOfProviderConfiguration() {
    server.stop(0);
    var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> ai.generate("AssistantPrompt", "private prompt"));
    assertEquals(503, error.getStatusCode().value());
    assertTrue(error.getReason().contains("server could not connect"));
    assertFalse(error.getReason().contains(base()));
  }

  private String base() { return "http://127.0.0.1:" + server.getAddress().getPort(); }
}
