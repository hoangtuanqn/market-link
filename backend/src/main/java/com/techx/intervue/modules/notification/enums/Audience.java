package com.techx.intervue.modules.notification.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import com.techx.intervue.modules.user.enums.RoleType;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** Ai nhận thông báo admin đăng (FR-077). Admin không nằm trong audience nào. */
public enum Audience {
    ALL(RoleType.CUSTOMER, RoleType.FARMER),
    CUSTOMERS(RoleType.CUSTOMER),
    FARMERS(RoleType.FARMER);

    private final List<RoleType> roles;

    Audience(RoleType... roles) {
        this.roles = List.of(roles);
    }

    /**
     * Những audience một người thấy trên banner. Khách vãng lai (role null) và admin chỉ thấy ALL:
     * họ không thuộc audience nào nên cũng không nhận bản thông báo.
     */
    public static List<Audience> visibleTo(RoleType role) {
        return Arrays.stream(values())
                .filter(a -> a == ALL || (role != null && a.roles.contains(role)))
                .toList();
    }

    /** Giá trị cột users.role (chữ thường) cho câu fan-out. */
    public List<String> roleCodes() {
        return roles.stream().map(r -> r.name().toLowerCase(Locale.ROOT)).toList();
    }

    @JsonValue
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static Audience fromCode(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<Audience> {
        public DbConverter() {
            super(Audience.class);
        }
    }
}
