package com.recoverpro.server.repository;

import com.recoverpro.server.entity.ProcessedRazorpayEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedRazorpayEventRepository extends JpaRepository<ProcessedRazorpayEvent, String> {
}
