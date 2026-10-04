package com.careerx.codelab;

import com.careerx.repository.Store;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CodeLabService {
  private final Store db;
  private final CodeRunner runner;
  private final TransactionTemplate independentTransaction;
  private final ThreadPoolExecutor pool=new ThreadPoolExecutor(2,2,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(16),
    runnable -> { Thread t=new Thread(runnable,"codelab-judge"); t.setDaemon(true); return t; },new ThreadPoolExecutor.AbortPolicy());
  public CodeLabService(Store db,CodeRunner runner,PlatformTransactionManager transactions) {
    this.db=db; this.runner=runner;
    this.independentTransaction=new TransactionTemplate(transactions);
    this.independentTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }
  @PreDestroy void close() { pool.shutdownNow(); }
  public static void language(String language) {
    if(!Set.of("java","cpp","python").contains(language)) throw bad("Choose Java, C++ or Python.");
  }
  public Map<String,Object> catalog(String uid,String search,String topic,String difficulty,String state,int page) {
    String where=" WHERE 1=1"; List<Object> args=new ArrayList<>();
    String term=search.strip().toLowerCase(Locale.ROOT).replaceAll("\\s+"," ");
    term=Map.of("dp","dynamic programming","binarysearch","binary search","linkedlist","linked lists","linkedlists","linked lists","two-pointer","two pointers").getOrDefault(term,term);
    if(!term.isBlank()) {
      String pattern="%"+term.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
      where+=" AND (LOWER(q.title) LIKE ? ESCAPE '!' OR LOWER(q.topic) LIKE ? ESCAPE '!')";
      args.add(pattern); args.add(pattern);
    }
    if(!topic.isBlank()) { where+=" AND q.topic=?"; args.add(topic); }
    if(!difficulty.isBlank()) { where+=" AND q.difficulty=?"; args.add(difficulty); }
    String solved="EXISTS (SELECT 1 FROM code_submissions s WHERE s.question_id=q.id AND s.user_id=? AND s.mode='SUBMIT' AND s.status='ACCEPTED')";
    if(state.equals("solved") || state.equals("todo")) { where+=" AND "+(state.equals("todo")?"NOT ":"")+solved; args.add(uid); }
    int total=db.count("SELECT COUNT(*) FROM code_questions q"+where,args.toArray());
    List<Object> listArgs=new ArrayList<>(); listArgs.add(uid); listArgs.addAll(args); listArgs.add(12); listArgs.add(page*12);
    var rows=db.list("SELECT q.id,q.slug,q.title,q.topic,q.difficulty,"+solved+" AS solved FROM code_questions q"+where+" ORDER BY q.id LIMIT ? OFFSET ?",listArgs.toArray());
    return Map.of("questions",rows,"total",total,"page",page,"pageSize",12,
      "topics",db.list("SELECT DISTINCT topic FROM code_questions ORDER BY topic").stream().map(x -> x.get("topic")).toList(),
      "progress",progress(uid));
  }
  public Object progress(String uid) {
    return db.one("SELECT COUNT(*) AS total, SUM(CASE WHEN EXISTS (SELECT 1 FROM code_submissions s WHERE s.question_id=q.id AND s.user_id=? AND s.mode='SUBMIT' AND s.status='ACCEPTED') THEN 1 ELSE 0 END) AS solved FROM code_questions q",uid);
  }
  public Map<String,Object> detail(String uid,int id,String language) {
    language(language);
    var q=db.one("SELECT id,slug,title,topic,difficulty,statement_json FROM code_questions WHERE id=?",id);
    var statement=db.parse((String)q.remove("statement_json")).deepCopy();
    // Editorial and hints are fetched explicitly, not leaked with the description.
    ((com.fasterxml.jackson.databind.node.ObjectNode)statement).remove(List.of("approach","complexity","hints"));
    q.put("statement",statement);
    q.put("examples",db.list("SELECT input_text AS input, expected_text AS output FROM code_test_cases WHERE question_id=? AND sample=true ORDER BY position",id));
    q.put("starter",db.one("SELECT starter FROM code_solutions WHERE question_id=? AND language_id=?",id,language).get("starter"));
    var drafts=db.list("SELECT source_code AS code,revision,updated_at FROM code_drafts WHERE user_id=? AND question_id=? AND language_id=?",uid,id,language);
    q.put("draft",drafts.isEmpty()?null:drafts.getFirst()); q.put("language",language);
    q.put("solved",db.exists("SELECT 1 FROM code_submissions WHERE user_id=? AND question_id=? AND mode='SUBMIT' AND status='ACCEPTED'",uid,id));
    return q;
  }
  public Object hints(int id) { return db.parse((String)db.one("SELECT statement_json FROM code_questions WHERE id=?",id).get("statement_json")).path("hints"); }
  public Object solution(int id,String language) {
    language(language);
    var statement=db.parse((String)db.one("SELECT statement_json FROM code_questions WHERE id=?",id).get("statement_json"));
    return Map.of("code",db.one("SELECT solution FROM code_solutions WHERE question_id=? AND language_id=?",id,language).get("solution"),
      "approach",statement.path("approach"),"complexity",statement.path("complexity"),"language",language);
  }
  @Transactional
  public Object saveDraft(String uid,int id,String language,String code,int revision) {
    language(language); db.one("SELECT id FROM code_questions WHERE id=?",id);
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var previous=db.list("SELECT revision FROM code_drafts WHERE user_id=? AND question_id=? AND language_id=?",uid,id,language);
    int current=previous.isEmpty()?0:((Number)previous.getFirst().get("revision")).intValue();
    if(current!=revision) throw new ResponseStatusException(HttpStatus.CONFLICT,"A newer draft was saved in another tab. Copy your code before reloading.");
    if(current==0) db.exec("INSERT INTO code_drafts(user_id,question_id,language_id,source_code) VALUES(?,?,?,?)",uid,id,language,code);
    else db.exec("UPDATE code_drafts SET source_code=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND question_id=? AND language_id=?",code,uid,id,language);
    return Map.of("revision",current+1);
  }
  @Transactional
  public String submit(String uid,int id,String language,String source,String mode,String key) {
    language(language);
    if(!Set.of("RUN","SUBMIT").contains(mode)) throw bad("Choose Run or Submit.");
    if(!runner.configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
      "The code runner is not connected yet. You can solve questions and save code; Run and Submit need a sandbox connection.");
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var duplicate=db.list("SELECT id,question_id,language_id,source_code,mode FROM code_submissions WHERE user_id=? AND request_key=?",uid,key);
    if(!duplicate.isEmpty()) {
      var prior=duplicate.getFirst();
      if(((Number)prior.get("question_id")).intValue()!=id || !prior.get("language_id").equals(language) || !prior.get("source_code").equals(source) || !prior.get("mode").equals(mode)) throw bad("Use a new request identifier for changed code.");
      return (String)prior.get("id");
    }
    if(db.exists("SELECT 1 FROM code_submissions WHERE user_id=? AND status IN ('QUEUED','RUNNING')",uid))
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Your previous run is still being checked. Please wait for its result.");
    String checker=(String)db.one("SELECT checker FROM code_questions WHERE id=?",id).get("checker");
    var tests=db.list("SELECT sample,input_text,expected_text FROM code_test_cases WHERE question_id=?"+(mode.equals("RUN")?" AND sample=true":"")+" ORDER BY position",id);
    if(tests.isEmpty()) throw new IllegalStateException("Question has no tests");
    String submission=db.id();
    db.exec("INSERT INTO code_submissions(id,user_id,question_id,language_id,request_key,mode,source_code,status,total) VALUES(?,?,?,?,?,?,?,'QUEUED',?)",
      submission,uid,id,language,key,mode,source,tests.size());
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override public void afterCommit() {
        try { pool.execute(() -> judge(submission,language,source,checker,tests)); }
        catch(RejectedExecutionException ex) {
          independentTransaction.executeWithoutResult(ignored -> fail(submission,"The code runner is busy. Please try again shortly."));
        }
      }
    });
    return submission;
  }
  private void judge(String id,String language,String source,String checker,List<Map<String,Object>> tests) {
    try {
      db.exec("UPDATE code_submissions SET status='RUNNING' WHERE id=?",id);
      var runs=runner.execute(language,source,tests.stream().map(t -> (String)t.get("input_text")).toList());
      if(runs.size()!=tests.size()) throw new IllegalStateException("Incomplete results");
      int passed=0; String overall="ACCEPTED"; var cases=new ArrayList<Map<String,Object>>();
      for(int i=0;i<tests.size();i++) {
        var test=tests.get(i); var run=runs.get(i); boolean sample=Boolean.TRUE.equals(test.get("sample"));
        String status=switch(run.status()) {
          case 3 -> OutputChecker.accepts(checker,(String)test.get("input_text"),(String)test.get("expected_text"),run.stdout())?"ACCEPTED":"WRONG_ANSWER";
          case 4 -> "WRONG_ANSWER"; case 5 -> "TIME_LIMIT"; case 6 -> "COMPILATION_ERROR";
          case 7,8,9,10,11,12 -> "RUNTIME_ERROR"; default -> "RUNNER_ERROR";
        };
        if(status.equals("ACCEPTED")) passed++; else if(overall.equals("ACCEPTED") || status.equals("RUNNER_ERROR")) overall=status;
        var entry=new LinkedHashMap<String,Object>();
        entry.put("number",i+1); entry.put("sample",sample); entry.put("status",status);
        entry.put("seconds",run.seconds()); entry.put("memoryKb",run.memoryKb());
        if(sample) { entry.put("input",test.get("input_text")); entry.put("expected",test.get("expected_text")); entry.put("output",clip(run.stdout())); entry.put("error",clip(status.equals("COMPILATION_ERROR")?run.compileOutput():run.stderr())); }
        // Hidden outputs, stderr and stdin are intentionally omitted, including runtime errors.
        cases.add(entry);
      }
      String message=overall.equals("ACCEPTED")?"All selected test cases passed.":overall.equals("RUNNER_ERROR")?"The sandbox could not complete judging. Please try again.":"Check the result below, update your code and try again.";
      db.exec("UPDATE code_submissions SET status=?,passed=?,result_json=?,finished_at=CURRENT_TIMESTAMP WHERE id=?",overall,passed,db.text(Map.of("message",message,"cases",cases)),id);
    } catch(Exception ex) { if(ex instanceof InterruptedException) Thread.currentThread().interrupt(); fail(id,"The sandbox could not complete this run. Please try again; your code is still available."); }
  }
  private static String clip(String value) { return value.length()>8000?value.substring(0,8000)+"\n[output truncated]":value; }
  private void fail(String id,String message) { db.exec("UPDATE code_submissions SET status='RUNNER_ERROR',result_json=?,finished_at=CURRENT_TIMESTAMP WHERE id=?",db.text(Map.of("message",message,"cases",List.of())),id); }
  public Object submission(String uid,String id) {
    var row=db.one("SELECT id,question_id,language_id,mode,source_code AS code,status,passed,total,result_json,created_at FROM code_submissions WHERE id=? AND user_id=?",id,uid);
    Object result=row.remove("result_json"); row.put("result",result==null?null:db.parse((String)result)); return row;
  }
  public Object history(String uid,int question) {
    return db.list("SELECT id,language_id,mode,status,passed,total,created_at FROM code_submissions WHERE user_id=? AND question_id=? ORDER BY created_at DESC LIMIT 30",uid,question);
  }
  public Object runnerStatus() { return Map.of("configured",runner.configured(),"destination",runner.destination(),"languages",List.of("java","cpp","python")); }
  private static ResponseStatusException bad(String text) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,text); }
}
