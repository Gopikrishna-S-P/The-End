package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.ForgotPasswordRequest;
import com.recoverpro.server.dto.request.ResetPasswordRequest;
import com.recoverpro.server.dto.request.VerifyOtpRequest;

/** Anonymous forgot/reset-password OTP flow, split out of AuthServiceImpl (SYSTEM-PLAN SP39). */
public interface PasswordResetService {

    void forgotPassword(ForgotPasswordRequest request);

    void verifyResetOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);
}
