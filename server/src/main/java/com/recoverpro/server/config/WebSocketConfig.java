package com.recoverpro.server.config;

import com.recoverpro.server.security.jwt.JwtHandshakeInterceptor;
import com.recoverpro.server.websocket.LiveTrackWebSocketHandler;
import com.recoverpro.server.websocket.SosAudioWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.List;

/**
 * Registers the WebSocket handlers that already existed as beans but were never mapped to a URL
 * (BCR-6): LiveTrackWebSocketHandler was fully implemented and unreachable; SosAudioWebSocketHandler
 * didn't exist at all until this pass. Both sit behind the existing JwtHandshakeInterceptor, which
 * already accepts a JWT via Authorization header or ?token= (browsers can't set headers on a WS
 * upgrade) -- that interceptor predates this change and needed no modification.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final LiveTrackWebSocketHandler liveTrackWebSocketHandler;
    private final SosAudioWebSocketHandler sosAudioWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Value("${app.cors.allowed-origins:}")
    private List<String> allowedOrigins;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = allowedOrigins.toArray(new String[0]);

        registry.addHandler(liveTrackWebSocketHandler, "/ws/live-track")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(origins);

        registry.addHandler(sosAudioWebSocketHandler, "/ws/sos-audio")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(origins);
    }
}
