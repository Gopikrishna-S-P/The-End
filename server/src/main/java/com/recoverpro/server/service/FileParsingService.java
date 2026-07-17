package com.recoverpro.server.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface FileParsingService {

    List<Map<String, String>> parseFile(MultipartFile file);

    List<Map<String, String>> parseExcel(MultipartFile file);

    List<Map<String, String>> parseCsv(MultipartFile file);
}
