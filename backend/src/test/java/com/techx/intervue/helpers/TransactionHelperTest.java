package com.techx.intervue.helpers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class TransactionHelperTest {

    private final List<String> calls = new ArrayList<>();

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void runsImmediatelyWithoutTransaction() {
        TransactionHelper.afterCommit(() -> calls.add("commit"));

        assertThat(calls).containsExactly("commit");
    }

    @Test
    void waitsForCommit() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionHelper.afterCompletion(() -> calls.add("commit"), () -> calls.add("rollback"));
        assertThat(calls).isEmpty();

        finish(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(calls).containsExactly("commit");
    }

    @Test
    void runsRollbackActionOnlyOnRollback() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionHelper.afterCompletion(() -> calls.add("commit"), () -> calls.add("rollback"));

        finish(TransactionSynchronization.STATUS_ROLLED_BACK);

        assertThat(calls).containsExactly("rollback");
    }

    private static void finish(int status) {
        List<TransactionSynchronization> syncs =
                TransactionSynchronizationManager.getSynchronizations();
        if (status == TransactionSynchronization.STATUS_COMMITTED) {
            syncs.forEach(TransactionSynchronization::afterCommit);
        }
        syncs.forEach(s -> s.afterCompletion(status));
    }
}
