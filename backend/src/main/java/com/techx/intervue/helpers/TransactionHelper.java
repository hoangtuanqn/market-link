package com.techx.intervue.helpers;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Work outside the DB (Redis, the mail queue) should only run after the transaction has committed:
 * on rollback we must not send a "password changed" email or kick the session out. With no
 * transaction running, it runs immediately.
 */
public class TransactionHelper {

    public static void afterCommit(Runnable action) {
        afterCompletion(action, null);
    }

    /**
     * onRollback: undo what was done outside the DB before the transaction is rolled back (may be
     * null).
     */
    public static void afterCompletion(Runnable onCommit, Runnable onRollback) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            onCommit.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        onCommit.run();
                    }

                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK && onRollback != null) {
                            onRollback.run();
                        }
                    }
                });
    }
}
