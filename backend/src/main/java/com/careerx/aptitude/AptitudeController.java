package com.careerx.aptitude;

import com.careerx.security.RateLimit;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/aptitude") @Validated
public class AptitudeController {
  private final AptitudeService service;
  private final RateLimit rate;
  public AptitudeController(AptitudeService service, RateLimit rate) { this.service=service; this.rate=rate; }
  public record Answer(@NotNull @Min(0) @Max(3) Integer answerIndex,
    @NotNull @Pattern(regexp="[a-fA-F0-9-]{36}") String requestKey) {}
  public record Start(@NotNull @Pattern(regexp="|Quantitative|Reasoning|Verbal") String category,
    @NotNull @Pattern(regexp="|Easy|Medium|Hard") String difficulty,
    @Min(1) @Max(100) int count, @Min(1) @Max(180) int minutes,
    @NotNull @Pattern(regexp="[a-fA-F0-9-]{36}") String requestKey) {}
  public record Save(@Min(1) int questionId, @Min(0) @Max(3) Integer answerIndex,
    boolean marked, @Min(0) int revision) {}
  @ModelAttribute void headers(HttpServletResponse response) { response.setHeader("Cache-Control","no-store"); }
  @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
  @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
  Object invalid() { return Map.of("message","Please check the aptitude filters or answers."); }
  @GetMapping("/questions") Object catalog(Principal user,
    @RequestParam(defaultValue="") @Size(max=120) String search,
    @RequestParam(defaultValue="") @Pattern(regexp="|Quantitative|Reasoning|Verbal") String category,
    @RequestParam(defaultValue="") @Size(max=70) String topic,
    @RequestParam(defaultValue="") @Pattern(regexp="|Easy|Medium|Hard") String difficulty,
    @RequestParam(defaultValue="") @Pattern(regexp="|solved|todo") String progress,
    @RequestParam(defaultValue="") @Pattern(regexp="|ORIGINAL|GATE_PYQ") String source,
    @RequestParam(defaultValue="0") @Min(0) @Max(1000) int page) {
    return service.catalog(user.getName(),search,category,topic,difficulty,progress,source,page);
  }
  @GetMapping("/questions/{id}") Object question(@PathVariable int id,Principal user) { return service.question(user.getName(),id); }
  @PostMapping("/questions/{id}/answers") Object answer(@PathVariable int id,@Valid @RequestBody Answer input,Principal user) {
    rate.check("aptitude-answer:"+user.getName(),150,600);
    return service.answer(user.getName(),id,input.answerIndex(),input.requestKey());
  }
  @GetMapping("/progress") Object progress(Principal user) { return service.progress(user.getName()); }
  @PostMapping("/mocks") Object start(@Valid @RequestBody Start input,Principal user) {
    rate.check("aptitude-mock:"+user.getName(),20,600); return service.start(user.getName(),input);
  }
  @GetMapping("/mocks/{id}") Object mock(@PathVariable String id,Principal user) { return service.mock(user.getName(),id); }
  @PutMapping("/mocks/{id}/answers") Object save(@PathVariable String id,@Valid @RequestBody Save input,Principal user) {
    rate.check("aptitude-save:"+user.getName(),400,600); return service.save(user.getName(),id,input);
  }
  @PostMapping("/mocks/{id}/submit") Object submit(@PathVariable String id,Principal user) { return service.submit(user.getName(),id); }
}
