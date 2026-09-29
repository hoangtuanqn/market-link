package com.techx.intervue.modules.chat.enums;

import java.util.Collection;

public enum AssistantAudience {
    CUSTOMER("ROLE_CUSTOMER"),
    FARMER("ROLE_FARMER"),
    ADMIN("ROLE_ADMIN");

    private final String authority;

    AssistantAudience(String authority) {
        this.authority = authority;
    }

    public String authority() {
        return authority;
    }

    public static AssistantAudience of(Collection<String> authorities) {
        if (authorities.contains(ADMIN.authority)) {
            return ADMIN;
        }
        if (authorities.contains(FARMER.authority)) {
            return FARMER;
        }
        if (authorities.contains(CUSTOMER.authority)) {
            return CUSTOMER;
        }
        return null;
    }
}
