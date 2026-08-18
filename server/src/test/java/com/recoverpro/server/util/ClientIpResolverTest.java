package com.recoverpro.server.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SYSTEM-PLAN 8.1: three separate extractClientIp() copies (AuthServiceImpl,
 * RefreshTokenRotationServiceImpl, ContactController) used to take the FIRST entry of
 * X-Forwarded-For directly -- fully attacker-controlled, since it bypasses the trusted-proxy
 * validation server.tomcat.remoteip.internal-proxies (TRUSTED_PROXY_CIDR) already performs at
 * the Tomcat layer before request.getRemoteAddr() is ever set. All three now delegate here.
 *
 * <p>MockHttpServletRequest.getRemoteAddr() stands in for "what RemoteIpValve already resolved,
 * after validating the caller against the trusted-proxy CIDR" -- ClientIpResolver's job is
 * simply to never look past that, no matter what headers a caller sends.
 */
class ClientIpResolverTest {

    @Test
    void resolve_forgedXForwardedFor_returnsRealSocketAddress_notTheForgedHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5"); // what RemoteIpValve actually resolved
        request.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8"); // attacker-supplied
        request.addHeader("X-Real-IP", "9.9.9.9"); // also attacker-supplied

        String resolved = ClientIpResolver.resolve(request);

        assertThat(resolved).isEqualTo("203.0.113.5");
        assertThat(resolved).isNotIn("1.2.3.4", "5.6.7.8", "9.9.9.9");
    }

    @Test
    void resolve_noForwardingHeadersAtAll_stillReturnsRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.7");

        assertThat(ClientIpResolver.resolve(request)).isEqualTo("198.51.100.7");
    }
}
