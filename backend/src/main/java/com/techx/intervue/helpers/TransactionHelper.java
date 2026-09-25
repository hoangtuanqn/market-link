package com.techx.intervue.helpers;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Việc ngoài DB (Redis, hàng đợi mail) chỉ nên chạy khi transaction đã commit: rollback thì không
 * được gửi mail "đã đổi mật khẩu" hay đá văng phiên. Không có transaction đang chạy thì chạy luôn.
 */
public class TransactionHelper {

    public static void afterCommit(Runnable action) {
        afterCompletion(action, null);
    }

    /**
     * onRollback: hoàn tác phần đã làm ngoài DB trước khi transaction bị rollback (có thể null).
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
