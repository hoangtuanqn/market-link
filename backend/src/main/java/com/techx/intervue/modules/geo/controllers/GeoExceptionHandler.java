package com.techx.intervue.modules.geo.controllers;

import com.techx.intervue.modules.geo.exceptions.ProvinceNotFoundException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = GeoController.class)
public class GeoExceptionHandler {

    @ExceptionHandler(ProvinceNotFoundException.class)
    ResponseEntity<ApiResource<Void>> provinceNotFound(ProvinceNotFoundException e) {
        ErrorResource error =
                ErrorResource.builder().code("PROVINCE_NOT_FOUND").details(List.of()).build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResource.error(error, e.getMessage()));
    }
}
