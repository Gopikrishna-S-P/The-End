package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.OptimizeAssignmentOrderRequest;
import com.recoverpro.server.dto.response.OptimizedAssignmentOrderResponse;

public interface AllocationOptimizerService {

    OptimizedAssignmentOrderResponse optimize(OptimizeAssignmentOrderRequest request);
}
