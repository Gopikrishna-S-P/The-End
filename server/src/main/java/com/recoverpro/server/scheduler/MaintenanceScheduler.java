package com.recoverpro.server.scheduler;

import com.recoverpro.server.entity.AgentShift;
import com.recoverpro.server.enums.ShiftStatus;
import com.recoverpro.server.repository.AgentShiftRepository;
import com.recoverpro.server.repository.ChatMessageRepository;
import com.recoverpro.server.repository.ChatSessionRepository;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.RefreshTokenRepository;
import com.recoverpro.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Periodic housekeeping tasks:
 * - Purge expired/revoked refresh tokens
 * - Purge expired password reset OTPs
 * - Auto-unlock accounts whose lockout period has elapsed
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MaintenanceScheduler {

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AgentShiftRepository agentShiftRepository;

    @Value("${lucien.sessions.max-age-days:90}")
    private int sessionMaxAgeDays;

    @Value("${agent.shift.max-hours:14}")
    private int shiftMaxHours;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgeExpiredTokens() {
        Instant now = Instant.now();
        refreshTokenRepository.deleteExpiredTokens(now);
        int otpDeleted = passwordResetTokenRepository.deleteExpired(now);
        log.info("Token cleanup: OTPs removed={}", otpDeleted);
    }

    @Scheduled(fixedDelay = 900_000)
    @Transactional
    public void unlockExpiredAccounts() {
        userRepository.findExpiredLockouts(Instant.now()).forEach(user -> {
            userRepository.resetLockout(user.getId());
            log.info("Auto-unlocked account: id={}", user.getId());
        });
    }

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeOldChatSessions() {
        Instant cutoff = Instant.now().minusSeconds((long) sessionMaxAgeDays * 86400);
        int messages = chatMessageRepository.deleteMessagesForSessionsOlderThan(cutoff);
        int sessions = chatSessionRepository.deleteSessionsOlderThan(cutoff);
        log.info("FRIDAY session purge: {} messages + {} sessions older than {} days removed",
                messages, sessions, sessionMaxAgeDays);
    }

    @Scheduled(fixedDelay = 30 * 60_000)
    @Transactional
    public void autoEndDanglingShifts() {
        Instant cutoff = Instant.now().minusSeconds((long) shiftMaxHours * 3600);
        List<AgentShift> dangling = agentShiftRepository.findStaleActiveShifts(cutoff);
        if (dangling.isEmpty()) return;
        Instant now = Instant.now();
        for (AgentShift shift : dangling) {
            shift.setStatus(ShiftStatus.AUTO_ENDED);
            shift.setEndedAt(now);
        }
        agentShiftRepository.saveAll(dangling);
        log.warn("Auto-ended {} dangling shifts (no ping for {} h): {}",
                dangling.size(), shiftMaxHours,
                dangling.stream().map(s -> s.getId().toString()).toList());
    }
}
