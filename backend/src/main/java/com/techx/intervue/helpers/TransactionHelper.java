package com.techx.intervue.helpers;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public class TransactionHelper {

    public static void afterCommit(Runnable action) {
        afterCompletion(action, null);
    }

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
