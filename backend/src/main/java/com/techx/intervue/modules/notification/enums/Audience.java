package com.techx.intervue.modules.notification.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import com.techx.intervue.modules.user.enums.RoleType;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** Who receives an admin-posted announcement (FR-077). Admin is not in any audience. */
public enum Audience {
    ALL(RoleType.CUSTOMER, RoleType.FARMER),
    CUSTOMERS(RoleType.CUSTOMER),
    FARMERS(RoleType.FARMER);

    private final List<RoleType> roles;

    Audience(RoleType... roles) {
        this.roles = List.of(roles);
    }

    /**
     * The audiences a person sees on the banner. A guest (null role) and an admin only see ALL:
     * they belong to no audience so they do not receive the announcement either.
     */
    public static List<Audience> visibleTo(RoleType role) {
        return Arrays.stream(values())
                .filter(a -> a == ALL || (role != null && a.roles.contains(role)))
                .toList();
    }

    /** Value of the users.role column (lowercase) for the fan-out statement. */
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
