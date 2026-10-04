package com.careerx.codelab;

import java.util.Arrays;

public final class OutputChecker {
  private OutputChecker() {}
  public static boolean accepts(String checker,String input,String expected,String actual) {
    if(actual==null || actual.length()>65536) return false;
    String[] output=tokens(actual);
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
  private static String[] tokens(String text) {
    String trimmed=text.strip(); return trimmed.isEmpty()?new String[0]:trimmed.split("\\s+");
  }
}
