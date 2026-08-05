package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.DashboardFilterRequest;
import com.recoverpro.server.dto.response.UnifiedDashboardResponse;
import com.recoverpro.server.security.AuthenticatedUser;

public interface UnifiedDashboardService {
    UnifiedDashboardResponse getDashboard(AuthenticatedUser user, DashboardFilterRequest filter);
}
