package com.techx.intervue.modules.geo.resources;

/** A ward with the province it belongs to — what GeoDirectory keeps in memory. */
public record WardRow(String code, String provinceCode, String name, String fullName) {

    public WardResource toResource() {
        return new WardResource(code, name, fullName);
    }
}
