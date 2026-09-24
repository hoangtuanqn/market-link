package com.techx.intervue.services.impl;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class BaseService {
    protected <E> E findOrThrow(java.util.Optional<E> optional, String message) {
        return optional.orElseThrow(() -> new EntityNotFoundException(message));
    }
}
