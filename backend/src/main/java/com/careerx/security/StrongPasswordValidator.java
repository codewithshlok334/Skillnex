package com.careerx.security;
import jakarta.validation.*;
import java.nio.charset.StandardCharsets;
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword,String> {
 @Override public boolean isValid(String value,ConstraintValidatorContext context){
  if(value==null)return false;
  if(value.getBytes(StandardCharsets.UTF_8).length>72){
   context.disableDefaultConstraintViolation();context.buildConstraintViolationWithTemplate("Password is too long. Please use a shorter password.").addConstraintViolation();return false;
  }
  return value.codePointCount(0,value.length())>=9&&value.matches("(?s).*[A-Z].*")&&value.matches("(?s).*[0-9].*")&&value.matches("(?s).*[^\\p{L}\\p{N}\\s].*");
 }
}
