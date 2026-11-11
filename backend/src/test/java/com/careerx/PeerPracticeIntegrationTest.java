package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.careerx.ai.AIService;
import com.careerx.repository.Store;
import com.fasterxml.jackson.databind.*;
import jakarta.servlet.http.Cookie;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;

@SpringBootTest(properties={"app.peer.turn-urls=turn:relay.example:80,turns:relay.example:443?transport=tcp", "app.peer.turn-secret=test-relay-secret"}) @AutoConfigureMockMvc @ActiveProfiles("test")
class PeerPracticeIntegrationTest {
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired Store db;
  @Autowired com.careerx.service.PeerPracticeService rooms;
  @MockitoBean AIService ai;
  static final String ORIGIN="http://localhost:5173";
  record User(String id,Cookie cookie) {}
  @BeforeEach void setup(){ db.exec("DELETE FROM rate_limits"); when(ai.available()).thenReturn(true); when(ai.audioTranscriptionAvailable()).thenReturn(true); }
  User user() throws Exception {
    var r=mvc.perform(post("/api/auth/signup").header("Origin",ORIGIN).contentType("application/json").content(json.writeValueAsString(Map.of("name","Peer Test","email",UUID.randomUUID()+"@example.com","password","Strong-test-password-2026!")))).andExpect(status().isOk()).andReturn();
    return new User(body(r).path("id").asText(),new Cookie("careerx_session",r.getResponse().getHeader("Set-Cookie").split(";")[0].split("=",2)[1]));
  }
  JsonNode body(MvcResult r)throws Exception{return json.readTree(r.getResponse().getContentAsString());}
  ResultActions send(User u,String path,Object payload)throws Exception{return mvc.perform(post("/api/peer"+path).cookie(u.cookie).header("Origin",ORIGIN).contentType("application/json").content(json.writeValueAsString(payload)));}
  JsonNode ok(User u,String path,Object payload)throws Exception{return body(send(u,path,payload).andExpect(status().isOk()).andReturn());}
  String create(User u)throws Exception{return ok(u,"/rooms",Map.of("title","Practice")).path("id").asText();}
  String connect(User u,String id)throws Exception{String cid=UUID.randomUUID().toString();ok(u,"/rooms/"+id+"/connect",Map.of("clientId",cid));return cid;}
  JsonNode getRoom(User u,String id)throws Exception{return body(mvc.perform(get("/api/peer/rooms/"+id).cookie(u.cookie)).andExpect(status().isOk()).andReturn());}
  JsonNode action(User u,String id,String action)throws Exception{return ok(u,"/rooms/"+id+"/action",Map.of("action",action,"revision",getRoom(u,id).path("revision").asInt()));}
  @Test void relayCredentialsAreAuthenticatedShortLivedAndDoNotExposeIdentityOrSecret()throws Exception{
    mvc.perform(get("/api/peer/config")).andExpect(status().isUnauthorized());
    var u=user();
    var config=body(mvc.perform(get("/api/peer/config").cookie(u.cookie)).andExpect(status().isOk()).andReturn());
    assertTrue(config.path("relayAvailable").asBoolean());
    var relay=config.path("iceServers").get(1);
    assertEquals(2,relay.path("urls").size());
    String username=relay.path("username").asText();
    long remaining=Long.parseLong(username.split(":")[0])-System.currentTimeMillis()/1000;
    assertTrue(remaining>10700 && remaining<=10800);
    assertFalse(username.contains(u.id));
    assertFalse(config.toString().contains("test-relay-secret"));
    var mac=javax.crypto.Mac.getInstance("HmacSHA1");
    mac.init(new javax.crypto.spec.SecretKeySpec("test-relay-secret".getBytes(StandardCharsets.UTF_8),"HmacSHA1"));
    assertEquals(Base64.getEncoder().encodeToString(mac.doFinal(username.getBytes(StandardCharsets.UTF_8))),relay.path("credential").asText());
    var refreshed=body(mvc.perform(get("/api/peer/config").cookie(u.cookie)).andExpect(status().isOk()).andReturn());
    assertNotEquals(username,refreshed.path("iceServers").get(1).path("username").asText());
  }
  @Test void managedRelayUsesTurnCredentialsAndRejectsIncompleteConfiguration()throws Exception{
    var managed=new com.careerx.controller.PeerPracticeController(null,null,ai,null,null,
      "turn:relay.example:80, turns:relay.example:443?transport=tcp","","turn-user","turn-password","");
    JsonNode config=json.valueToTree(managed.config(()->"user"));
    assertTrue(config.path("relayAvailable").asBoolean());
    assertEquals("turn-user",config.path("iceServers").get(0).path("username").asText());
    assertEquals("turn-password",config.path("iceServers").get(0).path("credential").asText());
    assertEquals("turns:relay.example:443?transport=tcp",config.path("iceServers").get(0).path("urls").get(1).asText());
    var incomplete=new com.careerx.controller.PeerPracticeController(null,null,ai,null,null,"turn:relay.example:80","","turn-user","","");
    JsonNode disabled=json.valueToTree(incomplete.config(()->"user"));
    assertFalse(disabled.path("relayAvailable").asBoolean());
    assertTrue(disabled.path("iceServers").isEmpty());
  }
  @Test void expiredActiveRoomEndsAndStopsPublishingMedia()throws Exception{
    var h=user();var g=user();String id=create(h),path="/rooms/"+id;
    ok(g,path+"/join",Map.of());String hc=connect(h,id);connect(g,id);action(h,id,"start");
    db.exec("UPDATE peer_rooms SET expires_ms=? WHERE id=?",System.currentTimeMillis()-1000,id);
    var ended=ok(h,path+"/sync",Map.of("clientId",hc,"epoch",0,"cursor",0,"mic",true,"camera",true));
    assertEquals("COMPLETED",ended.path("status").asText());
    for(var member:ended.path("participants")){assertFalse(member.path("mic").asBoolean());assertFalse(member.path("camera").asBoolean());}
    assertTrue(ended.path("ended_ms").asLong()>0);
  }
  @Test void privateRoomsHaveTwoSlotsAndRejectOutsidersAndStaleConnections()throws Exception{
    var host=user();var guest=user();var outsider=user();String id=create(host),path="/rooms/"+id;
    mvc.perform(get("/api/peer/rooms/"+id)).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/peer/rooms/"+id).cookie(outsider.cookie)).andExpect(status().isNotFound());
    send(host,path+"/action",Map.of("action","start","revision",0)).andExpect(status().isConflict());
    ok(guest,path+"/join",Map.of());send(outsider,path+"/join",Map.of()).andExpect(status().isConflict());
    String hc=connect(host,id),gc=connect(guest,id);int epoch=getRoom(host,id).path("epoch").asInt();
    send(guest,path+"/action",Map.of("action","start","revision",1)).andExpect(status().isForbidden());
    assertEquals("ACTIVE",action(host,id,"start").path("status").asText());
    var signal=Map.of("clientId",hc,"epoch",epoch,"kind","description","payload",Map.of("type","offer","sdp","test-sdp"));
    ok(host,path+"/signal",signal);
    var poll=ok(guest,path+"/sync",Map.of("clientId",gc,"epoch",epoch,"cursor",0,"mic",false,"camera",false));
    assertEquals(1,poll.path("signals").size());assertFalse(poll.has("notes"));
    send(outsider,path+"/signal",signal).andExpect(status().isNotFound());
    assertEquals(guest.id,action(host,id,"swap").path("interviewer_id").asText());
    connect(host,id);send(host,path+"/signal",signal).andExpect(status().isConflict());
    assertEquals(0,db.count("SELECT COUNT(*) FROM peer_signals WHERE room_id=?",id));
    action(guest,id,"end");send(guest,path+"/connect",Map.of("clientId",gc)).andExpect(status().isConflict());
    send(outsider,path+"/join",Map.of()).andExpect(status().isConflict());
  }
  record Session(User host,User guest,String id,String path) {}
  Session session() throws Exception {
    var h=user();var g=user();String id=create(h),path="/rooms/"+id;
    ok(g,path+"/join",Map.of());connect(h,id);connect(g,id);action(h,id,"start");
    return new Session(h,g,id,path);
  }
  String shared(User u,String path,String text)throws Exception {
    String id=UUID.randomUUID().toString();
    ok(u,path+"/notes",Map.of("id",id,"text",text,"shareWithPartner",true));return id;
  }
  static final String HOST_TEXT="I explained that binary search works on any unsorted array. I described checking the middle and discarding half, but did not establish the sorted-order invariant.";
  static final String GUEST_TEXT="Before answering I would ask if the array is sorted. I would explain the range invariant, show a small example and compare the logarithmic search with a linear scan.";
  com.fasterxml.jackson.databind.node.ObjectNode generated(Session s,String note) {
    var n=json.createObjectNode().put("summary","A review of the shared practice conversation").put("coverage","Shared text only; no video or unsaved speech assessed.");
    var people=n.putArray("participants");
    for(var u:List.of(s.host,s.guest)) {
      var p=people.addObject().put("userId",u.id).put("coverage","Only the saved text for this person was reviewed.");
      var criteria=p.putArray("criteria");
      for(String key:List.of("clarity","structure","reasoning","interviewing"))criteria.addObject().put("key",key).put("score",80).put("reason","Practice guidance based on the shared explanation.");
      p.putArray("strengths").add("Explained the search approach.");p.putArray("improvements").add("State the precondition first.");p.putArray("nextSteps").add("Practise with a sorted array.");
      var mistakes=p.putArray("mistakes");
      if(u.id.equals(s.host.id) && note!=null)mistakes.addObject().put("noteId",note).put("quote","binary search works on any unsorted array").put("issue","Requires ordering").put("improvement","Establish sorted order first.");
    }
    return n;
  }
  @Test void bothReportsAreEndOnlyShareOptInAndNeverSendPrivateNotes()throws Exception {
    var s=session();var outsider=user();
    String privateId=UUID.randomUUID().toString();
    ok(s.host,s.path+"/notes",Map.of("id",privateId,"text","PRIVATE_SENTINEL_This is a personal observation that must never reach the shared AI report or the partner."));
    assertEquals(0,getRoom(s.guest,s.id).path("notes").size());
    String nid=shared(s.host,s.path,HOST_TEXT);shared(s.guest,s.path,GUEST_TEXT);
    assertEquals(2,getRoom(s.guest,s.id).path("notes").size());
    assertTrue(getRoom(s.guest,s.id).path("notes").get(0).path("shared").asBoolean());
    send(s.host,s.path+"/analysis",Map.of()).andExpect(status().isConflict());
    verify(ai,never()).generate(eq("PeerReviewPrompt"),anyString());
    action(s.host,s.id,"end");
    send(outsider,s.path+"/analysis",Map.of()).andExpect(status().isNotFound());
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(generated(s,nid));
    var report=ok(s.guest,s.path+"/analysis",Map.of());
    assertEquals(2,report.path("version").asInt());assertEquals(2,report.path("participants").size());
    assertEquals(2,report.path("reviewedEntries").asInt());assertEquals(2,report.path("totalEntries").asInt());
    assertEquals(s.host.id,report.path("participants").get(0).path("userId").asText());
    assertEquals(80,report.path("participants").get(0).path("overallScore").asInt());
    assertEquals(report,ok(s.host,s.path+"/analysis",Map.of()));
    assertEquals(report,getRoom(s.host,s.id).path("report"));assertEquals(report,getRoom(s.guest,s.id).path("report"));
    var prompt=org.mockito.ArgumentCaptor.forClass(String.class);
    verify(ai,times(1)).generate(eq("PeerReviewPrompt"),prompt.capture());
    assertFalse(prompt.getValue().contains("PRIVATE_SENTINEL"));assertTrue(prompt.getValue().contains(HOST_TEXT));
    assertEquals(2,db.count("SELECT COUNT(*) FROM peer_reports WHERE room_id=?",s.id));
    mvc.perform(delete("/api/peer"+s.path+"/notes/"+nid).cookie(s.guest.cookie).header("Origin",ORIGIN)).andExpect(status().isOk());
    assertEquals(1,db.count("SELECT COUNT(*) FROM peer_notes WHERE id=?",nid));
    shared(s.guest,s.path,"My final answer used a sorted array and kept the search interval inclusive, checking the middle until the range was empty.");
    assertTrue(getRoom(s.host,s.id).path("report").isNull());assertTrue(getRoom(s.guest,s.id).path("report").isNull());
  }
  @Test void absentEvidenceIsNotZeroOrAnInventedAssessment()throws Exception {
    var s=session();
    ok(s.host,s.path+"/notes",Map.of("id",UUID.randomUUID().toString(),"text",HOST_TEXT));
    action(s.host,s.id,"end");
    var empty=ok(s.host,s.path+"/analysis",Map.of());
    assertEquals(0,empty.path("reviewedEntries").asInt());
    for(var p:empty.path("participants")){assertTrue(p.path("overallScore").isNull());assertTrue(p.path("mistakes").isEmpty());}
    verify(ai,never()).generate(eq("PeerReviewPrompt"),anyString());
    String note=shared(s.host,s.path,HOST_TEXT);
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(generated(s,note));
    var report=ok(s.guest,s.path+"/analysis",Map.of());
    var silent=report.path("participants").get(1);
    assertEquals("insufficient_evidence",silent.path("status").asText());
    assertTrue(silent.path("overallScore").isNull());assertTrue(silent.path("strengths").isEmpty());
    assertEquals(0,silent.path("evidenceEntries").asInt());
    for(var c:silent.path("criteria"))assertTrue(c.path("score").isNull());
  }
  @Test void reportRejectsPartnerQuoteUnknownIdentityAndInvalidScores()throws Exception {
    var s=session();String hn=shared(s.host,s.path,HOST_TEXT),gn=shared(s.guest,s.path,GUEST_TEXT);action(s.host,s.id,"end");
    var wrongQuote=generated(s,hn);
    ((com.fasterxml.jackson.databind.node.ObjectNode)wrongQuote.path("participants").get(0).path("mistakes").get(0)).put("noteId",gn).put("quote","Before answering");
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(wrongQuote);
    send(s.host,s.path+"/analysis",Map.of()).andExpect(status().isBadGateway());
    var wrongIdentity=generated(s,hn);((com.fasterxml.jackson.databind.node.ObjectNode)wrongIdentity.path("participants").get(1)).put("userId",UUID.randomUUID().toString());
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(wrongIdentity);
    send(s.host,s.path+"/analysis",Map.of()).andExpect(status().isBadGateway());
    var wrongScore=generated(s,hn);((com.fasterxml.jackson.databind.node.ObjectNode)wrongScore.path("participants").get(0).path("criteria").get(0)).put("score",101);
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(wrongScore);
    send(s.host,s.path+"/analysis",Map.of()).andExpect(status().isBadGateway());
    assertEquals(0,db.count("SELECT COUNT(*) FROM peer_reports WHERE room_id=?",s.id));
  }
  @Test void lateConversationDuringAnalysisCannotCacheAnOutdatedReport()throws Exception {
    var s=session();String hn=shared(s.host,s.path,HOST_TEXT);shared(s.guest,s.path,GUEST_TEXT);action(s.host,s.id,"end");
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenAnswer(invocation->{
      rooms.note(s.id,s.guest.id,UUID.randomUUID().toString(),"note","Another shared answer arrived while the report was generating.","candidate",true);
      return generated(s,hn);
    });
    send(s.host,s.path+"/analysis",Map.of()).andExpect(status().isConflict());
    assertEquals(0,db.count("SELECT COUNT(*) FROM peer_reports WHERE room_id=?",s.id));
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(generated(s,hn));
    assertEquals(3,ok(s.guest,s.path+"/analysis",Map.of()).path("reviewedEntries").asInt());
  }
  @Test void providerFailureIsRetryableAndLegacyPrivateReportIsNeverShared()throws Exception {
    var s=session();String hn=shared(s.host,s.path,HOST_TEXT);shared(s.guest,s.path,GUEST_TEXT);action(s.host,s.id,"end");
    db.exec("INSERT INTO peer_reports(room_id,user_id,result_json,created_ms) VALUES(?,?,?,?)",s.id,s.host.id,"{\"summary\":\"PRIVATE_LEGACY_REPORT\"}",System.currentTimeMillis());
    assertTrue(getRoom(s.guest,s.id).path("report").isNull());
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Provider unavailable"));
    send(s.host,s.path+"/analysis",Map.of()).andExpect(status().isServiceUnavailable());
    assertTrue(getRoom(s.guest,s.id).path("report").isNull());
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(generated(s,hn));
    var report=ok(s.host,s.path+"/analysis",Map.of());assertFalse(report.toString().contains("PRIVATE_LEGACY_REPORT"));
    assertEquals(report,getRoom(s.guest,s.id).path("report"));
  }
  @Test void transcriptionRequiresExplicitConsentAndValidAudioAndIsIdempotent()throws Exception{
    var h=user();var g=user();String id=create(h),path="/rooms/"+id;ok(g,path+"/join",Map.of());connect(h,id);connect(g,id);action(h,id,"start");
    byte[] pcm=new byte[32044];var w=ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN);w.put("RIFF".getBytes(StandardCharsets.US_ASCII)).putInt(pcm.length-8).put("WAVEfmt ".getBytes(StandardCharsets.US_ASCII)).putInt(16).putShort((short)1).putShort((short)1).putInt(16000).putInt(32000).putShort((short)2).putShort((short)16).put("data".getBytes(StandardCharsets.US_ASCII)).putInt(pcm.length-44);
    String clip=UUID.randomUUID().toString();var audio=new MockMultipartFile("audio","speech.wav","audio/wav",pcm);
    mvc.perform(multipart("/api/peer"+path+"/transcribe").file(audio).param("clipId",clip).cookie(h.cookie).header("Origin",ORIGIN)).andExpect(status().isForbidden());
    ok(h,path+"/consent",Map.of("enabled",true));
    mvc.perform(multipart("/api/peer"+path+"/transcribe").file(new MockMultipartFile("audio","bad.wav","audio/wav",new byte[64])).param("clipId",clip).cookie(h.cookie).header("Origin",ORIGIN)).andExpect(status().isBadRequest());
    when(ai.transcribe(any(),eq("en-IN"))).thenReturn("Please explain the design decision you made for your last project.");
    for(int i=0;i<2;i++)mvc.perform(multipart("/api/peer"+path+"/transcribe").file(audio).param("clipId",clip).cookie(h.cookie).header("Origin",ORIGIN)).andExpect(status().isOk());
    verify(ai,times(1)).transcribe(any(),eq("en-IN"));assertEquals(1,getRoom(g,id).path("notes").size());
    ok(h,path+"/consent",Map.of("enabled",false));
    mvc.perform(multipart("/api/peer"+path+"/transcribe").file(audio).param("clipId",UUID.randomUUID().toString()).cookie(h.cookie).header("Origin",ORIGIN)).andExpect(status().isForbidden());
  }
}
