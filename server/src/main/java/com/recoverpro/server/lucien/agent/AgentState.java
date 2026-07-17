package com.recoverpro.server.lucien.agent;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

/** Mutable state for one ReAct session turn. Lives only for the duration of a chat() call. */
@Getter
public class AgentState {

    private final List<AgentStep> steps = new ArrayList<>();
    private int iterationCount = 0;
    private String pendingActionId;
    private boolean finished = false;

    public void addStep(AgentStep step) {
        steps.add(step);
    }

    public void incrementIteration() {
        iterationCount++;
    }

    public void setPendingActionId(String id) {
        this.pendingActionId = id;
    }

    public void markFinished() {
        this.finished = true;
    }

    public boolean hasPendingConfirmation() {
        return pendingActionId != null;
    }
}
