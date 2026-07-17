package com.recoverpro.server.config.cache;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.data.redis.cache.RedisCacheManager;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class TwoTierCacheManager implements CacheManager {

    private final Map<String, TwoTierCache> caches;
    private final RedisCacheManager redisManager;

    public TwoTierCacheManager(List<CaffeineCache> l1Caches, RedisCacheManager redisManager) {
        this.redisManager = redisManager;
        this.caches = l1Caches.stream().collect(Collectors.toMap(
                CaffeineCache::getName,
                l1 -> new TwoTierCache(l1.getName(), l1, redisManager.getCache(l1.getName()))
        ));
    }

    @Override
    public Cache getCache(String name) {
        TwoTierCache cached = caches.get(name);
        if (cached != null) return cached;
        return redisManager.getCache(name);
    }

    @Override
    public Collection<String> getCacheNames() {
        return caches.keySet();
    }
}
