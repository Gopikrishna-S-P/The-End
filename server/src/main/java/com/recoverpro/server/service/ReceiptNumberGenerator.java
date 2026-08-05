package com.recoverpro.server.service;

import java.util.UUID;

public interface ReceiptNumberGenerator {

    String generate(UUID organizationId);
}
