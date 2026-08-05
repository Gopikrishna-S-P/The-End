package com.recoverpro.server.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.recoverpro.server.config.cache.TwoTierCacheManager;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.security.jackson2.SecurityJackson2Modules;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class RedisCacheConfig {

    private GenericJackson2JsonRedisSerializer securityAwareSerializer(ObjectMapper base) {
        ObjectMapper om = base.copy();
        om.registerModules(SecurityJackson2Modules.getModules(getClass().getClassLoader()));
        om.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .allowIfSubType("com.recoverpro.server.")
                        .allowIfSubType("org.springframework.security.")
                        .allowIfSubType("java.util.")
                        .allowIfSubType("java.lang.")
                        .build(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );
        return new GenericJackson2JsonRedisSerializer(om);
    }

    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory cf, ObjectMapper objectMapper) {
        GenericJackson2JsonRedisSerializer valueSerializer = securityAwareSerializer(objectMapper);
        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(valueSerializer));

        return RedisCacheManager.builder(cf)
                .cacheDefaults(base.entryTtl(Duration.ofMinutes(10)))
                .withCacheConfiguration("userDetails",  base.entryTtl(Duration.ofMinutes(5)))
                .withCacheConfiguration("featureFlags", base.entryTtl(Duration.ofMinutes(10)))
                .withCacheConfiguration("systemPrompts", base.entryTtl(Duration.ofMinutes(30)))
                .withCacheConfiguration("lucienContext", base.entryTtl(Duration.ofHours(2)))
                .build();
    }

    @Bean
    @Primary
    public CacheManager cacheManager(RedisCacheManager redisCacheManager) {
        return new TwoTierCacheManager(
                List.of(
                        caffeineCache("userDetails",   30, TimeUnit.SECONDS, 5_000),
                        caffeineCache("featureFlags",  30, TimeUnit.SECONDS, 2_000),
                        caffeineCache("systemPrompts", 30, TimeUnit.SECONDS, 500),
                        caffeineCache("lucienContext", 30, TimeUnit.SECONDS, 2_000),
                        caffeineCache("default",       60, TimeUnit.SECONDS, 1_000)
                ),
                redisCacheManager);
    }

    private static CaffeineCache caffeineCache(String name, long ttl, TimeUnit unit, int maxSize) {
        return new CaffeineCache(name,
                Caffeine.newBuilder()
                        .expireAfterWrite(ttl, unit)
                        .maximumSize(maxSize)
                        .recordStats()
                        .build());
    }
}
