package com.recoverpro.server.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * SYSTEM-PLAN 8.1: the app already resolves the trusted client IP correctly at the Tomcat layer
 * (server.forward-headers-strategy=native + server.tomcat.remoteip.internal-proxies=${TRUSTED_PROXY_CIDR}),
 * which validates X-Forwarded-For against the configured trusted-proxy CIDR before Tomcat's
 * RemoteIpValve ever sets it on the request. Re-reading X-Forwarded-For in application code (as
 * three separate extractClientIp() copies used to) bypasses that validation entirely and takes
 * whatever value the caller supplies -- fully attacker-controlled, since nothing upstream of a
 * misconfigured or absent proxy strips it. request.getRemoteAddr() is the single correct read
 * once RemoteIpValve has run; there is nothing else to parse.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {}

    public static String resolve(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
