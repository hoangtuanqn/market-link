package com.techx.intervue.modules.chat.enums;

import java.util.Collection;

/**
 * Who the assistant is talking to. The audience decides which tools Claude is shown (FR-093,
 * FR-094) and which hourly cap applies; it is resolved from the authenticated principal, never from
 * anything the model or the request body says.
 */
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

    /**
     * The most privileged audience the account holds, or null when it holds none. An approved
     * Farmer keeps ROLE_CUSTOMER as well, so order matters: the farmer tools are a superset of the
     * customer ones, and a Farmer asking a customer question is still served.
     */
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
