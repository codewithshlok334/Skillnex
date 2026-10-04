package com.careerx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CareerXApplication {

  public static void main(String[] args) {
    SpringApplication.run(CareerXApplication.class, args);
  }
}
