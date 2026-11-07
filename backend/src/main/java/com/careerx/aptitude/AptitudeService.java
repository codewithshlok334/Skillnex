package com.careerx.aptitude;

import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AptitudeService {
  private final Store db;
  private final org.springframework.jdbc.core.JdbcTemplate jdbc;
  private final com.careerx.achievements.AchievementService achievements;
  private static final int PAGE_SIZE = 20;
  public AptitudeService(Store db,org.springframework.jdbc.core.JdbcTemplate jdbc,com.careerx.achievements.AchievementService achievements) { this.db = db; this.jdbc=jdbc; this.achievements=achievements; }
  private int number(Object value) { return ((Number)value).intValue(); }
  private long millis(Object value) { return ((Number)value).longValue(); }
  private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
  private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT,message); }
  private Map<String,Object> row(int id) { return db.one("SELECT * FROM aptitude_questions WHERE id=?",id); }
  private boolean solved(String uid,int id) { return db.exists("SELECT 1 FROM aptitude_attempts WHERE user_id=? AND question_id=? AND correct=TRUE",uid,id); }
  private Map<String,Object> publicQuestion(Map<String,Object> q,boolean solved,boolean detail) {
    var result = new LinkedHashMap<String,Object>();
    for (String key : List.of("id","title","category","topic","difficulty")) result.put(key,q.get(key));
    result.put("source",db.parse((String)q.get("source_json"))); result.put("solved",solved);
    if (detail) {
      result.put("prompt",q.get("prompt")); result.put("passage",q.get("passage"));
      result.put("options",db.parse((String)q.get("options_json")));
    }
    return result;
  }
  public Object catalog(String uid,String search,String category,String topic,String difficulty,String progress,String source,int page) {
    StringBuilder where=new StringBuilder(" WHERE 1=1"); List<Object> args=new ArrayList<>();
    if (!search.isBlank()) { where.append(" AND (LOWER(q.title) LIKE ? ESCAPE '!' OR LOWER(q.topic) LIKE ? ESCAPE '!' OR LOWER(q.prompt) LIKE ? ESCAPE '!')");
      String term="%"+search.trim().toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%"; args.addAll(List.of(term,term,term)); }
    for (var filter:List.of(new String[]{"category",category},new String[]{"topic",topic},new String[]{"difficulty",difficulty},new String[]{"source_kind",source})) {
      if (!filter[1].isEmpty()) { where.append(" AND q.").append(filter[0]).append("=?"); args.add(filter[1]); }
    }
    if (!progress.isEmpty()) { where.append(progress.equals("todo")?" AND NOT EXISTS (":" AND EXISTS (");
      where.append("SELECT 1 FROM aptitude_attempts a WHERE a.user_id=? AND a.question_id=q.id AND a.correct=TRUE)"); args.add(uid); }
    int total=db.count("SELECT COUNT(*) FROM aptitude_questions q"+where,args.toArray());
    Set<Integer> solvedIds=new HashSet<>();
    db.list("SELECT DISTINCT question_id FROM aptitude_attempts WHERE user_id=? AND correct=TRUE",uid).forEach(a->solvedIds.add(number(a.get("question_id"))));
    List<Object> pageArgs=new ArrayList<>(args); pageArgs.add(PAGE_SIZE);pageArgs.add(page*PAGE_SIZE);
    var questions=db.list("SELECT q.* FROM aptitude_questions q"+where+" ORDER BY q.id LIMIT ? OFFSET ?",pageArgs.toArray()).stream()
      .map(q->publicQuestion(q,solvedIds.contains(number(q.get("id"))),false)).toList();
    return Map.of("questions",questions,"total",total,"page",page,"pageSize",PAGE_SIZE,"bankTotal",db.count("SELECT COUNT(*) FROM aptitude_questions"),
      "solved",solvedIds.size(),"topics",db.list("SELECT DISTINCT category,topic FROM aptitude_questions ORDER BY category,topic"),
      "categories",db.list("SELECT category,COUNT(*) AS total FROM aptitude_questions GROUP BY category ORDER BY category"));
  }
  public Object question(String uid,int id) { return publicQuestion(row(id),solved(uid,id),true); }
  private Map<String,Object> feedback(Map<String,Object> q,Integer chosen) {
    Map<String,Object> result=new LinkedHashMap<>(); result.put("questionId",q.get("id")); result.put("selectedIndex",chosen);
    result.put("correct",chosen!=null&&chosen==number(q.get("correct_index")));result.put("correctIndex",q.get("correct_index"));
    result.put("explanation",q.get("explanation"));result.put("source",db.parse((String)q.get("source_json")));return result;
  }
  @Transactional public Object answer(String uid,int id,int selected,String requestKey) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var q=row(id); if(selected<0||selected>3) throw bad("Choose one of the four options.");
    var prior=db.list("SELECT question_id,selected_index FROM aptitude_attempts WHERE user_id=? AND request_key=?",uid,requestKey);
    if (!prior.isEmpty()) {
      if(number(prior.getFirst().get("question_id"))!=id || number(prior.getFirst().get("selected_index"))!=selected) throw conflict("This answer request has already been used.");
    } else {
      for(var active:db.list("SELECT question_ids FROM aptitude_mocks WHERE user_id=? AND status='ACTIVE' AND expires_ms>?",uid,System.currentTimeMillis())) {
        for(JsonNode questionId:db.parse((String)active.get("question_ids"))) if(questionId.asInt()==id) throw conflict("Finish your active mock before checking this answer in practice.");
      }
      db.exec("INSERT INTO aptitude_attempts(id,user_id,question_id,request_key,selected_index,correct,created_ms) VALUES(?,?,?,?,?,?,?)",
        db.id(),uid,id,requestKey,selected,selected==number(q.get("correct_index")),System.currentTimeMillis());
    }
    var result=feedback(q,selected);result.put("solved",solved(uid,id));return result;
  }
  private Map<String,Object> lock(String uid,String id) { return db.one("SELECT * FROM aptitude_mocks WHERE id=? AND user_id=? FOR UPDATE",id,uid); }
  private List<Integer> ids(Map<String,Object> session) { List<Integer> result=new ArrayList<>(); db.parse((String)session.get("question_ids")).forEach(q->result.add(q.asInt())); return result; }
  private Map<String,Integer> answers(Map<String,Object> session) {
    Map<String,Integer> result=new LinkedHashMap<>(); db.parse((String)session.get("answers_json")).fields().forEachRemaining(e->result.put(e.getKey(),e.getValue().asInt())); return result;
  }
  private Set<Integer> marked(Map<String,Object> session) { Set<Integer> result=new LinkedHashSet<>(); db.parse((String)session.get("review_json")).forEach(q->result.add(q.asInt())); return result; }
  private Map<Integer,Map<String,Object>> sessionQuestions(Map<String,Object> session) {
    List<Integer> selected=ids(session);String placeholders=String.join(",",Collections.nCopies(selected.size(),"?"));
    Map<Integer,Map<String,Object>> result=new HashMap<>();
    for(var q:db.list("SELECT * FROM aptitude_questions WHERE id IN ("+placeholders+")",selected.toArray()))result.put(number(q.get("id")),q);
    return result;
  }
  private Map<String,Object> finish(Map<String,Object> session) {
    if (session.get("status").equals("COMPLETED")) return session;
    String uid=(String)session.get("user_id"), id=(String)session.get("id");Map<String,Integer> choices=answers(session);
    long finished=Math.min(System.currentTimeMillis(),millis(session.get("expires_ms")));int score=0;
    var questions=sessionQuestions(session);List<Object[]> attempts=new ArrayList<>();
    for (int qid:ids(session)) {
      Integer chosen=choices.get(String.valueOf(qid)); boolean correct=chosen!=null && chosen==number(questions.get(qid).get("correct_index"));
      if(correct)score++;
      attempts.add(new Object[]{db.id(),uid,qid,id,db.id(),chosen,correct,finished});
    }
    jdbc.batchUpdate("INSERT INTO aptitude_attempts(id,user_id,question_id,mock_id,request_key,selected_index,correct,created_ms) VALUES(?,?,?,?,?,?,?,?)",attempts);
    var awards=achievements.mock(uid,score,questions.size(),choices.size(),questions.values().stream().allMatch(q->q.get("difficulty").equals("Hard")));
    db.exec("UPDATE aptitude_mocks SET status='COMPLETED',score=?,finished_ms=?,awards_json=? WHERE id=?",score,finished,db.text(awards),id);
    return lock(uid,id);
  }
  private Map<String,Object> view(Map<String,Object> session) {
    if (session.get("status").equals("ACTIVE") && millis(session.get("expires_ms"))<=System.currentTimeMillis()) session=finish(session);
    boolean complete=session.get("status").equals("COMPLETED");var choices=answers(session);
    var questions=new ArrayList<Map<String,Object>>();var bank=sessionQuestions(session);
    for(int id:ids(session)) {
      var q=bank.get(id);var item=publicQuestion(q,false,true);
      // Exam sources can contain the answer key. Reveal them with the review, not during the test.
      if(!complete)item.remove("source");
      else item.put("review",feedback(q,choices.get(String.valueOf(id))));
      questions.add(item);
    }
    var result=new LinkedHashMap<String,Object>();
    for(String key:List.of("id","status","category","difficulty","revision","total","score"))result.put(key,session.get(key));
    result.put("createdAt",session.get("created_ms"));result.put("expiresAt",session.get("expires_ms"));result.put("finishedAt",session.get("finished_ms"));
    result.put("serverNow",System.currentTimeMillis());result.put("answers",choices);result.put("marked",marked(session));result.put("questions",questions);
    result.put("marking","One mark for a correct answer. No negative marking. Unanswered questions earn zero.");
    result.put("awards",complete?db.parse((String)session.get("awards_json")):List.of());
    return result;
  }
  @Transactional public Object start(String uid,AptitudeController.Start input) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var repeat=db.list("SELECT * FROM aptitude_mocks WHERE user_id=? AND request_key=?",uid,input.requestKey());
    if(!repeat.isEmpty()) return view(lock(uid,(String)repeat.getFirst().get("id")));
    for(var active:db.list("SELECT id FROM aptitude_mocks WHERE user_id=? AND status='ACTIVE'",uid)) {
      var session=lock(uid,(String)active.get("id"));
      if(millis(session.get("expires_ms"))>System.currentTimeMillis())throw conflict("You already have an active mock. Resume or submit it before starting another.");
      finish(session);
    }
    List<Map<String,Object>> pool=db.list("SELECT id,category FROM aptitude_questions WHERE (?='' OR category=?) AND (?='' OR difficulty=?) ORDER BY id",
      input.category(),input.category(),input.difficulty(),input.difficulty());
    if(pool.size()<input.count())throw bad("Not enough questions for this combination. Choose fewer questions or a wider difficulty range.");
    Collections.shuffle(pool);List<Integer> chosen=new ArrayList<>();
    // Round-robin across subjects avoids an accidentally one-subject mixed mock.
    Map<String,ArrayDeque<Integer>> groups=new LinkedHashMap<>();
    for(var q:pool)groups.computeIfAbsent((String)q.get("category"),ignored->new ArrayDeque<>()).add(number(q.get("id")));
    while(chosen.size()<input.count())for(var group:groups.values())if(!group.isEmpty()&&chosen.size()<input.count())chosen.add(group.removeFirst());
    Collections.shuffle(chosen);String id=db.id();long now=System.currentTimeMillis();
    db.exec("INSERT INTO aptitude_mocks(id,user_id,request_key,status,category,difficulty,question_ids,created_ms,expires_ms,total) VALUES(?,?,?,'ACTIVE',?,?,?,?,?,?)",
      id,uid,input.requestKey(),input.category(),input.difficulty(),db.text(chosen),now,now+input.minutes()*60000L,chosen.size());
    return view(lock(uid,id));
  }
  @Transactional public Object mock(String uid,String id) { db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid); return view(lock(uid,id)); }
  @Transactional public Object save(String uid,String id,AptitudeController.Save input) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var session=lock(uid,id);
    if(!session.get("status").equals("ACTIVE")||millis(session.get("expires_ms"))<=System.currentTimeMillis())return view(session);
    if(!ids(session).contains(input.questionId()))throw bad("This question is not part of your mock.");
    if(input.revision()!=number(session.get("revision")))throw conflict("This mock changed in another tab. Reload its latest saved answers.");
    var choices=answers(session);String key=String.valueOf(input.questionId());
    if(input.answerIndex()==null)choices.remove(key);else choices.put(key,input.answerIndex());
    var review=marked(session);if(input.marked())review.add(input.questionId());else review.remove(input.questionId());
    db.exec("UPDATE aptitude_mocks SET answers_json=?,review_json=?,revision=revision+1 WHERE id=?",db.text(choices),db.text(review),id);
    return view(lock(uid,id));
  }
  @Transactional public Object submit(String uid,String id) { db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid); return view(finish(lock(uid,id))); }
  @Transactional public Object progress(String uid) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    for(var expired:db.list("SELECT id FROM aptitude_mocks WHERE user_id=? AND status='ACTIVE' AND expires_ms<=?",uid,System.currentTimeMillis()))finish(lock(uid,(String)expired.get("id")));
    var summary=db.one("SELECT COUNT(*) AS attempted,COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END),0) AS correct FROM aptitude_attempts WHERE user_id=? AND selected_index IS NOT NULL",uid);
    int tried=number(summary.get("attempted")),correct=number(summary.get("correct"));
    var topics=db.list("SELECT q.category,q.topic,COUNT(a.id) AS attempted,COALESCE(SUM(CASE WHEN a.correct THEN 1 ELSE 0 END),0) AS correct FROM aptitude_questions q LEFT JOIN aptitude_attempts a ON a.question_id=q.id AND a.user_id=? AND a.selected_index IS NOT NULL GROUP BY q.category,q.topic ORDER BY q.category,q.topic",uid);
    List<Map<String,Object>> weaknesses=new ArrayList<>();
    for(var topic:topics) {
      int attempts=number(topic.get("attempted")),right=number(topic.get("correct"));
      topic.put("accuracy",attempts==0?null:Math.round(100.0*right/attempts));
      if(attempts>=3&&right*100.0/attempts<70)weaknesses.add(topic);
    }
    weaknesses.sort(Comparator.comparingLong(t->((Number)t.get("accuracy")).longValue()));
    LocalDate today=LocalDate.now(ZoneOffset.UTC);long first=today.minusDays(29).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
    Map<String,int[]> days=new TreeMap<>();
    for(int i=29;i>=0;i--)days.put(today.minusDays(i).toString(),new int[2]);
    for(var attempt:db.list("SELECT created_ms,correct FROM aptitude_attempts WHERE user_id=? AND created_ms>=? AND selected_index IS NOT NULL",uid,first)) {
      String date=Instant.ofEpochMilli(millis(attempt.get("created_ms"))).atZone(ZoneOffset.UTC).toLocalDate().toString();
      int[] counts=days.get(date);if(counts!=null){counts[0]++;if(Boolean.TRUE.equals(attempt.get("correct")))counts[1]++;}
    }
    var daily=days.entrySet().stream().map(day->Map.of("date",(Object)day.getKey(),"attempted",day.getValue()[0],"correct",day.getValue()[1])).toList();
    var result=new LinkedHashMap<String,Object>();result.put("attempted",tried);result.put("correct",correct);result.put("accuracy",tried==0?0:Math.round(correct*100.0/tried));
    result.put("solved",db.count("SELECT COUNT(DISTINCT question_id) FROM aptitude_attempts WHERE user_id=? AND correct=TRUE",uid));
    result.put("topics",topics);result.put("weakTopics",weaknesses);result.put("daily",daily);
    result.put("mocks",db.list("SELECT id,status,category,difficulty,score,total,created_ms,expires_ms,finished_ms FROM aptitude_mocks WHERE user_id=? ORDER BY created_ms DESC LIMIT 20",uid));
    return result;
  }
}
