package com.recoverpro.server.service;

/**
 * Notifies a human when a background job fails, instead of the failure only ever reaching a log
 * line nobody is watching -- the reconciliation scheduler died silently for a stretch this way
 * before being noticed by chance. Deliberately minimal: one email channel, no dashboards/metrics
 * stack, since this deploys to a single remote machine rather than cloud infrastructure with
 * budget for one.
 */
public interface OpsAlertService {

    /**
     * @param jobName short, stable identifier for the failing job (used as the dedupe/cooldown
     *                key -- keep it constant across calls for the same job, e.g. the scheduler's
     *                class-level name)
     * @param context what the job was doing when it failed, for a human reading the alert
     * @param cause   the exception; its message is included, stack trace is not (kept to logs)
     */
    void alertJobFailure(String jobName, String context, Throwable cause);
}
