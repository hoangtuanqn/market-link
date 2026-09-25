package com.techx.intervue.modules.farmer.exceptions;

/** Admin gọi theo `{id}` hồ sơ Farmer không tồn tại → 404 (R-06). */
public class FarmerProfileNotFoundException extends RuntimeException {
    public FarmerProfileNotFoundException() {
        super("Farmer profile not found.");
    }
}
