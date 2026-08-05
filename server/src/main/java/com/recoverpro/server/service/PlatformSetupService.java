package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateDirectUserRequest;
import com.recoverpro.server.dto.response.UserResponse;

import java.util.List;

public interface PlatformSetupService {
    UserResponse createAdminUser(CreateDirectUserRequest request);
    List<UserResponse> listAdminUsers();
}
