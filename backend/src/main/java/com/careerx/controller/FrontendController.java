package com.careerx.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Serves only React page routes; Spring continues to own APIs, OAuth and assets. */
@Controller
@ConditionalOnResource(resources = "classpath:/static/index.html")
public class FrontendController {
  @GetMapping(value = {
    "/", "/login", "/signup", "/forgot-password", "/reset-password", "/demo", "/app", "/app/**"
  }, produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<Resource> page() {
    return ResponseEntity.ok()
      .contentType(MediaType.TEXT_HTML)
      .cacheControl(CacheControl.noStore())
      .body(new ClassPathResource("static/index.html"));
  }
}
