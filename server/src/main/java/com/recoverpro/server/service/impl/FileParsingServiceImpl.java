package com.recoverpro.server.service.impl;

import com.recoverpro.server.exception.FileParsingException;
import com.recoverpro.server.service.FileParsingService;
import com.recoverpro.server.service.RowHandler;
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
    public void streamFile(MultipartFile file, RowHandler handler) {
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        log.info("Parsing file: {} with content type: {}", filename, contentType);
        if ((contentType != null && contentType.equals("text/csv"))
                || (filename != null && filename.toLowerCase().endsWith(".csv"))) {
            streamCsv(file, handler);
        } else {
            streamExcel(file, handler);
        }
    }

    /**
     * OpenCSV's CSVReader already reads line-by-line under the hood; the only thing that made
     * the old parseCsv() non-streaming was collecting every row into a List before returning.
     * This never accumulates rows -- each one is handed to {@code handler} and then eligible for
     * GC immediately, regardless of file size.
     */
    private void streamCsv(MultipartFile file, RowHandler handler) {
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String[] headers = reader.readNext();
            if (headers == null || headers.length == 0)
                throw new FileParsingException("CSV file has no header row");
            List<String> headerList = Arrays.stream(headers).map(String::trim).toList();
            handler.onHeaders(headerList);

            String[] line;
            int dataRowIndex = 0;
            while ((line = reader.readNext()) != null) {
                if (isLineEmpty(line)) continue;
                Map<String, String> rowData = new LinkedHashMap<>();
                for (int i = 0; i < headerList.size(); i++) {
                    rowData.put(headerList.get(i), i < line.length ? line[i].trim() : "");
                }
                handler.onRow(rowData, dataRowIndex);
                dataRowIndex++;
            }
            log.info("Streamed {} data rows from CSV: {}", dataRowIndex, file.getOriginalFilename());
        } catch (IOException | CsvValidationException e) {
            log.error("Error parsing CSV file: {}", file.getOriginalFilename(), e);
            throw new FileParsingException("Failed to parse CSV file: " + e.getMessage());
        }
    }

    /**
     * Apache POI's usermodel/WorkbookFactory API buffers the whole workbook internally
     * regardless of how rows are consumed afterward -- true XLSX streaming needs the SAX-based
     * eventusermodel/XSSFReader API, a materially larger change (shared-strings table, style/
     * date-format resolution, XML SAX handling) not attempted here given the correctness risk to
     * financial data. What this DOES fix: the parsed rows are handed to {@code handler} one at a
     * time instead of being collected into a List that outlives the parse and is held for the
     * entire processing run (that list, not POI's own parse-time buffer, was what
     * FileProcessingServiceImpl held onto for the task's full duration).
     */
    private void streamExcel(MultipartFile file, RowHandler handler) {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) throw new FileParsingException("Excel file has no sheets");
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new FileParsingException("Excel file has no header row");
            List<String> headers = extractHeaders(headerRow);
            handler.onHeaders(headers);

            DataFormatter formatter = new DataFormatter();
            int totalRows = sheet.getLastRowNum();
            int dataRowIndex = 0;
            for (int i = 1; i <= totalRows; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row, formatter)) continue;
                Map<String, String> rowData = new LinkedHashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    rowData.put(headers.get(j), cell == null ? "" : formatter.formatCellValue(cell).trim());
                }
                handler.onRow(rowData, dataRowIndex);
                dataRowIndex++;
            }
            log.info("Streamed {} data rows from Excel: {}", dataRowIndex, file.getOriginalFilename());
        } catch (IOException e) {
            log.error("Error parsing Excel file: {}", file.getOriginalFilename(), e);
            throw new FileParsingException("Failed to parse Excel file: " + e.getMessage());
        }
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
