package com.techx.intervue.modules.geo.resources;

/**
 * A Vietnamese province or centrally run city, e.g. ("79", "Hồ Chí Minh", "Thành phố Hồ Chí Minh").
 */
public record ProvinceResource(String code, String name, String fullName) {}
