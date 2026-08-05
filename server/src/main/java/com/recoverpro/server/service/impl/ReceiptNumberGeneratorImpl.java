package com.recoverpro.server.service.impl;

import com.recoverpro.server.repository.ReceiptSequenceRepository;
import com.recoverpro.server.service.ReceiptNumberGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceiptNumberGeneratorImpl implements ReceiptNumberGenerator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final ReceiptSequenceRepository receiptSequenceRepository;

    @Override
    public String generate(UUID organizationId) {
        LocalDate today = LocalDate.now();
        long seq = receiptSequenceRepository.nextValue(organizationId, today);

        String datePart = today.format(DATE_FORMAT);
        long orgHash = Math.abs(organizationId.getMostSignificantBits() % 10000);
        String orgPart = String.format("%04d", orgHash);
        String seqPart = String.format("%06d", seq % 1000000);
        return "RCP-" + datePart + "-" + orgPart + "-" + seqPart;
    }
}
