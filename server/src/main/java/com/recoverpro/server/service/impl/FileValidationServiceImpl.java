package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.exception.InvalidFileException;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.service.FileValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileValidationServiceImpl implements FileValidationService {

    private final FileUploadRepository fileUploadRepository;
    private final ClamAvScannerClient clamAvScannerClient;

    @Value("${application.file.allowed-types}")
    private List<String> allowedTypes;

    @Value("${application.file.max-size-bytes}")
    private long maxSizeBytes;

    @Override
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new InvalidFileException("File must not be empty");

        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new InvalidFileException("Invalid file type: " + contentType + ". Allowed types: xlsx, xls, csv");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new InvalidFileException("File size exceeds maximum of " + (maxSizeBytes / 1024 / 1024) + " MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) throw new InvalidFileException("File name must not be null");

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!List.of("xlsx", "xls", "csv").contains(extension)) {
            throw new InvalidFileException("Invalid file extension: " + extension);
        }
        validateMagicBytes(file, extension);

        try (InputStream is = file.getInputStream()) {
            if (!clamAvScannerClient.isClean(is)) {
                throw new InvalidFileException("File failed virus scan and was rejected");
            }
        } catch (IOException e) {
            throw new InvalidFileException("Could not read file for virus scanning: " + e.getMessage());
        }
    }

    @Override
    public String computeSha256Hash(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException | IOException e) {
            throw new InvalidFileException("Failed to compute file hash: " + e.getMessage());
        }
    }

    @Override
    public boolean isDuplicateFile(String sha256Hash, UUID organizationId, UploadType uploadType) {
        return fileUploadRepository.existsBySha256HashAndOrganizationIdAndUploadTypeAndIsDeletedFalse(
                sha256Hash, organizationId, uploadType);
    }

    private void validateMagicBytes(MultipartFile file, String extension) {
        byte[] header = new byte[8];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 4) throw new InvalidFileException("File is too small to be a valid " + extension.toUpperCase());
        } catch (IOException e) {
            throw new InvalidFileException("Cannot read file content: " + e.getMessage());
        }

        switch (extension) {
            case "xlsx" -> {
                if (header[0] != 0x50 || header[1] != 0x4B || header[2] != 0x03 || header[3] != 0x04)
                    throw new InvalidFileException("File content does not match XLSX format");
            }
            case "xls" -> {
                byte[] xls = {(byte)0xD0, (byte)0xCF, 0x11, (byte)0xE0, (byte)0xA1, (byte)0xB1, 0x1A, (byte)0xE1};
                if (!Arrays.equals(Arrays.copyOf(header, 8), xls))
                    throw new InvalidFileException("File content does not match XLS format");
            }
            case "csv" -> {
                for (byte b : header) {
                    if (b == 0x00) throw new InvalidFileException("File content does not match CSV format -- binary data detected");
                }
            }
            default -> throw new InvalidFileException("Unsupported extension: " + extension);
        }
    }

    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1 || lastDot == filename.length() - 1) return "";
        return filename.substring(lastDot + 1);
    }
}
