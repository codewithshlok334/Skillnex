package com.careerx.ai;

import com.fasterxml.jackson.databind.JsonNode;

public interface AIService {
  JsonNode generate(String task, String input);
  double[] embed(String input);
  boolean available();
  boolean embeddingsAvailable();
  String embeddingModel();
  default boolean audioTranscriptionAvailable() { return false; }
  default String transcribe(byte[] wav, String language) {
    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Audio transcription is not configured. Use browser dictation or type your answer.");
  }
}
