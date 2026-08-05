package com.recoverpro.server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    @Value("${app.http.manager-connect-timeout-ms:5000}")
    private int managerConnectMs;

    @Value("${app.http.manager-read-timeout-ms:30000}")
    private int managerReadMs;

    @Value("${lucien.llama.connect-timeout-ms:5000}")
    private int llamaConnectMs;

    @Value("${lucien.llama.read-timeout-ms:60000}")
    private int llamaReadMs;

    @Value("${lucien.tts.connect-timeout-ms:5000}")
    private int ttsConnectMs;

    @Value("${lucien.tts.read-timeout-ms:60000}")
    private int ttsReadMs;

    @Bean(name = "managerRestTemplate")
    public RestTemplate managerRestTemplate() {
        return build(managerConnectMs, managerReadMs);
    }

    @Bean(name = "llamaRestTemplate")
    public RestTemplate llamaRestTemplate() {
        return build(llamaConnectMs, llamaReadMs);
    }

    @Bean(name = "ttsRestTemplate")
    public RestTemplate ttsRestTemplate() {
        return build(ttsConnectMs, ttsReadMs);
    }

    private RestTemplate build(int connectMs, int readMs) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectMs));
        factory.setReadTimeout(Duration.ofMillis(readMs));
        return new RestTemplate(factory);
    }
}
