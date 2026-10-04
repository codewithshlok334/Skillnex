package com.careerx.config;

import com.careerx.repository.Store;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.demo", havingValue = "true")
public class DemoSeed implements CommandLineRunner {

  private final Store db;
  private final PasswordEncoder passwords;

  public DemoSeed(Store db, PasswordEncoder passwords) {
    this.db = db;
    this.passwords = passwords;
  }

  @Transactional
  public void run(String... args) {
    if (db.exists("SELECT 1 FROM app_users WHERE email='student@careerx.demo'")) return;
    String student = user("Alex Morgan", "student@careerx.demo", "STUDENT"),
      faculty = user("Dr. Maya Chen", "faculty@careerx.demo", "FACULTY"),
      admin = user("SkillNex Admin", "admin@careerx.demo", "ADMIN"),
      peer = user("Priya Sharma", "priya@careerx.demo", "STUDENT");
    db.exec(
      "UPDATE profiles SET college='Northwood University',branch='Computer Science',course='B.Tech',study_year='3',graduation_year='2027',career_goal='Software Engineer',skills='Java, SQL, JavaScript, React, Git',projects='Campus event management application',reputation=245 WHERE user_id=?",
      student
    );
    db.badge(student, "helper");
    db.badge(student, "solver");
    db.badge(student, "expert");
    String resume = db.id();
    db.exec(
      "INSERT INTO resumes(id,user_id,name,content) VALUES(?,?,?,?)",
      resume,
      student,
      "Alex_Morgan_Resume.pdf",
      "Alex Morgan\nalex.morgan@example.com\nSUMMARY\nComputer Science student building web applications with Java and React.\nEDUCATION\nNorthwood University, B.Tech Computer Science, expected 2027\nSKILLS\nJava, SQL, JavaScript, React, Git\nPROJECTS\nCampus Event Manager: Built a web application using Java and React to organize campus events.\nACHIEVEMENTS\nParticipated in the campus hackathon."
    );
    db.exec(
      "INSERT INTO resume_analyses(id,resume_id,result_json) VALUES(?,?,?)",
      db.id(),
      resume,
      db.text(
        Map.of(
          "demo",
          true,
          "score",
          78,
          "summary",
          "Sample analysis: a solid foundation. Add more detail about your project responsibilities and strengthen your summary.",
          "breakdown",
          List.of(
            Map.of("label", "Formatting", "score", 92),
            Map.of("label", "Keywords", "score", 68),
            Map.of("label", "Skills", "score", 85),
            Map.of("label", "Experience", "score", 62),
            Map.of("label", "Projects", "score", 80),
            Map.of("label", "Structure", "score", 88),
            Map.of("label", "Readability", "score", 85)
          ),
          "issues",
          List.of(
            Map.of(
              "title",
              "Make your project contribution clearer",
              "original",
              "Built a web application using Java and React to organize campus events.",
              "suggestion",
              "Developed a campus event management application with Java and React.",
              "severity",
              "medium"
            ),
            Map.of(
              "title",
              "Add supported project outcomes",
              "original",
              "",
              "suggestion",
              "Describe what your project does and your own contribution. Include metrics only if you can verify them.",
              "severity",
              "high"
            )
          )
        )
      )
    );
    String upcoming = db.id();
    db.exec(
      "INSERT INTO interviews(id,user_id,role,kind,difficulty,duration,scheduled_at) VALUES(?,?,?,?,?,?,?)",
      upcoming,
      student,
      "Frontend Developer",
      "Technical",
      "Medium",
      30,
      Timestamp.from(Instant.now().plusSeconds(86400))
    );
    String done = db.id();
    db.exec(
      "INSERT INTO interviews(id,user_id,role,kind,difficulty,duration,status,started_at) VALUES(?,?,?,?,?,?,'COMPLETED',?)",
      done,
      student,
      "Software Developer",
      "Mixed",
      "Medium",
      25,
      Timestamp.from(Instant.now().minusSeconds(172800))
    );
    String iq = db.id();
    db.exec(
      "INSERT INTO interview_questions(id,interview_id,position,content) VALUES(?,?,0,?)",
      iq,
      done,
      "Tell me about a project you built."
    );
    db.exec(
      "INSERT INTO interview_answers(id,question_id,content) VALUES(?,?,?)",
      db.id(),
      iq,
      "I built a campus event manager with Java and React. I implemented the event listing interface and the API integration."
    );
    db.exec(
      "INSERT INTO interview_reports(id,interview_id,result_json) VALUES(?,?,?)",
      db.id(),
      done,
      db.text(
        Map.of(
          "demo",
          true,
          "score",
          84,
          "breakdown",
          List.of(
            Map.of("label", "Technical Knowledge", "score", 85),
            Map.of("label", "Communication", "score", 82),
            Map.of("label", "Answer Relevance", "score", 88),
            Map.of("label", "Problem Solving", "score", 78),
            Map.of("label", "Confidence Indicators", "score", 80),
            Map.of("label", "Clarity", "score", 88)
          ),
          "strengths",
          List.of(
            "Sample feedback: clearly describes the project stack.",
            "Connects the answer to a personal contribution."
          ),
          "improvements",
          List.of("Explain one technical tradeoff in more detail."),
          "modelAnswers",
          List.of(
            Map.of(
              "question",
              "Tell me about a project you built.",
              "answer",
              "I built a campus event manager using Java and React, focusing on the event listing interface and API integration."
            )
          ),
          "topics",
          List.of("REST API design", "React state management"),
          "followUpQuestions",
          List.of("How did you handle API errors?")
        )
      )
    );
    String goal = db.id(),
      road = db.id();
    db.exec(
      "INSERT INTO career_goals(id,user_id,title) VALUES(?,?,?)",
      goal,
      student,
      "Software Engineer"
    );
    db.exec(
      "INSERT INTO career_roadmaps(id,user_id,goal_id,summary) VALUES(?,?,?,?)",
      road,
      student,
      goal,
      "Demo roadmap: build on your Java and SQL foundation, then connect your backend and frontend skills."
    );
    String[] skills = {
      "Java fundamentals",
      "Data structures & algorithms",
      "SQL & databases",
      "Spring Boot",
      "System design",
      "Build & deploy",
    };
    int[] progress = { 100, 100, 100, 60, 20, 0 };
    for (int i = 0; i < skills.length; i++) db.exec(
      "INSERT INTO roadmap_items(id,roadmap_id,title,position,progress,learn,practice,build,interview) VALUES(?,?,?,?,?,?,?,?,?)",
      db.id(),
      road,
      skills[i],
      i,
      progress[i],
      "Study the core concepts of " + skills[i] + ".",
      "Solve three exercises and explain your approach.",
      "Apply this skill to your campus event project.",
      "Explain one tradeoff you made while using this skill."
    );
    String q1 = question(
      peer,
      "What is the difference between an interface and an abstract class in Java?",
      "I understand both provide abstraction. When should I choose one over the other in a real project?",
      "Programming"
    );
    String q2 = question(
      student,
      "How do I approach dynamic programming problems as a beginner?",
      "I can solve basic recursion problems but struggle to identify overlapping subproblems. What is a good way to practice?",
      "DSA"
    );
    String q3 = question(
      peer,
      "How does database normalization reduce duplicate data?",
      "Could someone explain 1NF, 2NF and 3NF with a simple student-course example and functional dependencies?",
      "DBMS"
    );
    question(
      student,
      "What should a strong project section on a fresher resume include?",
      "I have two academic projects. How can I describe my own contribution clearly without exaggerating?",
      "Resume"
    );
    answer(
      faculty,
      q1,
      "Use an interface to describe a capability that unrelated classes can implement. Use an abstract class when closely related classes should share state or implementation. A class can implement multiple interfaces but can extend only one class.",
      faculty
    );
    answer(
      student,
      q3,
      "Normalization organizes data based on dependencies. Instead of repeating course details in every enrollment row, keep courses and enrollments in separate tables linked by a course ID.",
      faculty
    );
    answer(
      peer,
      q2,
      "Start by writing the recursive solution and drawing its call tree. Identify repeated states, memoize them, then translate the recurrence into a table when useful.",
      null
    );
    db.exec(
      "UPDATE questions SET ai_explanation=? WHERE id=?",
      "Sample AI explanation (demo): an interface defines a contract; an abstract class can share implementation and state. Consider whether your types share a capability or a common base.",
      q1
    );
    db.notify(student, "ANALYSIS", "Your resume analysis is ready to explore.", "/app/resumes");
    db.notify(
      student,
      "VERIFIED",
      "Dr. Maya Chen verified your DBMS answer.",
      "/app/community/" + q3
    );
    db.notify(
      student,
      "INTERVIEW",
      "Your mock interview report is ready.",
      "/app/interviews/" + done
    );
  }

  private String user(String name, String email, String role) {
    String id = db.id();
    db.exec(
      "INSERT INTO app_users(id,email,password_hash,name,role) VALUES(?,?,?,?,?)",
      id,
      email,
      passwords.encode("CareerX-demo-2026!"),
      name,
      role
    );
    db.exec("INSERT INTO profiles(user_id) VALUES(?)", id);
    return id;
  }

  private String question(String uid, String title, String body, String category) {
    String id = db.id();
    db.exec(
      "INSERT INTO questions(id,user_id,title,original_title,body,category) VALUES(?,?,?,?,?,?)",
      id,
      uid,
      title,
      title,
      body,
      category
    );
    return id;
  }

  private void answer(String uid, String q, String body, String verifier) {
    db.exec(
      "INSERT INTO answers(id,question_id,user_id,body,verified_by) VALUES(?,?,?,?,?)",
      db.id(),
      q,
      uid,
      body,
      verifier
    );
  }
}
