package com.recoverpro.server.config;

import com.recoverpro.server.security.RlsOrgIdHolder;
import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

/**
 * Every connection checkout stamps app.current_org_id as a Postgres session
 * variable (set_config(..., is_local=false)) so the RLS policies in
 * V010__rls_policies.sql / V040__rls_failclosed_and_extend.sql — which read
 * it via current_org_id() — actually receive a value. Session-scoped, not
 * transaction-scoped: Spring's transaction managers call getConnection()
 * and only *afterwards* set autoCommit(false), so a SET LOCAL issued here
 * would run in an implicit autocommit transaction and be gone before the
 * real transaction starts. Session-level plus "always re-set on every
 * checkout" gives the same isolation guarantee without that timing gap,
 * since every logical Spring transaction checks out a connection via
 * getConnection() exactly once.
 */
public class RlsAwareDataSource extends DelegatingDataSource {

    private static final String SET_ORG_SQL = "SELECT set_config('app.current_org_id', ?, false)";

    /**
     * Gates the "OR current_setting('app.is_platform_admin', true) = 'true'" branch that
     * individual RLS policies opt into (see V050 for file_uploads) -- only ever activated by
     * RlsOrgIdHolder.setBypass(true), which only server-side code that has already checked
     * hasRole('PLATFORM_ADMIN') may call. Explicitly set to 'true'/'false' on every checkout,
     * same reasoning as app.current_org_id below: pooled connections must never carry a stale
     * value left over from a previous borrower.
     */
    private static final String SET_PLATFORM_ADMIN_SQL = "SELECT set_config('app.is_platform_admin', ?, false)";

    public RlsAwareDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = super.getConnection();
        applyOrgContext(connection);
        return connection;
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = super.getConnection(username, password);
        applyOrgContext(connection);
        return connection;
    }

    private void applyOrgContext(Connection connection) throws SQLException {
        UUID orgId = RlsOrgIdHolder.get();
        try (PreparedStatement ps = connection.prepareStatement(SET_ORG_SQL)) {
            ps.setString(1, orgId != null ? orgId.toString() : "");
            ps.execute();
        }

        try (PreparedStatement ps = connection.prepareStatement(SET_PLATFORM_ADMIN_SQL)) {
            ps.setString(1, RlsOrgIdHolder.isBypass() ? "true" : "false");
            ps.execute();
        }
    }
}
