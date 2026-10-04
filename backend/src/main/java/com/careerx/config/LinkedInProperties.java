package com.careerx.config;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.linkedin")
public class LinkedInProperties {
  private String clientId = "", clientSecret = "", redirectUri = "";
  public String getClientId() { return clientId; }
  public void setClientId(String value) { clientId = value; }
  public String getClientSecret() { return clientSecret; }
  public void setClientSecret(String value) { clientSecret = value; }
  public String getRedirectUri() { return redirectUri; }
  public void setRedirectUri(String value) { redirectUri = value; }
  public boolean configured() {
    if (clientId.isBlank() || clientSecret.isBlank() || redirectUri.isBlank()) return false;
    try {
      URI uri = URI.create(redirectUri);
      boolean transport = "https".equals(uri.getScheme()) ||
        ("http".equals(uri.getScheme()) && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost())));
      return transport && uri.getHost() != null && uri.getUserInfo() == null && uri.getQuery() == null &&
        uri.getFragment() == null && "/api/linkedin/callback".equals(uri.getPath());
    } catch (IllegalArgumentException ex) { return false; }
  }
}
