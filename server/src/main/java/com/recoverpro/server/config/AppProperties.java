package com.recoverpro.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String baseUrl = "http://localhost:5173";
    private Jwt jwt = new Jwt();
    private Security security = new Security();

    @Data
    public static class Jwt {
        private String secret;
        private long accessTokenExpiryMs = 900_000L;
        private long refreshTokenExpiryMs = 604_800_000L;
    }

    @Data
    public static class Security {
        private int maxLoginAttempts = 5;
        private int loginWindowMinutes = 15;
        private int lockoutDurationMinutes = 30;
        private int otpExpiryMinutes = 10;
        private int welcomeOtpExpiryMinutes = 1440;
        private int bcryptStrength = 12;
        private int forgotPasswordMaxAttempts = 3;
        private int forgotPasswordWindowMinutes = 30;
        private int otpMaxAttempts = 5;
        private int otpWindowMinutes = 10;
        private int contactFormMaxAttempts = 5;
        private int contactFormWindowMinutes = 60;
    }
}
