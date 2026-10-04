package com.careerx;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.careerx.controller.FrontendController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SingleSiteHostingTest {
  @Autowired MockMvc mvc;

  @Test
  void directNavigationAndRefreshServeTheShellWithoutAuthentication() throws Exception {
    for (String route : new String[] {"/", "/login", "/signup", "/forgot-password", "/reset-password",
        "/demo", "/app", "/app/resumes", "/app/codelab/42", "/app/interviews/session-123", "/app/admin"}) {
      mvc.perform(get(route).accept(MediaType.TEXT_HTML))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
        .andExpect(content().string(containsString("SPA_TEST_SHELL")))
        .andExpect(header().string("Cache-Control", containsString("no-store")));
    }
    mvc.perform(head("/app/codelab/42")).andExpect(status().isOk());
  }

  @Test
  void javascriptAndMissingAssetsNeverReceiveTheHtmlShell() throws Exception {
    mvc.perform(get("/assets/hosting-test.js"))
      .andExpect(status().isOk())
      .andExpect(content().string(containsString("window.skillnexHostingTest")))
      .andExpect(content().string(not(containsString("SPA_TEST_SHELL"))));
    mvc.perform(get("/assets/missing.js"))
      .andExpect(status().isNotFound())
      .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
      .andExpect(jsonPath("$.message").value("Not found."));
  }

  @Test
  void frontendHeadersPermitOnlyTheNeededVoiceAndAssetOrigins() throws Exception {
    mvc.perform(get("/login"))
      .andExpect(header().string("Content-Security-Policy", allOf(
        containsString("script-src 'self'"), containsString("media-src 'self' blob:"),
        containsString("connect-src 'self' wss://generativelanguage.googleapis.com"),
        containsString("frame-ancestors 'none'"))))
      .andExpect(header().string("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()"))
      .andExpect(header().string("X-Content-Type-Options", "nosniff"));
  }

  @Test
  void apiAuthenticationAdminAuthorizationAndMissingRoutesStaySeparate() throws Exception {
    mvc.perform(get("/api/config")).andExpect(status().isOk())
      .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    mvc.perform(get("/api/resumes")).andExpect(status().isUnauthorized())
      .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    mvc.perform(get("/api/admin/users").with(user("student").roles("STUDENT")))
      .andExpect(status().isForbidden());
    mvc.perform(get("/api/missing-route").with(user("student").roles("STUDENT")))
      .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Not found."));
    mvc.perform(get("/not-a-frontend-route").with(user("student").roles("STUDENT")))
      .andExpect(status().isNotFound());
    mvc.perform(post("/app/resumes").header("Origin", "http://localhost:5173"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void oauthPathsAreNotCapturedByTheLoginPage() throws Exception {
    // OAuth is disabled in the test profile, so these are real 404s instead of HTML.
    for (String route : new String[] {"/oauth2/authorization/google", "/login/oauth2/code/google"}) {
      mvc.perform(get(route)).andExpect(status().isNotFound())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.message").value("Not found."));
    }
  }

  @Test
  void noFrontendControllerIsRegisteredWithoutTheBundledIndex() {
    new ApplicationContextRunner().withUserConfiguration(FrontendController.class)
      .withClassLoader(new FilteredClassLoader(new ClassPathResource("static/index.html")))
      .run(context -> assertThat(context).doesNotHaveBean(FrontendController.class));
  }
}
