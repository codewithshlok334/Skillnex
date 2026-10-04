package com.careerx;

import com.careerx.codelab.Judge0Runner;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class Judge0RunnerTest {
 @Test void sendsRestrictedExecutionAndRestoresBatchOrdering() throws Exception {
  var json=new ObjectMapper(); var captured=new AtomicReference<String>();
  var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  String first="00000000-0000-0000-0000-000000000001",second="00000000-0000-0000-0000-000000000002";
  server.createContext("/submissions/batch",exchange -> {
   assertEquals("test-key",exchange.getRequestHeaders().getFirst("X-Auth-Token"));
   String response;
   if(exchange.getRequestMethod().equals("POST")) {
    captured.set(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
    response="[{\"token\":\""+first+"\"},{\"token\":\""+second+"\"}]";
   } else response="{\"submissions\":[{\"token\":\""+second+"\",\"status\":{\"id\":3},\"stdout\":\"Mg==\",\"time\":\"0.01\"},{\"token\":\""+first+"\",\"status\":{\"id\":3},\"stdout\":\"MQ==\"}]}";
   byte[] bytes=response.getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
  });server.start();
  try {
   var runner=new Judge0Runner(json,"http://127.0.0.1:"+server.getAddress().getPort(),"test-key","",62,54,71);
   var results=runner.execute("python","custom_variable = 1",List.of("input 1","input 2"));
   assertEquals("1",results.get(0).stdout());assertEquals("2",results.get(1).stdout());
   var entry=json.readTree(captured.get()).path("submissions").get(0);
   assertEquals(71,entry.path("language_id").asInt());assertFalse(entry.path("enable_network").asBoolean());
   assertEquals(64,entry.path("max_processes_and_or_threads").asInt());assertEquals(3,entry.path("cpu_time_limit").asInt());
   assertEquals("custom_variable = 1",new String(Base64.getDecoder().decode(entry.path("source_code").asText()),StandardCharsets.UTF_8));
   assertFalse(entry.has("expected_output"));assertFalse(entry.has("callback_url"));assertFalse(entry.has("additional_files"));
  } finally { server.stop(0); }
 }
 @Test void noImplicitThirdPartyOrUnsafeUrlFallback() {
  var json=new ObjectMapper();var offline=new Judge0Runner(json,"","","",62,54,71);
  assertFalse(offline.configured());
  assertThrows(IllegalArgumentException.class,()->new Judge0Runner(json,"http://public-host.example","","",62,54,71));
  assertThrows(IllegalArgumentException.class,()->new Judge0Runner(json,"https://user:password@example.com","","",62,54,71));
 }
}
