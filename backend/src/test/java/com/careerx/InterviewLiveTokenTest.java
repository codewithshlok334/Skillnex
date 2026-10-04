package com.careerx;

import com.careerx.ai.InterviewLiveTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

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
}
