package com.careerx.codelab;
import java.util.List;
public interface CodeRunner {
  record Execution(int status, String stdout, String stderr, String compileOutput, double seconds, long memoryKb) {}
  boolean configured();
  String destination();
  List<Execution> execute(String language, String source, List<String> inputs) throws Exception;
}
