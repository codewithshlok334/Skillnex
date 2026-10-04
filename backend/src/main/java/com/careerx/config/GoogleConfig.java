package com.careerx.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.*;

@Configuration
@ConditionalOnProperty(name = "app.google-enabled", havingValue = "true")
public class GoogleConfig {

  @Bean
  ClientRegistrationRepository registrations(
    @Value("${GOOGLE_CLIENT_ID}") String id,
    @Value("${GOOGLE_CLIENT_SECRET}") String secret
  ) {
    return new InMemoryClientRegistrationRepository(
      CommonOAuth2Provider.GOOGLE.getBuilder("google")
        .clientId(id)
        .clientSecret(secret)
        .scope("openid", "profile", "email")
        .build()
    );
  }
}
