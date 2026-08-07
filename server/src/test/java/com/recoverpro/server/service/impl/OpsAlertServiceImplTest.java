package com.recoverpro.server.service.impl;

import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OpsAlertServiceImplTest {

    @Mock private EmailService emailService;
    @Mock private NotificationService notificationService;

    private OpsAlertServiceImpl newService(long cooldownMinutes) {
        OpsAlertServiceImpl svc = new OpsAlertServiceImpl(emailService, notificationService);
        try {
            var field = OpsAlertServiceImpl.class.getDeclaredField("cooldownMinutes");
            field.setAccessible(true);
            field.set(svc, cooldownMinutes);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        return svc;
    }

    @Test
    void alertJobFailure_firstFailure_sendsEmail() {
        OpsAlertServiceImpl service = newService(30);

        service.alertJobFailure("TestJob.run", "doing a thing", new RuntimeException("boom"));

        verify(emailService).sendOpsAlert(contains("TestJob.run"), contains("boom"));
    }

    @Test
    void alertJobFailure_secondFailureWithinCooldown_suppressed() {
        OpsAlertServiceImpl service = newService(30);

        service.alertJobFailure("TestJob.run", "attempt 1", new RuntimeException("boom"));
        service.alertJobFailure("TestJob.run", "attempt 2", new RuntimeException("boom again"));

        verify(emailService, times(1)).sendOpsAlert(anyString(), anyString());
    }

    @Test
    void alertJobFailure_zeroCooldown_alwaysSends() {
        OpsAlertServiceImpl service = newService(0);

        service.alertJobFailure("TestJob.run", "attempt 1", new RuntimeException("boom"));
        service.alertJobFailure("TestJob.run", "attempt 2", new RuntimeException("boom again"));

        verify(emailService, times(2)).sendOpsAlert(anyString(), anyString());
    }

    @Test
    void alertJobFailure_differentJobNames_eachAlertsIndependently() {
        OpsAlertServiceImpl service = newService(30);

        service.alertJobFailure("JobA.run", "context", new RuntimeException("boom"));
        service.alertJobFailure("JobB.run", "context", new RuntimeException("boom"));

        verify(emailService).sendOpsAlert(contains("JobA.run"), anyString());
        verify(emailService).sendOpsAlert(contains("JobB.run"), anyString());
    }
}
