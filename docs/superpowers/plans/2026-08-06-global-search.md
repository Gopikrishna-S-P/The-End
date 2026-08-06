# Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the topbar's search actually search (loan number + customer name, currently a no-op), and merge it with the Ctrl/Cmd+K palette into one search that also jumps straight to a loan's detail page.

**Architecture:** Backend adds a blind-index child table (`allocation_name_search_tokens`) so `Allocation.borrower_name` — encrypted with a random IV, unsearchable in SQL — can be prefix-matched without decryption, reusing the existing `LookupHashService` HMAC infra. The repository query that already accepts (and silently drops) `searchTerm` gets a real predicate. On the frontend, `CommandPalette` (which already owns keyboard nav, fuzzy matching, and recents) gains an optional debounced backend-search integration; `GlobalSearchModal` — a second, disconnected search box — is deleted, and both Ctrl/Cmd+K and the topbar Search button open the one merged component.

**Tech Stack:** Spring Boot / JPA / PostgreSQL (Flyway migrations, row-level security) on the backend; React + TypeScript (Vite) on the frontend, no test runner configured there today.

## Global Constraints

- `Allocation.borrowerName` is AES/GCM-encrypted with a random IV per row (`LocalKeyEnvelopeEncryptor`) — never pattern-match it directly in SQL.
- Every org-scoped table in this codebase carries its own denormalized `organization_id` column with an RLS policy comparing it to `current_org_id()` (see `V070__call_logs_recording_and_rls.sql`) — no join-based RLS policies exist anywhere in this schema, so the new table must follow the same shape.
- `LookupHashService` (`server/src/main/java/com/recoverpro/server/security/encryption/LookupHashService.java`) is the existing HMAC-SHA256 blind-index utility (used today by `Borrower` for phone/email/ckycId exact-match lookup) — reuse it and its configured key; do not introduce a second HMAC secret.
- Default import batch size is 500 rows (`application.file.batch-size`), max 50,000 rows per file (`application.file.max-rows`) — the token-write path runs once per batch, not once per row.
- The frontend has no test runner configured (no vitest/jest, no `"test"` script in `web/package.json`) — frontend verification in this plan is `npm run build` + `npm run lint` + a live click-through in the running app, not automated tests. This is a deliberate correction from the design spec's mention of "frontend component tests," discovered while writing this plan; it matches how this project already verifies frontend work (see `feedback_verify_via_live_frontend` project convention: click through the real page, don't assume from code alone).
- Backend changes must pass the full `mvn test` suite (run from `recoverpro/server/`), not just `mvn compile` — this project has had real regressions slip through compile-only checks before.
- Spec: `docs/superpowers/specs/2026-08-06-global-search-design.md`. Read it for the "why"; this plan is the "how."

---

## Task 1: `LookupHashService.nameSearchTokens` — prefix-token generation

**Files:**
- Modify: `server/src/main/java/com/recoverpro/server/security/encryption/LookupHashService.java`
- Test: `server/src/test/java/com/recoverpro/server/security/encryption/LookupHashServiceTest.java` (new)

