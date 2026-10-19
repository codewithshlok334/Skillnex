package com.careerx.service;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

class RoadmapPdfServiceTest {
  @Test
  void exportsCompletePlanWithProgressAndReadablePagination() throws Exception {
    var items = new ArrayList<Map<String, Object>>();
    String[] titles = {"Build strong programming foundations", "Design APIs with confidence", "Work with real databases", "Build and ship a complete project", "Test, deploy and observe", "Explain your engineering decisions"};
    for (int i=0; i<titles.length; i++) items.add(Map.of("title", titles[i], "learn", "Explore the core concepts through official documentation and small experiments.", "practice", "Solve three exercises, test edge cases, and explain the trade-offs in your approach.", "build", "Add this skill to a portfolio project with clear documentation and meaningful tests.", "interview", "Describe one decision you made, the alternatives, and how you measured the result.", "progress", i==0 ? 100 : i==1 ? 40 : 0));
    byte[] bytes = new RoadmapPdfService().export(Map.of("title", "Backend Developer", "summary", "Build on your Java and SQL experience to create reliable services. Follow this path from foundations to a project you can confidently explain."), items);
    try (var doc = Loader.loadPDF(bytes)) {
      String text = new PDFTextStripper().getText(doc);
      for (String title : titles) assertTrue(text.contains(title));
      assertTrue(text.contains("23% complete"));
      assertTrue(text.contains("1 / 6 milestones"));
      assertTrue(text.contains("EXPLAIN / INTERVIEW PRACTICE"));
      assertTrue(doc.getNumberOfPages() >= 3);
    }
    Files.createDirectories(Path.of("target/roadmap-preview"));
    Files.write(Path.of("target/roadmap-preview/career-roadmap.pdf"), bytes);
  }

  @Test
  void longContentAndLongWordsRemainCompleteAcrossPages() throws Exception {
    String longWord = "abcdefghij".repeat(90);
    var item = Map.<String,Object>of("title", "A detailed milestone", "learn", "Learning with café and API design.\n" + "Work through a documented example. ".repeat(180), "practice", longWord, "build", "Final project detail", "interview", "Final interview question", "progress", 80);
    byte[] bytes = new RoadmapPdfService().export(Map.of("title", "Engineering", "summary", "A long plan"), Collections.nCopies(3,item));
    try (var doc = Loader.loadPDF(bytes)) {
      String text = new PDFTextStripper().getText(doc);
      assertEquals(3, text.split("Final interview question", -1).length - 1);
      assertTrue(text.replaceAll("\\s", "").contains(longWord));
      assertTrue(doc.getNumberOfPages() > 4);
      assertTrue(doc.getNumberOfPages() < 30);
    }
  }
}
