package com.careerx.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;

public final class Requests {

  public record Login(
    @jakarta.validation.constraints.Email @NotBlank String email,
    @NotBlank @Size(max = 128) String password
  ) {}

  public record Signup(
    @NotBlank @Size(max = 120) String name,
    @jakarta.validation.constraints.Email @NotBlank String email,
    @Size(min = 10, max = 72) @NotBlank String password,
    @Size(max = 200) String college,
    @Size(max = 100) String course,
    @Size(max = 100) String branch,
    @Size(max = 20) String studyYear,
    @Size(max = 10) String graduationYear,
    @Size(max = 200) String careerGoal
  ) {}

  public record Email(@jakarta.validation.constraints.Email @NotBlank String email) {}

  public record Reset(
    @NotBlank String token,
    @NotBlank @Size(min = 10, max = 72) String password
  ) {}

  public record Profile(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 200) String college,
    @Size(max = 100) String course,
    @Size(max = 100) String branch,
    @Size(max = 20) String studyYear,
    @Size(max = 10) String graduationYear,
    @Size(max = 200) String careerGoal,
    @Size(max = 3000) String skills,
    @Size(max = 10000) String projects,
    boolean publicProfile
  ) {}

  public record Text(@NotBlank @Size(max = 30000) String text) {}

  public record ResumeBuild(
    @NotBlank @Size(max = 250) String name,
    @NotBlank @Size(max = 60000) String content,
    JsonNode document
  ) {}

  public record Match(
    @NotBlank String resumeId,
    @NotBlank @Size(max = 20000) String jobDescription
  ) {}

  public record Interview(
    @NotBlank @Size(max = 100) String role,
    @Pattern(regexp = "HR|Technical|Behavioral|Coding|Mixed") @NotNull String kind,
    @Pattern(regexp = "Easy|Medium|Hard") @NotNull String difficulty,
    @Min(5) @Max(90) int duration,
    String scheduledAt
  ) {}

  public record AnswerInput(
    @NotBlank String questionId,
    @NotBlank @Size(max = 15000) String text,
    @Pattern(regexp = "TEXT|VOICE|MIXED") String inputMode,
    @Min(0) @Max(86400) Integer responseSeconds,
    @Min(0) @Max(86400) Integer speechSeconds,
    @Min(0) @Max(15000) Integer spokenWords
  ) {}

  public record Question(
    @NotBlank @Size(max = 250) String title,
    @Size(max = 250) String originalTitle,
    @NotBlank @Size(max = 20000) String body,
    @NotBlank @Size(max = 60) String category
  ) {}

  public record Answer(@NotBlank String questionId, @NotBlank @Size(max = 20000) String body) {}

  public record Vote(@Min(-1) @Max(1) int value) {}

  public record Report(
    @NotBlank String targetId,
    @Pattern(regexp = "question|answer") @NotNull String targetType,
    @NotBlank @Size(max = 1000) String reason
  ) {}

  public record Progress(@Min(0) @Max(100) int progress) {}

  public record Moderation(@Pattern(regexp = "dismiss|remove") @NotNull String action) {}
}
