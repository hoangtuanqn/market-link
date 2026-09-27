package com.techx.intervue.modules.geo.resources;

/** A country for the address form; {@code name} is English, the browser localises it by code. */
public record CountryResource(String code, String name) {}
