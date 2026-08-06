package com.recoverpro.server.service.importer;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.enums.UploadType;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Builds the downloadable CSV template for an upload type, straight from the processor's own
 * {@link ImportFieldSpec} list. Generating it rather than checking in static files is what keeps
 * the template honest - a column added to a processor shows up in the template automatically,
 * so the two can never document different formats.
 */
@Service
@RequiredArgsConstructor
public class ImportTemplateService {

    private final List<EntityImportProcessor<?>> processors;

    private Map<UploadType, EntityImportProcessor<?>> byType;

    @PostConstruct
    void index() {
        byType = processors.stream()
                .collect(Collectors.toMap(EntityImportProcessor::supportedType, Function.identity()));
    }

    public String buildCsv(UploadType uploadType) {
        EntityImportProcessor<?> processor = byType.get(uploadType);
        if (processor == null) {
            throw new BusinessException("No import processor registered for upload type: " + uploadType);
        }

        List<ImportFieldSpec> specs = processor.fieldSpecs();
        String header = specs.stream().map(ImportFieldSpec::name).collect(Collectors.joining(","));
        String example = specs.stream().map(s -> escape(s.example())).collect(Collectors.joining(","));

        return header + "\n" + example + "\n";
    }

    public String filename(UploadType uploadType) {
        return uploadType.name().toLowerCase() + "-import-template.csv";
    }

    private static String escape(String value) {
        if (value == null || value.isEmpty()) return "";
        boolean needsQuoting = value.contains(",") || value.contains("\"") || value.contains("\n");
        return needsQuoting ? '"' + value.replace("\"", "\"\"") + '"' : value;
    }
}
