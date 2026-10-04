package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.careerx.codelab.*;
import com.careerx.repository.Store;
import com.careerx.security.Tokens;
import com.fasterxml.jackson.databind.*;
import jakarta.servlet.http.Cookie;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class CodeLabIntegrationTest {
 @Autowired MockMvc mvc; @Autowired Store db; @Autowired Tokens tokens; @Autowired ObjectMapper json;
 @MockitoBean CodeRunner runner;
 static final String ORIGIN="http://localhost:5173";
 record Account(String id,Cookie cookie) {}
 Account account(){String id=db.id();db.exec("INSERT INTO app_users(id,email,name) VALUES(?,?,?)",id,id+"@example.test","Coder");return new Account(id,new Cookie("careerx_session",tokens.create(id,0)));}
 @BeforeEach void setup(){when(runner.configured()).thenReturn(true);when(runner.destination()).thenReturn("local-sandbox");}
 ResultActions getAs(Account a,String path)throws Exception{return mvc.perform(get(java.net.URI.create("/api/codelab"+path)).cookie(a.cookie()));}
 JsonNode body(ResultActions result)throws Exception{return json.readTree(result.andReturn().getResponse().getContentAsString());}
 ResultActions save(Account a,int id,String lang,String code,int revision)throws Exception{return mvc.perform(put("/api/codelab/questions/"+id+"/draft?language="+lang).cookie(a.cookie()).header("Origin",ORIGIN).contentType("application/json").content(json.writeValueAsString(Map.of("code",code,"revision",revision))));}
 ResultActions submit(Account a,String lang,String mode,String source,String key)throws Exception{return mvc.perform(post("/api/codelab/questions/1/submissions").cookie(a.cookie()).header("Origin",ORIGIN).contentType("application/json").content(json.writeValueAsString(Map.of("code",source,"language",lang,"mode",mode,"requestKey",key))));}
 void sumRunner()throws Exception{when(runner.execute(anyString(),anyString(),anyList())).thenAnswer(call->{List<String>inputs=call.getArgument(2);return inputs.stream().map(s->{String[]values=s.trim().split("\\s+");long sum=0;for(int i=1;i<values.length;i++)sum+=Long.parseLong(values[i]);return new CodeRunner.Execution(3,"  "+sum+"\n", "","",.02,1000);}).toList();});}
 JsonNode finish(Account a,String id)throws Exception{for(int i=0;i<120;i++){JsonNode r=body(getAs(a,"/submissions/"+id).andExpect(status().isOk()));if(!Set.of("QUEUED","RUNNING").contains(r.path("status").asText()))return r;Thread.sleep(30);}fail("Job did not complete");return null;}

 @Test void catalogContainsFiftyOriginalProblemsAndExactlyThreeLanguages()throws Exception{
  Account a=account();JsonNode list=body(getAs(a,"/questions").andExpect(status().isOk()));assertEquals(50,list.path("total").asInt());assertEquals(12,list.path("questions").size());
  assertEquals(50,db.count("SELECT COUNT(*) FROM code_questions"));assertEquals(150,db.count("SELECT COUNT(*) FROM code_solutions"));assertEquals(300,db.count("SELECT COUNT(*) FROM code_test_cases"));
  assertEquals(3,body(getAs(a,"/status")).path("languages").size());
  getAs(a,"/questions/1?language=ruby").andExpect(status().isBadRequest());
  assertTrue(body(getAs(a,"/questions?difficulty=Hard")).path("total").asInt()>0);
 }
 @Test void searchMatchesTopicsTitlesAndAliasesAndCombinesWithFilters()throws Exception{
  Account a=account();
  JsonNode arrays=body(getAs(a,"/questions?search=%20ArRaY%20").andExpect(status().isOk()));
  assertTrue(arrays.path("total").asInt()>0);
  for(JsonNode q:arrays.path("questions"))assertEquals("Arrays",q.path("topic").asText());
  JsonNode dp=body(getAs(a,"/questions?search=DP").andExpect(status().isOk()));
  assertTrue(dp.path("total").asInt()>0);
  for(JsonNode q:dp.path("questions"))assertEquals("Dynamic programming",q.path("topic").asText());
  assertEquals(1,body(getAs(a,"/questions?search=BinarySearch&difficulty=Hard")).path("total").asInt());
  assertEquals(1,body(getAs(a,"/questions?search=Pair%20Budget&topic=Hashing")).path("total").asInt());
  assertEquals(0,body(getAs(a,"/questions?search=%25")).path("total").asInt());
 }
 @Test void questionsDoNotLeakHiddenTestsSolutionsOrOtherUsersDrafts()throws Exception{
  Account owner=account(),other=account();save(owner,1,"python","my_private_variable = 7",0).andExpect(status().isOk());
  JsonNode q=body(getAs(other,"/questions/1?language=python"));assertTrue(q.path("draft").isNull());assertEquals(2,q.path("examples").size());assertFalse(q.has("tests"));assertFalse(q.has("solution"));assertFalse(q.path("statement").has("approach"));
  assertFalse(q.toString().contains("my_private_variable"));assertTrue(body(getAs(owner,"/questions/1/solution?language=java")).path("code").asText().contains("class Main"));
  mvc.perform(get("/api/codelab/questions")).andExpect(status().isUnauthorized());
 }
 @Test void draftsPersistPerUserProblemAndLanguageWithRevisionProtection()throws Exception{
  Account a=account();save(a,1,"java","class Main {}",0).andExpect(status().isOk());save(a,1,"python","print(5)",0).andExpect(status().isOk());
  assertEquals("class Main {}",body(getAs(a,"/questions/1?language=java")).path("draft").path("code").asText());
  save(a,1,"java","newer",1).andExpect(status().isOk());save(a,1,"java","stale",1).andExpect(status().isConflict());
  assertEquals("newer",body(getAs(a,"/questions/1?language=java")).path("draft").path("code").asText());
  save(a,1,"python","x".repeat(40001),1).andExpect(status().isBadRequest());
 }
 @Test void sampleRunNeverMarksSolvedAndSubmitUsesAllPrivateCases()throws Exception{
  sumRunner();Account a=account();String source="different_variable_names_and_algorithm";
  String runId=body(submit(a,"python","RUN",source,db.id()).andExpect(status().isOk())).path("id").asText();
  JsonNode run=finish(a,runId);assertEquals("ACCEPTED",run.path("status").asText());assertEquals(2,run.path("total").asInt());
  assertEquals(0,body(getAs(a,"/questions")).path("progress").path("solved").asInt());
  String id=body(submit(a,"cpp","SUBMIT",source,db.id())).path("id").asText();JsonNode result=finish(a,id);assertEquals("ACCEPTED",result.path("status").asText());assertEquals(6,result.path("total").asInt());
  assertEquals(1,body(getAs(a,"/questions")).path("progress").path("solved").asInt());
  for(JsonNode t:result.path("result").path("cases"))if(!t.path("sample").asBoolean()){assertFalse(t.has("input"));assertFalse(t.has("expected"));assertFalse(t.has("output"));assertFalse(t.has("error"));}
  getAs(account(),"/submissions/"+id).andExpect(status().isNotFound());
 }
 @Test void duplicateRequestCannotCreateAnotherAttempt()throws Exception{
  sumRunner();Account a=account();String key=db.id();String id=body(submit(a,"java","SUBMIT","source",key)).path("id").asText();finish(a,id);
  assertEquals(id,body(submit(a,"java","SUBMIT","source",key)).path("id").asText());assertEquals(1,db.count("SELECT COUNT(*) FROM code_submissions WHERE user_id=?",a.id()));
  submit(a,"java","SUBMIT","changed",key).andExpect(status().isBadRequest());
 }
 @Test void invalidLanguageAndOfflineRunnerNeverExecuteOrMarkSolved()throws Exception{
  Account a=account();submit(a,"javascript","SUBMIT","code",db.id()).andExpect(status().isBadRequest());
  when(runner.configured()).thenReturn(false);submit(a,"python","RUN","code",db.id()).andExpect(status().isServiceUnavailable());verify(runner,never()).execute(anyString(),anyString(),anyList());
  assertEquals(0,db.count("SELECT COUNT(*) FROM code_submissions WHERE user_id=?",a.id()));
 }
 @Test void compilerErrorTimeoutAndIncorrectOutputRemainUnsolved()throws Exception{
  Account a=account();for(int code:List.of(6,5,3,13)){
   when(runner.execute(anyString(),anyString(),anyList())).thenAnswer(call->{List<String>inputs=call.getArgument(2);return inputs.stream().map(s->new CodeRunner.Execution(code,"wrong","private hidden diagnostics","syntax error",0,0)).toList();});
   String id=body(submit(a,"python","SUBMIT","code",db.id())).path("id").asText();var result=finish(a,id);
   assertEquals(Map.of(6,"COMPILATION_ERROR",5,"TIME_LIMIT",3,"WRONG_ANSWER",13,"RUNNER_ERROR").get(code),result.path("status").asText());
   assertFalse(result.path("result").path("cases").get(2).has("error"));
  }assertEquals(0,body(getAs(a,"/questions")).path("progress").path("solved").asInt());
 }
 @Test void outputComparisonAcceptsWhitespaceAndEveryValidPair(){
  assertTrue(OutputChecker.accepts("TOKENS","","1 2\n3"," 1\n2  3 \n"));assertFalse(OutputChecker.accepts("TOKENS","","1 2","2 1"));
  String input="4 10\n3 7 2 8";assertTrue(OutputChecker.accepts("PAIR_INDICES",input,"0 1","2 3"));assertTrue(OutputChecker.accepts("PAIR_INDICES",input,"0 1","3 2"));
  assertFalse(OutputChecker.accepts("PAIR_INDICES",input,"0 1","0 0"));assertFalse(OutputChecker.accepts("PAIR_INDICES",input,"0 1","-1"));assertFalse(OutputChecker.accepts("PAIR_INDICES",input,"0 1","4 1"));
 }
}
