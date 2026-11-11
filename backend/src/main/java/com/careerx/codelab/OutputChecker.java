package com.careerx.codelab;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class OutputChecker {
  private OutputChecker() {}
  public static boolean accepts(String checker,String input,String expected,String actual) {
    if(actual==null || actual.length()>65536) return false;
    String[] output=tokens(actual);
    if (checker.equals("TOKEN_MULTISET")) {
      String[] wanted=tokens(expected);
      Arrays.sort(wanted); Arrays.sort(output);
      return Arrays.equals(wanted,output);
    }
    if (checker.equals("UNORDERED_LINES") || checker.equals("UNORDERED_GROUPS")) {
      try {
        boolean groups=checker.equals("UNORDERED_GROUPS");
        return rows(expected,groups).equals(rows(actual,groups));
      } catch (RuntimeException ignored) { return false; }
    }
    if(checker.equals("PAIR_INDICES") && !expected.trim().equals("-1")) {
      try {
        String[] data=tokens(input);
        int n=Integer.parseInt(data[0]); long target=Long.parseLong(data[1]);
        if(output.length!=2) return false;
        int a=Integer.parseInt(output[0]),b=Integer.parseInt(output[1]);
        return a>=0 && b>=0 && a<n && b<n && a!=b && Long.parseLong(data[a+2])+Long.parseLong(data[b+2])==target;
      } catch(RuntimeException ignored) { return false; }
    }
    return Arrays.equals(tokens(expected),output);
  }
  // Only the order explicitly declared irrelevant by the problem is ignored.
  // Lists retain multiplicity, so duplicate/missing answers cannot pass as sets.
  private static List<String> rows(String text,boolean groups) {
    String[] lines=text.strip().split("\\R");
    int count=Integer.parseInt(lines[0].strip());
    if(count<0 || lines.length!=count+1) throw new IllegalArgumentException("Invalid row count");
    List<String> result=new ArrayList<>();
    for(int i=1;i<lines.length;i++) {
      String[] values=tokens(lines[i]);
      if(groups) {
        if(values.length==0 || Integer.parseInt(values[0])!=values.length-1)
          throw new IllegalArgumentException("Invalid group length");
        Arrays.sort(values,1,values.length);
      }
      result.add(String.join(" ",values));
    }
    Collections.sort(result);
    return result;
  }
  private static String[] tokens(String text) {
    String trimmed=text.strip(); return trimmed.isEmpty()?new String[0]:trimmed.split("\\s+");
  }
}
