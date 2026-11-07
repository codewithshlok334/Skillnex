package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import com.careerx.achievements.AchievementService;
import com.careerx.repository.Store;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest @ActiveProfiles("test")
class AchievementIntegrationTest {
  @Autowired Store db; @Autowired AchievementService achievements;
  String account(){String uid=db.id();db.exec("INSERT INTO app_users(id,email,name) VALUES(?,?,?)",uid,uid+"@example.test","Achievement learner");return uid;}
  Set<String> ids(List<Map<String,Object>> badges){var ids=new HashSet<String>();badges.forEach(b->ids.add((String)b.get("id")));return ids;}
  void submission(String uid,int question,String mode,String status,int passed,String time){
    db.exec("INSERT INTO code_submissions(id,user_id,question_id,language_id,request_key,mode,source_code,status,passed,total,created_at,finished_at) VALUES(?,?,?,'python',?,?,'test fixture',?,?,6,CAST(? AS TIMESTAMP),CAST(? AS TIMESTAMP))",db.id(),uid,question,db.id(),mode,status,passed,time,time);
  }
  @Test void thresholdsUseExactScoreAndMinimumMockSize(){
    String a=account();assertTrue(achievements.mock(a,1,1,1,true).isEmpty());assertTrue(achievements.mock(a,0,20,0,true).isEmpty());
    assertEquals(Set.of("learning-first"),ids(achievements.mock(a,13,20,20,false)));
    assertEquals(Set.of("learning-sharp"),ids(achievements.mock(a,14,20,20,false)));
    assertTrue(achievements.mock(a,16,20,20,false).isEmpty());
    assertEquals(Set.of("learning-high"),ids(achievements.mock(a,17,20,20,false)));
    assertEquals(Set.of("learning-perfect"),ids(achievements.mock(a,20,20,20,false)));
    assertEquals(Set.of("learning-hard"),ids(achievements.mock(a,17,20,20,true)));
    assertEquals(5,db.count("SELECT COUNT(*) FROM user_badges WHERE user_id=?",a));
  }
  @Test void grantsArePrivatePermanentAndDoNotDuplicateNotifications(){
    String a=account(),b=account();achievements.mock(a,20,20,20,true);
    assertTrue(achievements.mock(a,20,20,20,true).isEmpty());assertTrue(achievements.mock(a,0,20,20,false).isEmpty());
    assertEquals(5,db.count("SELECT COUNT(*) FROM user_badges WHERE user_id=?",a));
    assertEquals(0,db.count("SELECT COUNT(*) FROM user_badges WHERE user_id=?",b));
    assertEquals(5,db.count("SELECT COUNT(*) FROM notifications WHERE user_id=? AND kind='BADGE'",a));
  }
  @Test void onlyFullyAcceptedSubmitsQualifyAndRepeatProblemsCountOnce(){
    String a=account();submission(a,1,"RUN","ACCEPTED",6,"2026-01-01 10:00:00");submission(a,2,"SUBMIT","WRONG_ANSWER",5,"2026-01-01 10:01:00");
    submission(a,3,"SUBMIT","ACCEPTED",5,"2026-01-01 10:02:00");assertTrue(achievements.coding(a).isEmpty());
    submission(a,1,"SUBMIT","ACCEPTED",6,"2026-01-01 10:03:00");assertEquals(Set.of("learning-first"),ids(achievements.coding(a)));
    for(int i=4;i<15;i++)submission(a,1,"SUBMIT","ACCEPTED",6,"2026-01-01 10:"+String.format("%02d",i)+":00");
    assertTrue(achievements.coding(a).isEmpty());assertEquals(1,db.count("SELECT COUNT(*) FROM user_badges WHERE user_id=?",a));
  }
  @Test void hardMediumAndFirstSubmissionMilestonesAreMeasuredFromJudgedHistory(){
    String a=account();var questions=db.list("SELECT id FROM code_questions WHERE difficulty IN ('Medium','Hard') ORDER BY CASE WHEN difficulty='Hard' THEN 0 ELSE 1 END,id LIMIT 10");
    for(int i=0;i<10;i++)submission(a,((Number)questions.get(i).get("id")).intValue(),"SUBMIT","ACCEPTED",6,"2026-01-02 10:"+String.format("%02d",i)+":00");
    assertEquals(Set.of("learning-first","learning-sharp","learning-high","learning-perfect","learning-hard"),ids(achievements.coding(a)));
    assertTrue(achievements.coding(a).isEmpty());
    String b=account();for(int i=1;i<=5;i++){
      submission(b,i,"SUBMIT","WRONG_ANSWER",0,"2026-01-01 10:00:00");submission(b,i,"SUBMIT","ACCEPTED",6,"2026-01-02 10:00:00");
    }
    assertFalse(ids(achievements.coding(b)).contains("learning-perfect"));
  }
  @Test void infrastructureErrorsDoNotPenalizeFirstJudgedSubmissionAndModulesShareCollection(){
    String a=account();for(int i=1;i<=5;i++){
      submission(a,i,"SUBMIT","RUNNER_ERROR",0,"2026-01-01 10:00:00");submission(a,i,"RUN","WRONG_ANSWER",0,"2026-01-01 11:00:00");submission(a,i,"SUBMIT","ACCEPTED",6,"2026-01-02 10:00:00");
    }
    assertTrue(ids(achievements.coding(a)).contains("learning-perfect"));
    var mockAwards=ids(achievements.mock(a,20,20,20,true));assertFalse(mockAwards.contains("learning-first"));assertFalse(mockAwards.contains("learning-perfect"));
    assertEquals(5,db.count("SELECT COUNT(*) FROM user_badges WHERE user_id=?",a));
  }
}
