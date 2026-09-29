package com.techx.intervue.modules.geo.resources;

public record WardRow(String code, String provinceCode, String name, String fullName) {

    public WardResource toResource() {
        return new WardResource(code, name, fullName);
    }
}
