package com.careerx.codelab;

import java.time.LocalDate;
import java.util.*;

public final class CodingStreak {
  private CodingStreak() {}
  public static Map<String,Object> calculate(Collection<LocalDate> solvedDates,LocalDate today) {
    var days=new TreeSet<LocalDate>();solvedDates.stream().filter(d->!d.isAfter(today)).forEach(days::add);
    int longest=0,run=0;LocalDate previous=null;
    for(LocalDate day:days){run=previous!=null&&previous.plusDays(1).equals(day)?run+1:1;longest=Math.max(longest,run);previous=day;}
    LocalDate cursor=days.contains(today)?today:today.minusDays(1);int current=0;
    while(days.contains(cursor)){current++;cursor=cursor.minusDays(1);}
    return Map.of("current",current,"longest",longest,"solvedToday",days.contains(today));
  }
}
