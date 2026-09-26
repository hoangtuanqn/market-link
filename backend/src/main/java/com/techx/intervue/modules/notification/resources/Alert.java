package com.techx.intervue.modules.notification.resources;

/**
 * How to alert one person about an event, computed on the server from the settings + quiet hours
 * (spec §5).
 */
public record Alert(boolean inApp, boolean browser, boolean sound) {}
