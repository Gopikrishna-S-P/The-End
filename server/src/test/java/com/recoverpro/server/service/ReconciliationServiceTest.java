package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.BankStatementRowResponse;
import com.recoverpro.server.entity.BankStatementRow;
import com.recoverpro.server.repository.BankStatementRowRepository;
import com.recoverpro.server.repository.PaymentIntentRepository;
import com.recoverpro.server.repository.PaymentTransactionRepository;
import com.recoverpro.server.repository.ReconciliationRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private ReconciliationRunRepository runRepository;
    @Mock private BankStatementRowRepository rowRepository;
    @Mock private PaymentTransactionRepository txnRepository;
    @Mock private PaymentIntentRepository intentRepository;

    private ReconciliationService service;

    @BeforeEach
    void setUp() {
        service = new ReconciliationService(runRepository, rowRepository, txnRepository, intentRepository);
    }

    @Test
    void listRows_unfilteredOutcome_queriesRowsExactlyOnce() {
        UUID runId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);
        BankStatementRow row = BankStatementRow.builder().id(UUID.randomUUID()).runId(runId).build();
        Page<BankStatementRow> page = new PageImpl<>(List.of(row), pageable, 1);

        when(rowRepository.findByRunId(runId, pageable)).thenReturn(page);

        Page<BankStatementRowResponse> result = service.listRows(runId, null, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(rowRepository, times(1)).findByRunId(runId, pageable);
        verify(rowRepository, never()).findByRunId(runId);
    }
}
