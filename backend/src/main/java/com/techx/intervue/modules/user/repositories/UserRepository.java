package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    List<User> findByStatusAndDeactivatedUntilLessThanEqual(UserStatus status, Instant now);
}
