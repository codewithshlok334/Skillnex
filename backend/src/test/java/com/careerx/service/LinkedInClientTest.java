package com.careerx.service;

import com.careerx.config.LinkedInProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LinkedInClientTest {
  LinkedInProperties settings;
  HttpClient http;
  JwtDecoder decoder;
  LinkedInClient client;
  @BeforeEach void setup() throws Exception {
    settings=new LinkedInProperties(); settings.setClientId("client"); settings.setClientSecret("private-secret");
    settings.setRedirectUri("https://skillnex.example/api/linkedin/callback");
    http=mock(HttpClient.class); decoder=mock(JwtDecoder.class);
    client=new LinkedInClient(settings,new ObjectMapper(),http,decoder);
    HttpResponse<String> token=response("{\"access_token\":\"private-access\",\"id_token\":\"signed-token\"}");
    HttpResponse<String> info=response("{\"sub\":\"member\",\"name\":\"Member Name\",\"email\":\"private@example.test\",\"picture\":\"https://photo.example/x\"}");
    when(http.send(any(HttpRequest.class),any(HttpResponse.BodyHandler.class))).thenReturn(token,info);
    when(decoder.decode("signed-token")).thenReturn(identity("client","nonce","https://www.linkedin.com",Instant.now().plusSeconds(300)));
  }
  @SuppressWarnings("unchecked") HttpResponse<String> response(String body) {
    HttpResponse<String> response=mock(HttpResponse.class); when(response.statusCode()).thenReturn(200); when(response.body()).thenReturn(body); return response;
  }
  Jwt identity(String audience,String nonce,String issuer,Instant expiry) {
    return Jwt.withTokenValue("signed-token").header("alg","RS256").issuer(issuer).subject("member")
      .audience(List.of(audience)).issuedAt(Instant.now().minusSeconds(30)).expiresAt(expiry).claim("nonce",nonce).build();
  }
  @Test void onlyRequestsBasicScopeAndReturnsMinimalProfile() throws Exception {
    String url=client.authorizationUrl("state","nonce");
    assertTrue(url.startsWith("https://www.linkedin.com/oauth/v2/authorization?"));
    assertTrue(url.contains("scope=openid%20profile")); assertFalse(url.contains("email")); assertFalse(url.contains("private-secret"));
    var result=client.exchange("auth-code","nonce"); assertEquals(new LinkedInClient.Profile("member","Member Name"),result);
    var requests=org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
    verify(http,times(2)).send(requests.capture(),any(HttpResponse.BodyHandler.class));
    assertEquals("https://www.linkedin.com/oauth/v2/accessToken",requests.getAllValues().get(0).uri().toString());
    assertEquals("https://api.linkedin.com/v2/userinfo",requests.getAllValues().get(1).uri().toString());
    assertEquals("Bearer private-access",requests.getAllValues().get(1).headers().firstValue("Authorization").orElseThrow());
  }
  @Test void rejectsBadAudienceNonceIssuerAndExpiredIdentityBeforeUserinfo() throws Exception {
    for(Jwt jwt:List.of(identity("wrong","nonce","https://www.linkedin.com",Instant.now().plusSeconds(300)),
        identity("client","wrong","https://www.linkedin.com",Instant.now().plusSeconds(300)),
        identity("client","nonce","https://evil.test",Instant.now().plusSeconds(300)),
        identity("client","nonce","https://www.linkedin.com",Instant.now().minusSeconds(2)))) {
      var tokenReply=response("{\"access_token\":\"private-access\",\"id_token\":\"signed-token\"}");
      when(http.send(any(HttpRequest.class),any(HttpResponse.BodyHandler.class))).thenReturn(tokenReply);
      when(decoder.decode(anyString())).thenReturn(jwt);
      assertThrows(IllegalStateException.class,()->client.exchange("code","nonce"));
    }
    verify(http,times(4)).send(any(HttpRequest.class),any(HttpResponse.BodyHandler.class));
  }
  @Test void rejectsInvalidSignatureAndMismatchedUserinfoWithoutLeakingTokens() throws Exception {
    when(decoder.decode(anyString())).thenThrow(new JwtException("private-access signature error"));
    var error=assertThrows(IllegalStateException.class,()->client.exchange("code","nonce"));
    assertFalse(error.getMessage().contains("private-access")); assertNull(error.getCause());
    reset(http,decoder);
    when(decoder.decode(anyString())).thenReturn(identity("client","nonce","https://www.linkedin.com",Instant.now().plusSeconds(300)));
    var tokenReply=response("{\"access_token\":\"private-access\",\"id_token\":\"signed-token\"}");
    var userReply=response("{\"sub\":\"other-member\",\"name\":\"Other person\"}");
    when(http.send(any(HttpRequest.class),any(HttpResponse.BodyHandler.class))).thenReturn(tokenReply,userReply);
    assertThrows(IllegalStateException.class,()->client.exchange("code","nonce"));
  }
}

