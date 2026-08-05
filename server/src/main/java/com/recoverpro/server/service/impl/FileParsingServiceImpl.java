package com.recoverpro.server.service.impl;

import com.recoverpro.server.exception.FileParsingException;
import com.recoverpro.server.service.FileParsingService;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
public class FileParsingServiceImpl implements FileParsingService {

    @Override
    public List<Map<String, String>> parseFile(MultipartFile file) {
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        log.info("Parsing file: {} with content type: {}", filename, contentType);
        if ((contentType != null && contentType.equals("text/csv"))
                || (filename != null && filename.toLowerCase().endsWith(".csv"))) {
            return parseCsv(file);
        }
        return parseExcel(file);
    }

    @Override
    public List<Map<String, String>> parseExcel(MultipartFile file) {
        log.debug("Parsing Excel file: {}", file.getOriginalFilename());
        List<Map<String, String>> rows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) throw new FileParsingException("Excel file has no sheets");
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new FileParsingException("Excel file has no header row");
            List<String> headers = extractHeaders(headerRow);
            DataFormatter formatter = new DataFormatter();
            int totalRows = sheet.getLastRowNum();
            for (int i = 1; i <= totalRows; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row, formatter)) continue;
                Map<String, String> rowData = new LinkedHashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    rowData.put(headers.get(j), cell == null ? "" : formatter.formatCellValue(cell).trim());
                }
                rows.add(rowData);
            }
            log.info("Parsed {} data rows from Excel: {}", rows.size(), file.getOriginalFilename());
        } catch (IOException e) {
            log.error("Error parsing Excel file: {}", file.getOriginalFilename(), e);
            throw new FileParsingException("Failed to parse Excel file: " + e.getMessage());
        }
        return rows;
    }

    @Override
    public List<Map<String, String>> parseCsv(MultipartFile file) {
        log.debug("Parsing CSV file: {}", file.getOriginalFilename());
        List<Map<String, String>> rows = new ArrayList<>();
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String[] headers = reader.readNext();
            if (headers == null || headers.length == 0)
                throw new FileParsingException("CSV file has no header row");
            List<String> headerList = Arrays.stream(headers).map(String::trim).toList();
            String[] line;
            while ((line = reader.readNext()) != null) {
                if (isLineEmpty(line)) continue;
                Map<String, String> rowData = new LinkedHashMap<>();
                for (int i = 0; i < headerList.size(); i++) {
                    rowData.put(headerList.get(i), i < line.length ? line[i].trim() : "");
                }
                rows.add(rowData);
            }
            log.info("Parsed {} data rows from CSV: {}", rows.size(), file.getOriginalFilename());
        } catch (IOException | CsvValidationException e) {
            log.error("Error parsing CSV file: {}", file.getOriginalFilename(), e);
            throw new FileParsingException("Failed to parse CSV file: " + e.getMessage());
        }
        return rows;
    }

    private List<String> extractHeaders(Row headerRow) {
        List<String> headers = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        for (Cell cell : headerRow) headers.add(formatter.formatCellValue(cell).trim());
        return headers;
    }

    private boolean isRowEmpty(Row row, DataFormatter formatter) {
        for (Cell cell : row) if (!formatter.formatCellValue(cell).isBlank()) return false;
        return true;
    }

    private boolean isLineEmpty(String[] line) {
        for (String val : line) if (val != null && !val.isBlank()) return false;
        return true;
    }
}
