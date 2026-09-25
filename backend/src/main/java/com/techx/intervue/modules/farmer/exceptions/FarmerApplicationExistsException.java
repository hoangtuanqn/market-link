package com.techx.intervue.modules.farmer.exceptions;

/** Tài khoản đã có hồ sơ Farmer (đang chờ, đã duyệt hoặc bị đình chỉ) → không nộp đơn lại. */
public class FarmerApplicationExistsException extends RuntimeException {
    public FarmerApplicationExistsException() {
        super("You already have a farmer application on this account.");
    }
}
