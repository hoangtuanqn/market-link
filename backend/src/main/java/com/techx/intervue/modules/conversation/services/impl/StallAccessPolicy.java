package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Spec §8.1. PENDING và REJECTED không lọt tới đây được: FarmerService chỉ đặt users.role = FARMER
 * lúc approve, nên hai trạng thái đó vẫn là CUSTOMER và bị chặn ở kiểm tra role. SUSPENDED thì khác
 * — D-09 giữ nguyên role để người ta còn đăng nhập được, nên phải tra farmer_profiles.
 */
@Service
@RequiredArgsConstructor
public class StallAccessPolicy implements StallAccessPolicyInterface {

    private final FarmerProfileRepository farmerProfiles;

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
        if (!isOpenStall(target)) {
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
        // D-09: thread cũ vẫn đọc được (list không gọi hàm này), chỉ chặn gửi thêm. Chặn cả hai
        // chiều: stall bị đình chỉ thì không bán tiếp, mà khách cũng không đặt tiếp được.
        if (!isOpenStall(sender) || !isOpenStall(recipient)) {
            throw new ConversationClosedException();
        }
    }

    /** Người không phải Farmer luôn "mở" — khách với khách nhắn nhau không liên quan tới stall. */
    private boolean isOpenStall(User user) {
        if (user.getRole() != RoleType.FARMER) {
            return true;
        }
        return farmerProfiles
                .findByUserId(user.getId())
                .map(profile -> profile.getApprovalStatus() == ApprovalStatus.APPROVED)
                .orElse(false);
    }
}
