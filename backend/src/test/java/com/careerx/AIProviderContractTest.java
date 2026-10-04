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
    request = new AtomicReference<>();
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
}
