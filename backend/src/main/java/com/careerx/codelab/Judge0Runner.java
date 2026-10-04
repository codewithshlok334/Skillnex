package com.careerx.codelab;

import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/** Only the configured sandbox executes code. No ProcessBuilder or host execution fallback. */
@Component
@ConditionalOnProperty(name="app.codelab.provider", havingValue="judge0", matchIfMissing=true)
public class Judge0Runner implements CodeRunner {
  private final ObjectMapper json;
  private final String url,key,host;
  private final Map<String,Integer> languages;
  private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
    .followRedirects(HttpClient.Redirect.NEVER).build();
  public Judge0Runner(ObjectMapper json,
      @Value("${app.codelab.runner-url:}") String url,
      @Value("${app.codelab.runner-key:}") String key,
      @Value("${app.codelab.rapidapi-host:}") String host,
      @Value("${app.codelab.java-id:62}") int javaId,
      @Value("${app.codelab.cpp-id:54}") int cppId,
      @Value("${app.codelab.python-id:71}") int pythonId) {
    this.json=json; this.url=url.trim().replaceAll("/+$",""); this.key=key; this.host=host;
    languages=Map.of("java",javaId,"cpp",cppId,"python",pythonId);
    if (!this.url.isBlank()) {
      URI uri=URI.create(this.url);
      if (uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null ||
          !(uri.getScheme().equals("https") || (uri.getScheme().equals("http") &&
          Set.of("localhost","127.0.0.1","judge0","runner").contains(uri.getHost()))))
        throw new IllegalArgumentException("Use HTTPS or a local sandbox for CodeLab");
    }
  }
  public boolean configured() { return !url.isBlank(); }
  public String destination() { return configured() ? URI.create(url).getHost() : "Not connected"; }
  public List<Execution> execute(String language,String source,List<String> inputs) throws Exception {
    if (!configured() || !languages.containsKey(language)) throw new IllegalStateException("Runner unavailable");
    var submissions=json.createArrayNode();
    for (String input:inputs) {
      var entry=submissions.addObject();
      entry.put("language_id",languages.get(language)).put("source_code",encode(source)).put("stdin",encode(input))
        .put("enable_network",false).put("cpu_time_limit",3).put("wall_time_limit",10)
        .put("memory_limit",262144).put("max_file_size",64).put("max_processes_and_or_threads",64);
    }
    JsonNode created=request("POST","/submissions/batch?base64_encoded=true",json.createObjectNode().set("submissions",submissions));
    if (!created.isArray() || created.size()!=inputs.size()) throw new IllegalStateException("Invalid runner response");
    List<String> tokens=new ArrayList<>();
    for (JsonNode entry:created) {
      String token=entry.path("token").asText();
      if (!token.matches("[a-fA-F0-9-]{36}")) throw new IllegalStateException("Runner rejected submission");
      tokens.add(token);
    }
    long deadline=System.nanoTime()+Duration.ofSeconds(75).toNanos();
    while (System.nanoTime()<deadline) {
      JsonNode batch=request("GET","/submissions/batch?tokens="+String.join(",",tokens)+
        "&base64_encoded=true&fields=token,status,stdout,stderr,compile_output,time,memory",null).path("submissions");
      Map<String,JsonNode> byToken=new HashMap<>();
      for(JsonNode result:batch) byToken.put(result.path("token").asText(),result);
      if (tokens.stream().allMatch(t -> byToken.containsKey(t) && byToken.get(t).path("status").path("id").asInt()>2)) {
        List<Execution> results=new ArrayList<>();
        for(String token:tokens) {
          var result=byToken.get(token);
          results.add(new Execution(result.path("status").path("id").asInt(),decode(result.path("stdout")),
            decode(result.path("stderr")),decode(result.path("compile_output")),result.path("time").asDouble(),result.path("memory").asLong()));
        }
        return results;
      }
      Thread.sleep(700);
    }
    throw new java.util.concurrent.TimeoutException("The runner did not finish in time");
  }
  private JsonNode request(String method,String path,JsonNode body) throws Exception {
    var builder=HttpRequest.newBuilder(URI.create(url+path)).timeout(Duration.ofSeconds(12)).header("Accept","application/json");
    if (!key.isBlank()) builder.header(host.isBlank()?"X-Auth-Token":"X-RapidAPI-Key",key);
    if (!host.isBlank()) builder.header("X-RapidAPI-Host",host);
    if(method.equals("POST")) builder.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
    else builder.GET();
    var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofInputStream());
    try(var stream=response.body()) {
      byte[] bytes=stream.readNBytes(2_000_001);
      if(response.statusCode()/100!=2 || bytes.length>2_000_000) throw new IllegalStateException("Runner unavailable");
      return json.readTree(bytes);
    }
  }
  private static String encode(String s) { return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8)); }
  private static String decode(JsonNode n) {
    if(n.isNull() || n.isMissingNode()) return "";
    return new String(Base64.getDecoder().decode(n.asText()),StandardCharsets.UTF_8);
  }
}
