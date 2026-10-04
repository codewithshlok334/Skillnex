package com.careerx.service;

import com.careerx.ai.*;
import com.careerx.repository.Store;
import com.careerx.security.RateLimit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CommunityService {

  private final Store db;
  private final AIService ai;
  private final CommunityAIService community;
  private final RateLimit rate;

  public CommunityService(Store db, AIService ai, CommunityAIService community, RateLimit rate) {
    this.db = db;
    this.ai = ai;
    this.community = community;
    this.rate = rate;
  }

  public Object search(
    String query,
    String category,
    int page,
    String sort,
    String uid,
    boolean bookmarked
  ) {
    page = Math.max(0, Math.min(page, 10000));
    query = query == null ? "" : query.strip();
    if (query.length() > 250) throw new IllegalArgumentException();
    String filter = " WHERE q.hidden=FALSE";
    List<Object> args = new ArrayList<>();
    if (category != null && !category.isBlank()) {
      filter += " AND q.category=?";
      args.add(category);
    }
    if (bookmarked) {
      filter += " AND EXISTS(SELECT 1 FROM bookmarks b WHERE b.question_id=q.id AND b.user_id=?)";
      args.add(uid);
    }
    String select =
      "SELECT q.id,q.title,q.body,q.category,q.created_at,u.name,(SELECT COUNT(*) FROM answers a WHERE a.question_id=q.id AND a.hidden=FALSE) AS answer_count,(SELECT COUNT(*) FROM answers a WHERE a.question_id=q.id AND a.hidden=FALSE AND a.verified_by IS NOT NULL) AS verified_count FROM questions q JOIN app_users u ON u.id=q.user_id";
    boolean semantic = false;
    if (!query.isBlank() && ai.embeddingsAvailable()) {
      rate.check("search:" + uid, 30, 3600);
      try {
        double[] vector = ai.embed(query);
        var candidates = db.list(
          select.replace(
            "FROM questions q JOIN",
            " ,q.embedding,q.embedding_model FROM questions q JOIN"
          ) +
            filter +
            " AND q.embedding IS NOT NULL AND q.embedding_model=? ORDER BY q.created_at DESC LIMIT 2000",
          concat(args, ai.embeddingModel())
        );
        if (!candidates.isEmpty()) {
          var ranked = new ArrayList<Map<String, Object>>();
          for (var c : candidates) {
            var v = db.parse((String) c.remove("embedding"));
            c.remove("embedding_model");
            double score = cosine(vector, v);
            if (score > 0.2) {
              c.put("similarity", score);
              ranked.add(c);
            }
          }
          ranked.sort((a, b) ->
            Double.compare(
              ((Number) b.get("similarity")).doubleValue(),
              ((Number) a.get("similarity")).doubleValue()
            )
          );
          int start = Math.min(page * 12, ranked.size());
          return Map.of(
            "items",
            ranked.subList(start, Math.min(start + 12, ranked.size())),
            "total",
            ranked.size(),
            "page",
            page,
            "mode",
            "semantic"
          );
        }
      } catch (ResponseStatusException ignored) {}
    }
    if (!query.isBlank()) {
      String expanded = expand(query);
      filter += " AND (";
      int n = 0;
      for (String term : expanded.split("\\|")) {
        if (n++ > 0) filter += " OR ";
        filter += " LOWER(q.title || ' ' || q.body) LIKE ? ESCAPE '!'";
        args.add(
          "%" +
            term.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") +
            "%"
        );
      }
      filter += ")";
    }
    int count = db.count("SELECT COUNT(*) FROM questions q" + filter, args.toArray());
    String order = sort.equals("unanswered")
      ? "answer_count ASC,q.created_at DESC"
      : sort.equals("popular")
        ? "answer_count DESC,q.created_at DESC"
        : "q.created_at DESC";
    args.add(page * 12);
    return Map.of(
      "items",
      db.list(select + filter + " ORDER BY " + order + " LIMIT 12 OFFSET ?", args.toArray()),
      "total",
      count,
      "page",
      page,
      "mode",
      query.isBlank() ? "recent" : "expanded-keyword"
    );
  }

  private Object[] concat(List<Object> args, Object extra) {
    var copy = new ArrayList<>(args);
    copy.add(extra);
    return copy.toArray();
  }

  private String expand(String q) {
    String l = q.toLowerCase(Locale.ROOT);
    if (l.matches(".*(duplicate|redundan|normaliz|1nf|2nf|3nf).*")) return (
      q + "|normalization|functional dependenc|1nf|2nf|3nf"
    );
    if (l.matches(".*(interface|abstract).*")) return q + "|interface|abstract class";
    if (l.matches(".*(resume|cv|ats).*")) return q + "|resume|ATS";
    return q;
  }

  private double cosine(double[] a, com.fasterxml.jackson.databind.JsonNode b) {
    if (a.length != b.size()) return 0;
    double sum = 0,
      x = 0,
      y = 0;
    for (int i = 0; i < a.length; i++) {
      double v = b.path(i).asDouble();
      sum += a[i] * v;
      x += a[i] * a[i];
      y += v * v;
    }
    return x == 0 || y == 0 ? 0 : sum / Math.sqrt(x * y);
  }

  public Object detail(String id, String uid) {
    var q = new HashMap<>(
      db.one(
        "SELECT q.*,u.name FROM questions q JOIN app_users u ON u.id=q.user_id WHERE q.id=? AND q.hidden=FALSE",
        id
      )
    );
    q.remove("embedding");
    q.remove("embedding_model");
    q.put(
      "answers",
      db.list(
        "SELECT a.id,a.user_id,a.body,a.created_at,a.accepted,a.verified_by,u.name,u.role,v.name AS verifier,COALESCE((SELECT SUM(value) FROM votes WHERE answer_id=a.id),0) AS votes,COALESCE((SELECT value FROM votes WHERE answer_id=a.id AND user_id=?),0) AS my_vote FROM answers a JOIN app_users u ON u.id=a.user_id LEFT JOIN app_users v ON v.id=a.verified_by WHERE a.question_id=? AND a.hidden=FALSE ORDER BY a.created_at",
        uid,
        id
      )
    );
    q.put(
      "comments",
      db.list(
        "SELECT c.id,c.body,c.created_at,u.name FROM comments c JOIN app_users u ON u.id=c.user_id WHERE c.question_id=? ORDER BY c.created_at",
        id
      )
    );
    q.put(
      "bookmarked",
      db.exists("SELECT 1 FROM bookmarks WHERE user_id=? AND question_id=?", uid, id)
    );
    return q;
  }

  @Transactional
  public Object vote(String id, String uid, int value) {
    var answer = db.one("SELECT * FROM answers WHERE id=? AND hidden=FALSE FOR UPDATE", id);
    String owner = (String) answer.get("user_id");
    if (owner.equals(uid)) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "You cannot vote on your own answer."
    );
    int old = db
      .list("SELECT value FROM votes WHERE answer_id=? AND user_id=?", id, uid)
      .stream()
      .mapToInt(v -> ((Number) v.get("value")).intValue())
      .findFirst()
      .orElse(0);
    db.exec("DELETE FROM votes WHERE answer_id=? AND user_id=?", id, uid);
    if (value != 0) db.exec(
      "INSERT INTO votes(user_id,answer_id,value) VALUES(?,?,?)",
      uid,
      id,
      value
    );
    db.reputation(owner, (value - old) * 5);
    return Map.of("ok", true);
  }

  @Transactional
  public Object verify(String id, String uid) {
    var role = db.one("SELECT role FROM app_users WHERE id=?", uid).get("role");
    if (!Set.of("FACULTY", "ADMIN").contains(role)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "A verified faculty account is required."
    );
    var a = db.one("SELECT * FROM answers WHERE id=? AND hidden=FALSE FOR UPDATE", id);
    if (a.get("user_id").equals(uid)) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "You cannot verify your own answer."
    );
    if (a.get("verified_by") == null) {
      db.exec("UPDATE answers SET verified_by=? WHERE id=?", uid, id);
      db.reputation((String) a.get("user_id"), 20);
      db.badge((String) a.get("user_id"), "faculty");
      db.notify(
        (String) a.get("user_id"),
        "VERIFIED",
        "Your answer was verified by faculty.",
        "/app/community/" + a.get("question_id")
      );
    }
    return Map.of("ok", true);
  }

  @Transactional
  public Object accept(String id, String uid) {
    var a = db.one("SELECT * FROM answers WHERE id=? AND hidden=FALSE FOR UPDATE", id);
    db.owned("questions", (String) a.get("question_id"), uid);
    if (a.get("user_id").equals(uid)) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "You cannot mark your own answer helpful."
    );
    if (!Boolean.TRUE.equals(a.get("accepted"))) {
      db.exec("UPDATE answers SET accepted=TRUE WHERE id=?", id);
      db.reputation((String) a.get("user_id"), 10);
      db.badge((String) a.get("user_id"), "solver");
      if (
        db
          .one("SELECT category FROM questions WHERE id=?", a.get("question_id"))
          .get("category")
          .equals("Resume")
      ) db.badge((String) a.get("user_id"), "mentor");
    }
    return Map.of("ok", true);
  }

  public Object explain(String id, String uid) {
    var q = db.one("SELECT title,body FROM questions WHERE id=? AND hidden=FALSE", id);
    var result = community.explain(uid, q);
    db.exec(
      "UPDATE questions SET ai_explanation=? WHERE id=?",
      result.path("explanation").asText(),
      id
    );
    if (ai.embeddingsAvailable()) try {
      var vector = ai.embed(q.get("title") + " " + q.get("body"));
      db.exec(
        "UPDATE questions SET embedding=?,embedding_model=? WHERE id=?",
        db.text(vector),
        ai.embeddingModel(),
        id
      );
    } catch (ResponseStatusException ignored) {}
    return result;
  }
}
