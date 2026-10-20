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

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class PeerPracticeIntegrationTest {
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired Store db;
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
  @Test void analysisIsEndOnlyPrivateEvidenceBasedAndInvalidatedByNewNotes()throws Exception{
    var h=user();var g=user();String id=create(h),path="/rooms/"+id;ok(g,path+"/join",Map.of());connect(h,id);connect(g,id);action(h,id,"start");
    String text="I said a binary search works on any unsorted array. I described checking the middle and discarding half, but did not establish the sorted-order invariant.";
    String nid=UUID.randomUUID().toString();ok(h,path+"/notes",Map.of("id",nid,"text",text));
    assertEquals(0,getRoom(g,id).path("notes").size());
    send(h,path+"/analysis",Map.of()).andExpect(status().isConflict());verify(ai,never()).generate(eq("PeerReviewPrompt"),anyString());
    action(h,id,"end");
    send(g,path+"/analysis",Map.of()).andExpect(status().isUnprocessableEntity());
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(json.readTree("{\"summary\":\"Review of your saved answer\",\"coverage\":\"One written answer only, no video assessment\",\"strengths\":[\"Explained halving\"],\"mistakes\":[{\"quote\":\"binary search works on any unsorted array\",\"issue\":\"Needs a sorted range\",\"improvement\":\"Explain the ordering invariant first\"}],\"nextSteps\":[\"Practise a sorted-array example\"]}"));
    var report=ok(h,path+"/analysis",Map.of());assertEquals(1,report.path("reviewedEntries").asInt());
    ok(h,path+"/analysis",Map.of());verify(ai,times(1)).generate(eq("PeerReviewPrompt"),anyString());
    assertTrue(getRoom(g,id).path("report").isNull());
    ok(g,path+"/feedback",Map.of("clarity",3,"strengths","Explained the middle element clearly","improvements","Mention the sorted array requirement"));
    assertTrue(getRoom(h,id).path("report").isNull());
    when(ai.generate(eq("PeerReviewPrompt"),anyString())).thenReturn(json.readTree("{\"summary\":\"Unsupported review\",\"coverage\":\"limited\",\"strengths\":[],\"mistakes\":[{\"quote\":\"invented quote\",\"issue\":\"invented\",\"improvement\":\"invented\"}],\"nextSteps\":[]}"));
    send(h,path+"/analysis",Map.of()).andExpect(status().isBadGateway());assertEquals(0,db.count("SELECT COUNT(*) FROM peer_reports WHERE room_id=?",id));
    mvc.perform(delete("/api/peer"+path+"/notes/"+nid).cookie(g.cookie).header("Origin",ORIGIN)).andExpect(status().isOk());
    assertEquals(1,db.count("SELECT COUNT(*) FROM peer_notes WHERE id=?",nid));
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
