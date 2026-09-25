package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import org.springframework.stereotype.Service;

/**
 * Bản hiện tại chỉ dựa vào users.role và users.status vì farmer_profiles chưa tồn tại. Khi bảng đó
 * có, thêm kiểm tra approval_status vào đúng hai method dưới, không sửa service nào khác.
 */
@Service
public class StallAccessPolicy implements StallAccessPolicyInterface {

    @Override
    public void assertCanStart(User me) {
        if (me.getStatus() != UserStatus.ACTIVE) {
            throw new AccountRestrictedException();
        }
    }

    @Override
    public void assertCanBeMessaged(User target) {
        if (target.getRole() != RoleType.FARMER || target.getStatus() != UserStatus.ACTIVE) {
            throw new StallNotOpenException();
        }
    }

    @Override
    public void assertCanSend(User sender, User recipient) {
        if (sender.getStatus() != UserStatus.ACTIVE) {
            throw new AccountRestrictedException();
        }
        // Không kiểm role người nhận: stall trả lời khách cũng đi qua đây.
        if (recipient.getStatus() != UserStatus.ACTIVE) {
            throw new ConversationClosedException();
        }
    }
}
