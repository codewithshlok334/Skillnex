package com.careerx.service;

import java.awt.Color;
import java.io.*;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.List;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Service;

/** An account's saved roadmap, laid out independently of the browser viewport. */
@Service
public class RoadmapPdfService {
  private static final Color INK = Color.decode("#172638"), MUTED = Color.decode("#56677A");
  private static final Color LINE = Color.decode("#DDE5ED"), PAPER = Color.decode("#F4F7FA");
  private static final Color[] ACCENTS = {Color.decode("#167E87"), Color.decode("#7A54B0"), Color.decode("#A76716")};

  public byte[] export(Map<String, Object> roadmap, List<Map<String, Object>> items) throws IOException {
    try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
      doc.getDocumentInformation().setTitle("SkillNex career roadmap - " + value(roadmap, "title"));
      doc.getDocumentInformation().setAuthor("SkillNex");
      try (var w = new Writer(doc)) {
        w.page("YOUR CAREER, MAPPED OUT");
        w.paragraph(value(roadmap, "title"), 26, true, INK, 40, 515, 34);
        w.y -= 10;
        w.paragraph(value(roadmap, "summary"), 10, false, MUTED, 40, 515, 16);
        w.y -= 15;
        int percent = items.isEmpty() ? 0 : (int)Math.round(items.stream().mapToInt(RoadmapPdfService::progress).average().orElse(0));
        long complete = items.stream().filter(i -> progress(i) == 100).count();
        w.ensure(65);
        w.rect(40, w.y - 38, 515, 48, PAPER);
        w.text(percent + "% complete", 12, true, ACCENTS[0], 54, w.y - 8);
        w.text(complete + " / " + items.size() + " milestones  |  Self-reported progress", 9, false, MUTED, 200, w.y - 8);
        w.rect(54, w.y - 25, 487, 3, LINE);
        if (percent > 0) w.rect(54, w.y - 25, 487 * percent / 100f, 3, ACCENTS[0]);
        w.y -= 72;
        w.paragraph("THE PATH AT A GLANCE", 9, true, MUTED, 40, 515, 16);
        w.y -= 8;
        for (int i = 0; i < items.size(); i++) {
          var item = items.get(i);
          var title = w.wrap(value(item, "title"), 11, true, 370);
          float height = Math.max(54, title.size() * 15 + 29);
          w.ensure(height + 8);
          Color color = ACCENTS[i % ACCENTS.length];
          w.line(56, w.y + 8, 56, w.y - height, LINE, 2);
          w.rect(40, w.y - 18, 32, 30, color);
          w.text(String.format(Locale.ROOT, "%02d", i + 1), 11, true, Color.WHITE, 48, w.y - 7);
          float ty = w.y;
          for (String line : title) { w.text(line, 11, true, INK, 88, ty); ty -= 15; }
          w.text(progress(item) == 100 ? "Complete" : progress(item) > 0 ? "In progress" : "Not started", 8, false, MUTED, 88, ty - 2);
          w.text(progress(item) + "%", 10, true, color, 520, w.y);
          w.y -= height;
        }
        w.y -= 15;
        w.paragraph("A personal learning plan. Progress reflects your updates, not a skill assessment or a guarantee of career outcomes.", 9, false, MUTED, 40, 515, 14);

        if (!items.isEmpty()) w.page("YOUR ACTION PLAN");
        for (int i = 0; i < items.size(); i++) {
          var item = items.get(i);
          Color color = ACCENTS[i % ACCENTS.length];
          int headingLines = w.wrap(value(item, "title"), 19, true, 495).size();
          w.ensure(headingLines * 25 + 100);
          w.paragraph("STEP " + String.format(Locale.ROOT, "%02d", i + 1) + "  /  " + items.size() + "     -     " + progress(item) + "% COMPLETE", 9, true, color, 40, 515, 16);
          w.y -= 5;
          w.paragraph(value(item, "title"), 19, true, INK, 40, 495, 25);
          w.y -= 16;
          String[][] fields = {{"learn", "LEARN"}, {"practice", "PRACTICE"}, {"build", "BUILD"}, {"interview", "EXPLAIN / INTERVIEW PRACTICE"}};
          for (var field : fields) {
            var lines = w.wrap(value(item, field[0]), 10, false, 495);
            w.ensure(Math.min(90, 30 + lines.size() * 16));
            w.paragraph(field[1], 8, true, color, 40, 515, 14);
            for (String line : lines) {
              if (w.y < 65) { w.page("STEP " + (i + 1) + " - " + field[1] + " (CONTINUED)"); }
              w.text(line, 10, false, INK, 40, w.y); w.y -= 16;
            }
            w.y -= 15;
          }
          w.ensure(18); w.line(40, w.y, 555, w.y, LINE, 1); w.y -= 30;
        }
      }
      doc.save(out);
      return out.toByteArray();
    }
  }

  private static String value(Map<String, Object> map, String key) { return Objects.toString(map.get(key), "").strip(); }
  private static int progress(Map<String, Object> item) { return item.get("progress") instanceof Number n ? Math.max(0, Math.min(100, n.intValue())) : 0; }

  private static final class Writer implements AutoCloseable {
    final PDDocument doc;
    final PDFont regular, bold;
    PDPageContentStream stream;
    float y;
    Writer(PDDocument doc) throws IOException { this.doc = doc; regular = font(doc, false); bold = font(doc, true); }
    void page(String section) throws IOException {
      if (stream != null) stream.close();
      PDPage page = new PDPage(PDRectangle.A4); doc.addPage(page);
      stream = new PDPageContentStream(doc, page);
      rect(0, 832, 595, 10, ACCENTS[0]);
      text("SkillNex", 16, true, INK, 40, 793);
      text("CAREER FIELDNOTES", 8, true, MUTED, 420, 795);
      line(40, 775, 555, 775, LINE, 1);
      text(section, 8, true, MUTED, 40, 752);
      line(40, 45, 555, 45, LINE, 1);
      text("SkillNex  |  Craft Your Resume. Crack Your Interview.", 7, false, MUTED, 40, 30);
      text(LocalDate.now(ZoneOffset.UTC) + "  |  " + doc.getNumberOfPages(), 7, false, MUTED, 458, 30);
      y = 721;
    }
    void ensure(float height) throws IOException { if (y - height < 60) page("YOUR ROADMAP / CONTINUED"); }
    void paragraph(String content, float size, boolean weight, Color color, float x, float width, float leading) throws IOException {
      for (String line : wrap(content, size, weight, width)) { ensure(leading); text(line, size, weight, color, x, y); y -= leading; }
    }
    void text(String content, float size, boolean weight, Color color, float x, float baseline) throws IOException {
      stream.beginText(); stream.setFont(weight ? bold : regular, size); stream.setNonStrokingColor(color);
      stream.newLineAtOffset(x, baseline); stream.showText(safe(content, weight ? bold : regular)); stream.endText();
    }
    void rect(float x, float y, float width, float height, Color color) throws IOException { stream.setNonStrokingColor(color); stream.addRect(x,y,width,height); stream.fill(); }
    void line(float x, float y, float x2, float y2, Color color, float width) throws IOException { stream.setStrokingColor(color); stream.setLineWidth(width); stream.moveTo(x,y); stream.lineTo(x2,y2); stream.stroke(); }
    List<String> wrap(String text, float size, boolean weight, float width) throws IOException {
      PDFont font = weight ? bold : regular;
      var result = new ArrayList<String>();
      for (String paragraph : text.split("\\R", -1)) {
        String current = "";
        for (String word : safe(paragraph, font).split("\\s+")) {
          String candidate = current.isEmpty() ? word : current + " " + word;
          if (font.getStringWidth(candidate) * size / 1000 <= width) { current = candidate; continue; }
          if (!current.isEmpty()) result.add(current);
          current = "";
          for (int cp : word.codePoints().toArray()) {
            String c = new String(Character.toChars(cp));
            if (!current.isEmpty() && font.getStringWidth(current + c) * size / 1000 > width) { result.add(current); current = ""; }
            current += c;
          }
        }
        result.add(current);
      }
      return result;
    }
    static String safe(String value, PDFont font) {
      var out = new StringBuilder();
      for (int cp : value.replace('\t',' ').codePoints().toArray()) {
        String s = new String(Character.toChars(cp));
        try { font.encode(s); out.append(s); } catch (Exception ignored) { out.append('?'); }
      }
      return out.toString();
    }
    static PDFont font(PDDocument doc, boolean bold) throws IOException {
      var paths = new ArrayList<String>();
      String configured = System.getenv("PDF_FONT_PATH");
      if (configured != null && !configured.isBlank()) paths.add(configured);
      paths.add("/usr/share/fonts/truetype/dejavu/DejaVuSans" + (bold ? "-Bold" : "") + ".ttf");
      paths.add("C:/Windows/Fonts/" + (bold ? "arialbd.ttf" : "arial.ttf"));
      for (String path : paths) if (new File(path).isFile()) return PDType0Font.load(doc, new File(path));
      return new PDType1Font(bold ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA);
    }
    @Override public void close() throws IOException { if (stream != null) stream.close(); }
  }
}
