package com.careerx;
import static org.junit.jupiter.api.Assertions.*;
import com.careerx.codelab.CodingStreak;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
class CodingStreakTest {
 @Test void sameDaySolvesCountOnceAndYesterdayKeepsCurrentStreakAlive(){
  var today=LocalDate.of(2026,11,8);var days=List.of(today.minusDays(3),today.minusDays(2),today.minusDays(1),today.minusDays(1));
  var result=CodingStreak.calculate(days,today);assertEquals(3,result.get("current"));assertEquals(3,result.get("longest"));assertEquals(false,result.get("solvedToday"));
  assertEquals(0,CodingStreak.calculate(days,today.plusDays(1)).get("current"));
 }
 @Test void streakCrossesYearBoundariesAndIgnoresFutureDates(){
  var today=LocalDate.of(2026,1,2);var result=CodingStreak.calculate(List.of(today.minusDays(2),today.minusDays(1),today,today.plusDays(1)),today);
  assertEquals(3,result.get("current"));assertEquals(3,result.get("longest"));assertEquals(true,result.get("solvedToday"));
  assertEquals(0,CodingStreak.calculate(List.of(),today).get("current"));
 }
 @Test void longestStreakRemainsWhenCurrentStreakRestarts(){
  var today=LocalDate.of(2026,11,8);var result=CodingStreak.calculate(List.of(today.minusDays(7),today.minusDays(6),today.minusDays(5),today),today);
  assertEquals(1,result.get("current"));assertEquals(3,result.get("longest"));
 }
}
