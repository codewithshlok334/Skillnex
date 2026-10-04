package com.careerx.security;

import com.careerx.repository.Store;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RateLimit {

  private final Store db;

  public RateLimit(Store db) {
    this.db = db;
  }

  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
  public void check(String key, int limit, int seconds) {
    try {
      db.exec(
        "INSERT INTO rate_limits(bucket_key,count,window_start) VALUES(?,0,0) ON CONFLICT DO NOTHING",
        key
      );
    } catch (org.springframework.dao.DataAccessException e) {
      if (!db.exists("SELECT 1 FROM rate_limits WHERE bucket_key=?", key)) throw e;
    }
    var row = db.one("SELECT * FROM rate_limits WHERE bucket_key=? FOR UPDATE", key);
    long now = System.currentTimeMillis() / 1000;
    long start = ((Number) row.get("window_start")).longValue();
    int count = ((Number) row.get("count")).intValue();
    if (now - start >= seconds) {
      count = 0;
      start = now;
    }
    if (count >= limit) throw new ResponseStatusException(
      HttpStatus.TOO_MANY_REQUESTS,
      "Too many requests. Please try again shortly."
    );
    db.exec(
      "UPDATE rate_limits SET count=?,window_start=? WHERE bucket_key=?",
      count + 1,
      start,
      key
    );
  }
}
