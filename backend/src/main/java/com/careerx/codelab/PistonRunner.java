package com.careerx.codelab;

import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Local Piston/Isolate sandbox only. No program is executed by the Windows web server. */
@Component
@ConditionalOnProperty(name="app.codelab.provider", havingValue="piston")
public class PistonRunner implements CodeRunner {
  private final ObjectMapper json;
  private final String url;
  private final Map<String,String> versions;
  // Piston's Express/WebSocket server rejects Java's default cleartext HTTP/2 upgrade.
  private final HttpClient http=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(2))
      .followRedirects(HttpClient.Redirect.NEVER).build();
  private volatile long checkedAt;
  private volatile boolean available;

  public PistonRunner(ObjectMapper json,
      @Value("${app.codelab.runner-url:}") String url,
      @Value("${app.codelab.java-version:15.0.2}") String javaVersion,
      @Value("${app.codelab.cpp-version:10.2.0}") String cppVersion,
      @Value("${app.codelab.python-version:3.10.0}") String pythonVersion) {
    this.json=json;
    this.url=url.strip().replaceAll("/+$","");
    versions=Map.of("java",javaVersion,"cpp",cppVersion,"python",pythonVersion);
    if(!this.url.isBlank()) {
      URI uri=URI.create(this.url);
      if(!"http".equals(uri.getScheme()) || !Set.of("127.0.0.1","localhost","piston").contains(Objects.toString(uri.getHost(),""))
          || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null || !uri.getPath().isEmpty())
        throw new IllegalArgumentException("Local Piston must use a loopback HTTP address without a path or credentials");
    }
    if(versions.values().stream().anyMatch(v -> !v.matches("\\d+\\.\\d+\\.\\d+")))
      throw new IllegalArgumentException("Pin each local runtime to its installed version");
  }

  public synchronized boolean configured() {
    if(url.isBlank()) return false;
    long now=System.nanoTime();
    if(checkedAt!=0 && now-checkedAt<Duration.ofSeconds(5).toNanos()) return available;
    try {
      JsonNode runtimes=request("/runtimes",null,3);
      available=runtimes.isArray() && versions.entrySet().stream().allMatch(entry -> {
        for(JsonNode runtime:runtimes) {
          if(!entry.getValue().equals(runtime.path("version").asText())) continue;
          if(entry.getKey().equals(runtime.path("language").asText())) return true;
          for(JsonNode alias:runtime.path("aliases")) if(entry.getKey().equals(alias.asText())) return true;
        }
        return false;
      });
    } catch(Exception ex) {
      if(ex instanceof InterruptedException) Thread.currentThread().interrupt();
      available=false;
    }
    checkedAt=System.nanoTime();
    return available;
  }
  public String destination() { return "Local sandbox on this computer"; }

  public List<Execution> execute(String language,String source,List<String> inputs) throws Exception {
    if(!versions.containsKey(language) || !configured()) throw new IllegalStateException("Start the local CodeLab runner first");
    String filename=switch(language) { case "java" -> "Main.java"; case "cpp" -> "main.cpp"; default -> "main.py"; };
    // Java's Piston source launcher compiles within the run stage. Include that
    // bounded startup cost without relaxing Python or C++ execution limits.
    int runTimeout=language.equals("java")?15000:5000;
    int runCpuTime=language.equals("java")?10000:3000;
    var results=new ArrayList<Execution>();
    long deadline=System.nanoTime()+Duration.ofSeconds(150).toNanos();
    for(String input:inputs) {
      if(Thread.currentThread().isInterrupted()) throw new InterruptedException();
      if(System.nanoTime()>deadline) throw new java.util.concurrent.TimeoutException("Local runner took too long");
      var payload=json.createObjectNode();
      payload.put("language",language).put("version",versions.get(language)).put("stdin",input)
          .put("compile_timeout",10000).put("run_timeout",runTimeout)
          .put("compile_cpu_time",10000).put("run_cpu_time",runCpuTime)
          .put("compile_memory_limit",536870912).put("run_memory_limit",268435456);
      payload.putArray("files").addObject().put("name",filename).put("content",source).put("encoding","utf8");
      JsonNode response=request("/execute",payload,35);
      JsonNode compile=response.path("compile");
      if(!compile.isMissingNode() && !succeeded(compile)) {
        if(!compile.isObject()) throw new IllegalStateException("Invalid compile response");
        int status="XX".equals(compile.path("status").asText())?13:6;
        var failure=new Execution(status,"","",compile.path("output").asText(compile.path("stderr").asText()),0,0);
        // Compilation does not depend on stdin. Reuse this verdict without repeatedly compiling bad code.
        while(results.size()<inputs.size()) results.add(failure);
        break;
      }
      // Piston's Java package uses Java's source-file launcher and returns only a run stage.
      if(language.equals("cpp") && !compile.isObject()) throw new IllegalStateException("Missing compilation result");
      JsonNode run=response.path("run");
      if(!run.isObject() || !run.has("stdout") || !run.has("code")) throw new IllegalStateException("Invalid execution result");
      String state=run.path("status").asText("");
      int status=succeeded(run)?3:state.equals("TO")?5:state.equals("XX")?13:11;
      results.add(new Execution(status,run.path("stdout").asText(),run.path("stderr").asText(),"",
          Math.max(0,run.path("cpu_time").asDouble())/1000.0,Math.max(0,run.path("memory").asLong())/1024));
    }
    return results;
  }
  private static boolean succeeded(JsonNode stage) {
    String status=stage.path("status").asText("");
    return stage.path("code").isIntegralNumber() && stage.path("code").asInt()==0
        && (stage.path("signal").isNull() || stage.path("signal").isMissingNode())
        && (status.isEmpty() || status.equals("OK"));
  }
  private JsonNode request(String path,JsonNode payload,int timeout) throws Exception {
    var builder=HttpRequest.newBuilder(URI.create(url+"/api/v2"+path)).timeout(Duration.ofSeconds(timeout)).header("Accept","application/json");
    if(payload==null) builder.GET();
    else builder.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)));
    var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofInputStream());
    try(var stream=response.body()) {
      byte[] body=stream.readNBytes(1_000_001);
      if(response.statusCode()/100!=2 || body.length>1_000_000) throw new IllegalStateException("Local sandbox unavailable");
      return json.readTree(body);
    }
  }
}
