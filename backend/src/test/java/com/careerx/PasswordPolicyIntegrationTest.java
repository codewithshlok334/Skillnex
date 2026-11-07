package com.careerx;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.careerx.dto.Requests;
import com.careerx.repository.Store;
import jakarta.validation.Validator;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class PasswordPolicyIntegrationTest {
 @Autowired Store db; @Autowired MockMvc mvc; @Autowired Validator validator; @Autowired PasswordEncoder encoder;
 @Test void newSignupAndResetShareStrengthChecks(){
  for(String password:new String[]{"Pass123!","lowercase1!","NoNumbers!","NoSymbols1","Password1 ","Aa1!"+"🧠".repeat(18)}){
   assertFalse(validator.validate(new Requests.Signup("Learner","learner@example.test",password,null,null,null,null,null,null)).isEmpty());
   assertFalse(validator.validate(new Requests.Reset("test-token",password)).isEmpty());
  }
  assertTrue(validator.validate(new Requests.Reset("test-token","Pass1234!")).isEmpty());
 }
 @Test void oldPasswordStillLogsInWithoutChangingAccountOrSavedData()throws Exception{
  String uid=db.id(),email=uid+"@example.test",hash=encoder.encode("oldpassword");
  db.exec("INSERT INTO app_users(id,email,name,password_hash) VALUES(?,?,?,?)",uid,email,"Existing learner",hash);
  db.exec("INSERT INTO profiles(user_id,skills) VALUES(?,?)",uid,"Saved Java skills");
  mvc.perform(post("/api/auth/login").header("Origin","http://localhost:5173").contentType("application/json").content(db.text(Map.of("email",email,"password","oldpassword")))).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(uid));
  assertEquals(hash,db.one("SELECT password_hash FROM app_users WHERE id=?",uid).get("password_hash"));
  assertEquals("Saved Java skills",db.one("SELECT skills FROM profiles WHERE user_id=?",uid).get("skills"));
 }
 @Test void signupApiRejectsWeakPasswordsEvenWhenBrowserChecksAreBypassed()throws Exception{
  String email=db.id()+"@example.test";
  mvc.perform(post("/api/auth/signup").header("Origin","http://localhost:5173").contentType("application/json").content(db.text(Map.of("name","New learner","email",email,"password","LongWithoutDigits!")))).andExpect(status().isBadRequest());
  assertEquals(0,db.count("SELECT COUNT(*) FROM app_users WHERE email=?",email));
  mvc.perform(post("/api/auth/signup").header("Origin","http://localhost:5173").contentType("application/json").content(db.text(Map.of("name","New learner","email",email,"password","Pass1234!")))).andExpect(status().isOk());
 }
}
