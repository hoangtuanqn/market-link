package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.user.entities.User;

/**
 * Ai được mở thread với ai, ai còn được gửi. Đây là chỗ DUY NHẤT sẽ đọc
 * farmer_profiles.approval_status khi bảng đó xuất hiện (roadmap backend bước 3): PENDING →
 * StallNotOpenException, SUSPENDED → ConversationClosedException khi gửi.
 */
public interface StallAccessPolicyInterface {

    /** Người mở thread phải là tài khoản đang hoạt động. */
    void assertCanStart(User me);

    /** Đối tượng của thread mới phải là một stall đang mở nhận tin. */
    void assertCanBeMessaged(User target);

    /** Trước mỗi lần gửi: người gửi còn hoạt động, người nhận chưa bị khoá hay đình chỉ. */
    void assertCanSend(User sender, User recipient);
}
