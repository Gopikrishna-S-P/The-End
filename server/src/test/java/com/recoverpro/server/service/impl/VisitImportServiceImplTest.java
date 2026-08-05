package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.VisitImportResult;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisitImportServiceImplTest {

    @Mock private AllocationRepository allocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private VisitLogRepository visitLogRepository;

    private VisitImportServiceImpl service;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        service = new VisitImportServiceImpl(allocationRepository, userRepository, visitLogRepository);
        orgId = UUID.randomUUID();
    }

    private MockMultipartFile buildWorkbook(String[][] rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("visits");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Loan Number");
            header.createCell(1).setCellValue("Agent Email");
            header.createCell(2).setCellValue("Visit Date");
            header.createCell(3).setCellValue("Disposition");

            for (int i = 0; i < rows.length; i++) {
                Row row = sheet.createRow(i + 1);
                for (int c = 0; c < rows[i].length; c++) {
                    row.createCell(c).setCellValue(rows[i][c]);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return new MockMultipartFile("file", "visits.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }

    @Test
    void importFromExcel_batchesAllocationAndAgentLookups_insteadOfPerRow() throws IOException {
        UUID agentId1 = UUID.randomUUID();
        UUID agentId2 = UUID.randomUUID();
        Allocation alloc1 = Allocation.builder().id(UUID.randomUUID()).loanNumber("L001").build();
        Allocation alloc2 = Allocation.builder().id(UUID.randomUUID()).loanNumber("L002").build();
        User agent1 = User.builder().id(agentId1).organizationId(orgId).email("agent1@example.com").build();
        User agent2 = User.builder().id(agentId2).organizationId(orgId).email("agent2@example.com").build();

        when(allocationRepository.findByOrganizationIdAndLoanNumberIn(any(), anyList()))
                .thenReturn(List.of(alloc1, alloc2));
        when(userRepository.findByEmailIgnoreCaseIn(anyList()))
                .thenReturn(List.of(agent1, agent2));

        MockMultipartFile file = buildWorkbook(new String[][]{
                {"L001", "agent1@example.com", "01/07/2026", "PTP"},
                {"L002", "agent2@example.com", "02/07/2026", "PTP"},
        });

        VisitImportResult result = service.importFromExcel(file, orgId, UUID.randomUUID());

        assertThat(result.getImported()).isEqualTo(2);
        assertThat(result.getFailed()).isZero();
        verify(allocationRepository, times(1)).findByOrganizationIdAndLoanNumberIn(any(), anyList());
        verify(userRepository, times(1)).findByEmailIgnoreCaseIn(anyList());
        verify(userRepository, never()).findByEmailIgnoreCase(any());
    }
}
