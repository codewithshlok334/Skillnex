package com.careerx.config;

import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetAvailability {

  private final boolean available;

  public PasswordResetAvailability(
    @Value("${app.demo}") boolean demo,
    @Value("${spring.mail.host:}") String smtpHost
  ) {
    String host = smtpHost == null ? "" : smtpHost.strip().toLowerCase(Locale.ROOT);
    available = demo || (!host.isBlank() && !Set.of("localhost", "127.0.0.1", "::1", "[::1]").contains(host));
  }

  public boolean available() {
    return available;
  }
}
