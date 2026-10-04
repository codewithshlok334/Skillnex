package com.careerx.codelab;

import com.careerx.security.RateLimit;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/codelab") @Validated
public class CodeLabController {
  private final CodeLabService service;
  private final RateLimit rate;
  public CodeLabController(CodeLabService service,RateLimit rate) { this.service=service; this.rate=rate; }
  public record Draft(@NotNull @Size(max=40000) String code,@Min(0) int revision) {}
  public record Submission(@NotBlank @Size(max=40000) String code,@NotBlank String language,
    @Pattern(regexp="RUN|SUBMIT") @NotNull String mode,@Pattern(regexp="[a-fA-F0-9-]{36}") @NotNull String requestKey) {}
  @ModelAttribute void headers(HttpServletResponse res) { res.setHeader("Cache-Control","no-store"); }
  @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
  @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
  public Object invalidFilter() { return Map.of("message","Check the CodeLab filters or request fields."); }
  @GetMapping("/status") public Object status() { return service.runnerStatus(); }
  @GetMapping("/questions") public Object questions(Principal user,
    @RequestParam(defaultValue="") @Size(max=120) String search,@RequestParam(defaultValue="") @Size(max=50) String topic,
    @RequestParam(defaultValue="") @Pattern(regexp="|Easy|Medium|Hard") String difficulty,
    @RequestParam(defaultValue="") @Pattern(regexp="|solved|todo") String state,
    @RequestParam(defaultValue="0") @Min(0) @Max(1000) int page) { return service.catalog(user.getName(),search,topic,difficulty,state,page); }
  @GetMapping("/questions/{id}") public Object question(@PathVariable int id,@RequestParam(defaultValue="python") String language,Principal user) { return service.detail(user.getName(),id,language); }
  @GetMapping("/questions/{id}/hints") public Object hints(@PathVariable int id) { return service.hints(id); }
  @GetMapping("/questions/{id}/solution") public Object solution(@PathVariable int id,@RequestParam String language) { return service.solution(id,language); }
  @PutMapping("/questions/{id}/draft") public Object draft(@PathVariable int id,@RequestParam String language,@Valid @RequestBody Draft input,Principal user) {
    rate.check("codelab-draft:"+user.getName(),120,600); return service.saveDraft(user.getName(),id,language,input.code(),input.revision());
  }
  @PostMapping("/questions/{id}/submissions") public Object submit(@PathVariable int id,@Valid @RequestBody Submission input,Principal user) {
    rate.check("codelab-run:"+user.getName(),40,600);
    return Map.of("id",service.submit(user.getName(),id,input.language(),input.code(),input.mode(),input.requestKey()));
  }
  @GetMapping("/submissions/{id}") public Object submission(@PathVariable String id,Principal user) { return service.submission(user.getName(),id); }
  @GetMapping("/questions/{id}/submissions") public Object history(@PathVariable int id,Principal user) { return service.history(user.getName(),id); }
}
