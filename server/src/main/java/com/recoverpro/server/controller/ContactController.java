package com.recoverpro.server.controller;

import com.recoverpro.server.service.EmailService;
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

    record ContactRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 120)           String company,
        @NotBlank @Email           String email,
        @NotBlank @Size(max = 2000) String message
    ) {}

    @PreAuthorize("permitAll()")
    @PostMapping
    public ResponseEntity<Void> enquire(@Valid @RequestBody ContactRequest req) {
        emailService.sendContactEnquiry(req.name(), req.company(), req.email(), req.message());
        return ResponseEntity.ok().build();
    }
}
