package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateUserRequestDto;
import com.recoverpro.server.dto.request.ReviewRequestDto;
import com.recoverpro.server.dto.response.UserCreationRequestResponse;
import com.recoverpro.server.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserCreationRequestService {

    UserCreationRequestResponse submit(CreateUserRequestDto dto, UserPrincipal principal);

    Page<UserCreationRequestResponse> listPendingForApprover(UserPrincipal principal, Pageable pageable);

    Page<UserCreationRequestResponse> listMyRequests(UserPrincipal principal, Pageable pageable);

    UserCreationRequestResponse review(UUID requestId, ReviewRequestDto dto, UserPrincipal principal);

    long countPendingForApprover(UserPrincipal principal);
}
