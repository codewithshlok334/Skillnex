package com.careerx.service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {

  public String extract(MultipartFile file) {
    if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Upload a PDF or DOCX smaller than 5 MB."
    );
    try {
      String name = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase(
        Locale.ROOT
      );
      byte[] data = file.getBytes();
      String text;
      if (
        name.endsWith(".pdf") &&
        new String(Arrays.copyOf(data, 5), StandardCharsets.US_ASCII).equals("%PDF-")
      ) {
        try (var pdf = Loader.loadPDF(data)) {
          if (
            pdf.getNumberOfPages() > 30 || pdf.isEncrypted()
          ) throw new IllegalArgumentException();
          text = new PDFTextStripper().getText(pdf);
        }
      } else if (name.endsWith(".docx") && data.length > 4 && data[0] == 'P' && data[1] == 'K') {
        try (var doc = new XWPFDocument(new ByteArrayInputStream(data))) {
          var result = new StringBuilder();
          doc.getParagraphs().forEach(p -> result.append(p.getText()).append("\n"));
          doc
            .getTables()
            .forEach(t ->
              t
                .getRows()
                .forEach(r ->
                  r.getTableCells().forEach(c -> result.append(c.getText()).append("\n"))
                )
            );
          text = result.toString();
        }
      } else throw new IllegalArgumentException();
      text = text.replace("\u0000", "").strip();
      if (text.length() < 30) throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "No readable text found. Upload a text-based PDF or DOCX; scanned PDFs need OCR first."
      );
      if (text.length() > 60000) throw new IllegalArgumentException();
      return text;
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "This file could not be read. Use an unencrypted PDF (up to 30 pages) or DOCX."
      );
    }
  }

  public byte[] docx(String text, String template) throws IOException {
    try (var doc = new XWPFDocument(); var out = new ByteArrayOutputStream()) {
      int index = 0;
      for (String line : text.split("\n", -1)) {
        var paragraph = doc.createParagraph();
        var run = paragraph.createRun();
        boolean title = index++ == 0,
          heading = isHeading(line);
        run.setFontFamily(template.equals("academic") ? "Georgia" : "Calibri");
        run.setFontSize(title ? 24 : heading ? 12 : 11);
        run.setBold(title || heading);
        run.setColor(title || heading ? accent(template) : "333333");
        if (title && template.equals("academic")) paragraph.setAlignment(ParagraphAlignment.CENTER);
        paragraph.setSpacingAfter(heading ? 100 : 60);
        run.setText(line);
      }
      doc.write(out);
      return out.toByteArray();
    }
  }

  public byte[] pdf(String text, String template) throws IOException {
    try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
      PDFont font = loadFont(doc);
      PDPage page = new PDPage();
      doc.addPage(page);
      PDPageContentStream stream = new PDPageContentStream(doc, page);
      float y = 740;
      int index = 0;
      for (String paragraph : text.split("\n", -1)) {
        boolean title = index++ == 0,
          heading = isHeading(paragraph);
        float size = title ? 22 : heading ? 12 : 10;
        for (String line : wrap(paragraph, font, size, 500)) {
          if (y < 52) {
            stream.close();
            page = new PDPage();
            doc.addPage(page);
            stream = new PDPageContentStream(doc, page);
            y = 740;
          }
          stream.beginText();
          stream.setFont(font, size);
          stream.setNonStrokingColor(
            java.awt.Color.decode("#" + (title || heading ? accent(template) : "333333"))
          );
          float x =
            title && template.equals("academic")
              ? (612 - (font.getStringWidth(line) / 1000) * size) / 2
              : 52;
          stream.newLineAtOffset(x, y);
          stream.showText(line);
          stream.endText();
          y -= title ? 32 : heading ? 20 : 15;
        }
      }
      stream.close();
      doc.save(out);
      return out.toByteArray();
    }
  }

  private String accent(String template) {
    return switch (template) {
      case "developer" -> "385A78";
      case "modern" -> "745193";
      case "fresher" -> "39745B";
      case "data" -> "326F83";
      default -> "222222";
    };
  }

  private boolean isHeading(String line) {
    return (
      line.length() > 1 &&
      line.length() < 55 &&
      line.matches(".*[A-Z].*") &&
      line.equals(line.toUpperCase(Locale.ROOT))
    );
  }

  private PDFont loadFont(PDDocument doc) throws IOException {
    String configured = System.getenv("PDF_FONT_PATH");
    List<String> paths = new ArrayList<>();
    if (configured != null && !configured.isBlank()) paths.add(configured);
    paths.add("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    paths.add("C:/Windows/Fonts/arial.ttf");
    for (String path : paths)
      if (new File(path).isFile()) return PDType0Font.load(doc, new File(path));
    return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
  }

  private List<String> wrap(String value, PDFont font, float size, float width) throws IOException {
    // Unsupported glyphs are visible as '?' instead of breaking an entire export.
    var safe = new StringBuilder();
    for (int cp : value.codePoints().toArray()) {
      String c = new String(Character.toChars(cp));
      try {
        font.encode(c);
        safe.append(c);
      } catch (Exception e) {
        safe.append("?");
      }
    }
    List<String> lines = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    for (String word : safe.toString().split(" ", -1)) {
      String candidate = current.isEmpty() ? word : current + " " + word;
      if ((font.getStringWidth(candidate) / 1000) * size <= width) {
        current.setLength(0);
        current.append(candidate);
      } else {
        if (!current.isEmpty()) lines.add(current.toString());
        current.setLength(0);
        for (int cp : word.codePoints().toArray()) {
          String c = new String(Character.toChars(cp));
          if ((font.getStringWidth(current + c) / 1000) * size > width) {
            lines.add(current.toString());
            current.setLength(0);
          }
          current.append(c);
        }
      }
    }
    lines.add(current.toString());
    return lines;
  }
}
