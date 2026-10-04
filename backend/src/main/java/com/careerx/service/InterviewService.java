package com.careerx.service;

import com.careerx.ai.InterviewAIService;
import com.careerx.repository.Store;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InterviewService {

  private final Store db;
  private final InterviewAIService ai;
  private final PracticeInterview practice;
  private final InterviewCurriculum curriculum;

  public InterviewService(Store db, InterviewAIService ai, PracticeInterview practice, InterviewCurriculum curriculum) {
    this.db = db;
    this.ai = ai;
    this.practice = practice;
    this.curriculum = curriculum;
  }

  public Map<String, Object> context(String id, String uid) {
    var i = db.owned("interviews", id, uid);
    var out = new HashMap<String, Object>(i);
    out.put("audioTranscriptionAvailable", ai.audioTranscriptionAvailable());
    out.put(
      "transcript",
      db.list(
        "SELECT q.id,q.position,q.content AS question,q.phase,q.turn_kind,q.plan_index,a.content AS answer,a.input_mode,a.response_seconds,a.speech_seconds,a.spoken_words,a.feedback_json FROM interview_questions q LEFT JOIN interview_answers a ON a.question_id=q.id WHERE q.interview_id=? ORDER BY q.position",
        id
      )
    );
    var r = db.list(
      "SELECT content FROM resumes WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
      uid
    );
    out.put("resume", r.isEmpty() ? "" : r.getFirst().get("content"));
    out.put("candidateName", db.one("SELECT name FROM app_users WHERE id=?", uid).get("name"));
    long elapsed = elapsed(i);
    out.put("elapsedSeconds", elapsed);
    out.put("remainingSeconds", Math.max(0, ((Number) i.get("duration")).longValue() * 60 - elapsed));
    if (curriculum.structured(i)) {
      var plan = curriculum.plan(i);
      var questions = db.list("SELECT phase,plan_index,turn_kind FROM interview_questions WHERE interview_id=? ORDER BY position DESC LIMIT 1", id);
      var current = questions.isEmpty() ? Map.<String,Object>of("phase", "Introduction", "plan_index", 0, "turn_kind", "MAIN") : questions.getFirst();
      out.put("progression", Map.of("phase", current.get("phase"), "turnKind", current.get("turn_kind"), "mainQuestion", ((Number)current.get("plan_index")).intValue() + 1, "mainQuestionCount", plan.size(), "stages", List.of("Introduction", "Easy", "Medium", "Hard", "Closing")));
      out.put("canFinishAfterAnswer", "Closing".equals(current.get("phase")));
    }
    return out;
  }

  @Transactional
  public Object start(String id, String uid, String mode, String interviewer) {
    if (!Set.of("female", "male").contains(interviewer)) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Choose Maya or Aarav before starting."
    );
    if (!Set.of("AI", "PRACTICE").contains(mode)) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Choose AI or practice mode."
    );
    var i = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    if (i.get("status").equals("ACTIVE")) return view(id, uid);
    if (!i.get("status").equals("SCHEDULED")) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "This interview cannot be started."
    );
    if (mode.equals("AI") && !ai.available()) throw new ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "AI interviews are not connected yet. Choose guided practice to begin without AI."
    );
    String question = curriculum.structured(i) ? curriculum.plan(i).getFirst().question() : mode.equals("PRACTICE")
      ? practice.questions(i).getFirst()
      : ai.next(uid, context(id, uid)).path("question").asText();
    if (curriculum.structured(i)) insertPlannedQuestion(id, 0, 0, curriculum.plan(i).getFirst(), "MAIN", question);
    else db.exec(
      "INSERT INTO interview_questions(id,interview_id,position,content) VALUES(?,?,0,?)",
      db.id(),
      id,
      question
    );
    db.exec(
      "UPDATE interviews SET status='ACTIVE',started_at=?,mode=?,interviewer_gender=? WHERE id=?",
      Timestamp.from(Instant.now()),
      mode,
      interviewer,
      id
    );
    return view(id, uid);
  }

  @Transactional
  public Object answer(String id, String uid, String qid, String text, String inputMode, Integer responseSeconds, Integer speechSeconds, Integer spokenWords) {
    var i = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    if (!i.get("status").equals("ACTIVE")) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "This interview is not active."
    );
    var q = db.one(
      "SELECT id,position FROM interview_questions WHERE interview_id=? ORDER BY position DESC LIMIT 1",
      id
    );
    if (!q.get("id").equals(qid)) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Please answer the current question."
    );
    if (
      db.exists("SELECT 1 FROM interview_answers WHERE question_id=?", qid)
    ) throw new ResponseStatusException(HttpStatus.CONFLICT, "Answer already submitted.");
    db.exec(
      "INSERT INTO interview_answers(id,question_id,content,input_mode,response_seconds,speech_seconds,spoken_words) VALUES(?,?,?,?,?,?,?)",
      db.id(),
      qid,
      text,
      inputMode == null ? "TEXT" : inputMode,
      responseSeconds,
      speechSeconds,
      spokenWords
    );
    return view(id, uid);
  }

  @Transactional
  public Object next(String id, String uid) {
    var i = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    if (!i.get("status").equals("ACTIVE")) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "This interview is not active."
    );
    var last = db.one(
      "SELECT id,position,phase,turn_kind,plan_index FROM interview_questions WHERE interview_id=? ORDER BY position DESC LIMIT 1",
      id
    );
    if (
      !db.exists("SELECT 1 FROM interview_answers WHERE question_id=?", last.get("id"))
    ) return view(id, uid);
    if (elapsed(i) >= ((Number) i.get("duration")).longValue() * 60) return view(id, uid);
    int position = ((Number) last.get("position")).intValue() + 1;
    if (curriculum.structured(i)) return nextPlanned(id, uid, i, last, position);
    boolean guided = "PRACTICE".equals(i.get("mode"));
    int limit = guided ? practice.questions(i).size() : 20;
    if (position >= limit) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "You have completed all questions. End the interview to review your session."
    );
    String question = guided
      ? practice.questions(i).get(position)
      : ai.next(uid, context(id, uid)).path("question").asText();
    db.exec(
      "INSERT INTO interview_questions(id,interview_id,position,content) VALUES(?,?,?,?)",
      db.id(),
      id,
      position,
      question
    );
    return view(id, uid);
  }

  private void insertPlannedQuestion(String id, int position, int index, InterviewCurriculum.Step step, String kind, String question) {
    db.exec("INSERT INTO interview_questions(id,interview_id,position,content,phase,turn_kind,plan_index) VALUES(?,?,?,?,?,?,?)", db.id(), id, position, question, step.phase(), kind, index);
  }

  @Transactional
  public void saveLiveAnswer(String id, String uid, String qid, String text, Integer speechSeconds) {
    var session = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    if (!"ACTIVE".equals(session.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "This interview is not active.");
    var saved = db.list("SELECT a.content FROM interview_answers a JOIN interview_questions q ON q.id=a.question_id WHERE q.interview_id=? AND q.id=?", id, qid);
    if (!saved.isEmpty()) {
      if (!text.strip().equals(String.valueOf(saved.getFirst().get("content")))) throw new ResponseStatusException(HttpStatus.CONFLICT, "This answer was already saved. Reload the current question.");
      return; // Idempotent retry after a lost HTTP response.
    }
    answer(id, uid, qid, text.strip(), "VOICE", null, speechSeconds, text.strip().split("\\s+").length);
  }

  @Transactional
  public Object advanceLive(String id, String uid, String answeredQuestionId) {
    var session = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    if (!"ACTIVE".equals(session.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "This interview is not active.");
    var last = db.one("SELECT id,position,phase FROM interview_questions WHERE interview_id=? ORDER BY position DESC LIMIT 1", id);
    int limit = curriculum.structured(session) ? curriculum.limit(session) : 20;
    if (last.get("id").equals(answeredQuestionId) && !"Closing".equals(last.get("phase")) &&
        ((Number)last.get("position")).intValue() + 1 < limit && elapsed(session) < ((Number)session.get("duration")).longValue() * 60)
      next(id, uid);
    return view(id, uid);
  }

  private Object nextPlanned(String id, String uid, Map<String,Object> session, Map<String,Object> last, int position) {
    var plan = curriculum.plan(session);
    int index = ((Number)last.get("plan_index")).intValue();
    if (index + 1 >= plan.size() || position >= curriculum.limit(session)) throw new ResponseStatusException(HttpStatus.CONFLICT, "You have completed the interview. Finish to see your review.");
    int nextIndex = index + 1;
    var next = plan.get(nextIndex);
    String question = next.question(), turnKind = "MAIN";
    if (!"PRACTICE".equals(session.get("mode"))) {
      var input = context(id, uid);
      boolean mayFollow = "MAIN".equals(last.get("turn_kind")) && !"Introduction".equals(last.get("phase"));
      input.put("mayAskFollowup", mayFollow);
      input.put("nextPlannedQuestion", next.question());
      input.put("nextPlannedPhase", next.phase());
      var turn = ai.turn(uid, input);
      if (!turn.path("answerReview").isObject() || !turn.path("askFollowup").isBoolean()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Answer analysis could not be completed. Your answer is saved; please retry.");
      db.exec("UPDATE interview_answers SET feedback_json=? WHERE question_id=?", db.text(turn.path("answerReview")), last.get("id"));
      String followup = turn.path("question").asText("").strip();
      boolean repeated = db.list("SELECT content FROM interview_questions WHERE interview_id=?", id).stream().anyMatch(q -> followup.equalsIgnoreCase(String.valueOf(q.get("content")).strip()));
      if (mayFollow && turn.path("askFollowup").asBoolean() && !followup.isBlank() && !repeated) {
        nextIndex = index;
        next = plan.get(index);
        question = followup;
        turnKind = "FOLLOW_UP";
      }
    }
    insertPlannedQuestion(id, position, nextIndex, next, turnKind, question);
    return view(id, uid);
  }

  @Transactional
  public Object end(String id, String uid) {
    var i = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    if (i.get("status").equals("COMPLETED")) return view(id, uid);
    if (!i.get("status").equals("ACTIVE")) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Start this interview first."
    );
    int count = db.count(
      "SELECT COUNT(*) FROM interview_answers a JOIN interview_questions q ON q.id=a.question_id WHERE q.interview_id=?",
      id
    );
    if (count == 0) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Submit at least one answer before requesting an evaluation."
    );
    db.exec("UPDATE interviews SET status='COMPLETED',ended_at=? WHERE id=?", Timestamp.from(Instant.now()), id);
    return view(id, uid);
  }

  @Transactional
  public Object report(String id, String uid) {
    var i = db.one("SELECT * FROM interviews WHERE id=? AND user_id=? FOR UPDATE", id, uid);
    var saved = db.list("SELECT result_json FROM interview_reports WHERE interview_id=?", id);
    if (!saved.isEmpty()) return db.parse((String) saved.getFirst().get("result_json"));
    if (!i.get("status").equals("COMPLETED")) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Complete the interview first."
    );
    Object result = "PRACTICE".equals(i.get("mode"))
      ? practice.review(context(id, uid))
      : ai.evaluate(uid, context(id, uid));
    db.exec(
      "INSERT INTO interview_reports(id,interview_id,result_json) VALUES(?,?,?)",
      db.id(),
      id,
      db.text(result)
    );
    db.notify(uid, "INTERVIEW", "Your interview feedback is ready.", "/app/interviews/" + id);
    return result;
  }

  private long elapsed(Map<String, Object> session) {
    Object start = session.get("started_at"), end = session.get("ended_at");
    if (!(start instanceof Timestamp started)) return 0;
    // Historic completed sessions have no end timestamp; do not invent their duration.
    if ("COMPLETED".equals(session.get("status")) && end == null) return 0;
    Instant finish = end instanceof Timestamp ended ? ended.toInstant() : Instant.now();
    return Math.max(0, Duration.between(started.toInstant(), finish).getSeconds());
  }

  public Object view(String id, String uid) {
    var result = context(id, uid);
    result.remove("resume");
    result.put("aiAvailable", ai.available());
    result.put(
      "questionLimit",
      curriculum.structured(result) ? curriculum.limit(result) : "PRACTICE".equals(result.get("mode")) ? practice.questions(result).size() : 20
    );
    var reports = db.list("SELECT result_json FROM interview_reports WHERE interview_id=?", id);
    result.put(
      "report",
      reports.isEmpty() ? null : db.parse((String) reports.getFirst().get("result_json"))
    );
    return result;
  }
}
