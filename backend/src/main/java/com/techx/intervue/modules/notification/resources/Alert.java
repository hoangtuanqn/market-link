package com.techx.intervue.modules.notification.resources;

/** Cách báo một sự kiện cho một người, tính ở server theo cài đặt + giờ yên tĩnh (spec §5). */
public record Alert(boolean inApp, boolean browser, boolean sound) {}
