package com.recoverpro.server.util;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Extracts plain text from PDF, DOCX, and TXT/MD document bytes. */
public final class RagDocumentTextExtractor {

    private RagDocumentTextExtractor() {}

    public static String extract(byte[] fileBytes, String contentType) throws IOException {
        if (contentType == null) {
            throw new IOException("Unknown content type");
        }
        return switch (contentType) {
            case "application/pdf" -> extractPdf(fileBytes);
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> extractDocx(fileBytes);
            case "text/plain", "text/markdown" -> new String(fileBytes, StandardCharsets.UTF_8);
            default -> throw new IOException("Unsupported content type for RAG ingestion: " + contentType);
        };
    }

    private static String extractPdf(byte[] fileBytes) throws IOException {
        try (PdfReader reader = new PdfReader(fileBytes)) {
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder sb = new StringBuilder();
            int pages = reader.getNumberOfPages();
            for (int page = 1; page <= pages; page++) {
                sb.append(extractor.getTextFromPage(page)).append('\n');
            }
            return sb.toString();
        }
    }

    private static String extractDocx(byte[] fileBytes) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(fileBytes));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }
}
