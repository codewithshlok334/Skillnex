package com.careerx.security;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;
@Target({ElementType.FIELD,ElementType.PARAMETER,ElementType.RECORD_COMPONENT,ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy=StrongPasswordValidator.class)
public @interface StrongPassword {
 String message() default "Use at least 9 characters, including a capital letter, a number and a special symbol.";
 Class<?>[] groups() default {};
 Class<? extends Payload>[] payload() default {};
}
