package com.careerx;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.careerx.ai.AIService;
import com.careerx.config.PasswordResetAvailability;
import com.careerx.controller.AuthController;
import com.careerx.controller.UserController;
import com.careerx.dto.Requests.Email;
import com.careerx.exception.ApiErrors;
import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import com.careerx.security.Tokens;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PasswordResetAvailabilityTest {

  private final Store db = mock(Store.class);
  private final RateLimit rate = mock(RateLimit.class);
  private final JavaMailSender mail = mock(JavaMailSender.class);

  private AuthController controller(boolean demo, String host) {
    return new AuthController(db, mock(PasswordEncoder.class), mock(Tokens.class), rate, mail,
      new PasswordResetAvailability(demo, host), demo, "https://skillnex.example", "support@example.com");
  }

  @Test
  void onlyDemoOrConfiguredRemoteMailEnablesRecovery() {
    for (String host : new String[] {null, "", "  ", "localhost", " LOCALHOST ", "127.0.0.1", "::1", "[::1]"}) {
      assertFalse(new PasswordResetAvailability(false, host).available());
      assertTrue(new PasswordResetAvailability(true, host).available());
    }
    assertTrue(new PasswordResetAvailability(false, "smtp.example.com").available());
  }

  @Test
  void missingDeliveryIsPublicAndRejectsEveryAccountBeforeLookup() throws Exception {
    var user = new UserController(db, mock(AIService.class), new PasswordResetAvailability(false, "localhost"), false, false);
    var mvc = MockMvcBuilders.standaloneSetup(controller(false, "localhost"), user)
      .setControllerAdvice(new ApiErrors()).build();
    mvc.perform(get("/api/config")).andExpect(status().isOk())
      .andExpect(jsonPath("$.passwordResetAvailable").value(false));
    String first = null;
    for (String email : List.of("existing@example.com", "unknown@example.com")) {
      String response = mvc.perform(post("/api/auth/forgot-password").contentType("application/json")
        .content("{\"email\":\"" + email + "\"}"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("email delivery has not been set up")))
        .andReturn().getResponse().getContentAsString();
      if (first == null) first = response;
      else assertEquals(first, response);
    }
    verifyNoInteractions(db, rate, mail);
  }

  @Test
  void demoKeepsItsLocalResetLinkWithoutAnEmailProvider() {
    when(db.list(anyString(), eq("demo@example.com"))).thenReturn(List.of(Map.of("id", "member")));
    var result = (Map<?, ?>) controller(true, "localhost").forgot(new Email("demo@example.com"), new MockHttpServletRequest());
    assertTrue(result.get("demoResetUrl").toString().startsWith("/reset-password?token="));
    verifyNoInteractions(mail);
  }

  @Test
  void configuredMailFailureDoesNotRevealAccountExistenceOrLeaveAUsableToken() {
    when(db.list(anyString(), eq("existing@example.com"))).thenReturn(List.of(Map.of("id", "member")));
    when(db.list(anyString(), eq("unknown@example.com"))).thenReturn(List.of());
    doThrow(new MailSendException("delivery failed")).when(mail).send(any(SimpleMailMessage.class));
    var auth = controller(false, "smtp.example.com");
    var existing = (Map<?, ?>) auth.forgot(new Email("existing@example.com"), new MockHttpServletRequest());
    var unknown = (Map<?, ?>) auth.forgot(new Email("unknown@example.com"), new MockHttpServletRequest());
    assertEquals(existing, unknown);
    assertFalse(existing.containsKey("demoResetUrl"));
    verify(db, times(2)).exec("DELETE FROM password_resets WHERE user_id=?", "member");
  }

  @Test
  void configuredDeliverySendsTheLinkWithoutExposingItsTokenInTheResponse() {
    when(db.list(anyString(), eq("existing@example.com"))).thenReturn(List.of(Map.of("id", "member")));
    var result = (Map<?, ?>) controller(false, "smtp.example.com")
      .forgot(new Email("existing@example.com"), new MockHttpServletRequest());
    var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail).send(message.capture());
    assertArrayEquals(new String[] {"existing@example.com"}, message.getValue().getTo());
    assertTrue(message.getValue().getText().contains("https://skillnex.example/reset-password?token="));
    assertEquals(1, result.size());
    var user = new UserController(db, mock(AIService.class), new PasswordResetAvailability(false, "smtp.example.com"), false, false);
    assertEquals(true, ((Map<?, ?>) user.config()).get("passwordResetAvailable"));
  }
}
