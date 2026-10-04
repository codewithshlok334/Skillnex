package com.careerx.service;

import java.util.*;
import org.springframework.stereotype.Component;

/** Curated practice questions and self-review guidance; never presented as AI evaluation. */
@Component
public class PracticeInterview {
  private final InterviewCurriculum curriculum;
  public PracticeInterview(InterviewCurriculum curriculum) { this.curriculum = curriculum; }

  public List<String> questions(Map<String, Object> session) {
    if (curriculum.structured(session)) return curriculum.plan(session).stream().map(InterviewCurriculum.Step::question).toList();
    String role = String.valueOf(session.get("role"));
    String kind = String.valueOf(session.get("kind"));
    String difficulty = String.valueOf(session.get("difficulty"));
    var questions = new ArrayList<String>();
    questions.add(
      "Tell me about yourself and one experience that prepares you for a " + role + " role."
    );
    var behavioral = List.of(
      "Describe a challenge in a project or team. What was your responsibility, what action did you take, and what happened?",
      "Tell me about a disagreement with a teammate. How did you reach a decision?",
      "Give an example of learning something unfamiliar under a deadline. How did you check your understanding?",
      "Describe a mistake you made. What did you change afterward?",
      "How would you prioritize two urgent tasks with conflicting deadlines? Explain your reasoning."
    );
    if (kind.equals("Coding")) {
      questions.addAll(List.of(
        "Write a function that returns the first non-repeating character in a string. Explain your approach, examples, and edge cases.",
        "What are the time and space complexities of your solution? Can you improve either one?",
        "Write test cases for empty input, repeated characters, and Unicode. Explain the expected outputs.",
        "How would you adapt your approach if the input arrived as a stream too large to hold in memory?"
      ));
    } else if (kind.equals("HR") || kind.equals("Behavioral") || role.equals("General HR")) {
      questions.addAll(behavioral);
    } else {
      questions.addAll(
        switch (role) {
          case "Java Developer" -> List.of(
            "Explain equals and hashCode in Java. What can go wrong when a mutable object is used as a HashMap key?",
            "When would you choose an interface over an abstract class? Give a concrete example.",
            "Two threads update shared state. How would you prevent race conditions and test your solution?",
            "How would you design exception handling and validation for a Spring REST API?",
            "A Java service slows down under load. How would you investigate CPU, memory, and database bottlenecks?"
          );
          case "Python Developer" -> List.of(
            "Compare lists, tuples, sets, and dictionaries. Give a suitable use case for each.",
            "Explain a mutable default argument bug in Python and how to avoid it.",
            "When would a generator help process a large file? What are the trade-offs?",
            "How would you choose between async I/O, threads, and processes for a Python application?",
            "How would you validate, test, and handle errors in a Python API?"
          );
          case "Frontend Developer" -> List.of(
            "How do you choose between local state and shared state in a React application?",
            "Explain how you would build an accessible form with validation and keyboard navigation.",
            "An older network response overwrites newer search results. How would you prevent this?",
            "A page feels slow on mobile. What would you measure and improve first?",
            "How would you test loading, empty, error, and success states in a user interface?"
          );
          case "Data Analyst" -> List.of(
            "How would you investigate missing values, duplicates, and outliers before analyzing a dataset?",
            "Explain SQL joins and how duplicate keys can inflate an aggregate.",
            "How would you define and validate a metric for student engagement?",
            "An experiment shows higher conversion. What would you check before concluding the change worked?",
            "How would you communicate a finding, its uncertainty, and a recommendation to a nontechnical team?"
          );
          case "AI/ML" -> List.of(
            "How would you split training, validation, and test data while avoiding leakage?",
            "Explain overfitting and how you would detect and reduce it.",
            "For an imbalanced classification task, how would you choose evaluation metrics?",
            "How would you compare a machine learning model with a simple baseline?",
            "A deployed model performs worse over time. What would you monitor and investigate?"
          );
          default -> List.of(
            "Walk through a project you built. What were the main components and why did you choose them?",
            "How would you find duplicate values efficiently? Explain time and space complexity.",
            "Design a REST endpoint for booking an interview. How would you validate input and prevent duplicate bookings?",
            "Explain a database index and a case where it helps or hurts performance.",
            "A service works locally but fails intermittently in production. How would you investigate and test a fix?"
          );
        }
      );
      if (kind.equals("Mixed")) questions.addAll(behavioral.subList(0, 2));
    }
    questions.add(
      switch (difficulty) {
        case "Hard" -> "Choose one solution you discussed. How would it change under ten times the workload or a much tighter deadline? Explain trade-offs and failure cases.";
        case "Easy" -> "Choose a concept from this conversation and explain it to a beginner with a simple example.";
        default -> "Choose one answer you gave. What alternative approach would you consider, and how would you decide between them?";
      }
    );
    questions.add(
      "What questions would you ask the interviewer about the role, team, and expectations?"
    );
    return questions;
  }

  public Map<String, Object> review(Map<String, Object> session) {
    var transcript = (List<?>) session.get("transcript");
    long answered = transcript
      .stream()
      .filter(row -> ((Map<?, ?>) row).get("answer") != null)
      .count();
    return Map.of(
      "practice",
      true,
      "answeredCount",
      answered,
      "questionCount",
      transcript.size(),
      "summary",
      "Your answers are saved. This is a self-review guide, not an AI score or an assessment of technical correctness.",
      "checklist",
      List.of(
        "Did I answer the question directly before adding details?",
        "Did I explain my own contribution with a specific example?",
        "Did I describe my reasoning, alternatives, and trade-offs?",
        "Did I support the outcome with facts instead of invented metrics?",
        "Which answer should I research, verify, and practice again?"
      )
    );
  }
}
