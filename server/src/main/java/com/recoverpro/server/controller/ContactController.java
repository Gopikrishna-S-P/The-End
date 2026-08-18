package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.RateLimitExceededException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.util.ClientIpResolver;
import com.recoverpro.server.util.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contact")
@RequiredArgsConstructor
public class ContactController {

    private final EmailService emailService;
    private final RateLimiter rateLimiter;
    private final AppProperties appProperties;

    record ContactRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 120)           String company,
        @NotBlank @Email           String email,
        @NotBlank @Size(max = 2000) String message
    ) {}

    @PreAuthorize("permitAll()")
    @PostMapping
    public ResponseEntity<Void> enquire(@Valid @RequestBody ContactRequest req, HttpServletRequest httpRequest) {
        AppProperties.Security sec = appProperties.getSecurity();
        String rateLimitKey = "contact:" + ClientIpResolver.resolve(httpRequest);
        if (!rateLimiter.isAllowed(rateLimitKey, sec.getContactFormMaxAttempts(), sec.getContactFormWindowMinutes())) {
            long retryAfter = rateLimiter.getRetryAfterSeconds(rateLimitKey);
            throw new RateLimitExceededException("Too many submissions. Please try again later.", retryAfter);
        }
        emailService.sendContactEnquiry(req.name(), req.company(), req.email(), req.message());
        return ResponseEntity.ok().build();
    }
}
