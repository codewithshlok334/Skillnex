package com.careerx.controller;

import com.careerx.repository.Store;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.*;
import java.security.Principal;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class PhotoController {

  private final Store db;

  public PhotoController(Store db) {
    this.db = db;
  }

  @PostMapping("/api/users/me/photo")
  public Object upload(@RequestParam MultipartFile file, Principal p) {
    if (file.isEmpty() || file.getSize() > 1024 * 1024) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Choose a PNG or JPEG smaller than 1 MB."
    );
    try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw new IllegalArgumentException();
      var reader = readers.next();
      try {
        if (
          !Set.of("png", "jpeg", "jpg").contains(reader.getFormatName().toLowerCase(Locale.ROOT))
        ) throw new IllegalArgumentException();
        reader.setInput(stream);
        int w = reader.getWidth(0),
          h = reader.getHeight(0);
        if (w < 1 || h < 1 || w > 4096 || h > 4096) throw new IllegalArgumentException();
        var input = reader.read(0);
        var image = new BufferedImage(256, 256, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(
          java.awt.RenderingHints.KEY_INTERPOLATION,
          java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC
        );
        int side = Math.min(w, h);
        g.drawImage(
          input,
          0,
          0,
          256,
          256,
          (w - side) / 2,
          (h - side) / 2,
          (w + side) / 2,
          (h + side) / 2,
          null
        );
        g.dispose();
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", out);
        String url =
          "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        db.exec("UPDATE profiles SET photo_url=? WHERE user_id=?", url, p.getName());
        return Map.of("photoUrl", url);
      } finally {
        reader.dispose();
      }
    } catch (Exception e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Use a valid PNG or JPEG image, up to 4096 pixels per side."
      );
    }
  }
}
