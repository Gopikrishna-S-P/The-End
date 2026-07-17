package com.recoverpro.server.service.impl;

import com.recoverpro.server.repository.ReceiptSequenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceiptNumberGeneratorImplTest {

    @Mock private ReceiptSequenceRepository receiptSequenceRepository;

    private ReceiptNumberGeneratorImpl generator;

    @BeforeEach
    void setUp() {
        generator = new ReceiptNumberGeneratorImpl(receiptSequenceRepository);
    }

    @Test
    void generate_claimsNextValueAndFormatsReceiptNumber() {
        UUID orgId = UUID.randomUUID();
        when(receiptSequenceRepository.nextValue(eq(orgId), any(LocalDate.class))).thenReturn(42L);

        String receipt = generator.generate(orgId);

        verify(receiptSequenceRepository).nextValue(eq(orgId), any(LocalDate.class));
        assertThat(receipt).startsWith("RCP-").contains("-000042");
    }

    @Test
    void generate_differentOrgsProduceDifferentOrgPart() {
        UUID orgA = UUID.randomUUID();
        UUID orgB = UUID.randomUUID();
        when(receiptSequenceRepository.nextValue(any(), any(LocalDate.class))).thenReturn(1L);

        String receiptA = generator.generate(orgA);
        String receiptB = generator.generate(orgB);

        assertThat(receiptA).isNotEqualTo(receiptB);
    }
}
