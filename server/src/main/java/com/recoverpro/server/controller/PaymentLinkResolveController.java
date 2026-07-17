package com.recoverpro.server.controller;

import com.recoverpro.server.dto.response.PaymentLinkResponse;
import com.recoverpro.server.service.PaymentLinkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@Slf4j
@RestController
@RequestMapping("/p")
@RequiredArgsConstructor
public class PaymentLinkResolveController {

    private final PaymentLinkService paymentLinkService;

    @PreAuthorize("permitAll()")
    @GetMapping("/{token}")
    public ResponseEntity<String> resolve(@PathVariable String token) {
        PaymentLinkResponse link = paymentLinkService.resolveAndConsume(token);

        if (link == null) {
            log.info("Payment link miss: token={}", token);
            return ResponseEntity.status(HttpStatus.GONE)
                    .contentType(MediaType.TEXT_HTML)
                    .body(invalidLinkHtml());
        }

        String target = link.getTargetUri();
        if (target == null || target.isBlank()) {
            log.error("Payment link {} has no targetUri -- misconfigured", token);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_HTML)
                    .body(invalidLinkHtml());
        }

        if (target.startsWith("upi://")) {
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(upiHandoffHtml(target));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(target));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    private static String invalidLinkHtml() {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Link no longer valid</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: system-ui; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #111; }
                        h1 { color: #b91c1c; }
                    </style>
                </head>
                <body>
                    <h1>Link no longer valid</h1>
                    <p>This payment link has expired or has already been used.</p>
                    <p>If you still need to make a payment, please reach out to your
                    recovery contact for a fresh link.</p>
                </body>
                </html>
                """;
    }

    private static String upiHandoffHtml(String upiUri) {
        String escaped = htmlEscape(upiUri);
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Open your UPI app</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <meta http-equiv="refresh" content="0; url=%s">
                    <style>
                        body { font-family: system-ui; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #111; }
                        a.btn { display: inline-block; padding: 14px 24px; background: #0AA550; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; }
                        small { color: #6b7280; }
                    </style>
                </head>
                <body>
                    <h1>Open your UPI app</h1>
                    <p>Tap the button to launch your UPI app and complete the payment.</p>
                    <p><a class="btn" href="%s">Open UPI app</a></p>
                    <p><small>UPI links work on Android / iOS phones with a UPI app installed.</small></p>
                </body>
                </html>
                """.formatted(escaped, escaped);
    }

    private static String htmlEscape(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
