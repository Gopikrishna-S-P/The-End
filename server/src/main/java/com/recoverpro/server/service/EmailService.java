package com.recoverpro.server.service;

public interface EmailService {
    void sendPasswordResetOtp(String email, String otp, int expiryMinutes);
    void sendAccountLockedAlert(String email);
    void sendWelcomeEmail(String email, String firstName, String otp, int expiryMinutes);

    void sendContactEnquiry(String name, String company, String email, String message);
}
