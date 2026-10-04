package com.careerx.service;

import com.careerx.config.LinkedInProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

/** Fixed provider endpoints; tokens exist only during this request and are never stored. */
@Service
public class LinkedInClient {
  public record Profile(String subject, String name) {}
  private final LinkedInProperties settings;
  private final ObjectMapper json;
  private final HttpClient http;
  private final JwtDecoder decoder;

  @org.springframework.beans.factory.annotation.Autowired
  public LinkedInClient(LinkedInProperties settings, ObjectMapper json) {
    this(settings, json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
      .followRedirects(HttpClient.Redirect.NEVER).build(), createDecoder());
  }
  LinkedInClient(LinkedInProperties settings, ObjectMapper json, HttpClient http, JwtDecoder decoder) {
    this.settings = settings; this.json = json;
    this.http = http; this.decoder = decoder;
  }
  private static JwtDecoder createDecoder() {
    var decoder = NimbusJwtDecoder.withJwkSetUri("https://www.linkedin.com/oauth/openid/jwks").build();
    decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("https://www.linkedin.com"));
    return decoder;
  }

  public String authorizationUrl(String state, String nonce) {
    return "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=" + enc(settings.getClientId()) +
      "&redirect_uri=" + enc(settings.getRedirectUri()) + "&scope=openid%20profile&state=" + enc(state) + "&nonce=" + enc(nonce);
  }

  public Profile exchange(String code, String nonce) {
    try {
      String form = "grant_type=authorization_code&code=" + enc(code) + "&client_id=" + enc(settings.getClientId()) +
        "&client_secret=" + enc(settings.getClientSecret()) + "&redirect_uri=" + enc(settings.getRedirectUri());
      var response = http.send(HttpRequest.newBuilder(URI.create("https://www.linkedin.com/oauth/v2/accessToken"))
        .timeout(Duration.ofSeconds(15)).header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(form)).build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200 || response.body().length() > 100000) throw new IllegalStateException();
      var tokens = json.readTree(response.body());
      String access = tokens.path("access_token").asText();
      if (access.isBlank() || access.length() > 16000) throw new IllegalStateException();
      Jwt identity = decoder.decode(tokens.path("id_token").asText());
      if (identity.getIssuer() == null || !"https://www.linkedin.com".equals(identity.getIssuer().toString()) ||
          !identity.getAudience().contains(settings.getClientId()) || identity.getExpiresAt() == null ||
          !identity.getExpiresAt().isAfter(Instant.now()) || !nonce.equals(identity.getClaimAsString("nonce")) ||
          ((identity.getAudience().size() > 1 || identity.hasClaim("azp")) && !settings.getClientId().equals(identity.getClaimAsString("azp"))))
        throw new IllegalStateException();
      var info = http.send(HttpRequest.newBuilder(URI.create("https://api.linkedin.com/v2/userinfo"))
        .timeout(Duration.ofSeconds(15)).header("Authorization", "Bearer " + access).GET().build(), HttpResponse.BodyHandlers.ofString());
      if (info.statusCode() != 200 || info.body().length() > 100000) throw new IllegalStateException();
      var profile = json.readTree(info.body());
      String sub = profile.path("sub").asText(), name = profile.path("name").asText();
      if (sub.isBlank() || sub.length() > 255 || !sub.equals(identity.getSubject()) || name.isBlank() || name.length() > 300)
        throw new IllegalStateException();
      // No email, picture request, contacts, posts or messages are retained.
      return new Profile(sub, name);
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt(); throw new IllegalStateException("LinkedIn connection failed.");
    } catch (Exception ex) {
      // Never propagate provider bodies, authorization codes or token-bearing exceptions.
      throw new IllegalStateException("LinkedIn connection failed. Try connecting again.");
    }
  }

  private static String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
}