**Interfaces:**
- Produces: `Set<String> LookupHashService.nameSearchTokens(String name)` — normalizes `name` (trim, lowercase, split on whitespace), and for every word emits the HMAC hash (via the existing `hash(String)` method) of every prefix from length 2 up to the full word length. Non-letter/digit characters are stripped from each word before prefixing. Returns an empty set for `null`/blank input or if no HMAC key is configured (mirrors `hash()`'s existing null-safety).

- [ ] **Step 1: Write the failing test**

```java
package com.recoverpro.server.security.encryption;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LookupHashServiceTest {

    @Autowired
    private LookupHashService lookupHashService;

    @Test
    void nameSearchTokens_returnsPrefixesOfEachWord() {
        Set<String> tokens = lookupHashService.nameSearchTokens("John Smith");

        assertThat(tokens).contains(
                lookupHashService.hash("jo"), lookupHashService.hash("joh"), lookupHashService.hash("john"),
                lookupHashService.hash("sm"), lookupHashService.hash("smi"), lookupHashService.hash("smit"), lookupHashService.hash("smith"));
        assertThat(tokens).hasSize(7);
    }

    @Test
    void nameSearchTokens_isCaseAndWhitespaceInsensitive() {
        Set<String> lower = lookupHashService.nameSearchTokens("john smith");
        Set<String> mixed = lookupHashService.nameSearchTokens("  John   SMITH  ");

        assertThat(mixed).isEqualTo(lower);
    }

    @Test
    void nameSearchTokens_blankOrNull_returnsEmptySet() {
        assertThat(lookupHashService.nameSearchTokens(null)).isEmpty();
        assertThat(lookupHashService.nameSearchTokens("   ")).isEmpty();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `recoverpro/server/`): `mvn test -Dtest=LookupHashServiceTest`
Expected: compile error — `nameSearchTokens` does not exist on `LookupHashService`.

- [ ] **Step 3: Implement `nameSearchTokens`**

Add to `LookupHashService.java`, alongside the existing `hash`/`hashPhone` methods (needs `java.util.HashSet` and `java.util.Set` imports added to the file's import list):

```java
    public java.util.Set<String> nameSearchTokens(String name) {
        if (name == null || name.isBlank() || hmacKey == null) return java.util.Set.of();
        java.util.Set<String> tokens = new java.util.HashSet<>();
        for (String word : name.trim().toLowerCase().split("\\s+")) {
            String cleaned = word.replaceAll("[^\\p{L}\\p{N}]", "");
            for (int len = 2; len <= cleaned.length(); len++) {
                tokens.add(hash(cleaned.substring(0, len)));
            }
        }
        return tokens;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mvn test -Dtest=LookupHashServiceTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/security/encryption/LookupHashService.java server/src/test/java/com/recoverpro/server/security/encryption/LookupHashServiceTest.java
git commit -m "Add name-search prefix-token generation to LookupHashService"
```

---

## Task 2: `allocation_name_search_tokens` table, entity, and repository

**Files:**
- Create: `server/src/main/resources/db/migration/V081__allocation_name_search_tokens.sql`
- Create: `server/src/main/java/com/recoverpro/server/entity/AllocationNameSearchToken.java`
- Create: `server/src/main/java/com/recoverpro/server/repository/AllocationNameSearchTokenRepository.java`

**Interfaces:**
- Produces: entity `AllocationNameSearchToken { UUID allocationId; String tokenHash; UUID organizationId; }`, composite key `AllocationNameSearchToken.Key(allocationId, tokenHash)`.
- Produces: `AllocationNameSearchTokenRepository extends JpaRepository<AllocationNameSearchToken, AllocationNameSearchToken.Key>` with `void deleteByAllocationId(UUID allocationId)` and inherited `saveAll(Iterable<AllocationNameSearchToken>)`.
- Consumed by: Task 3 (`AllocationSearchIndexService`) and Task 5 (the search query's subquery references this entity by JPQL name).

- [ ] **Step 1: Confirm the next migration version is still free**

Run: `ls server/src/main/resources/db/migration | sort -V | tail -3`
Expected: highest existing file is `V080__platform_admin_null_org_id.sql`. If a higher version already exists (another change landed first), use the next free number instead of `V081` throughout this task.

- [ ] **Step 2: Write the migration**

Create `server/src/main/resources/db/migration/V081__allocation_name_search_tokens.sql`:

```sql
-- =============================================================================
-- Table: allocation_name_search_tokens
-- =============================================================================
-- Blind-index tokens for searching Allocation.borrower_name, which is stored
-- AES/GCM-encrypted with a random IV per row (LocalKeyEnvelopeEncryptor) and
-- can never be pattern-matched directly in SQL. Each row is one HMAC-SHA256
-- (LookupHashService, same key as Borrower's phone/email/ckycId lookup hashes)
-- of a prefix of one word of the borrower's name, so a search for "sm" can
-- find "Smith" without ever decrypting the column at query time.
-- See docs/superpowers/specs/2026-08-06-global-search-design.md.
CREATE TABLE allocation_name_search_tokens (
    allocation_id   UUID     NOT NULL,
    token_hash      CHAR(64) NOT NULL,
    organization_id UUID     NOT NULL,
    PRIMARY KEY (allocation_id, token_hash)
);

CREATE INDEX idx_allocation_name_search_tokens_hash ON allocation_name_search_tokens (token_hash);
CREATE INDEX idx_allocation_name_search_tokens_org  ON allocation_name_search_tokens (organization_id);

ALTER TABLE allocation_name_search_tokens
    ADD CONSTRAINT fk_allocation_name_search_tokens_allocation
        FOREIGN KEY (allocation_id) REFERENCES allocations (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_allocation_name_search_tokens_organization
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE allocation_name_search_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_name_search_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_allocation_name_search_tokens_isolation ON allocation_name_search_tokens
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
```

- [ ] **Step 3: Write the entity**

Create `server/src/main/java/com/recoverpro/server/entity/AllocationNameSearchToken.java`:

```java
package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "allocation_name_search_tokens",
        indexes = { @Index(name = "idx_allocation_name_search_tokens_hash", columnList = "token_hash") })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(AllocationNameSearchToken.Key.class)
public class AllocationNameSearchToken {

    @Id
    @Column(name = "allocation_id", nullable = false, updatable = false)
    private UUID allocationId;

    @Id
    @Column(name = "token_hash", nullable = false, updatable = false, length = 64)
    private String tokenHash;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private UUID allocationId;
        private String tokenHash;
    }
}
```

- [ ] **Step 4: Write the repository**

Create `server/src/main/java/com/recoverpro/server/repository/AllocationNameSearchTokenRepository.java`:

```java
package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AllocationNameSearchToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AllocationNameSearchTokenRepository
        extends JpaRepository<AllocationNameSearchToken, AllocationNameSearchToken.Key> {

    @Modifying
    @Query("DELETE FROM AllocationNameSearchToken t WHERE t.allocationId = :allocationId")
    void deleteByAllocationId(@Param("allocationId") UUID allocationId);
}
```

- [ ] **Step 5: Verify the migration applies and the app boots**

Run (from `recoverpro/server/`): `mvn test -Dtest=RecoverProServerApplicationTests` (or whatever the existing Spring-context smoke test class is — check `server/src/test/java/com/recoverpro/server/` for a `*ApplicationTests.java` file and use its actual name if different)
Expected: PASS — Flyway applies `V081` cleanly and the Spring context loads with the new entity/repository wired.

- [ ] **Step 6: Commit**

```bash
git add server/src/main/resources/db/migration/V081__allocation_name_search_tokens.sql server/src/main/java/com/recoverpro/server/entity/AllocationNameSearchToken.java server/src/main/java/com/recoverpro/server/repository/AllocationNameSearchTokenRepository.java
git commit -m "Add allocation_name_search_tokens table, entity, and repository"
```

---

## Task 3: `AllocationSearchIndexService` — write-side token maintenance

**Files:**
- Create: `server/src/main/java/com/recoverpro/server/service/AllocationSearchIndexService.java`
- Create: `server/src/main/java/com/recoverpro/server/service/impl/AllocationSearchIndexServiceImpl.java`
- Test: `server/src/test/java/com/recoverpro/server/service/impl/AllocationSearchIndexServiceImplTest.java` (new)

**Interfaces:**
- Consumes: `LookupHashService.nameSearchTokens(String)` (Task 1), `AllocationNameSearchTokenRepository` (Task 2).
- Produces: `AllocationSearchIndexService.reindex(Allocation allocation)` and `.reindexAll(List<Allocation> allocations)` — deletes then recomputes an allocation's token rows from its current `borrowerName`. Consumed by Task 4 (import/upload write paths) and Task 6 (backfill runner).

- [ ] **Step 1: Write the failing test**

```java
package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationNameSearchTokenRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.AllocationSearchIndexService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationSearchIndexServiceImplTest extends AbstractIntegrationTest {

    @Autowired private AllocationSearchIndexService indexService;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AllocationNameSearchTokenRepository tokenRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private LookupHashService lookupHashService;
    @Autowired private EntityManager entityManager;

    private Organization org;
    private Allocation allocation;
    private FileUpload upload;

    @AfterEach
    void cleanup() {
        if (org != null) RlsOrgIdHolder.set(org.getId());
        if (allocation != null) allocationRepository.deleteById(allocation.getId());
        if (upload != null) fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void reindex_writesPrefixTokensForCurrentName_andRemovesStaleOnes() {
        org = createOrg("sp-search-a");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("it-search.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("it-search-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(managedOrg)
                .loanNumber("LN-SEARCH-" + System.nanoTime())
                .borrowerName("John Smith")
                .status(AllocationStatus.UNASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());

        indexService.reindex(allocation);
        entityManager.flush();

        List<AllocationNameSearchToken> tokens = tokenRepository.findAll().stream()
                .filter(t -> t.getAllocationId().equals(allocation.getId()))
                .toList();
        assertThat(tokens).extracting(AllocationNameSearchToken::getTokenHash)
                .contains(lookupHashService.hash("smith"), lookupHashService.hash("john"));

        allocation.setBorrowerName("Jane Doe");
        allocationRepository.save(allocation);
        indexService.reindex(allocation);
        entityManager.flush();

        List<AllocationNameSearchToken> afterRename = tokenRepository.findAll().stream()
                .filter(t -> t.getAllocationId().equals(allocation.getId()))
                .toList();
        assertThat(afterRename).extracting(AllocationNameSearchToken::getTokenHash)
                .contains(lookupHashService.hash("jane"), lookupHashService.hash("doe"))
                .doesNotContain(lookupHashService.hash("smith"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=AllocationSearchIndexServiceImplTest`
Expected: compile error — `AllocationSearchIndexService` does not exist.

- [ ] **Step 3: Write the interface**

Create `server/src/main/java/com/recoverpro/server/service/AllocationSearchIndexService.java`:

```java
package com.recoverpro.server.service;

import com.recoverpro.server.entity.Allocation;

import java.util.List;

public interface AllocationSearchIndexService {
    void reindex(Allocation allocation);
    void reindexAll(List<Allocation> allocations);
}
```

- [ ] **Step 4: Write the implementation**

Create `server/src/main/java/com/recoverpro/server/service/impl/AllocationSearchIndexServiceImpl.java`:

```java
package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.repository.AllocationNameSearchTokenRepository;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.AllocationSearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllocationSearchIndexServiceImpl implements AllocationSearchIndexService {

    private final AllocationNameSearchTokenRepository tokenRepository;
    private final LookupHashService lookupHashService;

    @Override
    @Transactional
    public void reindex(Allocation allocation) {
        tokenRepository.deleteByAllocationId(allocation.getId());
        Set<String> tokens = lookupHashService.nameSearchTokens(allocation.getBorrowerName());
        if (tokens.isEmpty()) return;

        UUID orgId = allocation.getOrganization().getId();
        List<AllocationNameSearchToken> rows = tokens.stream()
                .map(hash -> AllocationNameSearchToken.builder()
                        .allocationId(allocation.getId())
                        .tokenHash(hash)
                        .organizationId(orgId)
                        .build())
                .collect(Collectors.toList());
        tokenRepository.saveAll(rows);
    }

    @Override
    @Transactional
    public void reindexAll(List<Allocation> allocations) {
        allocations.forEach(this::reindex);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `mvn test -Dtest=AllocationSearchIndexServiceImplTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/service/AllocationSearchIndexService.java server/src/main/java/com/recoverpro/server/service/impl/AllocationSearchIndexServiceImpl.java server/src/test/java/com/recoverpro/server/service/impl/AllocationSearchIndexServiceImplTest.java
git commit -m "Add AllocationSearchIndexService to maintain name-search tokens"
```

---

## Task 4: Wire token reindexing into the two `borrowerName` write paths

**Files:**
- Modify: `server/src/main/java/com/recoverpro/server/service/importer/AllocationImportProcessor.java`
- Modify: `server/src/main/java/com/recoverpro/server/service/impl/UploadDataServiceImpl.java`
- Test: `server/src/test/java/com/recoverpro/server/service/impl/UploadDataServiceImplTest.java` (existing — extend it)

**Interfaces:**
- Consumes: `AllocationSearchIndexService.reindex`/`.reindexAll` (Task 3).

- [ ] **Step 1: Wire `AllocationImportProcessor`**

In `server/src/main/java/com/recoverpro/server/service/importer/AllocationImportProcessor.java`, add the field (the class is already `@RequiredArgsConstructor`, so adding a `final` field is enough — no constructor to hand-edit):

```java
    private final AllocationRepository allocationRepository;
    private final BorrowerRepository borrowerRepository;
    private final LookupHashService lookupHashService;
    private final com.recoverpro.server.service.AllocationSearchIndexService allocationSearchIndexService;
```

Change `persistBatch`:

```java
    @Override
    public void persistBatch(List<Allocation> batch, ImportContext context) {
        allocationRepository.saveAll(batch);
        allocationSearchIndexService.reindexAll(batch);
    }
```

- [ ] **Step 2: Wire `UploadDataServiceImpl`**

In `server/src/main/java/com/recoverpro/server/service/impl/UploadDataServiceImpl.java`, add the field:

```java
    private final AllocationRepository allocationRepo;
    private final FileUploadRepository fileUploadRepo;
    private final OrgIsolationGuard orgIsolationGuard;
    private final com.recoverpro.server.service.AllocationSearchIndexService allocationSearchIndexService;
```

Change `addRow`'s save line:

```java
        Allocation saved = allocationRepo.save(allocation);
        allocationSearchIndexService.reindex(saved);
        UploadRowResponse response = toRowResponse(saved);
```

Change `updateRow`'s return line:

```java
        Allocation saved = allocationRepo.save(allocation);
        allocationSearchIndexService.reindex(saved);
        return toRowResponse(saved);
```

- [ ] **Step 3: Update `UploadDataServiceImplTest` for the new dependency**

`server/src/test/java/com/recoverpro/server/service/impl/UploadDataServiceImplTest.java` is a plain Mockito unit test (`@ExtendWith(MockitoExtension.class)`) that constructs the service by hand in `@BeforeEach setUp()`:

```java
    @Mock private AllocationRepository allocationRepo;
    @Mock private FileUploadRepository fileUploadRepo;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private UploadDataServiceImpl service;
```
```java
        service = new UploadDataServiceImpl(allocationRepo, fileUploadRepo, orgIsolationGuard);
```

Add a mock and pass it into the constructor call:

```java
    @Mock private AllocationRepository allocationRepo;
    @Mock private FileUploadRepository fileUploadRepo;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private com.recoverpro.server.service.AllocationSearchIndexService allocationSearchIndexService;

    private UploadDataServiceImpl service;
```
```java
        service = new UploadDataServiceImpl(allocationRepo, fileUploadRepo, orgIsolationGuard, allocationSearchIndexService);
```

No behavior assertions need to change — `reindex`/`reindexAll` are void calls the existing tests don't assert on, and Mockito's default `@Mock` stubs them as no-ops.

- [ ] **Step 4: Run backend tests**

Run (from `recoverpro/server/`): `mvn test -Dtest=UploadDataServiceImplTest`
Expected: PASS.

Run: `mvn test` (full suite)
Expected: PASS — this confirms the `AllocationImportProcessor` change didn't break any existing import tests either.

- [ ] **Step 5: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/service/importer/AllocationImportProcessor.java server/src/main/java/com/recoverpro/server/service/impl/UploadDataServiceImpl.java server/src/test/java/com/recoverpro/server/service/impl/UploadDataServiceImplTest.java
git commit -m "Reindex allocation name-search tokens on every borrowerName write"
```

---

## Task 5: Make `searchTerm` actually filter — the core bug fix

**Files:**
- Modify: `server/src/main/java/com/recoverpro/server/repository/AllocationRepository.java`
- Modify: `server/src/main/java/com/recoverpro/server/service/impl/AllocationServiceImpl.java`
- Test: `server/src/test/java/com/recoverpro/server/repository/AllocationRepositorySearchTest.java` (new)

**Interfaces:**
- Consumes: `AllocationNameSearchToken` (Task 2), `LookupHashService.hash(String)` (existing).
- Produces: `AllocationRepository.findAllWithFilters(UUID, String, UUID, UUID, String searchTerm, String searchTermHash, Pageable)` — two new trailing parameters before `Pageable`. This is the method's only call site (`AllocationServiceImpl.getAllocations`), so the signature change is contained to this task.

- [ ] **Step 1: Write the failing test**

```java
package com.recoverpro.server.repository;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationRepositorySearchTest extends AbstractIntegrationTest {

    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AllocationNameSearchTokenRepository tokenRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private LookupHashService lookupHashService;

    private Organization org;
    private FileUpload upload;
    private Allocation smithAllocation;
    private Allocation doeAllocation;

    @AfterEach
    void cleanup() {
        if (org != null) RlsOrgIdHolder.set(org.getId());
        if (smithAllocation != null) allocationRepository.deleteById(smithAllocation.getId());
        if (doeAllocation != null) allocationRepository.deleteById(doeAllocation.getId());
        if (upload != null) fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void findAllWithFilters_searchTerm_matchesByLoanNumberPrefixOrNameToken() {
        org = createOrg("sp-search-repo");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("it-search-repo.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("it-search-repo-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(2)
                .build());

        String smithLoan = "LN-SMITH-" + System.nanoTime();
        smithAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber(smithLoan).borrowerName("John Smith")
                .status(AllocationStatus.UNASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        tokenRepository.save(AllocationNameSearchToken.builder()
                .allocationId(smithAllocation.getId())
                .tokenHash(lookupHashService.hash("smith"))
                .organizationId(managedOrg.getId())
                .build());

        doeAllocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber("LN-OTHER-" + System.nanoTime()).borrowerName("Jane Doe")
                .status(AllocationStatus.UNASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        tokenRepository.save(AllocationNameSearchToken.builder()
                .allocationId(doeAllocation.getId())
                .tokenHash(lookupHashService.hash("doe"))
                .organizationId(managedOrg.getId())
                .build());

        Page<Allocation> byName = allocationRepository.findAllWithFilters(
                managedOrg.getId(), null, null, null, "smith", lookupHashService.hash("smith"),
                PageRequest.of(0, 20));
        assertThat(byName.getContent()).extracting(Allocation::getId).containsExactly(smithAllocation.getId());

        Page<Allocation> byLoanNumber = allocationRepository.findAllWithFilters(
                managedOrg.getId(), null, null, null, smithLoan.substring(0, smithLoan.length() - 3), null,
                PageRequest.of(0, 20));
        assertThat(byLoanNumber.getContent()).extracting(Allocation::getId).containsExactly(smithAllocation.getId());

        Page<Allocation> noTerm = allocationRepository.findAllWithFilters(
                managedOrg.getId(), null, null, null, null, null, PageRequest.of(0, 20));
        assertThat(noTerm.getContent()).extracting(Allocation::getId)
                .containsExactlyInAnyOrder(smithAllocation.getId(), doeAllocation.getId());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=AllocationRepositorySearchTest`
Expected: compile error — `findAllWithFilters` does not accept 7 arguments yet.

- [ ] **Step 3: Update the repository query**

In `server/src/main/java/com/recoverpro/server/repository/AllocationRepository.java`, replace the `findAllWithFilters` query and signature:

```java
    @Query(value =
            "SELECT a FROM Allocation a " +
            "LEFT JOIN FETCH a.fileUpload " +
            "LEFT JOIN FETCH a.organization " +
            "WHERE a.organization.id = :organizationId " +
            "AND a.isDeleted = false " +
            "AND (:statusStr IS NULL OR CAST(a.status AS String) = :statusStr) " +
            "AND (:fileUploadId IS NULL OR a.fileUpload.id = :fileUploadId) " +
            "AND (:assignedToUserId IS NULL OR a.assignedToUserId = :assignedToUserId) " +
            "AND (:searchTerm IS NULL " +
            "     OR LOWER(a.loanNumber) LIKE LOWER(CONCAT(:searchTerm, '%')) " +
            "     OR a.id IN (SELECT t.allocationId FROM AllocationNameSearchToken t WHERE t.tokenHash = :searchTermHash))",
           countQuery =
            "SELECT COUNT(a) FROM Allocation a " +
            "WHERE a.organization.id = :organizationId " +
            "AND a.isDeleted = false " +
            "AND (:statusStr IS NULL OR CAST(a.status AS String) = :statusStr) " +
            "AND (:fileUploadId IS NULL OR a.fileUpload.id = :fileUploadId) " +
            "AND (:assignedToUserId IS NULL OR a.assignedToUserId = :assignedToUserId) " +
            "AND (:searchTerm IS NULL " +
            "     OR LOWER(a.loanNumber) LIKE LOWER(CONCAT(:searchTerm, '%')) " +
            "     OR a.id IN (SELECT t.allocationId FROM AllocationNameSearchToken t WHERE t.tokenHash = :searchTermHash))")
    Page<Allocation> findAllWithFilters(
            @Param("organizationId") UUID organizationId,
            @Param("statusStr") String statusStr,
            @Param("fileUploadId") UUID fileUploadId,
            @Param("assignedToUserId") UUID assignedToUserId,
            @Param("searchTerm") String searchTerm,
            @Param("searchTermHash") String searchTermHash,
            Pageable pageable);
```

- [ ] **Step 4: Update the one call site**

In `server/src/main/java/com/recoverpro/server/service/impl/AllocationServiceImpl.java`, in `getAllocations`, compute the normalized term and its hash, then pass both through:

```java
        String statusStr = filterRequest.getStatus() != null ? filterRequest.getStatus().name() : null;

        String normalizedSearch = StringUtils.hasText(filterRequest.getSearchTerm())
                ? filterRequest.getSearchTerm().trim() : null;
        String searchTermHash = (normalizedSearch != null && normalizedSearch.length() >= 2)
                ? lookupHashService.hash(normalizedSearch) : null;

        UUID fileUploadId = filterRequest.getFileUploadId();
        if (fileUploadId == null) {
            fileUploadId = activeDatasetResolver.activeFileId(filterRequest.getOrganizationId())
                    .orElse(NO_ACTIVE_DATASET);
        }

        Page<Allocation> page = allocationRepository.findAllWithFilters(
                filterRequest.getOrganizationId(), statusStr, fileUploadId,
                filterRequest.getAssignedToUserId(), normalizedSearch, searchTermHash, pageable);
```

This requires injecting `LookupHashService` into `AllocationServiceImpl` — add it to the field list and constructor-injected finals:

```java
    private final AllocationRepository allocationRepository;
    private final AllocationAuditLogRepository allocationAuditLogRepository;
    private final AllocationMapper allocationMapper;
    private final UserRepository userRepository;
    private final BorrowerRepository borrowerRepository;
    private final OrgIsolationGuard orgIsolationGuard;
    private final ActiveDatasetResolver activeDatasetResolver;
    private final com.recoverpro.server.security.encryption.LookupHashService lookupHashService;
```

(The class is `@RequiredArgsConstructor`, so no manual constructor edit is needed.)

- [ ] **Step 5: Run test to verify it passes**

Run: `mvn test -Dtest=AllocationRepositorySearchTest`
Expected: PASS.

- [ ] **Step 6: Run the full backend suite**

Run: `mvn test`
Expected: PASS — confirms no other caller of `AllocationServiceImpl.getAllocations` or `findAllWithFilters` broke (there is only the one call site found via search, but the full suite also exercises `AllocationController` tests that hit this path via HTTP).

- [ ] **Step 7: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/repository/AllocationRepository.java server/src/main/java/com/recoverpro/server/service/impl/AllocationServiceImpl.java server/src/test/java/com/recoverpro/server/repository/AllocationRepositorySearchTest.java
git commit -m "Fix searchTerm being silently ignored in allocation search"
```

---

## Task 6: Backfill existing allocations

**Files:**
- Create: `server/src/main/java/com/recoverpro/server/config/AllocationNameTokenBackfillRunner.java`
- Modify: `server/src/main/java/com/recoverpro/server/repository/AllocationRepository.java`
- Test: `server/src/test/java/com/recoverpro/server/config/AllocationNameTokenBackfillRunnerTest.java` (new)

**Interfaces:**
- Consumes: `AllocationSearchIndexService.reindex` (Task 3), new `AllocationRepository.findAllByOrganizationIdPaged(UUID, Pageable): Slice<Allocation>`.
- Mirrors the existing `LookupHashBackfillRunner` (`server/src/main/java/com/recoverpro/server/config/LookupHashBackfillRunner.java`) shape exactly — same flag-gating, per-org `RlsOrgIdHolder` scoping, 200-row pages.

- [ ] **Step 1: Add the paginated repository query**

In `AllocationRepository.java`, add (needs `import org.springframework.data.domain.Slice;` added to the file's imports):

```java
    @Query("SELECT a FROM Allocation a WHERE a.organization.id = :orgId AND a.isDeleted = false ORDER BY a.createdAt ASC")
    Slice<Allocation> findAllByOrganizationIdPaged(@Param("orgId") UUID orgId, Pageable pageable);
```

- [ ] **Step 2: Write the failing test**

```java
package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationNameSearchTokenRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationNameTokenBackfillRunnerTest extends AbstractIntegrationTest {

    @Autowired private AllocationNameTokenBackfillRunner runner;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private AllocationNameSearchTokenRepository tokenRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private LookupHashService lookupHashService;

    private Organization org;
    private FileUpload upload;
    private Allocation allocation;

    @AfterEach
    void cleanup() {
        if (org != null) RlsOrgIdHolder.set(org.getId());
        if (allocation != null) allocationRepository.deleteById(allocation.getId());
        if (upload != null) fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void run_whenEnabled_backfillsTokensForExistingAllocationsWithoutAny() {
        org = createOrg("sp-search-backfill");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("it-backfill.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("it-backfill-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload).organization(managedOrg)
                .loanNumber("LN-BACKFILL-" + System.nanoTime()).borrowerName("Backfill Borrower")
                .status(AllocationStatus.UNASSIGNED).totalDue(BigDecimal.TEN)
                .build());
        RlsOrgIdHolder.clear();

        ReflectionTestUtils.setField(runner, "enabled", true);
        runner.run();

        RlsOrgIdHolder.set(org.getId());
        List<AllocationNameSearchToken> tokens = tokenRepository.findAll().stream()
                .filter(t -> t.getAllocationId().equals(allocation.getId()))
                .toList();
        assertThat(tokens).extracting(AllocationNameSearchToken::getTokenHash)
                .contains(lookupHashService.hash("backfill"), lookupHashService.hash("borrower"));
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `mvn test -Dtest=AllocationNameTokenBackfillRunnerTest`
Expected: compile error — `AllocationNameTokenBackfillRunner` does not exist.

- [ ] **Step 4: Write the runner**

Create `server/src/main/java/com/recoverpro/server/config/AllocationNameTokenBackfillRunner.java`, mirroring `LookupHashBackfillRunner.java`:

```java
package com.recoverpro.server.config;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.AllocationSearchIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * One-time maintenance run, NOT part of normal startup: computes
 * allocation_name_search_tokens rows for every allocation that predates this
 * feature. Disabled unless app.backfill.allocation-name-tokens=true is passed
 * explicitly for one run, so it never re-runs on ordinary boots once done.
 * Mirrors LookupHashBackfillRunner's shape exactly.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class AllocationNameTokenBackfillRunner implements CommandLineRunner {

    private static final int PAGE_SIZE = 200;

    @Value("${app.backfill.allocation-name-tokens:false}")
    private boolean enabled;

    private final OrganizationRepository organizationRepository;
    private final AllocationRepository allocationRepository;
    private final AllocationSearchIndexService allocationSearchIndexService;

    @Override
    public void run(String... args) {
        if (!enabled) return;

        log.warn("Allocation name-token backfill starting.");
        List<Organization> orgs = organizationRepository.findAll();
        int totalAllocations = 0;
        int totalOrgs = 0;

        for (Organization org : orgs) {
            RlsOrgIdHolder.set(org.getId());
            try {
                totalAllocations += backfillOrg(org.getId());
            } catch (Exception e) {
                log.error("Allocation name-token backfill failed for orgId={}: {}", org.getId(), e.getMessage(), e);
            } finally {
                RlsOrgIdHolder.clear();
            }
            totalOrgs++;
        }

        log.warn("Allocation name-token backfill complete: {} allocations recomputed across {} organizations.",
                totalAllocations, totalOrgs);
    }

    @Transactional
    protected int backfillOrg(UUID orgId) {
        int updated = 0;
        int page = 0;
        Slice<Allocation> slice;
        do {
            slice = allocationRepository.findAllByOrganizationIdPaged(orgId, PageRequest.of(page, PAGE_SIZE));
            for (Allocation allocation : slice.getContent()) {
                allocationSearchIndexService.reindex(allocation);
                updated++;
            }
            page++;
        } while (slice.hasNext());
        return updated;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `mvn test -Dtest=AllocationNameTokenBackfillRunnerTest`
Expected: PASS.

- [ ] **Step 6: Run the full backend suite one more time**

Run: `mvn test`
Expected: PASS. This is the last backend task — confirm the whole suite is green before moving to the frontend.

- [ ] **Step 7: Commit**

```bash
git add server/src/main/java/com/recoverpro/server/config/AllocationNameTokenBackfillRunner.java server/src/main/java/com/recoverpro/server/repository/AllocationRepository.java server/src/test/java/com/recoverpro/server/config/AllocationNameTokenBackfillRunnerTest.java
git commit -m "Add backfill runner for allocation name-search tokens"
```

---

## Task 7: `CommandPaletteHelpers.ts` — unified recent-item storage

**Files:**
- Modify: `web/src/components/CommandPaletteHelpers.ts`

**Interfaces:**
- Produces: `interface RecentEntry { id: string; label: string; category: string; hint?: string }`, `readRecentEntries(key: string): RecentEntry[]`, `writeRecentEntries(key: string, list: RecentEntry[]): void`. Replaces `readStringArray`/`writeStringArray` (deleted — grep confirms `CommandPalette.tsx` is their only caller). Consumed by Task 8.

- [ ] **Step 1: Replace the recent-storage constants and helpers**

In `web/src/components/CommandPaletteHelpers.ts`, replace:

```ts
export const RECENT_KEY_DEFAULT = 'rp-palette-recent';
export const SAVED_KEY          = 'rp-palette-saved';
export const SAVED_MAX          = 12;

const TOKEN_KEYS = new Set(['in', 'cat', 'kind', 'type']);

/* ── localStorage helpers ─────────────────────────────────────────────────── */
export function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
  } catch { return []; }
}
export function writeStringArray(key: string, list: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}
```

with:

```ts
export const RECENT_KEY_DEFAULT = 'rp-palette-recent-v2';
export const SAVED_KEY          = 'rp-palette-saved';
export const SAVED_MAX          = 12;

const TOKEN_KEYS = new Set(['in', 'cat', 'kind', 'type']);

/* ── Recent-item storage ──────────────────────────────────────────────────── */
export interface RecentEntry {
  id: string;
  label: string;
  category: string;
  hint?: string;
}

export function readRecentEntries(key: string): RecentEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x: unknown): x is RecentEntry =>
      !!x && typeof x === 'object'
      && typeof (x as RecentEntry).id === 'string'
      && typeof (x as RecentEntry).label === 'string'
      && typeof (x as RecentEntry).category === 'string');
  } catch { return []; }
}

export function writeRecentEntries(key: string, list: RecentEntry[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}
```

(The key changes from `rp-palette-recent` to `rp-palette-recent-v2` because the stored shape changes from a bare string array to an object array — reading old data with the new parser would otherwise silently produce broken rows. Existing users just start with an empty recent list once under the new key; nothing to migrate.)

- [ ] **Step 2: Type-check**

Run (from `recoverpro/web/`): `npx tsc -b --noEmit`
Expected: new errors in `CommandPalette.tsx` (still using the old names) — expected at this point, resolved in Task 8. Confirm the errors are exactly `readStringArray`/`writeStringArray`/`RECENT_KEY_DEFAULT`-shape related and nothing else in this file broke.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/CommandPaletteHelpers.ts
git commit -m "Switch CommandPalette recent-item storage to full snapshots"
```

---

## Task 8: `CommandPalette.tsx` — merged remote search

**Files:**
- Modify: `web/src/components/CommandPalette.tsx`

**Interfaces:**
- Consumes: `readRecentEntries`/`writeRecentEntries`/`RecentEntry` (Task 7).
- Produces: two new optional props on `CommandPaletteProps` (defined in this task, in `CommandPaletteHelpers.ts`): `remoteSearch?: (term: string, signal: AbortSignal) => Promise<PaletteItem[]>` and `remoteLabel?: string` (default `'Loans & Customers'`). Consumed by Task 9 (`AppLayout.tsx` supplies `remoteSearch`).
- Convention: any `PaletteItem` whose `id` starts with `'allocation:'` is treated as a loan/customer result — its `hint` (not `category`) is shown as the row's subtitle, and its recent-entry snapshot is reconstructed into a working `run()` on the fly (since it can't come from the live `items` prop the way page/action recents do).

- [ ] **Step 1: Add the two new props to `CommandPaletteProps`**

In `web/src/components/CommandPaletteHelpers.ts`, update:

```ts
export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
  recentMax?: number;
  recentKey?: string;
  scope?: { currentPath: string; currentSection?: string };
  remoteSearch?: (term: string, signal: AbortSignal) => Promise<PaletteItem[]>;
  remoteLabel?: string;
}
```

- [ ] **Step 2: Replace the full contents of `CommandPalette.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, X, Settings, Search, CornerDownLeft, Loader2, User
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  type PaletteItem, type CommandPaletteProps, type ScopeMode,
  parseQuery, scoreItem, passesFilters, passesScope, findTypoSuggestion,
  readRecentEntries, writeRecentEntries, RECENT_KEY_DEFAULT,
} from './CommandPaletteHelpers';
import './TopbarCustomizeDialog.css';

export type { PaletteItem };

const RECENT_MAX_DEFAULT = 6;
const REMOTE_DEBOUNCE_MS = 250;
const REMOTE_MIN_CHARS = 2;

export default function CommandPalette({
  open, onClose, items, recentMax = RECENT_MAX_DEFAULT, recentKey = RECENT_KEY_DEFAULT, scope,
  remoteSearch, remoteLabel = 'Loans & Customers',
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all');
  const [activeIdx, setActiveIdx] = useState(0);
  const [remoteItems, setRemoteItems] = useState<PaletteItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<Element | null>(null);
  const remoteAbortRef = useRef<AbortController | null>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) { const prev = returnFocusRef.current; if (prev instanceof HTMLElement) prev.focus(); return; }
    returnFocusRef.current = document.activeElement;
    setQuery('');
    setScopeMode('all');
    setActiveIdx(0);
    setRemoteItems([]);
    setRemoteError(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const scoped = useMemo(
    () => items.filter(item => passesScope(item, scopeMode, scope)),
    [items, scopeMode, scope],
  );

  const parsed = useMemo(() => parseQuery(query), [query]);

  const filtered = useMemo(
    () => scoped.filter(item => passesFilters(item, parsed.filters)),
    [scoped, parsed.filters],
  );

  const showRemote = !!remoteSearch && parsed.text.length >= REMOTE_MIN_CHARS;

  useEffect(() => {
    remoteAbortRef.current?.abort();
    if (!open || !remoteSearch || !showRemote) {
      setRemoteItems([]); setRemoteLoading(false); setRemoteError(false);
      return;
    }
    const term = parsed.text;
    const controller = new AbortController();
    remoteAbortRef.current = controller;
    setRemoteLoading(true);
    setRemoteError(false);
    const t = setTimeout(async () => {
      try {
        const results = await remoteSearch(term, controller.signal);
        setRemoteItems(results);
      } catch (e: any) {
        if (e?.name !== 'CanceledError' && e?.name !== 'AbortError') { setRemoteItems([]); setRemoteError(true); }
      } finally {
        setRemoteLoading(false);
      }
    }, REMOTE_DEBOUNCE_MS);
    return () => { clearTimeout(t); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remoteSearch, showRemote, parsed.text]);

  const recentItems = useMemo(() => {
    if (parsed.text || Object.keys(parsed.filters).length > 0) return null;
    const entries = readRecentEntries(recentKey);
    const byId = new Map(filtered.map(i => [i.id, i]));
    const resolved = entries
      .map((e): PaletteItem | null => {
        const live = byId.get(e.id);
        if (live) return live;
        if (e.id.startsWith('allocation:')) {
          return {
            id: e.id,
            label: e.label,
            category: e.category,
            hint: e.hint,
            icon: User,
            run: () => navigate(`/app/allocations/${e.id.slice('allocation:'.length)}`),
          };
        }
        return null;
      })
      .filter((i): i is PaletteItem => !!i);
    return resolved.length > 0 ? resolved.slice(0, recentMax) : null;
  }, [filtered, parsed.text, parsed.filters, recentKey, recentMax, navigate]);

  const scored = useMemo(() => {
    if (!parsed.text) return filtered.map(item => ({ item, match: { score: 0 } }));
    return filtered
      .map(item => ({ item, match: scoreItem(item, parsed.text) }))
      .filter(({ match }) => match.score > 0)
      .sort((a, b) => b.match.score - a.match.score);
  }, [filtered, parsed.text]);

  const localFlat = recentItems ?? scored.map(s => s.item);
  const flat = showRemote ? [...remoteItems, ...localFlat] : localFlat;

  const typoSuggestion = useMemo(() => {
    if (!parsed.text || flat.length > 0) return null;
    return findTypoSuggestion(scoped, parsed.text);
  }, [parsed.text, flat.length, scoped]);

  useEffect(() => { if (activeIdx >= flat.length) setActiveIdx(Math.max(0, flat.length - 1)); }, [flat.length, activeIdx]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx='${activeIdx}']`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const remember = useCallback((item: PaletteItem) => {
    const entries = readRecentEntries(recentKey).filter(e => e.id !== item.id);
    entries.unshift({ id: item.id, label: item.label, category: item.category, hint: item.hint });
    writeRecentEntries(recentKey, entries.slice(0, Math.max(recentMax, 12)));
  }, [recentKey, recentMax]);

  const activate = useCallback((item: PaletteItem) => {
    remember(item);
    onClose(); requestAnimationFrame(() => item.run());
  }, [onClose, remember]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => flat.length === 0 ? 0 : (i + 1) % flat.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIdx(Math.max(0, flat.length - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = flat[activeIdx];
      if (entry) activate(entry);
      else if (typoSuggestion) activate(typoSuggestion);
    }
    else if (e.key === 'Tab' && scope) { e.preventDefault(); setScopeMode(m => m === 'all' ? 'page' : 'all'); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }, [flat, activeIdx, activate, onClose, typoSuggestion, scope]);

  if (!open) return null;

  const renderRow = (item: PaletteItem, idx: number) => {
    const isActive = idx === activeIdx;
    const Icon = item.icon;
    const subtitle = item.id.startsWith('allocation:') && item.hint ? item.hint : item.category;
    return (
      <button key={item.id} type="button" id={`rp-palette-item-${idx}`} data-idx={idx}
        className={`app-topbar-custom-row${isActive ? ' is-active' : ''}`}
        style={{ width: '100%', textAlign: 'left', border: 'none', background: isActive ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'transparent', cursor: 'pointer', alignItems: 'center' }}
        role="option" aria-selected={isActive}
        onMouseEnter={() => setActiveIdx(idx)} onClick={() => activate(item)}>

        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', flexShrink: 0, marginRight: '4px' }}>
          <Icon size={14} aria-hidden="true" style={{ color: 'var(--ink-secondary)' }} />
        </div>

        <div className="app-topbar-custom-row-body">
          <span className="app-topbar-custom-row-label">{item.label}</span>
          <span className="app-topbar-custom-row-desc">{subtitle}</span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: 'var(--radius-xs)', background: isActive ? 'var(--ink-solid)' : 'transparent', color: isActive ? 'var(--text-on-solid)' : 'color-mix(in srgb, var(--text-primary) 20%, transparent)', transition: 'all 0.2s', flexShrink: 0 }}>
          <ArrowRight size={12} aria-hidden="true" />
        </div>
      </button>
    );
  };

  const groupHeader = (label: string, loading?: boolean) => (
    <div style={{ padding: '4px 6px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}
      {loading && <Loader2 size={11} className="ds-spin" aria-hidden="true" />}
    </div>
  );

  return createPortal(
    <div className="app-topbar-custom-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="app-topbar-custom-dialog" ref={dialogRef} tabIndex={-1} style={{ outline: 'none' }}>

        <div className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <Settings size={14} aria-hidden="true" />
            <span id="rp-topbar-custom-title">{scope ? 'Search & commands' : 'Settings'}</span>
          </div>
          <button type="button" className="app-topbar-custom-close" onClick={onClose} aria-label="Close">
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {scope ? (
          <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 38, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <Search size={14} aria-hidden="true" style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search loans, customers, pages…"
                aria-label="Search loans, customers, and pages"
                aria-controls="rp-palette-list"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: 13, color: 'inherit' }}
              />
              <button type="button" onClick={() => setScopeMode(m => m === 'all' ? 'page' : 'all')}
                title="Toggle search scope (Tab)"
                style={{ flexShrink: 0, border: 'none', background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', color: 'inherit' }}>
                {scopeMode === 'all' ? 'Everywhere' : 'This page'}
              </button>
            </div>
          </div>
        ) : (
          <p className="app-topbar-custom-intro">
            Manage your account preferences, configure billing, or update your application theme.
            Select an option below to continue.
          </p>
        )}

        <div
          id="rp-palette-list"
          className="app-topbar-custom-list"
          role="listbox"
          ref={listRef}
          tabIndex={scope ? -1 : 0}
          onKeyDown={scope ? undefined : onKeyDown}
        >
          {showRemote ? (
            <>
              {groupHeader(remoteLabel, remoteLoading)}
              {remoteError && (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--ink-tertiary)' }}>
                  Couldn't load loan results.
                </div>
              )}
              {!remoteError && !remoteLoading && remoteItems.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--ink-tertiary)' }}>
                  No loans or customers match "{parsed.text}".
                </div>
              )}
              {remoteItems.map((item, i) => renderRow(item, i))}
              {groupHeader('Pages & Actions')}
              {scored.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--ink-tertiary)' }}>
                  No pages or actions match.
                </div>
              )}
              {scored.map((s, i) => renderRow(s.item, remoteItems.length + i))}
            </>
          ) : (
            <>
              {recentItems && groupHeader('Recent')}
              {flat.map((item, idx) => renderRow(item, idx))}

              {flat.length === 0 && typoSuggestion && (
                <button type="button" className="app-topbar-custom-row" onClick={() => activate(typoSuggestion)}
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', alignItems: 'center' }}>
                  <div className="app-topbar-custom-row-body">
                    <span className="app-topbar-custom-row-label">Did you mean "{typoSuggestion.label}"?</span>
                    <span className="app-topbar-custom-row-desc">Press <CornerDownLeft size={9} style={{ verticalAlign: 'middle' }} /> to go</span>
                  </div>
                </button>
              )}

              {flat.length === 0 && !typoSuggestion && (
                <div style={{ padding: '24px 6px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-tertiary)' }}>
                  No matches{parsed.text ? ` for "${parsed.text}"` : ''}.
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run (from `recoverpro/web/`): `npx tsc -b --noEmit`
Expected: no errors from `CommandPalette.tsx` or `CommandPaletteHelpers.ts`. (Errors from `AppLayout.tsx` about a missing `remoteSearch` prop type are expected here — it doesn't pass one yet — and are resolved in Task 9. If `tsc` doesn't report that as an error because the prop is optional, that's fine too — nothing to fix either way.)

Run: `npm run lint`
Expected: no new lint errors in `CommandPalette.tsx` (the `eslint-disable-next-line react-hooks/exhaustive-deps` comment on the remote-search effect suppresses the one intentional omission — `remoteSearch` itself isn't a dependency because the fetcher identity may change across renders in `AppLayout.tsx` and re-triggering the effect on that alone would cause spurious refetches; the effect already keys off `parsed.text`, `open`, and `showRemote`, which are what actually determines when a fetch should happen).

- [ ] **Step 4: Commit**

```bash
git add web/src/components/CommandPalette.tsx web/src/components/CommandPaletteHelpers.ts
git commit -m "Add merged backend search results to CommandPalette"
```

---

## Task 9: Wire `AppLayout.tsx` and delete `GlobalSearchModal`

**Files:**
- Modify: `web/src/AppLayout.tsx`
- Delete: `web/src/components/GlobalSearchModal.tsx`

**Interfaces:**
- Consumes: `CommandPalette`'s new `remoteSearch`/`remoteLabel` props (Task 8), `allocationsApi.listAllocations` (existing, `web/src/api/allocationsApi.ts`).

- [ ] **Step 1: Remove the `GlobalSearchModal` import and `searchOpen` state**

In `web/src/AppLayout.tsx`, remove this import line:

```tsx
import GlobalSearchModal from './components/GlobalSearchModal';
```

and remove:

```tsx
  const [searchOpen, setSearchOpen] = React.useState(false);
```

- [ ] **Step 2: Add the imports the new fetcher needs**

Change:

```tsx
import React, { useMemo, useEffect } from 'react';
```

to:

```tsx
import React, { useMemo, useEffect, useCallback } from 'react';
```

Change:

```tsx
import { Sun, Moon, HelpCircle, Settings, LogOut, Volume2, VolumeX, X, LayoutGrid } from 'lucide-react';
```

to:

```tsx
import { Sun, Moon, HelpCircle, Settings, LogOut, Volume2, VolumeX, X, LayoutGrid, User } from 'lucide-react';
```

Add, alongside the other API/type imports near the top of the file:

```tsx
import { allocationsApi } from './api/allocationsApi';
import type { AllocationResponse } from './types';
```

- [ ] **Step 3: Add the `fmtINR` helper and `searchAllocations` fetcher**

Add this module-level function, above `export default function AppLayout()`:

```tsx
function fmtINR(n?: number) {
  if (n == null) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
```

Inside the `AppLayout` component, near where `paletteItems` is defined, add:

```tsx
  const searchAllocations = useCallback(async (term: string, signal: AbortSignal): Promise<PaletteItem[]> => {
    const data = await allocationsApi.listAllocations(
      { searchTerm: term, page: 0, size: 8 } as any,
      signal,
    );
    return (data.content ?? []).map((a: AllocationResponse) => ({
      id: `allocation:${a.id}`,
      label: a.borrowerName || 'Unknown borrower',
      category: 'Loans & Customers',
      icon: User,
      hint: [a.loanNumber, fmtINR(a.outstandingAmount)].filter(Boolean).join(' • '),
      keywords: a.loanNumber ? [a.loanNumber] : [],
      run: () => navigate(`/app/allocations/${a.id}`),
    }));
  }, [navigate]);
```

- [ ] **Step 4: Wire the prop and drop `GlobalSearchModal`**

Change:

```tsx
      <CommandPalette
        open={s.paletteOpen}
        onClose={() => s.setPaletteOpen(false)}
        items={paletteItems}
        scope={{ currentPath: location.pathname, currentSection: nav.currentSection }}
      />
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
```

to:

```tsx
      <CommandPalette
        open={s.paletteOpen}
        onClose={() => s.setPaletteOpen(false)}
        items={paletteItems}
        scope={{ currentPath: location.pathname, currentSection: nav.currentSection }}
        remoteSearch={searchAllocations}
      />
```

- [ ] **Step 5: Point the topbar Search button at the same palette**

Change:

```tsx
          onOpenPalette={() => { s.setPaletteOpen(true); s.play('open'); }}
          onOpenSearch={() => { setSearchOpen(true); s.play('open'); }}
```

to:

```tsx
          onOpenPalette={() => { s.setPaletteOpen(true); s.play('open'); }}
```

(`TopBar`'s `onClick={onOpenSearch || onOpenPalette}` already falls back to `onOpenPalette` when `onOpenSearch` isn't passed — `TopBar.tsx` needs no changes.)

- [ ] **Step 6: Delete `GlobalSearchModal.tsx`**

```bash
rm web/src/components/GlobalSearchModal.tsx
```

- [ ] **Step 7: Type-check, lint, and build**

Run (from `recoverpro/web/`):

```bash
npx tsc -b --noEmit
npm run lint
npm run build
```

Expected: all three succeed with no errors (the `check-reset-scope.mjs` step inside `npm run build` isn't touched by this change and should pass as before).

- [ ] **Step 8: Commit**

```bash
git add web/src/AppLayout.tsx
git rm web/src/components/GlobalSearchModal.tsx
git commit -m "Merge topbar search into CommandPalette; remove GlobalSearchModal"
```

---

## Task 10: Live verification

**Files:** none (manual verification pass — no code changes)

- [ ] **Step 1: Start the backend with the migration applied**

Run (from `recoverpro/server/`): `mvn spring-boot:run`
Expected: boots cleanly, `V081` migration applies (check startup logs for `Migrating schema ... to version "081"`).

- [ ] **Step 2: Start the frontend**

Run (from `recoverpro/web/`): `npm run dev`

- [ ] **Step 3: Click through in the browser (use Claude in Chrome)**

As a user with an allocation-reading role (e.g. TL/MANAGER):
- Press Ctrl/Cmd+K — confirm it opens the merged palette (not two different boxes).
- Click the topbar Search button — confirm it opens the *same* component.
- Type 2+ letters of a real borrower's first or last name from a loaded dataset — confirm a "Loans & Customers" group appears with a matching result, and a "Pages & Actions" group appears below it with matching nav pages/actions (if any match the same text).
- Click the loan result — confirm it navigates straight to `/app/allocations/:id` for that loan.
- Reopen the palette (empty query) — confirm the loan you just clicked now appears under "Recent" alongside any previously-recent pages.
- Type a real loan number's first few characters — confirm it matches by loan number too.
- Type text that matches no borrower and no loan number (e.g. "zzzzz") — confirm the "Loans & Customers" group shows the "No loans or customers match" message rather than an error or a blank hang.

As a user WITHOUT allocation-read access (a role outside `AllocationController.READERS`, if one exists in the seeded test data), or by temporarily blocking the `/api/v1/allocations` network request via Chrome dev tools:
- Confirm the "Loans & Customers" group shows "Couldn't load loan results" and the "Pages & Actions" group still works normally (navigation isn't blocked by the failed backend call).

- [ ] **Step 4: Report findings**

If every check in Step 3 passes, the feature is done — no further steps. If any check fails, treat it as a bug against the specific task above whose code produced that behavior (not a new task) — fix it in place, re-run the relevant backend/frontend verification command from that task, and re-do this Task 10 click-through from the top.

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-06-global-search-design.md` maps to a task above — blind-index data model → Tasks 1-2, write path → Tasks 3-4, search query fix → Task 5, backfill → Task 6, frontend merge → Tasks 7-9, error handling and manual QA → Task 10. The spec's "unified list of `{type, id, label}` entries" for recents is implemented as `RecentEntry` (Task 7) with a same-render-live-lookup-first, synthesized-fallback-for-allocations approach (Task 8) — a refinement discovered while tracing `CommandPalette`'s actual internals (a pure ID-only unified list can't recover a working `run()` closure for allocation entries after a reload, since those items never live in the palette's static `items` prop the way pages/actions do); functionally this is still one storage key and one merged list, matching the spec's intent.
- **Frontend testing correction:** the spec mentions "component tests" for the frontend; this plan uses `tsc`/`eslint`/`npm run build` plus live browser verification instead, because no frontend test runner exists in this repo (`web/package.json` has no `test` script, no vitest/jest dependency). Introducing one would be a separate, unrelated undertaking.
- **Type consistency:** `findAllWithFilters`'s new parameters (`searchTerm`, `searchTermHash`) are named identically in the repository (Task 5), its only call site in `AllocationServiceImpl` (Task 5), and the test (Task 5). `AllocationSearchIndexService.reindex`/`reindexAll` signatures are identical across the interface (Task 3), both call sites (Task 4), and the backfill runner (Task 6). The `allocation:` id prefix convention is used consistently in `AppLayout.tsx`'s fetcher (Task 9), `CommandPalette.tsx`'s recent-entry reconstruction and row subtitle logic (Task 8).
