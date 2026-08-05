package com.recoverpro.server.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class RlsDataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource(
            DataSourceProperties properties,
            @Value("${spring.datasource.hikari.maximum-pool-size:20}") int maximumPoolSize,
            @Value("${spring.datasource.hikari.minimum-idle:5}") int minimumIdle,
            @Value("${spring.datasource.hikari.connection-timeout:30000}") long connectionTimeoutMs) {
        HikariDataSource hikari = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        hikari.setMaximumPoolSize(maximumPoolSize);
        hikari.setMinimumIdle(minimumIdle);
        hikari.setConnectionTimeout(connectionTimeoutMs);
        return new RlsAwareDataSource(hikari);
    }
}
