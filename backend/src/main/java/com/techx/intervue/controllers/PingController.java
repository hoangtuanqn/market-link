package com.techx.intervue.controllers;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/ping")
public class PingController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> index() {
        return ResponseEntity.ok(Map.of("status", true, "message", "Pong!"));
    }
}
