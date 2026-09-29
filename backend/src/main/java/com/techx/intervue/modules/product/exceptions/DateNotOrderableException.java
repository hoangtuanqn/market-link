package com.techx.intervue.modules.product.exceptions;

public class DateNotOrderableException extends RuntimeException {
    public DateNotOrderableException() {
        super("Customers can no longer order for that pickup day.");
    }
}
