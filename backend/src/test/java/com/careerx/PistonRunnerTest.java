package com.careerx;

import com.careerx.codelab.PistonRunner;
import com.fasterxml.jackson.databind.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PistonRunnerTest {
  private final ObjectMapper json=new ObjectMapper();
  private static final String RUNTIMES="[{\"language\":\"java\",\"version\":\"15.0.2\",\"aliases\":[]},{\"language\":\"c++\",\"version\":\"10.2.0\",\"aliases\":[\"cpp\"]},{\"language\":\"python\",\"version\":\"3.10.0\",\"aliases\":[]}]";
  private HttpServer server(AtomicReference<String> result,List<JsonNode> received) throws Exception {
    var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
    server.createContext("/api/v2/",exchange -> {
      String body=RUNTIMES;
      if(exchange.getRequestURI().getPath().endsWith("execute")) {
        received.add(json.readTree(exchange.getRequestBody())); body=result.get();
      }
      byte[] bytes=body.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
    });server.start();return server;
  }
  private PistonRunner runner(HttpServer server) {
    return new PistonRunner(json,"http://127.0.0.1:"+server.getAddress().getPort(),"15.0.2","10.2.0","3.10.0");
  }
  @Test void discoversAndExecutesAgainstServerThatRejectsProtocolUpgrade() throws Exception {
    var requests=new AtomicInteger();var rejectedUpgrades=new AtomicInteger();
    var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
    server.createContext("/api/v2/",exchange -> {
      requests.incrementAndGet();
      boolean upgrade=exchange.getRequestHeaders().containsKey("Upgrade");
      if(upgrade) rejectedUpgrades.incrementAndGet();
      String body=upgrade?"Bad Request":exchange.getRequestURI().getPath().endsWith("runtimes")?RUNTIMES:
          "{\"run\":{\"stdout\":\"7\\n\",\"stderr\":\"\",\"code\":0,\"signal\":null,\"status\":null}}";
      exchange.getRequestBody().readAllBytes();
      byte[] bytes=body.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(upgrade?400:200,bytes.length);
      exchange.getResponseBody().write(bytes);exchange.close();
    });
    server.start();
    try {
      var runner=runner(server);assertTrue(runner.configured());
      var results=runner.execute("python","print(7)",List.of(""));
      assertEquals(3,results.getFirst().status());assertEquals("7\n",results.getFirst().stdout());
      assertEquals(2,requests.get());assertEquals(0,rejectedUpgrades.get());
    } finally {server.stop(0);}
  }
  @Test void runsEveryInputWithPinnedLanguageAndResourceLimits() throws Exception {
    var response=new AtomicReference<>("{\"run\":{\"stdout\":\"3\\n\",\"stderr\":\"\",\"code\":0,\"signal\":null,\"status\":null,\"cpu_time\":12,\"memory\":2048}}");
    var received=new ArrayList<JsonNode>();var server=server(response,received);
    try {
      var runner=runner(server);assertTrue(runner.configured());
      var results=runner.execute("python","different_variable_name=3",List.of("1","2"));
      assertEquals(2,results.size());assertEquals(3,results.getFirst().status());
      assertEquals(.012,results.getFirst().seconds());assertEquals(2,results.getFirst().memoryKb());
      var request=received.getFirst();assertEquals("3.10.0",request.path("version").asText());
      assertEquals("main.py",request.path("files").get(0).path("name").asText());
      assertEquals("different_variable_name=3",request.path("files").get(0).path("content").asText());
      assertEquals(268435456,request.path("run_memory_limit").asInt());assertEquals(3000,request.path("run_cpu_time").asInt());
      assertEquals(5000,request.path("run_timeout").asInt());
      assertEquals("2",received.get(1).path("stdin").asText());assertFalse(request.has("expected_output"));
      assertFalse(request.has("args"));assertFalse(request.has("api_key"));
    } finally {server.stop(0);}
  }
  @Test void acceptsJavaSourceLauncherWithoutSeparateCompileStage() throws Exception {
    var response=new AtomicReference<>("{\"run\":{\"stdout\":\"7\\n\",\"stderr\":\"\",\"code\":0,\"signal\":null,\"status\":null}}");
    var received=new ArrayList<JsonNode>();var server=server(response,received);
    try {
      var results=runner(server).execute("java","public class Main { public static void main(String[] args) { System.out.println(7); } }",List.of(""));
      assertEquals(3,results.getFirst().status());assertEquals("7\n",results.getFirst().stdout());
      assertEquals("Main.java",received.getFirst().path("files").get(0).path("name").asText());
      assertEquals(10000,received.getFirst().path("run_cpu_time").asInt());
      assertEquals(15000,received.getFirst().path("run_timeout").asInt());
      assertEquals(268435456,received.getFirst().path("run_memory_limit").asInt());
    } finally {server.stop(0);}
  }
  @Test void keepsCppRunLimitsSeparateFromJavaSourceCompilationAllowance() throws Exception {
    var response=new AtomicReference<>("{\"compile\":{\"code\":0},\"run\":{\"stdout\":\"7\\n\",\"code\":0}}");
    var received=new ArrayList<JsonNode>();var server=server(response,received);
    try {
      var results=runner(server).execute("cpp","int main() {}",List.of(""));
      assertEquals(3,results.getFirst().status());
      assertEquals(3000,received.getFirst().path("run_cpu_time").asInt());
      assertEquals(5000,received.getFirst().path("run_timeout").asInt());
      assertEquals(10000,received.getFirst().path("compile_cpu_time").asInt());
    } finally {server.stop(0);}
  }
  @Test void compileErrorIsNotRerunForEveryInput() throws Exception {
    var response=new AtomicReference<>("{\"compile\":{\"code\":1,\"output\":\"syntax error\"}}");
    var received=new ArrayList<JsonNode>();var server=server(response,received);
    try {
      var results=runner(server).execute("java","invalid",List.of("1","2","3"));
      assertEquals(1,received.size());assertEquals("Main.java",received.getFirst().path("files").get(0).path("name").asText());
      assertEquals(3,results.size());assertTrue(results.stream().allMatch(r->r.status()==6));
      assertEquals("syntax error",results.getFirst().compileOutput());
    } finally {server.stop(0);}
  }
  @Test void mapsTimeoutRuntimeAndInternalFailureAndRejectsMalformedSuccess() throws Exception {
    var response=new AtomicReference<String>();var received=new ArrayList<JsonNode>();var server=server(response,received);
    try {
      var runner=runner(server);
      for(var entry:Map.of("TO",5,"SG",11,"RE",11,"XX",13,"OL",11).entrySet()) {
        response.set("{\"run\":{\"stdout\":\"\",\"code\":null,\"signal\":\"SIGKILL\",\"status\":\""+entry.getKey()+"\"}}");
        assertEquals(entry.getValue().intValue(),runner.execute("python","code",List.of("")).getFirst().status());
      }
      response.set("{}");assertThrows(IllegalStateException.class,()->runner.execute("python","code",List.of("")));
      response.set("{\"run\":{\"stdout\":\"\",\"code\":0}}");
      assertThrows(IllegalStateException.class,()->runner.execute("cpp","code",List.of("")));
      assertThrows(IllegalStateException.class,()->runner.execute("javascript","code",List.of("")));
    } finally {server.stop(0);}
  }
  @Test void requiresAllThreeInstalledVersionsAndLocalDestination() throws Exception {
    var response=new AtomicReference<>("{}");var server=server(response,new ArrayList<>());
    try {
      assertFalse(new PistonRunner(json,"http://127.0.0.1:"+server.getAddress().getPort(),"99.0.0","10.2.0","3.10.0").configured());
      assertFalse(new PistonRunner(json,"","15.0.2","10.2.0","3.10.0").configured());
      for(String url:List.of("https://external.example","http://127.0.0.1.evil.example","http://user@127.0.0.1","http://127.0.0.1/api","http://127.0.0.1?token=x"))
        assertThrows(IllegalArgumentException.class,()->new PistonRunner(json,url,"15.0.2","10.2.0","3.10.0"));
    } finally {server.stop(0);}
  }
}
