package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.careerx.repository.Store;
import com.careerx.security.Tokens;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class AptitudeIntegrationTest {
  @Autowired MockMvc mvc; @Autowired Store db; @Autowired Tokens tokens; @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
  record Account(String id,Cookie cookie) {}
  Account account() {
    String id=db.id();db.exec("INSERT INTO app_users(id,email,name) VALUES(?,?,?)",id,id+"@example.test","Aptitude learner");
    return new Account(id,new Cookie("careerx_session",tokens.create(id,0)));
  }
  ResultActions getAs(Account a,String path)throws Exception { return mvc.perform(get(java.net.URI.create("/api/aptitude"+path)).cookie(a.cookie())); }
  ResultActions postAs(Account a,String path,Object body)throws Exception { return mvc.perform(post("/api/aptitude"+path).cookie(a.cookie()).header("Origin","http://localhost:5173").contentType("application/json").content(db.text(body))); }
  ResultActions putAs(Account a,String path,Object body)throws Exception { return mvc.perform(put("/api/aptitude"+path).cookie(a.cookie()).header("Origin","http://localhost:5173").contentType("application/json").content(db.text(body))); }
  JsonNode body(ResultActions result)throws Exception { return json.readTree(result.andReturn().getResponse().getContentAsString()); }
  int answer(int id) { return db.count("SELECT correct_index FROM aptitude_questions WHERE id=?",id); }
  Map<String,Object> config(int count) { return Map.of("category","","difficulty","","count",count,"minutes",1,"requestKey",db.id()); }
  JsonNode mock(Account a,int count)throws Exception { return body(postAs(a,"/mocks",config(count)).andExpect(status().isOk())); }
  JsonNode save(Account a,JsonNode session,int id,Integer chosen,boolean marked)throws Exception {
    var input=new LinkedHashMap<String,Object>();input.put("questionId",id);input.put("answerIndex",chosen);input.put("marked",marked);input.put("revision",session.path("revision").asInt());
    return body(putAs(a,"/mocks/"+session.path("id").asText()+"/answers",input).andExpect(status().isOk()));
  }
  @Test void completeBankHasAllSubjectsAndNoAnswerLeakage()throws Exception {
    Account a=account(); JsonNode catalog=body(getAs(a,"/questions").andExpect(status().isOk()));
    assertEquals(500,catalog.path("total").asInt());assertEquals(20,catalog.path("questions").size());assertEquals(3,catalog.path("categories").size());
    assertEquals(500,db.count("SELECT COUNT(*) FROM aptitude_questions"));assertEquals(20,db.count("SELECT COUNT(*) FROM aptitude_questions WHERE source_kind='GATE_PYQ'"));
    assertTrue(db.count("SELECT COUNT(*) FROM aptitude_questions WHERE difficulty='Hard'")>=200);
    for(JsonNode item:catalog.path("questions")){assertFalse(item.has("correctIndex"));assertFalse(item.has("correct_index"));assertFalse(item.has("explanation"));}
    for(var row:db.list("SELECT id,options_json,correct_index,source_json FROM aptitude_questions")) {
      JsonNode options=db.parse((String)row.get("options_json"));Set<String> distinct=new HashSet<>();options.forEach(o->distinct.add(o.asText()));assertEquals(4,distinct.size());
      assertTrue(((Number)row.get("correct_index")).intValue()<4);
      JsonNode source=db.parse((String)row.get("source_json"));if(source.path("kind").asText().equals("GATE_PYQ"))assertTrue(source.path("answerKeyUrl").asText().startsWith("https://gate2026.iitg.ac.in/"));
    }
    JsonNode question=body(getAs(a,"/questions/1").andExpect(status().isOk()));assertEquals(4,question.path("options").size());assertFalse(question.has("explanation"));assertFalse(question.has("correctIndex"));
    getAs(a,"/questions/99999").andExpect(status().isNotFound());
    mvc.perform(get("/api/aptitude/questions")).andExpect(status().isUnauthorized());
  }
  @Test void searchFiltersPaginateAndValidate()throws Exception {
    Account a=account();
    JsonNode verbal=body(getAs(a,"/questions?category=Verbal").andExpect(status().isOk()));assertEquals(143,verbal.path("total").asInt());
    JsonNode hard=body(getAs(a,"/questions?category=Verbal&difficulty=Hard&search=argument").andExpect(status().isOk()));assertTrue(hard.path("total").asInt()>0);
    for(JsonNode q:hard.path("questions")){assertEquals("Verbal",q.path("category").asText());assertEquals("Hard",q.path("difficulty").asText());}
    assertEquals(20,body(getAs(a,"/questions?source=GATE_PYQ")).path("total").asInt());
    assertEquals(0,body(getAs(a,"/questions?search=%25%25%25")).path("total").asInt()); // literal percent is escaped
    getAs(a,"/questions?page=-1").andExpect(status().isBadRequest());getAs(a,"/questions?category=invalid").andExpect(status().isBadRequest());
    assertEquals(481,body(getAs(a,"/questions?page=24")).path("questions").get(0).path("id").asInt());
  }
  @Test void practiceIsScoredOnServerIdempotentAndPrivate()throws Exception {
    Account a=account(),other=account();String key=db.id();int correct=answer(1),wrong=(correct+1)%4;
    JsonNode miss=body(postAs(a,"/questions/1/answers",Map.of("answerIndex",wrong,"requestKey",key,"correct",true)).andExpect(status().isOk()));
    assertFalse(miss.path("correct").asBoolean());assertEquals(correct,miss.path("correctIndex").asInt());assertFalse(miss.path("explanation").asText().isBlank());assertFalse(miss.path("solved").asBoolean());
    postAs(a,"/questions/1/answers",Map.of("answerIndex",wrong,"requestKey",key)).andExpect(status().isOk());
    assertEquals(1,db.count("SELECT COUNT(*) FROM aptitude_attempts WHERE user_id=?",a.id()));
    postAs(a,"/questions/1/answers",Map.of("answerIndex",correct,"requestKey",key)).andExpect(status().isConflict());
    JsonNode right=body(postAs(a,"/questions/1/answers",Map.of("answerIndex",correct,"requestKey",db.id())).andExpect(status().isOk()));assertTrue(right.path("solved").asBoolean());
    assertEquals(1,body(getAs(a,"/questions?progress=solved")).path("total").asInt());assertEquals(499,body(getAs(a,"/questions?progress=todo")).path("total").asInt());
    assertFalse(body(getAs(other,"/questions/1")).path("solved").asBoolean());assertEquals(0,body(getAs(other,"/progress")).path("attempted").asInt());
    postAs(a,"/questions/1/answers",Map.of("answerIndex",4,"requestKey",db.id())).andExpect(status().isBadRequest());
  }
  @Test void mockIsBalancedPrivateResumableAndDoesNotRevealSolutions()throws Exception {
    Account a=account(),other=account();var input=config(12);JsonNode session=body(postAs(a,"/mocks",input).andExpect(status().isOk()));String id=session.path("id").asText();
    assertEquals(id,body(postAs(a,"/mocks",input)).path("id").asText());assertEquals(60000,session.path("expiresAt").asLong()-session.path("createdAt").asLong());
    Map<String,Integer> counts=new HashMap<>();for(JsonNode q:session.path("questions")){counts.merge(q.path("category").asText(),1,Integer::sum);assertFalse(q.has("review"));assertFalse(q.has("source"));assertFalse(q.has("correctIndex"));}
    assertEquals(Map.of("Quantitative",4,"Reasoning",4,"Verbal",4),counts);
    int qid=session.path("questions").get(0).path("id").asInt();
    JsonNode saved=save(a,session,qid,2,true);assertEquals(2,saved.path("answers").path(String.valueOf(qid)).asInt());assertEquals(1,saved.path("marked").size());
    JsonNode resumed=body(getAs(a,"/mocks/"+id));assertEquals(saved.path("answers"),resumed.path("answers"));assertEquals(session.path("expiresAt"),resumed.path("expiresAt"));
    getAs(other,"/mocks/"+id).andExpect(status().isNotFound());postAs(other,"/mocks/"+id+"/submit",Map.of()).andExpect(status().isNotFound());
    putAs(other,"/mocks/"+id+"/answers",Map.of("questionId",qid,"answerIndex",0,"marked",false,"revision",1)).andExpect(status().isNotFound());
    putAs(a,"/mocks/"+id+"/answers",Map.of("questionId",qid,"answerIndex",0,"marked",false,"revision",0)).andExpect(status().isConflict());
    putAs(a,"/mocks/"+id+"/answers",Map.of("questionId",9999,"answerIndex",0,"marked",false,"revision",1)).andExpect(status().isBadRequest());
    postAs(a,"/questions/"+qid+"/answers",Map.of("answerIndex",answer(qid),"requestKey",db.id())).andExpect(status().isConflict());
    JsonNode cleared=save(a,saved,qid,null,false);assertFalse(cleared.path("answers").has(String.valueOf(qid)));assertEquals(0,cleared.path("marked").size());
    postAs(a,"/mocks",config(2)).andExpect(status().isConflict());
  }
  @Test void submitGradesEveryQuestionAndOnlyOnce()throws Exception {
    Account a=account();JsonNode session=mock(a,3);String id=session.path("id").asText();
    int first=session.path("questions").get(0).path("id").asInt(),second=session.path("questions").get(1).path("id").asInt();
    session=save(a,session,first,answer(first),false);session=save(a,session,second,(answer(second)+1)%4,true);
    JsonNode result=body(postAs(a,"/mocks/"+id+"/submit",Map.of("score",999)).andExpect(status().isOk()));
    assertEquals("COMPLETED",result.path("status").asText());assertEquals(1,result.path("score").asInt());
    for(JsonNode q:result.path("questions")){assertTrue(q.has("review"));assertFalse(q.path("review").path("explanation").asText().isBlank());}
    assertTrue(result.path("questions").get(2).path("review").path("selectedIndex").isNull());
    JsonNode repeat=body(postAs(a,"/mocks/"+id+"/submit",Map.of()));assertEquals(result.path("score"),repeat.path("score"));
    assertEquals(3,db.count("SELECT COUNT(*) FROM aptitude_attempts WHERE mock_id=?",id));
    JsonNode late=save(a,result,second,answer(second),false);assertEquals(1,late.path("score").asInt());
    JsonNode stats=body(getAs(a,"/progress"));assertEquals(1,stats.path("solved").asInt());assertEquals(2,stats.path("attempted").asInt());assertEquals(50,stats.path("accuracy").asInt());
  }
  @Test void deadlineDiscardsLateChangesAndNeverResets()throws Exception {
    Account a=account();JsonNode session=mock(a,2);String id=session.path("id").asText();int qid=session.path("questions").get(0).path("id").asInt();
    db.exec("UPDATE aptitude_mocks SET expires_ms=? WHERE id=?",System.currentTimeMillis()-1000,id);
    JsonNode expired=save(a,session,qid,answer(qid),false);assertEquals("COMPLETED",expired.path("status").asText());assertEquals(0,expired.path("score").asInt());assertEquals(0,expired.path("answers").size());
    assertEquals(expired.path("expiresAt"),body(getAs(a,"/mocks/"+id)).path("expiresAt"));assertEquals(2,db.count("SELECT COUNT(*) FROM aptitude_attempts WHERE mock_id=?",id));
    assertEquals("ACTIVE",mock(a,1).path("status").asText());
  }
  @Test void mockSettingsAreBoundedAndWeakTopicsNeedEvidence()throws Exception {
    Account a=account();
    postAs(a,"/mocks",Map.of("category","","difficulty","","count",0,"minutes",1,"requestKey",db.id())).andExpect(status().isBadRequest());
    postAs(a,"/mocks",Map.of("category","","difficulty","","count",1,"minutes",181,"requestKey",db.id())).andExpect(status().isBadRequest());
    postAs(a,"/mocks",Map.of("category","Verbal","difficulty","Easy","count",100,"minutes",10,"requestKey",db.id())).andExpect(status().isBadRequest());
    for(int i=0;i<3;i++)postAs(a,"/questions/1/answers",Map.of("answerIndex",(answer(1)+1)%4,"requestKey",db.id())).andExpect(status().isOk());
    JsonNode stats=body(getAs(a,"/progress"));assertEquals(1,stats.path("weakTopics").size());assertEquals(0,stats.path("weakTopics").get(0).path("accuracy").asInt());assertEquals(30,stats.path("daily").size());
  }
  @Test void completedMockAwardsAppearOnProfileAndSurviveResubmission()throws Exception {
    Account a=account();db.exec("INSERT INTO profiles(user_id) VALUES(?)",a.id());
    JsonNode session=body(postAs(a,"/mocks",Map.of("category","","difficulty","Hard","count",20,"minutes",5,"requestKey",db.id())).andExpect(status().isOk()));
    String id=session.path("id").asText();var choices=new LinkedHashMap<String,Integer>();
    for(JsonNode q:session.path("questions"))choices.put(q.path("id").asText(),answer(q.path("id").asInt()));
    db.exec("UPDATE aptitude_mocks SET answers_json=? WHERE id=?",db.text(choices),id);
    JsonNode result=body(postAs(a,"/mocks/"+id+"/submit",Map.of()).andExpect(status().isOk()));
    assertEquals(5,result.path("awards").size());assertEquals(20,result.path("score").asInt());
    assertEquals(result.path("awards"),body(postAs(a,"/mocks/"+id+"/submit",Map.of())).path("awards"));
    JsonNode profile=body(mvc.perform(get("/api/users/me").cookie(a.cookie())).andExpect(status().isOk()));
    assertEquals(5,profile.path("badges").size());assertEquals(5,db.count("SELECT COUNT(*) FROM notifications WHERE user_id=? AND kind='BADGE'",a.id()));
  }
}
