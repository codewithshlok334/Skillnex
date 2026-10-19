package com.careerx;

import com.careerx.service.InterviewSpeech;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class InterviewSpeechTest {
  @Test void firstQuestionIsIntroducedByTheSelectedInterviewer() {
    var speech = InterviewSpeech.presentation(Map.of("interviewer_gender", "male", "transcript",
      List.of(Map.of("question", "Tell me about your project."))));
    assertTrue(speech.get("spokenPrompt").startsWith("Hello, I'm Aarav"));
    assertTrue(speech.get("spokenPrompt").endsWith("Tell me about your project."));
    assertEquals("", speech.get("acknowledgement"));
  }

  @Test void everyFollowingQuestionAppreciatesParticipationThenReadsTheExactQuestion() {
    var speech = InterviewSpeech.presentation(Map.of("transcript", List.of(
      Map.of("question", "Introduce yourself.", "answer", "I am learning Java."),
      Map.of("question", "Why did you choose Java?", "turn_kind", "FOLLOW_UP"))));
    assertEquals(speech.get("acknowledgement") + " Your next question is: Why did you choose Java?", speech.get("spokenPrompt"));
    assertTrue(speech.get("acknowledgement").contains("effort"));
    assertFalse(speech.get("acknowledgement").contains("correct"));
  }

  @Test void doesNotReadAnAlreadyAnsweredQuestionAgain() {
    var speech = InterviewSpeech.presentation(Map.of("transcript", List.of(Map.of("question", "Last question", "answer", "My answer"))));
    assertEquals("", speech.get("spokenPrompt"));
    assertTrue(speech.get("closingMessage").contains("prepare your analysis"));
    assertFalse(speech.get("closingMessage").contains("click"));
  }
}
