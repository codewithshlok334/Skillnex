package com.careerx.achievements;

import com.careerx.repository.Store;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AchievementService {
  private final Store db;
  public AchievementService(Store db) { this.db=db; }
  private List<Map<String,Object>> grant(String uid,List<String> eligible) {
    var earned=new ArrayList<Map<String,Object>>();
    for(String id:eligible) {
      if(db.exists("SELECT 1 FROM user_badges WHERE user_id=? AND badge_id=?",uid,id)) continue;
      var badge=db.one("SELECT id,name,description FROM badges WHERE id=?",id);
      db.exec("INSERT INTO user_badges(user_id,badge_id) VALUES(?,?)",uid,id);
      db.notify(uid,"BADGE","Achievement unlocked: "+badge.get("name"),"/app/profile#achievements");
      earned.add(badge);
    }
    return earned;
  }
  @Transactional public List<Map<String,Object>> mock(String uid,int score,int total,int answered,boolean allHard) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var eligible=new ArrayList<String>();
    if(answered>=10) eligible.add("learning-first");
    if(total>=20) {
      if(score*100>=total*70) eligible.add("learning-sharp");
      if(score*100>=total*85) eligible.add("learning-high");
      if(score==total) eligible.add("learning-perfect");
      if(allHard&&score*100>=total*85) eligible.add("learning-hard");
    }
    return grant(uid,eligible);
  }
  @Transactional public List<Map<String,Object>> coding(String uid) {
    db.one("SELECT id FROM app_users WHERE id=? FOR UPDATE",uid);
    var solved=db.list("SELECT DISTINCT q.id,q.difficulty FROM code_submissions s JOIN code_questions q ON q.id=s.question_id WHERE s.user_id=? AND s.mode='SUBMIT' AND s.status='ACCEPTED' AND s.passed=s.total AND s.total>0",uid);
    var eligible=new ArrayList<String>();
    if(!solved.isEmpty()) eligible.add("learning-first");
    if(solved.stream().filter(q->!q.get("difficulty").equals("Easy")).count()>=5) eligible.add("learning-sharp");
    if(solved.size()>=10) eligible.add("learning-high");
    // Runs and infrastructure errors are not judged attempts. Ties use the id for deterministic ordering.
    int firstPass=db.count("SELECT COUNT(DISTINCT s.question_id) FROM code_submissions s WHERE s.user_id=? AND s.mode='SUBMIT' AND s.status='ACCEPTED' AND s.passed=s.total AND s.total>0 AND NOT EXISTS (SELECT 1 FROM code_submissions earlier WHERE earlier.user_id=s.user_id AND earlier.question_id=s.question_id AND earlier.mode='SUBMIT' AND earlier.status NOT IN ('RUNNER_ERROR','QUEUED','RUNNING') AND (earlier.created_at<s.created_at OR (earlier.created_at=s.created_at AND earlier.id<s.id)))",uid);
    if(firstPass>=5) eligible.add("learning-perfect");
    if(solved.stream().anyMatch(q->q.get("difficulty").equals("Hard"))) eligible.add("learning-hard");
    return grant(uid,eligible);
  }
}
