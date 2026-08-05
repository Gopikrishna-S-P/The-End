package com.recoverpro.server.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@Component
@Validated
@ConfigurationProperties(prefix = "lucien.llama")
public class LucienProperties {

    @NotBlank
    private String baseUrl;

    @NotBlank
    private String model;

    @Min(1)
    private int maxTokens = 1024;

    @NotNull
    private Double temperature = 0.7;

    @NotNull
    private Double topP = 0.9;

    @Min(1000)
    private int connectTimeoutMs = 5000;

    @Min(5000)
    private int readTimeoutMs = 60000;

    @Min(1)
    private int maxConnections = 20;
}
