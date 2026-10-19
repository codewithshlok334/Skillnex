package com.careerx.service;

import java.util.*;

/** The same spoken turn is used by live voice, text-mode playback and captions. */
public final class InterviewSpeech {
  private InterviewSpeech() {}

  public static Map<String, String> presentation(Map<String, Object> interview) {
    var rows = interview.get("transcript") instanceof List<?> list ? list : List.of();
    int answered = (int) rows.stream().filter(row -> row instanceof Map<?, ?> m && hasAnswer(m)).count();
    String[] thanks = {
      "Thank you for sharing that. I appreciate your effort.",
      "Thanks for walking me through your answer. I appreciate you taking the time.",
      "Thank you. I appreciate the thought you put into your response."
    };
    String acknowledgement = answered == 0 ? "" : thanks[(answered - 1) % thanks.length];
    String spoken = "";
    if (!rows.isEmpty() && rows.getLast() instanceof Map<?, ?> current && !hasAnswer(current)) {
      String question = Objects.toString(current.get("question"), "");
      String name = "male".equals(interview.get("interviewer_gender")) ? "Aarav" : "Maya";
      spoken = answered == 0
        ? "Hello, I'm " + name + ", your AI interviewer. Let's begin. " + question
        : acknowledgement + " Your next question is: " + question;
    }
    return Map.of("acknowledgement", acknowledgement, "spokenPrompt", spoken,
      "closingMessage", "Thank you for completing the interview. I appreciate your effort today. Your interview is complete, and we will now prepare your analysis.");
  }

  private static boolean hasAnswer(Map<?, ?> row) {
    return row.get("answer") instanceof String answer && !answer.isBlank();
  }
}
