package com.careerx.achievements;

import com.careerx.repository.Store;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Existing accepted solutions qualify too; grants are idempotent and owner-scoped. */
@Component
public class AchievementBackfill implements ApplicationRunner {
  private final Store db; private final AchievementService achievements;
  public AchievementBackfill(Store db,AchievementService achievements){this.db=db;this.achievements=achievements;}
  @Override public void run(ApplicationArguments args) {
    for(var row:db.list("SELECT DISTINCT user_id FROM code_submissions WHERE mode='SUBMIT' AND status='ACCEPTED'")) achievements.coding((String)row.get("user_id"));
  }
}
