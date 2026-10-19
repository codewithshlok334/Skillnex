package com.careerx;

import com.careerx.ai.InterviewLiveTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InterviewLiveTokenTest {
  @Test void constrainsTokenToInterviewWithoutExposingProviderKey() throws Exception {
    var json = new ObjectMapper();
    var service = new InterviewLiveTokenService(json,"private-key","https://generativelanguage.googleapis.com/v1beta/openai","","gemini-3.8-live");
    var body = json.valueToTree(service.tokenRequest(Map.of("role","AI Engineer","interviewer_gender","male","transcript",List.of(Map.of("id","q1","question","Introduce yourself.")))));
    assertEquals(1, body.path("uses").asInt());
    assertFalse(body.toString().contains("private-key"));
    assertTrue(body.path("fieldMask").asText().contains("systemInstruction"));
    assertFalse(body.path("fieldMask").asText().contains("sessionResumption"));
    var setup = body.path("bidiGenerateContentSetup");
    assertEquals("AUDIO", setup.path("generationConfig").path("responseModalities").get(0).asText());
    assertEquals("Charon", setup.path("generationConfig").path("speechConfig").path("voiceConfig").path("prebuiltVoiceConfig").path("voiceName").asText());
    assertEquals("START_OF_ACTIVITY_INTERRUPTS", setup.path("realtimeInputConfig").path("activityHandling").asText());
    assertEquals("submit_answer", setup.path("tools").get(0).path("functionDeclarations").get(0).path("name").asText());
  }
  @Test void neverSendsAnotherProvidersKeyToGoogle() {
    var service = new InterviewLiveTokenService(new ObjectMapper(),"other-provider-key","https://api.openai.com/v1","","gemini-3.8-live");
    var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.issue(Map.of()));
    assertEquals(503, error.getStatusCode().value());
  }

  @Test void trimsSettingsAndReusesOnlyAnExactGoogleHttpsOrigin() throws Exception {
    var service = new InterviewLiveTokenService(new ObjectMapper(), " test-key\n",
      " https://generativelanguage.googleapis.com/v1beta/openai \t", " \n", " models/gemini-test-live \n");
    var http = attachClient(service, 200, "{\"name\":\"auth_tokens/test-session\"}");
    var result = service.issue(Map.of());
    assertEquals("models/gemini-test-live", result.get("model"));
    var request = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
    verify(http).send(request.capture(), any(HttpResponse.BodyHandler.class));
    assertEquals("test-key", request.getValue().headers().firstValue("x-goog-api-key").orElseThrow());
    assertFalse(result.toString().contains("test-key"));
    for (String base : List.of("http://generativelanguage.googleapis.com/", "https://generativelanguage.googleapis.com.evil.test/",
      "https://private@-generativelanguage.googleapis.com/", "https://generativelanguage.googleapis.com:8443/")) {
      var other = new InterviewLiveTokenService(new ObjectMapper(), "other-provider-secret", base, "", "gemini-test-live");
      var unused = mock(HttpClient.class);
      org.springframework.test.util.ReflectionTestUtils.setField(other, "http", unused);
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> other.issue(Map.of()));
      assertEquals(503, error.getStatusCode().value());
      assertFalse(error.getReason().contains("other-provider-secret"));
      verifyNoInteractions(unused);
    }
  }

  @Test void rejectsInvalidHeadersAndLiveModelsBeforeSending() {
    for (String badKey : List.of("private\ncredential", "private\tcredential", "private-\u00e9", "private\u007fcredential")) {
      var service = new InterviewLiveTokenService(new ObjectMapper(), "", "", badKey, "gemini-test-live");
      var http = mock(HttpClient.class);
      org.springframework.test.util.ReflectionTestUtils.setField(service, "http", http);
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.issue(Map.of()));
      assertEquals(503, error.getStatusCode().value());
      assertTrue(error.getReason().contains("unsupported characters"));
      assertFalse(error.getReason().contains("private"));
      verifyNoInteractions(http);
    }
    var badModel = new InterviewLiveTokenService(new ObjectMapper(), "", "", "test-key", "live\nmodel");
    assertTrue(assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> badModel.issue(Map.of())).getReason().contains("GEMINI_LIVE_MODEL"));
  }

  @Test void distinguishesSetupQuotaAndMalformedSuccessWithoutLeakingProviderDetails() throws Exception {
    for (int status : new int[] {400, 401, 403, 404, 422, 429, 503}) {
      var service = liveService();
      var http = attachClient(service, status, "private response mentioning test-key");
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.issue(Map.of()));
      assertEquals(503, error.getStatusCode().value());
      assertFalse(error.getReason().contains("private response"));
      assertFalse(error.getReason().contains("test-key"));
      if (status == 429) assertTrue(error.getReason().contains("quota"));
      if (status == 400 || status == 404 || status == 422) assertTrue(error.getReason().contains("GEMINI_LIVE_MODEL"));
      verify(http, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
    for (String invalid : List.of("private broken json", "{}", "{\"name\":\"auth_tokens/\"}")) {
      var service = liveService();
      attachClient(service, 200, invalid);
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.issue(Map.of()));
      assertEquals(502, error.getStatusCode().value());
      assertTrue(error.getReason().contains("invalid session credential"));
      assertFalse(error.getReason().contains("private"));
    }
  }

  @Test void transportDiagnosticsContainOnlyStatusAndExceptionTypes() throws Exception {
    var service = liveService();
    var http = mock(HttpClient.class);
    org.springframework.test.util.ReflectionTestUtils.setField(service, "http", http);
    when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenThrow(
      new java.io.IOException("private-url private-key private-prompt", new javax.net.ssl.SSLHandshakeException("private-provider-body")));
    var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(InterviewLiveTokenService.class);
    var entries = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
    entries.start(); logger.addAppender(entries);
    try {
      var error = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.issue(Map.of()));
      assertEquals(503, error.getStatusCode().value());
      assertTrue(error.getReason().contains("server could not connect"));
      assertFalse(error.getReason().contains("private"));
      assertEquals(1, entries.list.size());
      var entry = entries.list.getFirst();
      assertEquals("Gemini Live provider failure: status=0 exception=IOException root=SSLHandshakeException", entry.getFormattedMessage());
      assertNull(entry.getThrowableProxy());
    } finally { logger.detachAppender(entries); entries.stop(); }
    reset(http);
    when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenThrow(new HttpTimeoutException("private timeout"));
    assertEquals(504, assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> service.issue(Map.of())).getStatusCode().value());
  }

  private InterviewLiveTokenService liveService() {
    return new InterviewLiveTokenService(new ObjectMapper(), "", "https://other-provider.example/v1", "test-key", "gemini-test-live");
  }

  @SuppressWarnings("unchecked")
  private HttpClient attachClient(InterviewLiveTokenService service, int status, String body) throws Exception {
    var http = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(status);
    when(response.body()).thenReturn(body);
    when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
    org.springframework.test.util.ReflectionTestUtils.setField(service, "http", http);
    return http;
  }
}
