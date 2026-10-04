package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.careerx.ai.AIService;
import com.careerx.config.LinkedInProperties;
import com.careerx.repository.Store;
import com.careerx.security.Tokens;
import com.careerx.service.*;
import com.fasterxml.jackson.databind.*;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;

@SpringBootTest(properties={"app.linkedin.client-id=test-client", "app.linkedin.client-secret=test-secret",
  "app.linkedin.redirect-uri=http://localhost:5173/api/linkedin/callback"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LinkedInIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired Store db;
  @Autowired ObjectMapper json;
  @Autowired Tokens tokens;
  @Autowired LinkedInProperties settings;
  @Autowired LinkedInConnectionService connections;
  @Autowired DocumentService documents;
  @MockitoBean AIService ai;
  @MockitoBean LinkedInClient linkedin;
  static final String ORIGIN="http://localhost:5173";
  static final String CONTENT="Headline: Java Developer\nAbout: I build Java REST APIs and write unit tests for a student task management project.\nSkills: Java, SQL, JUnit.";
  record Account(String id, Cookie cookie) {}
  Account account() {
    String id=db.id();
    db.exec("INSERT INTO app_users(id,email,name) VALUES(?,?,?)",id,id+"@example.test","Test member");
    return new Account(id,new Cookie("careerx_session",tokens.create(id,0)));
  }
  @BeforeEach void setup() throws Exception {
    when(linkedin.authorizationUrl(anyString(),anyString())).thenAnswer(call -> "https://www.linkedin.com/oauth/v2/authorization?state="+call.getArgument(0));
    when(linkedin.exchange(anyString(),anyString())).thenReturn(new LinkedInClient.Profile("member-sub","Test LinkedIn Name"));
    when(ai.generate(eq("LinkedInAnalysisPrompt"),anyString())).thenReturn(review());
    when(ai.generate(eq("LinkedInFromResumePrompt"),anyString())).thenReturn(review());
  }
  JsonNode review() throws Exception {
    return json.readTree("""
      {"summary":"Review of supplied content only.","sections":[
        {"name":"Headline","status":"provided","evidence":"Java Developer","feedback":"State your focus.","suggestedText":"Java Developer | REST APIs"},
        {"name":"About","status":"not_provided","evidence":"","feedback":"Not included in this review.","suggestedText":""},
        {"name":"Experience","status":"not_provided","evidence":"","feedback":"Add project evidence.","suggestedText":""},
        {"name":"Skills","status":"not_provided","evidence":"","feedback":"Add relevant skills.","suggestedText":""}],
        "keywordsToConsider":["REST APIs"],"actionPlan":["Explain your project contribution."]}
      """);
  }
  ResultActions postJson(Account a,String path,Object body) throws Exception {
    return mvc.perform(post("/api/linkedin"+path).cookie(a.cookie()).header("Origin",ORIGIN)
      .contentType("application/json").content(json.writeValueAsString(body)));
  }
  Map<String,Object> input(boolean consent, boolean save) {
    return Map.of("profileUrl","https://www.linkedin.com/in/test-member/?utm_source=test","targetRole","Java Developer","content",CONTENT,"consent",consent,"saveReport",save);
  }
  String start(Account a) throws Exception {
    String url=json.readTree(postJson(a,"/connect",Map.of("consent",true)).andExpect(status().isOk())
      .andReturn().getResponse().getContentAsString()).path("authorizationUrl").asText();
    return url.substring(url.indexOf("state=")+6);
  }
  ResultActions callback(Account a,String state) throws Exception {
    return mvc.perform(get("/api/linkedin/callback").cookie(a.cookie()).param("state",state).param("code","test-code"));
  }

  @Test void authConsentAndOriginAreRequired() throws Exception {
    mvc.perform(get("/api/linkedin/status")).andExpect(status().isUnauthorized());
    var a=account();
    mvc.perform(post("/api/linkedin/connect").cookie(a.cookie()).header("Origin","https://evil.test")
      .contentType("application/json").content("{\"consent\":true}")).andExpect(status().isForbidden());
    postJson(a,"/connect",Map.of("consent",false)).andExpect(status().isBadRequest());
    postJson(a,"/analyze",input(false,true)).andExpect(status().isBadRequest());
    var invalid=new HashMap<>(input(true,false)); invalid.put("profileUrl","https://linkedin.com.evil.test/in/user/");
    postJson(a,"/analyze",invalid).andExpect(status().isBadRequest());
    verify(ai,never()).generate(anyString(),anyString());
    verify(linkedin,never()).exchange(anyString(),anyString());
  }

  @Test void oauthBindsStateToOwnerAndSessionAndConsumesItOnce() throws Exception {
    var a=account(); var other=account(); String state=start(a);
    callback(other,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    verify(linkedin,never()).exchange(anyString(),anyString());
    callback(a,state).andExpect(status().isSeeOther()).andExpect(redirectedUrl("/app/linkedin?connection=connected"))
      .andExpect(header().string("Cache-Control","no-store"));
    callback(a,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    verify(linkedin,times(1)).exchange(eq("test-code"),anyString());
    mvc.perform(get("/api/linkedin/status").cookie(a.cookie())).andExpect(jsonPath("$.connected").value(true))
      .andExpect(jsonPath("$.profile.display_name").value("Test LinkedIn Name"))
      .andExpect(jsonPath("$.profile.subject").doesNotExist()).andExpect(jsonPath("$.token").doesNotExist());
    mvc.perform(get("/api/linkedin/status").cookie(other.cookie())).andExpect(jsonPath("$.connected").value(false));
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_oauth_states WHERE user_id=?",a.id()));
  }

  @Test void expiryCancelSessionChangeAndProviderFailureDoNotConnect() throws Exception {
    var a=account(); String state=start(a);
    db.exec("UPDATE linkedin_oauth_states SET expires_at=? WHERE user_id=?",Timestamp.from(Instant.now().minusSeconds(1)),a.id());
    callback(a,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    state=start(a);
    db.exec("UPDATE linkedin_oauth_states SET session_hash='different' WHERE user_id=?",a.id());
    callback(a,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    state=start(a);
    mvc.perform(get("/api/linkedin/callback").cookie(a.cookie()).param("state",state).param("error","access_denied"))
      .andExpect(redirectedUrl("/app/linkedin?connection=cancelled"));
    callback(a,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    verify(linkedin,never()).exchange(anyString(),anyString());
    state=start(a); when(linkedin.exchange(anyString(),anyString())).thenThrow(new IllegalStateException("sensitive provider body"));
    callback(a,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    callback(a,state).andExpect(redirectedUrl("/app/linkedin?connection=failed"));
    verify(linkedin,times(1)).exchange(anyString(),anyString());
    mvc.perform(get("/api/linkedin/status").cookie(a.cookie())).andExpect(jsonPath("$.connected").value(false));
  }

  @Test void disconnectCancelsInFlightCallbackAndKeepsOtherAccounts() throws Exception {
    var a=account(); var other=account(); String state=start(a);
    var flow=connections.consume(a.id(),a.cookie().getValue(),state);
    callback(other,start(other)).andExpect(redirectedUrl("/app/linkedin?connection=connected"));
    mvc.perform(delete("/api/linkedin/connection").cookie(a.cookie()).header("Origin",ORIGIN)).andExpect(status().isOk());
    assertThrows(org.springframework.web.server.ResponseStatusException.class,()->connections.complete(flow,new LinkedInClient.Profile("late","Late callback")));
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_connections WHERE user_id=?",a.id()));
    mvc.perform(get("/api/linkedin/status").cookie(other.cookie())).andExpect(jsonPath("$.connected").value(true));
  }

  @Test void reportsAreOptInPrivateAndDeletableWithoutStoringRawInput() throws Exception {
    var a=account(); var other=account();
    postJson(a,"/analyze",input(true,false)).andExpect(status().isOk()).andExpect(jsonPath("$.saved").value(false))
      .andExpect(jsonPath("$.id").doesNotExist());
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_reports WHERE user_id=?",a.id()));
    String id=json.readTree(postJson(a,"/analyze",input(true,true)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("id").asText();
    mvc.perform(get("/api/linkedin/reports/"+id).cookie(other.cookie())).andExpect(status().isNotFound());
    mvc.perform(delete("/api/linkedin/reports/"+id).cookie(other.cookie()).header("Origin",ORIGIN)).andExpect(status().isNotFound());
    mvc.perform(get("/api/linkedin/reports/"+id).cookie(a.cookie())).andExpect(status().isOk())
      .andExpect(jsonPath("$.profileUrl").value("https://www.linkedin.com/in/test-member/"));
    var captured=org.mockito.ArgumentCaptor.forClass(String.class);
    verify(ai,times(2)).generate(eq("LinkedInAnalysisPrompt"),captured.capture());
    var payload=json.readTree(captured.getValue()); assertEquals(2,payload.size()); assertEquals(CONTENT,payload.path("profileText").asText());
    assertFalse(payload.has("profileUrl")); assertFalse(payload.has("token"));
    assertFalse(db.text(db.one("SELECT * FROM linkedin_reports WHERE id=?",id)).contains("student task management"));
    mvc.perform(delete("/api/linkedin/reports/"+id).cookie(a.cookie()).header("Origin",ORIGIN)).andExpect(status().isOk());
    mvc.perform(get("/api/linkedin/reports/"+id).cookie(a.cookie())).andExpect(status().isNotFound());
  }

  @Test void rejectsInventedEvidenceAndKeepsProviderFailureUnsaved() throws Exception {
    var a=account(); var fabricated=review(); ((com.fasterxml.jackson.databind.node.ObjectNode)fabricated.path("sections").get(0)).put("evidence","I worked at an invented company");
    when(ai.generate(eq("LinkedInAnalysisPrompt"),anyString())).thenReturn(fabricated);
    postJson(a,"/analyze",input(true,true)).andExpect(status().isBadGateway());
    when(ai.generate(eq("LinkedInAnalysisPrompt"),anyString())).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Provider unavailable"));
    postJson(a,"/analyze",input(true,true)).andExpect(status().isServiceUnavailable());
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_reports WHERE user_id=?",a.id()));
  }

  @Test void pdfExtractionCreatesNoResumeReportOrAiRequest() throws Exception {
    var a=account();
    var file=new MockMultipartFile("file","linkedin.pdf","application/pdf",documents.pdf(CONTENT,"minimal"));
    mvc.perform(multipart("/api/linkedin/extract").file(file).cookie(a.cookie()).header("Origin",ORIGIN))
      .andExpect(status().isOk()).andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("Java Developer")));
    verify(ai,never()).generate(anyString(),anyString());
    assertEquals(0,db.count("SELECT COUNT(*) FROM resumes WHERE user_id=?",a.id()));
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_reports WHERE user_id=?",a.id()));
    mvc.perform(multipart("/api/linkedin/extract").file(new MockMultipartFile("file","fake.pdf","application/pdf","not a PDF".getBytes()))
      .cookie(a.cookie()).header("Origin",ORIGIN)).andExpect(status().isBadRequest());
  }

  @Test void missingConfigurationDisablesOAuthButLeavesAnalysisAvailable() throws Exception {
    var a=account(); String original=settings.getClientId(); settings.setClientId("");
    try {
      mvc.perform(get("/api/linkedin/status").cookie(a.cookie())).andExpect(jsonPath("$.configured").value(false));
      postJson(a,"/connect",Map.of("consent",true)).andExpect(status().isServiceUnavailable());
      postJson(a,"/analyze",input(true,false)).andExpect(status().isOk());
    } finally { settings.setClientId(original); }
  }

  String savedResume(Account a) {
    String id=db.id();
    db.exec("INSERT INTO resumes(id,user_id,name,content) VALUES(?,?,?,?)",id,a.id(),"My resume.pdf",CONTENT+" Original private contact text.");
    return id;
  }
  @Test void savedResumePreviewIsOwnerOnlyAndDoesNotCallAi() throws Exception {
    var owner=account(); var other=account(); String id=savedResume(owner);
    mvc.perform(get("/api/linkedin/resume-preview/"+id)).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/linkedin/resume-preview/"+id).cookie(other.cookie())).andExpect(status().isNotFound());
    mvc.perform(get("/api/linkedin/resume-preview/"+id).cookie(owner.cookie())).andExpect(status().isOk())
      .andExpect(header().string("Cache-Control","no-store"))
      .andExpect(jsonPath("$.name").value("My resume.pdf"))
      .andExpect(jsonPath("$.text").value(CONTENT+" Original private contact text."))
      .andExpect(jsonPath("$.analysis").doesNotExist());
    mvc.perform(get("/api/resumes").cookie(other.cookie())).andExpect(jsonPath("$.length()").value(0));
    verify(ai,never()).generate(anyString(),anyString());
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_reports WHERE user_id=?",owner.id()));
  }
  @Test void resumeDraftsUseOnlyApprovedPreviewAndPersistTheirSourceWithoutLinkedInConfiguration() throws Exception {
    var a=account(); String id=savedResume(a);
    var request=new HashMap<>(input(true,true)); request.put("resumeId",id); request.put("profileUrl","");
    String original=settings.getClientId(); settings.setClientId("");
    try {
      String response=postJson(a,"/analyze",request).andExpect(status().isOk())
        .andExpect(jsonPath("$.report.sourceType").value("resume"))
        .andExpect(jsonPath("$.report.sourceName").value("My resume.pdf"))
        .andExpect(jsonPath("$.profileUrl").value(""))
        .andReturn().getResponse().getContentAsString();
      String reportId=json.readTree(response).path("id").asText();
      mvc.perform(get("/api/linkedin/reports/"+reportId).cookie(a.cookie()))
        .andExpect(jsonPath("$.report.sourceType").value("resume"))
        .andExpect(jsonPath("$.report.sourceName").value("My resume.pdf"));
      var captured=org.mockito.ArgumentCaptor.forClass(String.class);
      verify(ai).generate(eq("LinkedInFromResumePrompt"),captured.capture());
      var payload=json.readTree(captured.getValue()); assertEquals(2,payload.size());
      assertEquals(CONTENT,payload.path("profileText").asText());
      assertFalse(captured.getValue().contains("Original private contact text"));
      assertFalse(payload.has("resumeId"));
      assertEquals("linkedin-resume-v1",db.one("SELECT consent_version FROM linkedin_reports WHERE id=?",reportId).get("consent_version"));
      verify(linkedin,never()).exchange(anyString(),anyString());
    } finally { settings.setClientId(original); }
  }
  @Test void resumeDraftsRejectForeignOrDeletedSourcesAndRequireConsent() throws Exception {
    var a=account(); String id=savedResume(account());
    var request=new HashMap<>(input(true,false)); request.put("resumeId",id);
    postJson(a,"/analyze",request).andExpect(status().isNotFound());
    request.put("resumeId",db.id()); postJson(a,"/analyze",request).andExpect(status().isNotFound());
    request.put("resumeId",savedResume(a)); request.put("consent",false);
    postJson(a,"/analyze",request).andExpect(status().isBadRequest());
    request.put("consent",true); request.put("profileUrl","https://evil.test/in/member");
    postJson(a,"/analyze",request).andExpect(status().isBadRequest());
    request.remove("resumeId"); request.put("profileUrl","");
    postJson(a,"/analyze",request).andExpect(status().isBadRequest());
    verify(ai,never()).generate(anyString(),anyString());
  }
  @Test void resumeEvidenceMustMatchPreviewAndSavingIsStillOptional() throws Exception {
    var a=account(); var request=new HashMap<>(input(true,false)); request.put("resumeId",savedResume(a));
    postJson(a,"/analyze",request).andExpect(status().isOk()).andExpect(jsonPath("$.saved").value(false));
    var fabricated=review(); ((com.fasterxml.jackson.databind.node.ObjectNode)fabricated.path("sections").get(0)).put("evidence","Invented experience");
    when(ai.generate(eq("LinkedInFromResumePrompt"),anyString())).thenReturn(fabricated);
    request.put("saveReport",true); postJson(a,"/analyze",request).andExpect(status().isBadGateway());
    assertEquals(0,db.count("SELECT COUNT(*) FROM linkedin_reports WHERE user_id=?",a.id()));
  }
}
